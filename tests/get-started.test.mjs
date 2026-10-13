import assert from 'node:assert/strict';
import { test } from 'node:test';

const { adsSettings } = await import('../src/data/ads/settings.mjs');
const {
  applySignupParams,
  pagePlan,
  planFor,
  signupPlanKey,
  sampleCallUrl,
  signupHref,
  signupIndustry,
} = await import('../src/lib/ads-page.mjs');
const {
  SIGNUP_HIDDEN_FIELDS,
  fireSignupConversion,
  sendSignup,
  signupBody,
  signupConversionTarget,
  signupErrors,
} = await import('../src/lib/get-started.mjs');

const LIVE_SEND_TO = 'AW-18471816578/uX_RCNbj7ZsdEIKbhuhE';

test('ads settings publish a plan per page and the general sample call', () => {
  assert.deepEqual(adsSettings.plans.receptionist, {
    name: 'AI receptionist',
    amount: 'From £99 a month + VAT',
    minutes: '150 minutes included',
    setup: '£149 one-off setup. We build and test it for you.',
  });
  assert.deepEqual(adsSettings.plans.garage, {
    name: 'Garage edition',
    amount: '£249 a month + VAT',
    minutes: '400 minutes included',
    setup: '£299 one-off setup. We build and test it for you.',
  });
  assert.equal(adsSettings.extraMinutes, 'Extra minutes 45p each.');
  assert.deepEqual(adsSettings.pagePlans, {
    garages: 'garage',
    'estate-agents': 'receptionist',
    'ai-receptionist': 'receptionist',
  });
  assert.deepEqual(adsSettings.googleAdsConversion, {
    id: 'AW-18471816578',
    label: 'uX_RCNbj7ZsdEIKbhuhE',
  });
  assert.equal(adsSettings.sampleCalls.garages, '');
  assert.equal(adsSettings.sampleCalls['estate-agents'], '');
  assert.equal(
    adsSettings.sampleCalls['ai-receptionist'],
    'https://www.tiktok.com/@brackstonedigital/video/7695742730831514913',
  );
});

test('pages and sign-up industries pick the decided plan', () => {
  assert.equal(pagePlan(adsSettings, 'garages').amount, '£249 a month + VAT');
  assert.equal(pagePlan(adsSettings, 'estate-agents').amount, 'From £99 a month + VAT');
  assert.equal(pagePlan(adsSettings, 'ai-receptionist').amount, 'From £99 a month + VAT');
  assert.equal(pagePlan(adsSettings, 'garages').extraMinutes, 'Extra minutes 45p each.');
  assert.equal(pagePlan(adsSettings, 'unknown'), null);
  assert.equal(planFor({ plans: { receptionist: { amount: '  ' } } }, 'receptionist'), null);

  assert.equal(signupPlanKey('garages'), 'garage');
  assert.equal(signupPlanKey(' garages '), 'garage');
  assert.equal(signupPlanKey('estate-agents'), 'receptionist');
  assert.equal(signupPlanKey('general'), 'receptionist');
  assert.equal(signupPlanKey(null), 'receptionist');
});

test('sign-up links use the ads industry and carry through utm and gclid', () => {
  assert.equal(signupIndustry('garages'), 'garages');
  assert.equal(signupIndustry('estate-agents'), 'estate-agents');
  assert.equal(signupIndustry('ai-receptionist'), 'general');

  assert.equal(
    signupHref({ industry: 'garages', campaign: 'garages', placement: 'price' }),
    '/get-started/?industry=garages&utm_source=google&utm_medium=cpc&utm_campaign=garages&utm_content=price',
  );

  const href = signupHref({
    industry: 'estate-agents',
    campaign: 'estate-agents',
    placement: 'hero',
    landing: '?utm_source=newsletter&utm_medium=&utm_campaign=spring&utm_term=mot&utm_content=ad&gclid=click-1&unrelated=no',
  });
  const url = new URL(href, 'https://brackstonedigital.co.uk');
  assert.equal(url.pathname, '/get-started/');
  assert.equal(url.searchParams.get('industry'), 'estate-agents');
  assert.equal(url.searchParams.get('utm_source'), 'newsletter');
  assert.equal(url.searchParams.get('utm_medium'), 'cpc');
  assert.equal(url.searchParams.get('utm_campaign'), 'spring');
  assert.equal(url.searchParams.get('utm_term'), 'mot');
  assert.equal(url.searchParams.get('utm_content'), 'ad');
  assert.equal(url.searchParams.get('gclid'), 'click-1');
  assert.equal(url.searchParams.get('unrelated'), null);

  const attrs = new Map([
    ['href', '/get-started/?industry=general'],
    ['data-signup', ''],
    ['data-industry', 'general'],
    ['data-campaign', 'ai-receptionist'],
    ['data-placement', 'header'],
  ]);
  const node = {
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, value),
  };
  applySignupParams({ querySelectorAll: () => [node] }, '?gclid=abc&utm_source=newsletter&utm_campaign=spring');
  const updated = new URL(attrs.get('href'), 'https://brackstonedigital.co.uk');
  assert.equal(updated.searchParams.get('industry'), 'general');
  assert.equal(updated.searchParams.get('gclid'), 'abc');
  assert.equal(updated.searchParams.get('utm_source'), 'newsletter');
  assert.equal(updated.searchParams.get('utm_medium'), 'cpc');
  assert.equal(updated.searchParams.get('utm_campaign'), 'spring');
  assert.equal(updated.searchParams.get('utm_content'), 'header');
});

test('the sign-up body keeps every hidden field and puts the extra answers in the message', () => {
  const hidden = {
    industry: 'garages',
    gclid: 'click-9',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'garages',
    utm_term: 'mot',
    utm_content: 'hero',
    landing_page: '/get-started/',
  };
  const body = signupBody({
    businessName: 'Hartley Motors',
    email: 'sam@hartley.test',
    chosenIndustry: 'Garage',
    phone: '01274 000000',
    missedCalls: 'They go to voicemail',
    hidden,
    turnstileToken: 'token',
    submittedAt: '2026-10-13T09:00:00.000Z',
  });

  assert.equal(body.name, 'Hartley Motors');
  assert.equal(body.email, 'sam@hartley.test');
  assert.equal(body.business, 'Hartley Motors');
  assert.equal(body['cf-turnstile-response'], 'token');
  for (const field of SIGNUP_HIDDEN_FIELDS) {
    assert.equal(body[field], hidden[field], `submit body is missing ${field}`);
    assert.match(body.message, new RegExp(hidden[field]));
  }
  assert.match(body.message, /^AI receptionist sign-up from \/get-started\/\n/);
  const details = body.message.split('\n').slice(1);
  assert.equal(details[0], 'gclid: click-9');
  assert.equal(details[1], 'Landing page: /get-started/');
  assert.ok(details.indexOf('Phone: 01274 000000') > 1);
  assert.match(body.message, /Garage/);
  assert.match(body.message, /01274 000000/);
  assert.match(body.message, /voicemail/);
});

test('empty conversion settings do not call gtag', () => {
  const calls = [];
  const view = { gtag: (...args) => calls.push(args) };
  const empty = { googleAdsConversion: { id: '', label: '' } };
  assert.equal(signupConversionTarget(empty), '');
  assert.equal(
    fireSignupConversion(view, empty, 'brackstone_consent=accepted'),
    false,
  );
  assert.equal(
    fireSignupConversion(view, { googleAdsConversion: { id: 'AW-1', label: '' } }, 'brackstone_consent=accepted'),
    false,
  );
  assert.deepEqual(calls, []);
});

test('a conversion fires only after ad consent when both values are set', () => {
  const calls = [];
  const view = { gtag: (...args) => calls.push(args) };
  const settings = { googleAdsConversion: { id: 'AW-9', label: 'signup' } };
  assert.equal(fireSignupConversion(view, settings, 'brackstone_consent=declined'), false);
  assert.equal(fireSignupConversion(view, settings, ''), false);
  assert.deepEqual(calls, []);
  assert.equal(fireSignupConversion(view, settings, 'brackstone_consent=accepted'), true);
  assert.deepEqual(calls, [['event', 'conversion', { send_to: 'AW-9/signup' }]]);
});

test('the live conversion targets the Get started form submitted action', () => {
  assert.equal(signupConversionTarget(adsSettings), LIVE_SEND_TO);
});

function signupHarness(status, { reject = false } = {}) {
  const calls = [];
  const requests = [];
  const view = { gtag: (...args) => calls.push(args) };
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    if (reject) throw new TypeError('Failed to fetch');
    return { ok: status >= 200 && status < 300, status };
  };
  return { calls, requests, view, fetchImpl };
}

const formBody = signupBody({
  businessName: 'Example Motors',
  email: 'owner@example.co.uk',
  chosenIndustry: 'Garage',
  phone: '01274 000000',
  missedCalls: 'They go to voicemail',
  hidden: { gclid: 'click-9', landing_page: '/get-started/' },
  turnstileToken: 'token',
});

test('a successful sign-up fires the conversion once, with no form contents', async () => {
  const h = signupHarness(200);
  await sendSignup({
    fetchImpl: h.fetchImpl,
    endpoint: 'https://example.test/api/contact',
    body: formBody,
    view: h.view,
    settings: adsSettings,
    cookieString: 'brackstone_consent=accepted',
  });
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.calls, [['event', 'conversion', { send_to: LIVE_SEND_TO }]]);
  const sent = JSON.stringify(h.calls);
  for (const value of ['Example Motors', 'owner@example.co.uk', '01274', 'click-9', 'voicemail', 'token']) {
    assert.equal(sent.includes(value), false, `the conversion carried ${value}`);
  }
});

test('a failed sign-up never fires the conversion', async () => {
  for (const status of [400, 403, 500, 502]) {
    const h = signupHarness(status);
    await assert.rejects(sendSignup({
      fetchImpl: h.fetchImpl,
      endpoint: 'https://example.test/api/contact',
      body: formBody,
      view: h.view,
      settings: adsSettings,
      cookieString: 'brackstone_consent=accepted',
    }));
    assert.deepEqual(h.calls, [], `status ${status} fired a conversion`);
  }

  const offline = signupHarness(0, { reject: true });
  await assert.rejects(sendSignup({
    fetchImpl: offline.fetchImpl,
    endpoint: 'https://example.test/api/contact',
    body: formBody,
    view: offline.view,
    settings: adsSettings,
    cookieString: 'brackstone_consent=accepted',
  }));
  assert.deepEqual(offline.calls, []);
});

test('a successful sign-up without ad consent sends no conversion', async () => {
  for (const cookie of ['', 'brackstone_consent=declined']) {
    const h = signupHarness(200);
    await sendSignup({
      fetchImpl: h.fetchImpl,
      endpoint: 'https://example.test/api/contact',
      body: formBody,
      view: h.view,
      settings: adsSettings,
      cookieString: cookie,
    });
    assert.deepEqual(h.calls, []);
  }
});

test('an invalid sign-up is stopped before it is sent', async () => {
  const valid = { email: 'owner@example.co.uk', business: 'Example Motors', industry: 'Garage', phone: '01274 000000' };
  assert.deepEqual(signupErrors(valid), []);
  assert.deepEqual(signupErrors({ ...valid, email: 'not-an-email' }), ['email']);
  assert.deepEqual(signupErrors({ ...valid, business: 'A' }), ['business']);
  assert.deepEqual(signupErrors({ ...valid, industry: '' }), ['industry']);
  assert.deepEqual(signupErrors({ ...valid, phone: '  ' }), ['phone']);
  assert.deepEqual(signupErrors({}), ['email', 'business', 'industry', 'phone']);

  // The page returns on any error before sendSignup, which is the only path
  // that reaches gtag.
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/get-started.astro', import.meta.url), 'utf8');
  const script = page.slice(page.indexOf('<script>'));
  const check = script.indexOf('signupErrors({');
  const stop = script.indexOf('if (missingBusiness || badEmail || missingIndustry || missingPhone) {');
  const send = script.indexOf('await sendSignup({');
  assert.ok(check > 0 && stop > check && send > stop, 'sendSignup must come after the validation return');
  assert.doesNotMatch(script, /fireSignupConversion|gtag\(/, 'the page must not report a conversion outside sendSignup');
});

test('an empty sample call renders nothing', () => {
  for (const slug of ['garages', 'estate-agents']) {
    assert.equal(sampleCallUrl(adsSettings.sampleCalls, slug), '');
    const href = sampleCallUrl(adsSettings.sampleCalls, slug);
    const markup = href ? `<a href="${href}">Hear it answer a call</a>` : '';
    assert.equal(markup, '');
  }
  assert.equal(sampleCallUrl({ garages: '   ' }, 'garages'), '');
});

test('the general sample call is the TikTok video and opens as a link', () => {
  const href = sampleCallUrl(adsSettings.sampleCalls, 'ai-receptionist');
  assert.equal(href, 'https://www.tiktok.com/@brackstonedigital/video/7695742730831514913');
  assert.match(href, /^https:\/\//);
});
