import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { aiReceptionistAd } = await import('../src/data/ads/ai-receptionist.mjs');
const { trialHref } = await import('../src/lib/ads-page.mjs');

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

test('the trial promise covers calls, emails and web forms only', () => {
  const promises = aiReceptionistAd.trialPromise.join(' ').toLowerCase();
  assert.match(promises, /\bcalls?\b/, 'trial promise must mention calls');
  assert.match(promises, /\bemails?\b/, 'trial promise must mention emails');
  assert.match(promises, /\bforms?\b/, 'trial promise must mention web forms');

  const example = JSON.stringify(aiReceptionistAd.example).toLowerCase();
  assert.doesNotMatch(example, /\bmot\b|\bviewing\b|\bvaluation\b/, 'example call must stay trade free');
});

test('trial links carry the general campaign, vertical and the same placements as garages', () => {
  assert.equal(aiReceptionistAd.utmCampaign, 'ai-receptionist');
  assert.equal(aiReceptionistAd.vertical, 'general');

  const hero = trialHref({
    campaign: aiReceptionistAd.utmCampaign,
    placement: 'hero',
    vertical: aiReceptionistAd.vertical,
  });
  assert.equal(
    hero,
    'https://dashboard.brackstonedigital.co.uk/trial-request'
      + '?utm_source=google&utm_medium=cpc&utm_campaign=ai-receptionist&utm_content=hero&vertical=general',
  );

  for (const placement of ['header', 'hero', 'pricing', 'final', 'mobile-bar']) {
    const href = trialHref({
      campaign: aiReceptionistAd.utmCampaign,
      placement,
      vertical: aiReceptionistAd.vertical,
    });
    const url = new URL(href);
    assert.equal(`${url.origin}${url.pathname}`, 'https://dashboard.brackstonedigital.co.uk/trial-request');
    assert.equal(url.searchParams.get('utm_source'), 'google', `${placement} is missing utm_source=google`);
    assert.equal(url.searchParams.get('utm_medium'), 'cpc', `${placement} is missing utm_medium=cpc`);
    assert.equal(url.searchParams.get('utm_campaign'), 'ai-receptionist');
    assert.equal(url.searchParams.get('utm_content'), placement);
    assert.equal(url.searchParams.get('vertical'), 'general');
  }
});

test('the page renders the ads template with the general entry', () => {
  const page = readFileSync(join(root, 'src', 'pages', 'ai-receptionist', 'index.astro'), 'utf8');
  assert.match(page, /AdsLayout/);
  assert.match(page, /AdsPage/);
  assert.match(page, /ai-receptionist\.mjs/);
  assert.match(page, /aiReceptionistAd/);
});
