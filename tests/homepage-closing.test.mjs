import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

function decodeHtmlEntities(value) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function sectionHtml(html, id) {
  const match = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`));
  assert.ok(match, `the page is missing the ${id} section`);
  return decodeHtmlEntities(match[0]);
}

function anchors(html) {
  const found = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const hrefMatch = match[1].match(/href\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) continue;
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    found.push({ href: decodeHtmlEntities(hrefMatch[2]), text });
  }
  return found;
}

function assertCleanCopy(sectionHtmlText, label) {
  assert.ok(!sectionHtmlText.includes('—'), `${label} contains an em dash`);
  assert.ok(
    !/\bexamples?\b/i.test(sectionHtmlText),
    `${label} uses the word example, which is not allowed`,
  );
  for (const name of bannedToolNames) {
    const flags = name === 'Make' ? '' : 'i';
    assert.doesNotMatch(sectionHtmlText, new RegExp(`\\b${name}\\b`, flags), `${label} names ${name}`);
  }
}

test('homepage comparison, tested, faq and closing sections follow the packet', async () => {
  // Build to a separate outDir so this file and built-site.test.mjs can run
  // their builds in parallel without clobbering each other's dist.
  const outDir = join(root, 'dist-closing');
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
    },
  });

  const html = readFileSync(join(outDir, 'index.html'), 'utf8');

  // Comparison: by hand, buying a tool, having it built.
  const comparison = sectionHtml(html, 'comparison');
  assertCleanCopy(comparison, 'the comparison section');
  assert.match(comparison, /Doing it by hand, buying a tool, or having it built/);
  for (const column of ['By hand', 'Off-the-shelf tool', 'Built by Brackstone']) {
    assert.match(comparison, new RegExp(`\\b${column}\\b`), `the comparison is missing the ${column} column`);
  }
  for (const row of [
    'Calls, email and forms in one place',
    'Fits how your business actually works',
    'Works out of hours',
    'Someone to call when it needs changing',
  ]) {
    assert.match(comparison, new RegExp(`\\b${row}\\b`), `the comparison is missing the row ${row}`);
  }

  // What we test: kinds of test cases only. No scores, percentages or metrics.
  const tested = sectionHtml(html, 'tested');
  assertCleanCopy(tested, 'the tested section');
  for (const kind of [
    'Email with no address',
    'The same enquiry twice',
    'Caller changes their mind',
    'Asks for a price we cannot give',
  ]) {
    assert.match(tested, new RegExp(`\\b${kind}\\b`), `the tested section is missing the case ${kind}`);
  }
  assert.doesNotMatch(tested, /\d+\s?%/);
  assert.doesNotMatch(tested, /\bscore/i);
  assert.doesNotMatch(tested, /\b(Accuracy|Safety rating|Handover score|Pass rate|out of 10)\b/i);
  // The cases are made up, labelled with the Illustrative caption.
  assert.match(tested, /\bmade up\b/i);
  assert.match(tested, /Illustrative/);

  // FAQ: native details elements so the answers are reachable without JavaScript.
  const faq = sectionHtml(html, 'faq');
  assertCleanCopy(faq, 'the faq section');
  const faqDetails = [...faq.matchAll(/<details\b[\s\S]*?<\/details>/g)];
  assert.ok(faqDetails.length >= 5, 'the faq section should have at least five questions');
  for (const question of [
    'Do I have to change the software I use?',
    'What happens with something it cannot handle?',
    'Who owns the systems and the data?',
  ]) {
    assert.match(faq, new RegExp(question.replace(/[?]/g, '\\?')), `the faq is missing ${question}`);
  }
  assert.doesNotMatch(faq, /\b(claim|guarantee|we deliver)\b/i);

  const closing = sectionHtml(html, 'closing');
  assertCleanCopy(closing, 'the closing section');
  const teardownLinks = anchors(closing).filter((anchor) => anchor.text === 'Book a 15-minute teardown');
  assert.equal(teardownLinks.length, 1, 'the closing section should have exactly one teardown button');
  assert.equal(teardownLinks[0].href, '/contact/', 'the teardown button must point at /contact/');
  const trialLinks = anchors(closing).filter((anchor) => anchor.text === 'Start a free trial');
  assert.equal(trialLinks.length, 1, 'the closing section should have exactly one trial button');
});
