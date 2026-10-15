// Builds a standalone Cloudflare Pages artifact for the Marlow & Pike demo
// from an existing `dist` produced by `astro build`. The Marlow demo route
// becomes the artifact root. Only shared assets and the demo page are
// included: no Premier pages, no marketing pages, no sitemap.
//
// MP_SITE_ORIGIN is REQUIRED. It must be the exact HTTPS origin of the
// dedicated deployment this artifact will be published to, with no path,
// query, fragment or user credentials. It is build-time configuration only:
// the builder rewrites the standalone index's canonical, og:url,
// og:image and twitter:image to that origin (social images keep their
// pathname) and nothing else. Without a valid value the build fails closed
// and no artifact is written, so the standalone page never ships with the
// marketing domain in its metadata or a fabricated deployed identity.
//
// Usage:
//   npm run build
//   MP_SITE_ORIGIN=https://<dedicated-demo-origin> node scripts/build-marlow-pike-pages.mjs
import { access, copyFile, cp, mkdir, readFile, rm, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
// Repository source and dependencies are resolved from this script's real
// location, never from the build CWD (the artifact tests run the builder
// from synthetic fixture directories). The esbuild used for the Worker
// bundle is the one already declared inside the installed Wrangler
// dependency: an existing build dependency, nothing new installed.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerEntry = join(repoRoot, 'scripts', 'marlow-pike-worker-entry.mjs');
const source = resolve(root, 'dist');
const target = resolve(root, 'dist-marlow-pike-pages');
const demoIndex = join(source, 'marlow-pike-demo', 'index.html');

function requiredSiteOrigin() {
  const raw = process.env.MP_SITE_ORIGIN;
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 500) {
    throw new Error('MP_SITE_ORIGIN is required: set it to the exact HTTPS origin of the standalone deployment.');
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_err) {
    throw new Error('MP_SITE_ORIGIN must be a valid absolute URL origin.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('MP_SITE_ORIGIN must use https.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('MP_SITE_ORIGIN must not contain user credentials.');
  }
  if (
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error('MP_SITE_ORIGIN must be a bare origin: no path, query or fragment.');
  }
  return parsed.origin;
}

// Fail closed on rerun: the previous artifact is invalidated BEFORE any
// prerequisite is checked, so an invalid or missing MP_SITE_ORIGIN (or a
// missing source dist) can never leave the old standalone artifact in place
// looking deployable. Only this generated directory is removed.
await rm(target, { recursive: true, force: true });

let siteOrigin;
try {
  siteOrigin = requiredSiteOrigin();
} catch (err) {
  console.error(`marlow-pike-pages: ${err.message}`);
  process.exit(1);
}

try {
  await access(demoIndex);
} catch (_err) {
  console.error('marlow-pike-pages: dist/marlow-pike-demo/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

// Shared asset directories and files the demo page needs. The marketing
// robots.txt is deliberately NOT copied: it points at the marketing domain's
// sitemap, which this standalone artifact must never advertise. A gated,
// explicit robots file is generated below instead.
const sharedDirs = ['_astro', 'images', 'fonts'];
const sharedFiles = [
  'marlow-pike-favicon.svg',
  'favicon.svg',
];

// The demo is noindex; state it for crawlers at artifact level too, with no
// sitemap directive and no marketing-domain reference.
const STANDALONE_ROBOTS = 'User-agent: *\nDisallow: /\n';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceAttr(html, attr, nextValue) {
  const pattern = new RegExp(`(${escapeRegExp(attr)}=")([^"]*)(")`);
  if (!pattern.test(html)) {
    throw new Error(`marlow-pike-pages: expected attribute ${attr} not found in built index.`);
  }
  return html.replace(pattern, `$1${nextValue}$3`);
}

// Rewrite only the standalone index's identity and social image metadata.
// All four targets must be present; anything else is a build failure, not a
// silent pass-through of the marketing domain's metadata.
function rewriteMetadata(html) {
  let output = html;
  output = replaceAttr(output, 'rel="canonical" href', `${siteOrigin}/`);
  output = replaceAttr(output, 'property="og:url" content', `${siteOrigin}/`);
  const ogImage = output.match(/property="og:image" content="([^"]*)"/);
  if (!ogImage) {
    throw new Error('marlow-pike-pages: og:image not found in built index.');
  }
  const imagePath = new URL(ogImage[1], siteOrigin).pathname;
  output = replaceAttr(output, 'property="og:image" content', `${siteOrigin}${imagePath}`);
  output = replaceAttr(output, 'name="twitter:image" content', `${siteOrigin}${imagePath}`);
  return output;
}

// Everything from here on repopulates the target. Any failure — malformed
// metadata, a copy error, a worker compilation error — must leave NO
// apparently complete artifact behind, so the whole build is wrapped and the
// partial target is removed before exiting.
try {
await mkdir(target, { recursive: true });

let html = await readFile(demoIndex, 'utf8');
html = rewriteMetadata(html);
await writeFile(join(target, 'index.html'), html);

for (const dir of sharedDirs) {
  try {
    await cp(join(source, dir), join(target, dir), { recursive: true });
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

for (const file of sharedFiles) {
  try {
    await copyFile(join(source, file), join(target, file));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

await writeFile(join(target, 'robots.txt'), STANDALONE_ROBOTS);

// Advanced-mode Worker: compile the isolated entry into a self-contained
// `_worker.js` inside the artifact. Pages advanced mode ignores the
// repository-root functions/ tree entirely for this deployment, so no
// Premier, contact or marketing endpoint is compiled or routed. The JSON
// catalogue is bundled in; there is no runtime JSON import. Compilation
// happens only after the origin validation and page prerequisites above
// have succeeded, and a compiler error fails the build.
{
  // Dependency resolution lives INSIDE the guarded build: if the esbuild
  // shipped inside the installed wrangler dependency is missing or broken,
  // this throws into the surrounding catch, which removes the partial target, so
  // no stale artifact survives a broken dependency either.
  const wranglerRequire = createRequire(join(repoRoot, 'node_modules', 'wrangler', 'package.json'));
  const esbuild = wranglerRequire('esbuild');
  const result = await esbuild.build({
    entryPoints: [workerEntry],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outfile: join(target, '_worker.js'),
    sourcemap: false,
    logLevel: 'warning',
  });
  if (result?.errors?.length) {
    throw new Error(`worker bundle failed (${result.errors.length} errors).`);
  }
  console.log(`Worker bundle: esbuild ${esbuild.version} (resolved from installed wrangler) -> ${join(target, '_worker.js')}`);
}

const entries = await readdir(target);
console.log(`Marlow & Pike Pages artifact ready: ${target}`);
console.log(`Standalone origin: ${siteOrigin}`);
console.log(`Artifact root entries: ${entries.sort().join(', ')}`);
} catch (err) {
  // No partial or apparently complete artifact may survive any failure after
  // the target started being repopulated.
  await rm(target, { recursive: true, force: true });
  console.error(err?.message?.startsWith('marlow-pike-pages:') ? err.message : `marlow-pike-pages: ${err?.message || err}`);
  process.exit(1);
}
