import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

test('preview industries links follow the ads data', async () => {
  const { garagesAd } = await import('../src/data/ads/garages.mjs');
  const { estateAgentsAd } = await import('../src/data/ads/estate-agents.mjs');
  const { aiReceptionistAd } = await import('../src/data/ads/ai-receptionist.mjs');
  const entries = [garagesAd, estateAgentsAd, aiReceptionistAd];

  // Build to a separate outDir so this file and built-site.test.mjs can run
  // their builds in parallel without clobbering each other's dist.
  const outDir = join(root, 'dist-industries');
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
    },
  });

  const html = readFileSync(join(outDir, 'preview', 'index.html'), 'utf8');

  // Process, customer and team sections are on the preview page too.
  const how = sectionHtml(html, 'how');
  for (const step of ['Teardown', 'Build', 'Test', 'Run and improve']) {
    assert.match(how, new RegExp(`\\b${step}\\b`), `the process is missing ${step}`);
  }
  assert.match(html, /What your customer gets/);
  assert.match(html, /What your team sees at 8am/);
  assert.match(html, /Illustrative/);

  // Every trade with an ads entry gets exactly one link in the industries
  // section, pointing at that entry's page with its headline as the text.
  const industries = sectionHtml(html, 'industries');
  for (const entry of entries) {
    const href = `/${entry.slug}/`;
    const links = anchors(industries).filter((anchor) => anchor.href === href);
    assert.equal(links.length, 1, `expected exactly one link to ${href} in the industries section`);
    assert.ok(
      links[0].text.includes(entry.headline),
      `the link to ${href} should use the entry headline, found "${links[0].text}"`,
    );
  }

  // A trade without an entry is not linked. Each industry card is an article;
  // the trades card must contain no anchor at all.
  const cards = [...industries.matchAll(/<article\b[\s\S]*?<\/article>/g)].map((match) => match[0]);
  const tradesCard = cards.find((card) => card.includes('Trades and field service'));
  assert.ok(tradesCard, 'the industries section is missing the trades card');
  assert.equal(anchors(tradesCard).length, 0, 'a trade with no ads entry must not be linked');

  // No other ads page is linked from the industries section. The contact page
  // is allowed because of the "not on the list" call to action.
  const internalHrefs = anchors(industries)
    .map((anchor) => anchor.href)
    .filter((href) => href.startsWith('/'));
  const expected = entries.map((entry) => `/${entry.slug}/`).concat('/contact/');
  assert.deepEqual(
    internalHrefs.sort(),
    expected.sort(),
    'the industries section links to a page with no ads entry',
  );
});
