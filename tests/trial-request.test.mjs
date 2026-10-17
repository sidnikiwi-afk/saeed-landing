import assert from 'node:assert/strict';
import { test } from 'node:test';

const { adsSettings } = await import('../src/data/ads/settings.mjs');
const {
  TRIAL_REQUEST_ENDPOINT,
  sendTrialRequest,
  trialRequestBody,
} = await import('../src/lib/get-started.mjs');

const LIVE_SEND_TO = 'AW-18471816578/uX_RCNbj7ZsdEIKbhuhE';
const ACCEPTED_MESSAGE = "We've received your trial request. We'll set up your receptionist within 7 days, usually sooner, and email you when it's live.";

// A stand-in for the dashboard endpoint. Each call records the request and
// answers with the given status and body, or throws like a dropped connection.
function endpointHarness({ status = 201, json, text, reject = false } = {}) {
  const requests = [];
  const calls = [];
  const view = { gtag: (...args) => calls.push(args) };
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    if (reject) throw new TypeError('Failed to fetch');
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (json === undefined) throw new SyntaxError(`Unexpected token in ${text}`);
        return json;
      },
    };
  };
  return { requests, calls, view, fetchImpl };
}

const form = {
  businessName: ' Example Garage ',
  email: 'owner@example.co.uk',
  phone: '01274 123456',
  industry: 'Garage or MOT centre',
  website: 'examplegarage.co.uk',
  notes: 'They go to voicemail',
  hidden: {
    gclid: 'click-9',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'garages',
    utm_term: 'mot',
    utm_content: 'hero',
    landing_page: '/get-started/',
  },
  turnstileToken: 'token-1',
};

function send(h, overrides = {}) {
  return sendTrialRequest({
    fetchImpl: h.fetchImpl,
    body: trialRequestBody(form),
    view: h.view,
    settings: adsSettings,
    cookieString: 'brackstone_consent=accepted',
    ...overrides,
  });
}

test('the endpoint is the dashboard trial request route', () => {
  assert.equal(TRIAL_REQUEST_ENDPOINT, 'https://dashboard.brackstonedigital.co.uk/api/trial-requests');
});

test('an accepted request shows the confirmation and fires the conversion once, with no form contents', async () => {
  const h = endpointHarness({ status: 201, json: { accepted: true, reason: 'accepted', message: ACCEPTED_MESSAGE } });
  const result = await send(h);

  assert.deepEqual(result, { accepted: true, reason: 'accepted', message: ACCEPTED_MESSAGE });
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].url, TRIAL_REQUEST_ENDPOINT);
  assert.equal(h.requests[0].init.method, 'POST');
  assert.equal(h.requests[0].init.credentials, 'omit');
  assert.equal(h.requests[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(h.calls, [['event', 'conversion', { send_to: LIVE_SEND_TO }]]);
  const sent = JSON.stringify(h.calls);
  for (const value of ['Example Garage', 'owner@example.co.uk', '01274', 'click-9', 'voicemail', 'token-1']) {
    assert.equal(sent.includes(value), false, `the conversion carried ${value}`);
  }
});

test('a refused request shows the reason the endpoint gives and fires nothing', async () => {
  const refusals = [
    [400, 'missing_phone', 'Please add your phone number.'],
    [400, 'security_check_failed', 'Please complete the security check.'],
    [429, 'email_rate_limited', 'This email has already sent several trial requests today. Please try again tomorrow.'],
    [500, 'server_error', 'Something went wrong sending your trial request. Please try again.'],
  ];
  for (const [status, reason, message] of refusals) {
    const h = endpointHarness({ status, json: { accepted: false, reason, message } });
    assert.deepEqual(await send(h), { accepted: false, reason, message });
    assert.deepEqual(h.calls, [], `${reason} fired a conversion`);
  }
});

test('only a 201 with accepted true counts as accepted', async () => {
  for (const [status, json] of [
    [200, { accepted: true, reason: 'accepted', message: ACCEPTED_MESSAGE }],
    [201, { accepted: 'true', reason: 'accepted', message: ACCEPTED_MESSAGE }],
    [201, { reason: 'accepted' }],
  ]) {
    const h = endpointHarness({ status, json });
    const result = await send(h);
    assert.equal(result.accepted, false, `${status} ${JSON.stringify(json)} counted as accepted`);
    assert.ok(result.message, 'a doubtful answer still gives the visitor a message');
    assert.deepEqual(h.calls, []);
  }
});

test('a network failure or a non-JSON reply gives a try-again message and fires nothing', async () => {
  for (const h of [
    endpointHarness({ reject: true }),
    endpointHarness({ status: 502, text: '<html>Bad gateway</html>' }),
    endpointHarness({ status: 201, text: '<html>Moved</html>' }),
  ]) {
    const result = await send(h);
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'network_error');
    assert.equal(result.message, 'That did not send. Please check your connection and try again.');
    assert.deepEqual(h.calls, []);
  }
});

test('the request carries the ad click ID, tracking tags, landing page and industry in the contract fields', async () => {
  const h = endpointHarness({ status: 201, json: { accepted: true, reason: 'accepted', message: ACCEPTED_MESSAGE } });
  await send(h);
  assert.deepEqual(JSON.parse(h.requests[0].init.body), {
    business_name: 'Example Garage',
    email: 'owner@example.co.uk',
    phone: '01274 123456',
    industry: 'Garage or MOT centre',
    website: 'examplegarage.co.uk',
    notes: 'They go to voicemail',
    captcha_token: 'token-1',
    gclid: 'click-9',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'garages',
    utm_term: 'mot',
    utm_content: 'hero',
    landing_page: '/get-started/',
  });
});

test('the Other answer travels only when Other is chosen', () => {
  const other = trialRequestBody({ ...form, industry: 'Other', otherIndustry: '  Dog groomer ' });
  assert.equal(other.industry, 'Other');
  assert.equal(other.other_industry, 'Dog groomer');

  const garage = trialRequestBody({ ...form, otherIndustry: 'left over from before' });
  assert.equal('other_industry' in garage, false);
});

test('an accepted request without ad consent works the same and sends no conversion', async () => {
  for (const cookie of ['', 'brackstone_consent=declined']) {
    const h = endpointHarness({ status: 201, json: { accepted: true, reason: 'accepted', message: ACCEPTED_MESSAGE } });
    const result = await send(h, { cookieString: cookie });
    assert.equal(result.accepted, true);
    assert.equal(result.message, ACCEPTED_MESSAGE);
    assert.deepEqual(h.calls, [], `consent "${cookie}" fired a conversion`);
  }
});

test('an accepted request with consent but no gtag on the page still confirms', async () => {
  const h = endpointHarness({ status: 201, json: { accepted: true, reason: 'accepted', message: ACCEPTED_MESSAGE } });
  const result = await send(h, { view: {} });
  assert.equal(result.accepted, true);
});
