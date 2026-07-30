import { access, copyFile, cp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'dist');
const target = resolve(root, 'dist-premier-housing-pages');
const premierIndex = join(source, 'premier-housing-demo', 'index.html');

await access(premierIndex);
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
await copyFile(premierIndex, join(target, 'index.html'));

console.log(`Premier Housing Pages artifact ready: ${target}`);
