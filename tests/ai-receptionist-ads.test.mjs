import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { aiReceptionistAd } = await import('../src/data/ads/ai-receptionist.mjs');
const { signupHref } = await import('../src/lib/ads-page.mjs');

test('the general headline repeats a search that names no trade', () => {
  assert.equal(aiReceptionistAd.searchIntent, 'AI receptionist');
  assert.equal(aiReceptionistAd.slug, 'ai-receptionist');
  assert.equal(aiReceptionistAd.headline, 'AI receptionist');
  assert.ok(aiReceptionistAd.headlineAccent.trim(), 'headline accent is missing');
  assert.equal(aiReceptionistAd.setupOffer, '', 'the general page has no setup offer');

  const text = JSON.stringify(aiReceptionistAd).toLowerCase();
  for (const trade of [
    'garage',
    'mot',
    'estate agent',
    'solicitor',
    'dentist',
    'salon',
    'plumber',
    'electrician',
    'clinic',
  ]) {
    assert.equal(text.includes(trade), false, `general page must not name the trade ${trade}`);
  }

  for (const key of ['intro', 'trialPromise', 'featureCards', 'faq', 'priceIncludes']) {
    assert.ok(aiReceptionistAd[key], `entry is missing ${key}`);
  }
});

test('the trial promise covers calls only, not emails or web forms', () => {
  const promises = aiReceptionistAd.trialPromise.join(' ').toLowerCase();
  assert.match(promises, /\bcalls?\b/, 'trial promise must mention calls');
  assert.match(promises, /\btexts?\b/, 'trial promise must say the caller gets a text');
  assert.match(promises, /right person/, 'trial promise must say the call is passed on');

  // Email and web form handling are not part of the trial.
  const copy = JSON.stringify({ ...aiReceptionistAd, example: undefined }).toLowerCase();
  assert.doesNotMatch(copy, /\bemails?\b|web forms?|\bbooks?\b|\bdiary\b/, 'general page promises more than the trial gives');

  const example = JSON.stringify(aiReceptionistAd.example).toLowerCase();
  assert.doesNotMatch(example, /\bmot\b|\bviewing\b|\bvaluation\b/, 'example call must stay trade free');
});

test('sign-up links carry the general campaign and the page placements', () => {
  assert.equal(aiReceptionistAd.utmCampaign, 'ai-receptionist');
  assert.equal(aiReceptionistAd.vertical, 'general');

  const hero = signupHref({
    industry: 'general',
    campaign: aiReceptionistAd.utmCampaign,
    placement: 'hero',
  });
  assert.equal(
    hero,
    '/get-started/?industry=general&utm_source=google&utm_medium=cpc&utm_campaign=ai-receptionist&utm_content=hero',
  );

  for (const placement of ['header', 'hero', 'price', 'mobile-bar', 'final']) {
    const href = signupHref({
      industry: 'general',
      campaign: aiReceptionistAd.utmCampaign,
      placement,
    });
    const url = new URL(href, 'https://brackstonedigital.co.uk');
    assert.equal(url.pathname, '/get-started/');
    assert.equal(url.searchParams.get('utm_source'), 'google', `${placement} is missing utm_source=google`);
    assert.equal(url.searchParams.get('utm_medium'), 'cpc', `${placement} is missing utm_medium=cpc`);
    assert.equal(url.searchParams.get('utm_campaign'), 'ai-receptionist');
    assert.equal(url.searchParams.get('utm_content'), placement);
    assert.equal(url.searchParams.get('gclid'), null);
  }
});

test('the page renders the ads template with the general entry', () => {
  const page = readFileSync(join(root, 'src', 'pages', 'ai-receptionist', 'index.astro'), 'utf8');
  assert.match(page, /AdsLayout/);
  assert.match(page, /AdsPage/);
  assert.match(page, /ai-receptionist\.mjs/);
  assert.match(page, /aiReceptionistAd/);
});

test('the built ai receptionist page keeps the general feature heading', () => {
  // Build to a separate outDir so this file and the other ads test files can
  // run their builds in parallel without clobbering each other's dist.
  const outDir = join(root, 'dist-ai-receptionist');
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
    },
  });

  const html = readFileSync(join(outDir, 'ai-receptionist', 'index.html'), 'utf8');
  assert.match(html, /Built for UK businesses/, 'general feature eyebrow is missing');
  assert.match(html, /your callers need/, 'general feature heading is missing');
  assert.doesNotMatch(html, /garage caller/, 'general page still shows the garage feature heading');
  assert.match(html, /call you back first thing tomorrow morning/, 'general example callback timing is missing');
  assert.doesNotMatch(html, /this afternoon/i, 'general example promises an afternoon callback after hours');
  assert.doesNotMatch(html, /teardown/i, 'general ads page still says teardown');
  assert.match(html, /From £99 a month/);
  assert.match(html, /150 minutes included/);
  assert.match(html, /£149 one-off setup\. We build and test it for you\./);
  assert.match(html, /Extra minutes 45p each\./);
  assert.doesNotMatch(html, /£249|£299|Garage edition|Workshop mode|lettings systems/);
  assert.match(html, /\/get-started\/\?industry=general/);
  assert.match(html, /utm_source=google/);
  assert.match(html, /utm_medium=cpc/);
  assert.match(html, /utm_campaign=ai-receptionist/);
  assert.match(html, /Illustrative role-play with AI voices, not a real customer call\./);
  const sample = html.match(/<a\b[^>]*href="(https:\/\/www\.tiktok\.com\/@brackstonedigital\/video\/7695742730831514913)"[^>]*>[\s\S]*?Hear it answer a call[\s\S]*?<\/a>/);
  assert.ok(sample, 'general page is missing the sample call link');
  assert.match(sample[0], /target="_blank"/);
  assert.match(sample[0], /rel="noopener noreferrer"/);
  assert.equal((html.match(/Hear it answer a call/g) ?? []).length, 1);
  assert.ok(
    html.indexOf('Hear it answer a call') < html.indexOf('Illustrative role-play with AI voices, not a real customer call.'),
    'the role-play line is not under the sample call button',
  );
});
