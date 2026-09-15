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
const env = {
  TURNSTILE_SECRET_KEY: 'test-turnstile-secret-not-real',
  RESEND_API_KEY: 're_test_key_not_real',
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

function mockFetch({
  turnstile = { success: true, hostname: 'brackstonedigital.co.uk', action: __test.TURNSTILE_ACTION },
  resendStatus = 200,
} = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    if (/railway\.app|n8n|brackstone-lead/i.test(href)) {
      throw new Error(`n8n must not be called: ${href}`);
    }
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ href, init, body });
    if (href.includes('challenges.cloudflare.com/turnstile/v0/siteverify')) {
      return new Response(JSON.stringify(turnstile), { status: 200 });
    }
    if (href === __test.RESEND_EMAILS) {
      return new Response(JSON.stringify({ id: 'email_test' }), { status: resendStatus });
    }
    throw new Error(`unexpected fetch: ${href}`);
  };
  return calls;
}

function resendCalls(calls) {
  return calls.filter((call) => call.href === __test.RESEND_EMAILS);
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

test('rejects originless and disallowed POSTs before sending', async () => {
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

test('silently accepts the honeypot without verifying Turnstile or sending mail', async () => {
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

test('rejects an oversized request before sending', async () => {
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
  assert.equal(resendCalls(failedCalls).length, 0);
});

test('rejects a Turnstile success with the wrong action or hostname', async () => {
  const actionCalls = mockFetch({
    turnstile: { success: true, hostname: 'brackstonedigital.co.uk', action: 'other-form' },
  });
  const wrongAction = await onRequestPost({ request: request(), env });
  assert.equal(wrongAction.status, 400);
  assert.equal(resendCalls(actionCalls).length, 0);

  const hostCalls = mockFetch({
    turnstile: { success: true, hostname: 'evil.example', action: __test.TURNSTILE_ACTION },
  });
  const wrongHost = await onRequestPost({ request: request(), env });
  assert.equal(wrongHost.status, 400);
  assert.equal(resendCalls(hostCalls).length, 0);
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

test('emails Saeed via Resend after a successful Turnstile check', async () => {
  const calls = mockFetch();

  const response = await onRequestPost({
    request: request('POST', {
      ...validPayload,
      website: '',
      recipient: 'attacker@evil.example',
      phone: '07700900310',
    }),
    env,
  });

  assert.equal(response.status, 200);
  const body = await responseJson(response);
  assert.deepEqual(body, { ok: true });
  assert.equal(calls.length, 2);
  assert.match(calls[0].href, /siteverify/);
  assert.equal(calls[1].href, 'https://api.resend.com/emails');
  assert.equal(calls[1].init.headers.Authorization, `Bearer ${env.RESEND_API_KEY}`);
  assert.deepEqual(calls[1].body, {
    from: 'Brackstone <noreply@brackstonedigital.co.uk>',
    to: ['saeed@brackstonedigital.co.uk'],
    reply_to: 'sarah@company.co.uk',
    subject: 'New enquiry: Sarah Johnson',
    text: [
      'Name: Sarah Johnson',
      'Email: sarah@company.co.uk',
      'Business: letting agent',
      '',
      'What keeps slipping:',
      'Missed calls and quotes nobody chased.',
      '',
      'Source: brackstonedigital.co.uk/contact',
      'Submitted: 2026-09-13T12:00:00.000Z',
    ].join('\n'),
  });
  assert.equal(JSON.stringify(calls[1].body).includes('attacker@evil.example'), false);
  assert.equal(JSON.stringify(calls[1].body).includes('07700900310'), false);
  assert.equal(JSON.stringify(calls[1].body).includes(env.RESEND_API_KEY), false);
  assert.equal(JSON.stringify(body).includes(env.RESEND_API_KEY), false);
});

for (const secret of [undefined, '', '   ']) {
  test(`rejects contact submissions with an unconfigured Turnstile secret (${JSON.stringify(secret)})`, async () => {
    const calls = mockFetch();
    const response = await onRequestPost({
      request: request(),
      env: { RESEND_API_KEY: env.RESEND_API_KEY, TURNSTILE_SECRET_KEY: secret },
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await responseJson(response), {
      error: 'That did not send. Please try again in a moment.',
    });
    assert.equal(calls.length, 0, 'must not call Siteverify or send mail without a secret');
  });
}

test('fails closed when Resend is missing or the mailbox is not on the verified domain', async () => {
  const missingKey = mockFetch();
  const missing = await onRequestPost({
    request: request(),
    env: { TURNSTILE_SECRET_KEY: env.TURNSTILE_SECRET_KEY },
  });
  assert.equal(missing.status, 503);
  assert.deepEqual(await responseJson(missing), {
    error: 'Enquiry forwarding is not configured',
  });
  assert.equal(resendCalls(missingKey).length, 0);

  const badFrom = mockFetch();
  const wrongFrom = await onRequestPost({
    request: request(),
    env: { ...env, CONTACT_FROM_EMAIL: 'noreply@evil.example' },
  });
  assert.equal(wrongFrom.status, 503);
  assert.equal(resendCalls(badFrom).length, 0);

  const badTo = mockFetch();
  const wrongTo = await onRequestPost({
    request: request(),
    env: { ...env, CONTACT_NOTIFY_TO: 'attacker@evil.example' },
  });
  assert.equal(wrongTo.status, 503);
  assert.equal(resendCalls(badTo).length, 0);
});

test('fromEmail and notifyTo default to the verified Brackstone mailboxes', () => {
  assert.equal(__test.fromEmail({}), 'noreply@brackstonedigital.co.uk');
  assert.equal(__test.notifyTo({}), 'saeed@brackstonedigital.co.uk');
  assert.equal(__test.fromEmail({ CONTACT_FROM_EMAIL: 'hello@brackstonedigital.co.uk' }), 'hello@brackstonedigital.co.uk');
  assert.equal(__test.notifyTo({ CONTACT_NOTIFY_TO: 'hello@brackstonedigital.co.uk' }), 'hello@brackstonedigital.co.uk');
  assert.equal(__test.fromEmail({ CONTACT_FROM_EMAIL: 'noreply@evil.example' }), '');
  assert.equal(__test.notifyTo({ CONTACT_NOTIFY_TO: 'not-an-email' }), '');
  assert.equal(__test.mailConfigured({}), false);
  assert.equal(__test.mailConfigured({ RESEND_API_KEY: 're_test_key_not_real' }), true);
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
  mockFetch({ resendStatus: 500 });
  const failed = await onRequestPost({ request: request(), env });
  assert.equal(failed.status, 502);
  assert.deepEqual(await responseJson(failed), { error: 'Enquiry could not be sent' });

  const get = await onRequestGet({ request: request('GET'), env });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('Allow'), 'POST, OPTIONS');
});
