import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const publicPages = [
  'index.html',
  'contact/index.html',
  'privacy/index.html',
  'garages/index.html',
  'estate-agents/index.html',
  'ai-receptionist/index.html',
];

test('the spec fixes one consent cookie and the gclid parameter', () => {
  const spec = readFileSync(join(root, 'docs/specs/site-redesign.md'), 'utf8');
  assert.match(spec, /brackstone_consent/);
  assert.match(spec, /`accepted`/);
  assert.match(spec, /`declined`/);
  assert.match(spec, /\.brackstonedigital\.co\.uk/);
  assert.match(spec, /180 days/);
  assert.match(spec, /Max-Age=15552000/);
  assert.match(spec, /Click ID parameter: `gclid`/);
});

test('empty tag IDs load nothing and a choice is remembered without a Google tag', async () => {
  const { trackingSettings } = await import('../src/data/tracking.mjs');
  const { startConsent } = await import('../src/lib/consent.mjs');

  assert.equal(trackingSettings.ga4MeasurementId, '');
  assert.equal(trackingSettings.googleAdsId, '');
  assert.equal(trackingSettings.trialConversionLabel, '');
  assert.equal(trackingSettings.demoLineConversionLabel, '');

  const empty = harness();
  startConsent(empty.doc, trackingSettings, empty.env);
  empty.click('[data-consent-choice="accepted"]');
  assert.equal(empty.scripts.length, 0, 'accept with empty IDs still loaded a tag');
  assert.equal(empty.cookieValue(), 'accepted');
  assert.match(empty.lastCookie, /Domain=\.brackstonedigital\.co\.uk/);
  assert.match(empty.lastCookie, /Max-Age=15552000/);
  assert.match(empty.lastCookie, /Path=\//);
  assert.match(empty.lastCookie, /SameSite=Lax/);
  assert.match(empty.lastCookie, /Secure/);
  empty.click('a[href*="trial-request"]');
  empty.click('a[href^="tel:"]');
  assert.equal(empty.events().some((event) => event.name === 'conversion' || event.name === 'free_trial_tap' || event.name === 'demo_line_tap'), false);

  const declined = harness({ cookie: 'brackstone_consent=declined' });
  startConsent(declined.doc, {
    ga4MeasurementId: 'G-TEST1234',
    googleAdsId: 'AW-123456789',
    trialConversionLabel: 'trialLabel',
    demoLineConversionLabel: 'demoLabel',
  }, declined.env);
  assert.equal(declined.banner.hidden, true, 'a remembered decline still shows the banner');
  assert.equal(declined.scripts.length, 0, 'a remembered decline loaded a tag');

  const waiting = harness();
  startConsent(waiting.doc, {
    ga4MeasurementId: 'G-TEST1234',
    googleAdsId: 'AW-123456789',
    trialConversionLabel: 'trialLabel',
    demoLineConversionLabel: 'demoLabel',
  }, waiting.env);
  assert.equal(waiting.scripts.length, 0, 'a tag loaded before consent');
  waiting.click('a[href*="trial-request"]');
  assert.equal(waiting.events().length, 0, 'a trial tap counted before consent');
  waiting.click('[data-consent-choice="accepted"]');
  assert.equal(waiting.scripts.length, 1);
  assert.match(waiting.scripts[0].src, /googletagmanager\.com\/gtag\/js\?id=G-TEST1234/);
  waiting.click('a[href*="trial-request"]');
  assert.ok(waiting.events().some((event) => event.name === 'free_trial_tap'));
  assert.ok(waiting.events().some((event) => event.sendTo === 'AW-123456789/trialLabel'));
  waiting.click('a[href^="tel:"]');
  assert.ok(waiting.events().some((event) => event.name === 'demo_line_tap'));
  assert.ok(waiting.events().some((event) => event.sendTo === 'AW-123456789/demoLabel'));

  const noDemo = harness({ tel: false });
  startConsent(noDemo.doc, {
    ga4MeasurementId: 'G-TEST1234',
    googleAdsId: 'AW-123456789',
    trialConversionLabel: 'trialLabel',
    demoLineConversionLabel: 'demoLabel',
  }, noDemo.env);
  noDemo.click('[data-consent-choice="accepted"]');
  noDemo.click('a[href*="trial-request"]');
  assert.equal(noDemo.events().some((event) => event.name === 'demo_line_tap'), false);
});

test('ads trial links keep the UTM rules and gain gclid from the landing URL', async () => {
  const { trialHref, applyLandingUtms } = await import('../src/lib/ads-page.mjs');

  const plain = new URL(trialHref({
    campaign: 'garages',
    placement: 'hero',
    vertical: 'garage',
  }));
  assert.equal(plain.searchParams.get('gclid'), null);
  assert.equal(plain.searchParams.get('utm_source'), 'google');
  assert.equal(plain.searchParams.get('utm_medium'), 'cpc');
  assert.equal(plain.searchParams.get('utm_campaign'), 'garages');
  assert.equal(plain.searchParams.get('utm_content'), 'hero');

  const passed = new URL(trialHref({
    campaign: 'garages',
    placement: 'header',
    vertical: 'garage',
    landing: 'https://brackstonedigital.co.uk/garages/?gclid=CjwKtest&utm_source=newsletter&utm_term=mot&utm_medium=',
  }));
  assert.equal(passed.searchParams.get('gclid'), 'CjwKtest');
  assert.equal(passed.searchParams.get('utm_source'), 'newsletter');
  assert.equal(passed.searchParams.get('utm_medium'), 'cpc');
  assert.equal(passed.searchParams.get('utm_campaign'), 'garages');
  assert.equal(passed.searchParams.get('utm_content'), 'header');
  assert.equal(passed.searchParams.get('utm_term'), 'mot');
  assert.equal(passed.searchParams.get('vertical'), 'garage');

  const nodes = ['hero', 'final'].map((placement) => fakeTrial(placement));
  applyLandingUtms({ querySelectorAll: () => nodes }, '?gclid=from-ad&utm_campaign=spring');
  for (const node of nodes) {
    const url = new URL(node.getAttribute('href'));
    assert.equal(url.searchParams.get('gclid'), 'from-ad');
    assert.equal(url.searchParams.get('utm_campaign'), 'spring');
    assert.equal(url.searchParams.get('utm_content'), node.getAttribute('data-trial'));
    assert.equal(url.searchParams.get('utm_source'), 'google');
  }
});

test('built public pages carry the banner and no tracking tag', () => {
  const outDir = join(root, 'dist-consent');
  execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
    },
  });

  for (const rel of publicPages) {
    const html = readFileSync(join(outDir, rel), 'utf8');
    assert.match(html, /data-consent-banner/, `${rel} has no consent banner`);
    assert.match(html, />Accept</, `${rel} has no accept button`);
    assert.match(html, />Decline</, `${rel} has no decline button`);
    assert.match(html, /ad_storage/, `${rel} is missing consent mode`);
    assert.match(html, /ad_storage["']?\s*:\s*["']denied["']/, `${rel} does not deny storage before a choice`);
    assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*googletagmanager\.com/i, `${rel} loads a Google tag before consent`);
    assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*google-analytics\.com/i, `${rel} loads Google Analytics before consent`);
    assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*googleadservices\.com/i, `${rel} loads an ads tag before consent`);
    assert.doesNotMatch(html, /gtag\/js\?id=(?:G-|AW-)/i, `${rel} bakes a tag id into the page`);
  }

  const privacy = readFileSync(join(outDir, 'privacy/index.html'), 'utf8');
  assert.match(privacy, /brackstone_consent/);
  assert.match(privacy, /Google Analytics 4/);
  assert.match(privacy, /Google Ads/);
  assert.match(privacy, /180 days/);

  const premier = readFileSync(join(outDir, 'premier-housing-demo/index.html'), 'utf8');
  assert.doesNotMatch(premier, /data-consent-banner/);

  assert.equal(existsSync(join(outDir, 'preview/index.html')), false, '/preview/ must not exist');

  const garages = readFileSync(join(outDir, 'garages/index.html'), 'utf8');
  assert.doesNotMatch(garages, /gclid=/i, 'gclid must come from the landing URL, not the built HTML');
});

function fakeTrial(placement) {
  const attrs = new Map([
    ['href', 'https://dashboard.brackstonedigital.co.uk/trial-request'],
    ['data-trial', placement],
    ['data-campaign', 'garages'],
    ['data-vertical', 'garage'],
  ]);
  return {
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, value),
  };
}

function harness({ cookie = '', tel = true } = {}) {
  let jar = cookie;
  const state = { lastCookie: '' };
  const scripts = [];
  const listeners = [];
  const dataLayer = [];
  const view = {
    dataLayer,
    location: { hostname: 'brackstonedigital.co.uk', protocol: 'https:', search: '' },
  };
  view.gtag = function gtag() {
    dataLayer.push(arguments);
  };

  const trial = element('A', { href: 'https://dashboard.brackstonedigital.co.uk/trial-request?utm_content=hero' });
  const phone = element('A', { href: 'tel:+441274000000' });
  const accept = element('BUTTON', { 'data-consent-choice': 'accepted' });
  const decline = element('BUTTON', { 'data-consent-choice': 'declined' });
  const banner = element('DIV', { 'data-consent-banner': '' });
  banner.hidden = false;
  banner.children = [accept, decline];
  accept.parentElement = banner;
  decline.parentElement = banner;

  const elements = new Map([
    ['[data-consent-banner]', banner],
    ['[data-consent-choice="accepted"]', accept],
    ['[data-consent-choice="declined"]', decline],
    ['a[href*="trial-request"]', trial],
    ['a[href^="tel:"]', phone],
  ]);

  const doc = {
    get cookie() {
      return jar;
    },
    set cookie(value) {
      state.lastCookie = String(value);
      jar = String(value).split(';')[0];
    },
    querySelector(selector) {
      return elements.get(selector) || null;
    },
    querySelectorAll(selector) {
      if (selector === 'a[href^="tel:"]' && !tel) return [];
      const node = elements.get(selector);
      return node ? [node] : [];
    },
    createElement() {
      return { async: false, src: '' };
    },
    head: {
      appendChild(node) {
        scripts.push(node);
      },
    },
    addEventListener(type, fn) {
      if (type === 'click') listeners.push(fn);
    },
    defaultView: view,
  };

  return {
    doc,
    env: { window: view, location: view.location },
    scripts,
    banner,
    get lastCookie() {
      return state.lastCookie;
    },
    cookieValue() {
      const match = jar.match(/brackstone_consent=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : '';
    },
    events() {
      return dataLayer
        .filter((entry) => entry[0] === 'event')
        .map((entry) => ({
          name: entry[1],
          sendTo: entry[2] && entry[2].send_to,
        }));
    },
    click(selector) {
      const target = elements.get(selector);
      for (const listener of listeners) listener({ target });
    },
  };
}

function element(tagName, attrs) {
  const node = {
    tagName,
    parentElement: null,
    hidden: false,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
  };
  return node;
}
