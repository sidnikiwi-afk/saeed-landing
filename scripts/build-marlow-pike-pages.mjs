// Builds a standalone Cloudflare Pages artifact for the Marlow & Pike demo
// from an existing `dist` produced by `astro build`. The Marlow demo route
// becomes the artifact root. Only shared assets and the demo page are
// included: no Premier pages, no marketing pages, no sitemap.
//
// Usage: npm run build && node scripts/build-marlow-pike-pages.mjs
import { access, copyFile, cp, rm, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'dist');
const target = resolve(root, 'dist-marlow-pike-pages');
const demoIndex = join(source, 'marlow-pike-demo', 'index.html');

await access(demoIndex);

// Shared asset directories and files the demo page needs.
const sharedDirs = ['_astro', 'images', 'fonts'];
const sharedFiles = [
  'marlow-pike-favicon.svg',
  'favicon.svg',
  'robots.txt',
];

await rm(target, { recursive: true, force: true });
await cp(demoIndex, join(target, 'index.html'));

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

// The demo layout is already noindex; make it explicit at artifact level too.
await copyFile(demoIndex, join(target, 'index.html'));

const entries = await readdir(target);
console.log(`Marlow & Pike Pages artifact ready: ${target}`);
console.log(`Artifact root entries: ${entries.sort().join(', ')}`);
