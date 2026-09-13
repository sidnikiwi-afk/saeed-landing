import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  __test,
  onRequestGet,
  onRequestOptions,
  onRequestPost,
} from '../functions/api/contact.js';

const endpoint = 'https://premier-housing-demo.pages.dev/api/contact';
const allowedOrigin = 'https://brackstonedigital.co.uk';
const n8nWebhook = 'https://primary-production-64370.up.railway.app/webhook/brackstone-lead';
const env = {
  TURNSTILE_SECRET_KEY: 'test-turnstile-secret-not-real',
};
const validPayload = {
  name: 'Sarah Johnson',
  email: 'sarah@company.co.uk',
  business: 'letting agent',
  message: 'Missed calls and quotes nobody chased.',
  source: 'brackstonedigital.co.uk/contact',
  submitted_at: '2026-09-13T12:00:00.000Z',
  turnstile_token: 'valid-turnstile-token',
};

let originalFetch;

function request(method = 'POST', payload = validPayload, options = {}) {
  const headers = {
    Origin: options.origin === undefined ? allowedOrigin : options.origin,
    'Content-Type': options.contentType || 'application/json',
    'CF-Connecting-IP': options.ip || '203.0.113.10',
  };
  if (options.omitOrigin) delete headers.Origin;
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    init.body = options.rawBody === undefined ? JSON.stringify(payload) : options.rawBody;
  }
  return new Request(endpoint, init);
}

async function responseJson(response) {
  return JSON.parse(await response.text());
}

function mockFetch({ turnstile = { success: true, hostname: 'brackstonedigital.co.uk', action: __test.TURNSTILE_ACTION }, n8nStatus = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ href, init, body });
    if (href.includes('challenges.cloudflare.com/turnstile/v0/siteverify')) {
      return new Response(JSON.stringify(turnstile), { status: 200 });
    }
    return new Response('{"ok":true}', { status: n8nStatus });
  };
  return calls;
}

beforeEach(() => {
  originalFetch = globalThis.fetch;
  __test.resetRateLimit();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  __test.resetRateLimit();
});

test('allows only the expected production origins', () => {
  const origins = __test.allowedOrigins({});
  assert.equal(origins.has('https://brackstonedigital.co.uk'), true);
  assert.equal(origins.has('https://www.brackstonedigital.co.uk'), true);
  assert.equal(origins.has('https://premier-housing-demo.pages.dev'), true);
  assert.equal(origins.has('https://evil.example'), false);
});

test('answers an allowed browser preflight and rejects other origins', async () => {
  const allowed = await onRequestOptions({ request: request('OPTIONS'), env });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), allowedOrigin);

  const rejected = await onRequestOptions({
    request: request('OPTIONS', validPayload, { origin: 'https://evil.example' }),
    env,
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get('Access-Control-Allow-Origin'), null);
});

test('rejects originless and disallowed POSTs before forwarding', async () => {
  const calls = mockFetch();

  const originless = await onRequestPost({
    request: request('POST', validPayload, { omitOrigin: true }),
    env,
  });
  const disallowed = await onRequestPost({
    request: request('POST', validPayload, { origin: 'https://evil.example' }),
    env,
  });

  assert.equal(originless.status, 403);
  assert.equal(disallowed.status, 403);
  assert.equal(calls.length, 0);
});

test('silently accepts the honeypot without verifying Turnstile or forwarding', async () => {
  const calls = mockFetch();

  const response = await onRequestPost({
    request: request('POST', { ...validPayload, website: 'https://spam.example' }),
    env: {},
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), { ok: true });
  assert.equal(calls.length, 0);
});

test('validates required fields and body type', async () => {
  const calls = mockFetch();

  const badEmail = await onRequestPost({
    request: request('POST', { ...validPayload, email: 'not-an-email' }),
    env,
  });
  assert.equal(badEmail.status, 400);

  const missingName = await onRequestPost({
    request: request('POST', { ...validPayload, name: ' ' }),
    env,
  });
  assert.equal(missingName.status, 400);

  const badType = await onRequestPost({
    request: request('POST', validPayload, { contentType: 'text/plain' }),
    env,
  });
  assert.equal(badType.status, 415);
  assert.equal(calls.length, 0);
});

test('rejects an oversized request before forwarding', async () => {
  const calls = mockFetch();

  const response = await onRequestPost({
    request: request('POST', validPayload, {
      rawBody: JSON.stringify({
        ...validPayload,
        message: 'x'.repeat((16 * 1024) + 1),
      }),
    }),
    env,
  });

  assert.equal(response.status, 413);
  assert.equal(calls.length, 0);
});

test('rejects a missing or failed Turnstile token when the secret is configured', async () => {
  const missingCalls = mockFetch();
  const missing = await onRequestPost({
    request: request('POST', { ...validPayload, turnstile_token: '' }),
    env,
  });
  assert.equal(missing.status, 400);
  assert.equal(missingCalls.length, 0);

  const failedCalls = mockFetch({ turnstile: { success: false, 'error-codes': ['invalid-input-response'] } });
  const failed = await onRequestPost({ request: request(), env });
  assert.equal(failed.status, 400);
  assert.deepEqual(await responseJson(failed), {
    error: 'That did not send. Please try again in a moment.',
  });
  assert.equal(failedCalls.length, 1);
  assert.match(failedCalls[0].href, /siteverify/);
});

test('rejects a Turnstile success with the wrong action or hostname', async () => {
  const actionCalls = mockFetch({
    turnstile: { success: true, hostname: 'brackstonedigital.co.uk', action: 'other-form' },
  });
  const wrongAction = await onRequestPost({ request: request(), env });
  assert.equal(wrongAction.status, 400);
  assert.equal(actionCalls.filter((call) => call.href.includes(n8nWebhook)).length, 0);

  const hostCalls = mockFetch({
    turnstile: { success: true, hostname: 'evil.example', action: __test.TURNSTILE_ACTION },
  });
  const wrongHost = await onRequestPost({ request: request(), env });
  assert.equal(wrongHost.status, 400);
  assert.equal(hostCalls.filter((call) => call.href.includes(n8nWebhook)).length, 0);
});

test('accepts the widget field name for the Turnstile token', async () => {
  const calls = mockFetch();
  const { turnstile_token: _ignored, ...withoutAlias } = validPayload;

  const response = await onRequestPost({
    request: request('POST', {
      ...withoutAlias,
      'cf-turnstile-response': 'widget-token',
    }),
    env,
  });

  assert.equal(response.status, 200);
  assert.equal(calls[0].body.response, 'widget-token');
  assert.equal(calls[0].body.secret, env.TURNSTILE_SECRET_KEY);
  assert.equal(calls[0].body.remoteip, '203.0.113.10');
});

test('forwards only the existing n8n fields after a successful Turnstile check', async () => {
  const calls = mockFetch();

  const response = await onRequestPost({
    request: request('POST', {
      ...validPayload,
      website: '',
      recipient: 'attacker@evil.example',
    }),
    env,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), { ok: true });
  assert.equal(calls.length, 2);
  assert.match(calls[0].href, /siteverify/);
  assert.equal(calls[1].href, n8nWebhook);
  assert.deepEqual(calls[1].body, {
    name: 'Sarah Johnson',
    email: 'sarah@company.co.uk',
    business: 'letting agent',
    message: 'Missed calls and quotes nobody chased.',
    source: 'brackstonedigital.co.uk/contact',
    submitted_at: '2026-09-13T12:00:00.000Z',
  });
  assert.equal('website' in calls[1].body, false);
  assert.equal('turnstile_token' in calls[1].body, false);
  assert.equal('cf-turnstile-response' in calls[1].body, false);
  assert.equal('recipient' in calls[1].body, false);
});

test('honeypot-only interim forwards when Turnstile is not configured', async () => {
  const calls = mockFetch();

  const response = await onRequestPost({
    request: request('POST', { ...validPayload, turnstile_token: '' }),
    env: {},
  });

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].href, n8nWebhook);
  assert.equal(calls[0].body.email, 'sarah@company.co.uk');
});

test('fails closed when the n8n webhook host is not allowlisted', async () => {
  const calls = mockFetch();

  const response = await onRequestPost({
    request: request(),
    env: {
      ...env,
      N8N_LEAD_WEBHOOK_URL: 'https://evil.example/webhook/brackstone-lead',
    },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await responseJson(response), {
    error: 'Enquiry forwarding is not configured',
  });
  assert.equal(calls.filter((call) => !call.href.includes('siteverify')).length, 0);
});

test('webhookUrl keeps the live Railway path and rejects http', () => {
  assert.equal(__test.webhookUrl({}), n8nWebhook);
  assert.equal(
    __test.webhookUrl({ N8N_LEAD_WEBHOOK_URL: 'http://primary-production-64370.up.railway.app/webhook/brackstone-lead' }),
    ''
  );
  assert.equal(
    __test.webhookUrl({
      N8N_LEAD_WEBHOOK_URL: 'https://primary-production-64370.up.railway.app/webhook/brackstone-lead-rotated',
    }),
    'https://primary-production-64370.up.railway.app/webhook/brackstone-lead-rotated'
  );
});

test('rate limits repeated real submissions but does not expose configuration', async () => {
  mockFetch();
  for (let index = 0; index < 5; index += 1) {
    const response = await onRequestPost({ request: request(), env });
    assert.equal(response.status, 200);
  }
  const limited = await onRequestPost({ request: request(), env });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '600');
  assert.deepEqual(await responseJson(limited), {
    error: 'Too many enquiries. Please try again shortly.',
  });
});

test('returns a generic error for provider failures and blocks unsupported methods', async () => {
  mockFetch({ n8nStatus: 500 });
  const failed = await onRequestPost({ request: request(), env });
  assert.equal(failed.status, 502);
  assert.deepEqual(await responseJson(failed), { error: 'Enquiry could not be sent' });

  const get = await onRequestGet({ request: request('GET'), env });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('Allow'), 'POST, OPTIONS');
});
