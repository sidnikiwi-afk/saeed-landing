import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

test('the live settings carry the Google Ads tag and leave GA4 and tap labels empty', async () => {
  const { trackingSettings } = await import('../src/data/tracking.mjs');
  assert.equal(trackingSettings.ga4MeasurementId, '');
  assert.equal(trackingSettings.googleAdsId, 'AW-18471816578');
  assert.equal(trackingSettings.signupTapConversionLabel, '');
  assert.equal(trackingSettings.demoLineConversionLabel, '');
});

test('the Google Ads tag loads only after ad consent, and taps add no conversion', async () => {
  const { trackingSettings } = await import('../src/data/tracking.mjs');
  const { startConsent } = await import('../src/lib/consent.mjs');

  const waiting = harness();
  startConsent(waiting.doc, trackingSettings, waiting.env);
  assert.equal(waiting.scripts.length, 0, 'gtag.js loaded before consent');
  waiting.click('a[data-signup]');
  assert.equal(waiting.dataLayer.length, 0, 'something reached the dataLayer before consent');

  waiting.click('[data-consent-choice="accepted"]');
  assert.equal(waiting.scripts.length, 1);
  assert.equal(waiting.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=AW-18471816578');
  assert.ok(waiting.dataLayer.some((entry) => entry[0] === 'config' && entry[1] === 'AW-18471816578'));
  assert.ok(waiting.dataLayer.some((entry) => entry[0] === 'consent' && entry[1] === 'update'));
  waiting.click('a[data-signup]');
  waiting.click('a[href^="tel:"]');
  assert.equal(waiting.events().some((event) => event.name === 'conversion'), false, 'a tap fired a conversion with an empty label');

  const declined = harness();
  startConsent(declined.doc, trackingSettings, declined.env);
  declined.click('[data-consent-choice="declined"]');
  assert.equal(declined.scripts.length, 0, 'gtag.js loaded after a decline');
  assert.equal(declined.dataLayer.length, 0);

  const remembered = harness({ cookie: 'brackstone_consent=declined' });
  startConsent(remembered.doc, trackingSettings, remembered.env);
  assert.equal(remembered.scripts.length, 0, 'gtag.js loaded after a remembered decline');
});

test('empty tag IDs load nothing and a choice is remembered without a Google tag', async () => {
  const { startConsent } = await import('../src/lib/consent.mjs');
  const emptySettings = {
    ga4MeasurementId: '',
    googleAdsId: '',
    signupTapConversionLabel: '',
    demoLineConversionLabel: '',
  };

  const empty = harness();
  startConsent(empty.doc, emptySettings, empty.env);
  empty.click('[data-consent-choice="accepted"]');
  assert.equal(empty.scripts.length, 0, 'accept with empty IDs still loaded a tag');
  assert.equal(empty.cookieValue(), 'accepted');
  assert.match(empty.lastCookie, /Domain=\.brackstonedigital\.co\.uk/);
  assert.match(empty.lastCookie, /Max-Age=15552000/);
  assert.match(empty.lastCookie, /Path=\//);
  assert.match(empty.lastCookie, /SameSite=Lax/);
  assert.match(empty.lastCookie, /Secure/);
  empty.click('a[data-signup]');
  empty.click('a[href^="tel:"]');
  assert.equal(empty.events().some((event) => event.name === 'conversion' || event.name === 'signup_tap' || event.name === 'demo_line_tap'), false);

  const declined = harness({ cookie: 'brackstone_consent=declined' });
  startConsent(declined.doc, {
    ga4MeasurementId: 'G-TEST1234',
    googleAdsId: 'AW-123456789',
    signupTapConversionLabel: 'signupTapLabel',
    demoLineConversionLabel: 'demoLabel',
  }, declined.env);
  assert.equal(declined.banner.hidden, true, 'a remembered decline still shows the banner');
  assert.equal(declined.scripts.length, 0, 'a remembered decline loaded a tag');

  const waiting = harness();
  startConsent(waiting.doc, {
    ga4MeasurementId: 'G-TEST1234',
    googleAdsId: 'AW-123456789',
    signupTapConversionLabel: 'signupTapLabel',
    demoLineConversionLabel: 'demoLabel',
  }, waiting.env);
  assert.equal(waiting.scripts.length, 0, 'a tag loaded before consent');
  waiting.click('a[data-signup]');
  assert.equal(waiting.events().length, 0, 'a sign-up tap counted before consent');
  waiting.click('[data-consent-choice="accepted"]');
  assert.equal(waiting.scripts.length, 1);
  assert.match(waiting.scripts[0].src, /googletagmanager\.com\/gtag\/js\?id=G-TEST1234/);
  waiting.click('a[data-signup]');
  assert.ok(waiting.events().some((event) => event.name === 'signup_tap'));
  assert.ok(waiting.events().some((event) => event.sendTo === 'AW-123456789/signupTapLabel'));
  waiting.click('a[href^="tel:"]');
  assert.ok(waiting.events().some((event) => event.name === 'demo_line_tap'));
  assert.ok(waiting.events().some((event) => event.sendTo === 'AW-123456789/demoLabel'));

  const noDemo = harness({ tel: false });
  startConsent(noDemo.doc, {
    ga4MeasurementId: 'G-TEST1234',
    googleAdsId: 'AW-123456789',
    signupTapConversionLabel: 'signupTapLabel',
    demoLineConversionLabel: 'demoLabel',
  }, noDemo.env);
  noDemo.click('[data-consent-choice="accepted"]');
  noDemo.click('a[data-signup]');
  assert.equal(noDemo.events().some((event) => event.name === 'demo_line_tap'), false);
});

test('sign-up taps are reported only after consent, and empty labels add no conversion', async () => {
  const { startConsent } = await import('../src/lib/consent.mjs');
  const settings = {
    ga4MeasurementId: 'G-TEST1234',
    googleAdsId: 'AW-123456789',
    signupTapConversionLabel: 'signupTapLabel',
    demoLineConversionLabel: 'demoLabel',
  };

  const before = harness();
  startConsent(before.doc, settings, before.env);
  before.click('a[data-signup]');
  assert.equal(before.events().length, 0, 'a sign-up tap counted before consent');

  const accepted = harness({ cookie: 'brackstone_consent=accepted' });
  startConsent(accepted.doc, settings, accepted.env);
  accepted.click('a[data-signup]');
  assert.ok(accepted.events().some((event) => event.name === 'signup_tap'));
  assert.ok(accepted.events().some((event) => event.sendTo === 'AW-123456789/signupTapLabel'));

  const emptyLabel = harness({ cookie: 'brackstone_consent=accepted' });
  startConsent(emptyLabel.doc, {
    ga4MeasurementId: 'G-TEST1234',
    googleAdsId: 'AW-123456789',
    signupTapConversionLabel: '',
    demoLineConversionLabel: '',
  }, emptyLabel.env);
  emptyLabel.click('a[data-signup]');
  assert.equal(emptyLabel.events().some((event) => event.name === 'conversion'), false);
  assert.equal(emptyLabel.events().some((event) => event.sendTo), false);

  const emptyIds = harness({ cookie: 'brackstone_consent=accepted' });
  startConsent(emptyIds.doc, {
    ga4MeasurementId: '',
    googleAdsId: '',
    signupTapConversionLabel: '',
    demoLineConversionLabel: '',
  }, emptyIds.env);
  emptyIds.click('a[data-signup]');
  assert.equal(emptyIds.events().length, 0, 'empty tag IDs still reported a sign-up tap');
});

test('the consent banner lifts above the mobile sign-up bar', async () => {
  const { startConsent } = await import('../src/lib/consent.mjs');
  const source = readFileSync(join(root, 'src/lib/consent.mjs'), 'utf8');
  assert.doesNotMatch(source, /Free trial/);

  const banner = { hidden: false, style: { bottom: '' } };
  const bar = {
    getAttribute(name) {
      return name === 'data-mobile-cta' ? '' : null;
    },
    getBoundingClientRect() {
      return { height: 64 };
    },
  };
  const stale = {
    getAttribute(name) {
      return name === 'aria-label' ? 'Free trial' : null;
    },
    getBoundingClientRect() {
      return { height: 20 };
    },
  };
  let barDisplay = 'block';
  const resize = [];
  const view = {
    getComputedStyle(node) {
      return { display: node === bar ? barDisplay : 'block' };
    },
    addEventListener(type, fn) {
      if (type === 'resize') resize.push(fn);
    },
    location: { hostname: 'brackstonedigital.co.uk', protocol: 'https:' },
  };
  const doc = {
    cookie: '',
    querySelector(selector) {
      if (selector === '[data-consent-banner]') return banner;
      if (selector === '[data-mobile-cta]') return bar;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[role="region"]') return [stale];
      return [];
    },
    addEventListener() {},
    createElement() {
      return {};
    },
    head: { appendChild() {} },
  };

  startConsent(doc, {}, { window: view, location: view.location });
  assert.equal(banner.style.bottom, '76px');

  barDisplay = 'none';
  for (const fn of resize) fn();
  assert.equal(banner.style.bottom, '');
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

  // The Ads IDs reach the build only through the settings: the consent script
  // bundle carries the tag ID and the /get-started/ form carries the label.
  const signup = readFileSync(join(outDir, 'get-started/index.html'), 'utf8');
  assert.match(signup, /data-conversion-id="AW-18471816578"/);
  assert.match(signup, /data-conversion-label="uX_RCNbj7ZsdEIKbhuhE"/);
  assert.equal(signup.split('uX_RCNbj7ZsdEIKbhuhE').length - 1, 1);
  for (const rel of publicPages) {
    const html = readFileSync(join(outDir, rel), 'utf8');
    assert.doesNotMatch(html, /uX_RCNbj7ZsdEIKbhuhE/, `${rel} carries the sign-up label`);
    assert.doesNotMatch(html, /AW-18471816578/, `${rel} bakes the Ads tag ID into the page`);
  }
  const bundles = readdirSync(join(outDir, '_astro')).filter((name) => name.endsWith('.js'));
  const withTag = bundles.filter((name) => readFileSync(join(outDir, '_astro', name), 'utf8').includes('AW-18471816578'));
  assert.ok(withTag.length > 0 && withTag.every((name) => name.startsWith('ConsentBanner')), `Ads tag ID found in ${withTag.join(', ')}`);

  const garages = readFileSync(join(outDir, 'garages/index.html'), 'utf8');
  assert.doesNotMatch(garages, /gclid=/i, 'gclid must come from the landing URL, not the built HTML');
});

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

  const signup = element('A', { href: '/get-started/?industry=general&utm_content=hero', 'data-signup': '' });
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
    ['a[data-signup]', signup],
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
    dataLayer,
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
