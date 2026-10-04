import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, test } from 'node:test';

const repoRoot = resolveRepoRoot();
const script = join(repoRoot, 'scripts', 'build-marlow-pike-pages.mjs');

function resolveRepoRoot() {
  // This test lives in <repo>/tests/, run from the repo root.
  return process.cwd();
}

const MARKETING_ORIGIN = 'https://brackstonedigital.co.uk';

// Synthetic built index mirroring the real Astro output shape: noindex robots,
// a canonical and og/twitter metadata pointing at the marketing domain (what
// the shared layout emits before the standalone rewrite).
function fixtureIndex() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="canonical" href="${MARKETING_ORIGIN}/marlow-pike-demo/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${MARKETING_ORIGIN}/marlow-pike-demo/" />
    <meta property="og:image" content="${MARKETING_ORIGIN}/images/properties/property-2.jpg" />
    <meta name="twitter:image" content="${MARKETING_ORIGIN}/images/properties/property-2.jpg" />
    <title>Marlow &amp; Pike demo</title>
  </head>
  <body></body>
</html>
`;
}

const tempDirs = [];

async function makeFixtureDist() {
  const dir = await mkdtemp(join(tmpdir(), 'mp-artifact-'));
  tempDirs.push(dir);
  const demoDir = join(dir, 'dist', 'marlow-pike-demo');
  await mkdir(demoDir, { recursive: true });
  await writeFile(join(demoDir, 'index.html'), fixtureIndex());
  // Real-style marketing robots: sitemap directive that must NOT survive
  // into the standalone artifact.
  await writeFile(
    join(dir, 'dist', 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${MARKETING_ORIGIN}/sitemap-index.xml\n`
  );
  return dir;
}

function runBuilder(cwd, envMode = 'valid') {
  const env = { ...process.env };
  delete env.MP_SITE_ORIGIN;
  if (envMode !== 'missing') env.MP_SITE_ORIGIN = envMode;
  const result = spawnSync(process.execPath, [script], { cwd, env, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

after(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

test('rewrites the standalone identity and social images to MP_SITE_ORIGIN', async () => {
  const dir = await makeFixtureDist();
  const origin = 'https://mp-demo-standalone.example';
  const run = runBuilder(dir, origin);
  assert.equal(run.status, 0, run.stderr);

  const html = await readFile(join(dir, 'dist-marlow-pike-pages', 'index.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/mp-demo-standalone\.example\/"/);
  assert.match(html, /property="og:url" content="https:\/\/mp-demo-standalone\.example\/"/);
  // Social images keep their pathname but move to the dedicated origin.
  assert.match(html, /property="og:image" content="https:\/\/mp-demo-standalone\.example\/images\/properties\/property-2\.jpg"/);
  assert.match(html, /name="twitter:image" content="https:\/\/mp-demo-standalone\.example\/images\/properties\/property-2\.jpg"/);
});

test('standalone output carries no marketing canonical and keeps noindex', async () => {
  const dir = await makeFixtureDist();
  const run = runBuilder(dir, 'https://mp-demo-standalone.example');
  assert.equal(run.status, 0, run.stderr);

  const html = await readFile(join(dir, 'dist-marlow-pike-pages', 'index.html'), 'utf8');
  assert.equal(html.includes(MARKETING_ORIGIN), false);
  assert.equal(html.includes('/marlow-pike-demo'), false);
  assert.match(html, /name="robots" content="noindex, nofollow"/);

  // The builder never ships the marketing sitemap in the artifact.
  const entries = await readdir(join(dir, 'dist-marlow-pike-pages'));
  assert.equal(entries.includes('sitemap-index.xml'), false);
  assert.equal(entries.includes('sitemap-0.xml'), false);

  // robots.txt is generated, not copied: gated crawl with no marketing
  // sitemap directive.
  const robots = await readFile(join(dir, 'dist-marlow-pike-pages', 'robots.txt'), 'utf8');
  assert.match(robots, /^User-agent: \*\n/);
  assert.match(robots, /^Disallow: \/$/m);
  assert.equal(/Sitemap:/i.test(robots), false);
  assert.equal(robots.includes(MARKETING_ORIGIN), false);
});

test('fails closed when MP_SITE_ORIGIN is missing', async () => {
  const dir = await makeFixtureDist();
  const run = runBuilder(dir, 'missing');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /MP_SITE_ORIGIN is required/);
  await assert.rejects(readFile(join(dir, 'dist-marlow-pike-pages', 'index.html')));
});

test('fails closed on insecure, credentialed and path-bearing origins', async () => {
  for (const bad of [
    'http://mp-demo-standalone.example',
    'https://user:pass@mp-demo-standalone.example',
    'https://mp-demo-standalone.example/demo/',
    'https://mp-demo-standalone.example/?x=1',
    'https://mp-demo-standalone.example/#frag',
    'not-a-url',
  ]) {
    const dir = await makeFixtureDist();
    const run = runBuilder(dir, bad);
    assert.equal(run.status, 1, `expected failure for ${bad}`);
    assert.notEqual(run.stderr.trim(), '');
    await assert.rejects(readFile(join(dir, 'dist-marlow-pike-pages', 'index.html')), `no artifact for ${bad}`);
  }
});

test('fails closed when the built dist is missing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mp-artifact-empty-'));
  tempDirs.push(dir);
  const run = runBuilder(dir, 'https://mp-demo-standalone.example');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /dist\/marlow-pike-demo\/index\.html not found/);
});

test('advanced-mode worker exists and keeps the standalone isolation constraints', async () => {
  const dir = await makeFixtureDist();
  const origin = 'https://mp-demo-standalone.example';
  const run = runBuilder(dir, origin);
  assert.equal(run.status, 0, run.stderr);

  // The self-contained advanced-mode _worker.js is part of the artifact.
  const workerPath = join(dir, 'dist-marlow-pike-pages', '_worker.js');
  const worker = await readFile(workerPath, 'utf8');
  assert.ok(worker.length > 0);
  assert.ok(worker.includes('marlow-pike-enquire'), 'worker must route the Marlow endpoint');

  // The catalogue is bundled in as real canonical data (not merely the MP
  // refs that also appear in the endpoint allowlist); the worker never
  // re-imports JSON at runtime and never references the marketing origin.
  for (const value of ['Mill Lane, Marlow', 'Anchor Yard, Marlow', 'keeps Saturday viewings in order']) {
    assert.ok(worker.includes(value), `catalogue value ${value} missing from _worker.js`);
  }
  assert.equal(/marlow-pike-listings\.json/.test(worker), false);
  assert.equal(/with\s*\{\s*type:\s*['"]json['"]/.test(worker), false);
  assert.equal(worker.includes(MARKETING_ORIGIN), false);

  // The existing identity and robots constraints still hold alongside the
  // worker (the worker must not change the standalone page's identity).
  const html = await readFile(join(dir, 'dist-marlow-pike-pages', 'index.html'), 'utf8');
  assert.match(html, /rel="canonical" href="https:\/\/mp-demo-standalone\.example\/"/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  const robots = await readFile(join(dir, 'dist-marlow-pike-pages', 'robots.txt'), 'utf8');
  assert.match(robots, /^Disallow: \/$/m);
  assert.equal(/Sitemap:/i.test(robots), false);
});
