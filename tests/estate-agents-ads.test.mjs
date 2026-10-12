import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('estate agents ads data follows the page contract', async () => {
  const { estateAgentsAd } = await import('../src/data/ads/estate-agents.mjs');

  assert.equal(estateAgentsAd.slug, 'estate-agents');
  assert.equal(estateAgentsAd.utmCampaign, 'estate-agents');
  assert.equal(estateAgentsAd.vertical, 'estate-agent');
  assert.equal(estateAgentsAd.headline.includes('estate agents'), true, 'headline does not repeat the search');

  for (const key of ['intro', 'trialPromise', 'featureCards', 'faq']) {
    assert.ok(estateAgentsAd[key], `estate agents entry is missing ${key}`);
  }
  assert.ok(estateAgentsAd.trialPromise.length > 0, 'trial promise is empty');

  // The trial captures viewing requests and valuation leads and says who to
  // call first. Booking viewings into a diary is only a setup offer.
  const promiseText = [
    estateAgentsAd.intro,
    ...estateAgentsAd.trialPromise,
    ...estateAgentsAd.micro,
    ...estateAgentsAd.strip.map((item) => `${item.title} ${item.text}`),
  ]
    .join(' ')
    .toLowerCase();
  assert.match(promiseText, /viewing/, 'trial promise does not mention viewing requests');
  assert.match(promiseText, /valuation/, 'trial promise does not mention valuation leads');

  const bookingClaims = [estateAgentsAd.intro, ...estateAgentsAd.trialPromise, ...estateAgentsAd.micro].filter(
    (line) => /book(s|ing)?\s+(the\s+)?viewing/i.test(line),
  );
  assert.deepEqual(bookingClaims, [], 'a trial sentence claims to book viewings');
  assert.match(
    String(estateAgentsAd.setupOffer),
    /book(s|ing)?\s+(the\s+)?viewing/i,
    'booking viewings is not offered as a setup option',
  );
});

test('estate agents page builds with the right headline and no trial links', () => {
  // Build to a separate outDir so this file and built-site.test.mjs can run
  // their builds in parallel without clobbering each other's dist.
  const outDir = join(root, 'dist-estate-agents');
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
    },
  });

  const html = readFileSync(join(outDir, 'estate-agents', 'index.html'), 'utf8');

  assert.match(
    html,
    /<h1\b[^>]*>[\s\S]*AI receptionist for estate agents[\s\S]*<\/h1>/i,
    'estate agents headline does not repeat the search',
  );
  assert.doesNotMatch(html, /noindex/i, 'estate agents page must be indexed');

  const hrefs = [];
  const re = /href="(https:\/\/dashboard\.brackstonedigital\.co\.uk\/trial-request[^"]*)"/g;
  const decode = (value) =>
    value
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  for (const match of html.matchAll(re)) hrefs.push(decode(match[1]));
  const markup = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  assert.deepEqual(hrefs, [], 'estate agents page still links to the trial request');
  for (const phrase of ['free trial', 'Start free trial', 'Start a free trial', 'No card needed', 'Try it free']) {
    assert.doesNotMatch(markup, new RegExp(phrase, 'i'), `estate agents page still says "${phrase}"`);
  }

  const anchors = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const hrefMatch = match[1].match(/href\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) continue;
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    anchors.push({ href: decode(hrefMatch[2]), text });
  }
  const contactAnchors = anchors.filter((anchor) => anchor.href === '/contact/');
  assert.ok(
    contactAnchors.some((anchor) => anchor.text === 'Book a teardown'),
    'estate agents header or mobile bar is missing a teardown link',
  );
  assert.ok(
    contactAnchors.filter((anchor) => anchor.text === 'Book a 15-minute teardown').length >= 2,
    'estate agents hero and final sections are missing teardown links',
  );
});
