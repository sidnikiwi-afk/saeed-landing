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
import { join, resolve } from 'node:path';

const root = process.cwd();
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

// Shared asset directories and files the demo page needs.
const sharedDirs = ['_astro', 'images', 'fonts'];
const sharedFiles = [
  'marlow-pike-favicon.svg',
  'favicon.svg',
  'robots.txt',
];

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

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

let html = await readFile(demoIndex, 'utf8');
try {
  html = rewriteMetadata(html);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
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

const entries = await readdir(target);
console.log(`Marlow & Pike Pages artifact ready: ${target}`);
console.log(`Standalone origin: ${siteOrigin}`);
console.log(`Artifact root entries: ${entries.sort().join(', ')}`);
