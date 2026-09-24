import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const bannedToolNames = [
  'Zapier',
  'Make',
  'n8n',
  'HubSpot',
  'Xero',
  'QuickBooks',
  'Calendly',
  'WhatsApp',
];

// Live privacy copy still uses em dashes. This ticket must not edit
// src/pages/privacy.astro, so the em dash gate skips that frozen page.
// Emoji and banned tool names are still checked there.
const emDashExceptions = new Set(['privacy/index.html']);

export function copyProblems(html, relPath = 'page.html') {
  const problems = [];
  if (!emDashExceptions.has(relPath) && html.includes('\u2014')) {
    problems.push(`${relPath} contains an em dash`);
  }
  if (/\p{Extended_Pictographic}/u.test(html)) {
    problems.push(`${relPath} contains an emoji`);
  }
  for (const name of bannedToolNames) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(html)) {
      problems.push(`${relPath} names ${name}`);
    }
  }
  return problems;
}

function walkHtml(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkHtml(path, found);
    else if (name.endsWith('.html')) found.push(path);
  }
  return found;
}

function isPremierHousingDemo(relPath) {
  return relPath.split('/').some((part) => part.startsWith('premier-housing-demo'));
}

function isCopiedFromPublic(relPath) {
  const top = relPath.split('/')[0];
  if (!top || top === 'index.html') return false;
  const publicPath = join(root, 'public', top);
  return existsSync(publicPath) && statSync(publicPath).isDirectory();
}

test('copy scanner flags em dashes, emoji, and banned tool names', () => {
  assert.deepEqual(copyProblems('Book a teardown'), []);
  assert.ok(copyProblems('A real line \u2014 and more').length > 0);
  assert.ok(copyProblems('Status \u{1F389}').length > 0);
  for (const name of bannedToolNames) {
    assert.ok(copyProblems(`We use ${name} here.`).some((problem) => problem.includes(name)));
  }
  assert.deepEqual(copyProblems('Hello \u2014 there', 'privacy/index.html'), []);
});

test('built site hides the preview and keeps copy clean', () => {
  execFileSync('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  const previewPath = join(dist, 'preview', 'index.html');
  let previewHtml;
  try {
    previewHtml = readFileSync(previewPath, 'utf8');
  } catch {
    assert.fail('/preview/ does not exist yet');
  }

  assert.match(
    previewHtml,
    /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i,
    'preview page is missing noindex',
  );
  assert.match(previewHtml, /Book a teardown/);
  assert.match(previewHtml, /Illustrative/);
  assert.match(previewHtml, /Privacy/);
  assert.match(previewHtml, /\/fonts\/Geist-Variable\.woff2/);
  assert.match(previewHtml, /\/fonts\/GeistMono-Variable\.woff2/);
  assert.doesNotMatch(previewHtml, /fonts\.googleapis\.com/);
  assert.doesNotMatch(previewHtml, /<script\b/i);

  const homeHtml = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.match(homeHtml, /fonts\.googleapis\.com/);
  assert.doesNotMatch(homeHtml, /Geist-Variable\.woff2/);

  const sitemapFiles = readdirSync(dist).filter((name) => /^sitemap.*\.xml$/.test(name));
  assert.ok(sitemapFiles.length > 0, 'expected a sitemap in dist');
  for (const name of sitemapFiles) {
    const xml = readFileSync(join(dist, name), 'utf8');
    assert.doesNotMatch(xml, /\/preview\/?/i, `${name} includes the preview URL`);
  }

  const pages = walkHtml(dist).filter((path) => {
    const rel = relative(dist, path);
    return !isPremierHousingDemo(rel) && !isCopiedFromPublic(rel);
  });
  const problems = pages.flatMap((path) => copyProblems(readFileSync(path, 'utf8'), relative(dist, path)));
  assert.deepEqual(problems, []);
});
