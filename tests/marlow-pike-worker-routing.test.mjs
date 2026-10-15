// Advanced-mode Worker routing tests for the standalone Marlow & Pike
// artifact. These tests build the real `_worker.js` with the real builder
// and then IMPORT AND EXECUTE the generated module (not a re-implementation
// or a string grep): the Marlow endpoint must reach the existing handler and
// fail closed, every legacy/unknown API path must 404 without invoking
// ASSETS or fetch, and ordinary static requests must delegate to ASSETS.
// All fetch is mocked; no fixture address is printed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, beforeEach, test } from 'node:test';

const repoRoot = process.cwd();
const builder = join(repoRoot, 'scripts', 'build-marlow-pike-pages.mjs');
const MARKETING_ORIGIN = 'https://brackstonedigital.co.uk';
const demoOrigin = 'https://mp-demo-routing.example';

const tempDirs = [];

async function makeFixtureDist() {
  const dir = await mkdtemp(join(tmpdir(), 'mp-routing-'));
  tempDirs.push(dir);
  const demoDir = join(dir, 'dist', 'marlow-pike-demo');
  await mkdir(demoDir, { recursive: true });
  await writeFile(
    join(demoDir, 'index.html'),
    `<!doctype html><html lang="en"><head><meta charset="UTF-8" />
<meta name="robots" content="noindex, nofollow" />
<link rel="canonical" href="${MARKETING_ORIGIN}/marlow-pike-demo/" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${MARKETING_ORIGIN}/marlow-pike-demo/" />
<meta property="og:image" content="${MARKETING_ORIGIN}/images/properties/property-2.jpg" />
<meta name="twitter:image" content="${MARKETING_ORIGIN}/images/properties/property-2.jpg" />
<title>Marlow &amp; Pike demo</title></head><body></body></html>\n`
  );
  return dir;
}

async function buildWorker() {
  const dir = await makeFixtureDist();
  const run = spawnSync(process.execPath, [builder], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, MP_SITE_ORIGIN: demoOrigin },
  });
  assert.equal(run.status, 0, run.stderr);
  const workerPath = join(dir, 'dist-marlow-pike-pages', '_worker.js');
  const workerUrl = pathToFileURL(workerPath);
  const worker = (await import(workerUrl)).default;
  return { dir, worker };
}

function makeEnv({ allowed = true, fullConfig = false } = {}) {
  const assetCalls = [];
  const forwardCalls = [];
  const env = {
    // Legacy settings deliberately supplied: the worker must never use them
    // or reach any legacy route.
    PH_ALLOWED_ORIGINS: demoOrigin,
    INBOUND_EMAIL_WEBHOOK_SECRET: 'legacy-secret-must-not-be-used',
    DASHBOARD_WEBHOOK_URL: 'https://dashboard.brackstonedigital.co.uk',
    ASSETS: {
      fetch: async (request) => {
        assetCalls.push(request.url);
        return new Response('asset', { status: 200 });
      },
    },
  };
  if (allowed) env.MP_ALLOWED_ORIGINS = demoOrigin;
  if (fullConfig) {
    env.MP_DASHBOARD_WEBHOOK_URL = 'https://dashboard.brackstonedigital.co.uk';
    env.MP_INBOUND_EMAIL_WEBHOOK_SECRET = 'mp-secret-not-real';
    env.MP_INBOUND_TOKEN = 'mp-token-not-real';
    env.MP_INBOUND_RECIPIENT = 'firm-mp@dashboard.brackstonedigital.co.uk';
  }
  return { env, assetCalls, forwardCalls };
}

function marlowRequest(method = 'POST', pathname = '/api/marlow-pike-enquire', body = null) {
  const headers = { Origin: demoOrigin, 'Content-Type': 'application/json' };
  return new Request(`${demoOrigin}${pathname}`, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
  });
}

const builtWorkers = [];

// Valid enquiry payload: validation runs before the configuration check, so
// reaching the fail-closed 503 requires a payload that passes validation.
const validPayload = {
  name: 'Demo Visitor',
  phone: '07700 900410',
  email: 'visitor@example.com',
  message: 'viewing request reference check',
  property_ref: 'MP002',
};

beforeEach(() => {
  globalThis.fetch = async (...args) => {
    throw new Error('unexpected outbound fetch');
  };
});

after(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

test('worker bundles, exports a fetch handler and the artifact keeps identity constraints', async () => {
  const { dir } = await buildWorker();
  const source = await readFile(join(dir, 'dist-marlow-pike-pages', '_worker.js'), 'utf8');
  assert.ok(source.length > 0);
  // Self-contained: real canonical catalogue data is inlined, not merely the
  // MP refs that also appear in the endpoint allowlist, and nothing is left
  // to import at runtime.
  for (const value of ['Mill Lane, Marlow', 'Anchor Yard, Marlow', 'Studio apartment', 'keeps Saturday viewings in order']) {
    assert.ok(source.includes(value), `catalogue value ${value} missing from _worker.js`);
  }
  assert.doesNotMatch(source, /marlow-pike-listings\.json/);
  assert.doesNotMatch(source, /with\s*\{\s*type:\s*['"]json['"]/);
  // No marketing identity and no sitemap survive into the artifact.
  assert.equal(source.includes(MARKETING_ORIGIN), false);
  const entries = await readFile(join(dir, 'dist-marlow-pike-pages', 'robots.txt'), 'utf8');
  assert.match(entries, /^Disallow: \/$/m);
});

test('Marlow endpoint reaches the existing handler and fails closed on missing config', async () => {
  const { worker } = await buildWorker();
  // No MP_ALLOWED_ORIGINS at all: 403 before anything else.
  const { env: envNoOrigin, assetCalls, forwardCalls } = makeEnv({ allowed: false });
  const blocked = await worker.fetch(marlowRequest('POST'), envNoOrigin, {});
  assert.equal(blocked.status, 403);
  assert.deepEqual(assetCalls, []);
  // Origin allowed but the forwarding variables absent: 503, no fetch.
  const { env: envNoConfig } = makeEnv({ allowed: true });
  const failing = await worker.fetch(marlowRequest('POST', '/api/marlow-pike-enquire', validPayload), envNoConfig, {});
  assert.equal(failing.status, 503);
  assert.deepEqual(JSON.parse(await failing.text()), { error: 'Enquiry forwarding is not configured' });
  assert.deepEqual(forwardCalls, []);
});

test('OPTIONS with an explicit allowed origin returns the existing CORS preflight', async () => {
  const { worker } = await buildWorker();
  const { env } = makeEnv({ allowed: true });
  const response = await worker.fetch(marlowRequest('OPTIONS'), env, {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), demoOrigin);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
});

test('legacy and unknown API paths return 404 with no ASSETS or forward calls', async () => {
  const { worker } = await buildWorker();
  for (const pathname of ['/api/contact', '/api/enquire', '/api/enquire/probe', '/api/unknown', '/api']) {
    const { env, assetCalls, forwardCalls } = makeEnv({ allowed: true, fullConfig: true });
    const response = await worker.fetch(marlowRequest('POST', pathname, { name: 'x' }), env, {});
    assert.equal(response.status, 404, `expected 404 for ${pathname}`);
    assert.deepEqual(assetCalls, [], `ASSETS used for ${pathname}`);
    assert.deepEqual(forwardCalls, [], `forward attempted for ${pathname}`);
  }
});

test('ordinary static requests delegate to ASSETS', async () => {
  const { worker } = await buildWorker();
  const { env, assetCalls } = makeEnv({ allowed: true });
  for (const pathname of ['/', '/images/properties/property-1.jpg', '/robots.txt']) {
    const response = await worker.fetch(new Request(`${demoOrigin}${pathname}`), env, {});
    assert.equal(response.status, 200, `expected 200 for ${pathname}`);
  }
  assert.equal(assetCalls.length, 3);
});

test('unsupported Marlow method returns the existing 405', async () => {
  const { worker } = await buildWorker();
  const { env, assetCalls } = makeEnv({ allowed: true, fullConfig: true });
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const response = await worker.fetch(marlowRequest(method), env, {});
    assert.equal(response.status, 405, `expected 405 for ${method}`);
    assert.equal(response.headers.get('Allow'), 'POST, OPTIONS');
  }
  assert.deepEqual(assetCalls, []);
});
