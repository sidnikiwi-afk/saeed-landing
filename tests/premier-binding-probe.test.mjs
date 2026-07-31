import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, test } from 'node:test';

import {
  __test,
  onRequestDelete,
  onRequestGet,
  onRequestHead,
  onRequestOptions,
  onRequestPatch,
  onRequestPost,
  onRequestPut,
} from '../functions/api/enquire/probe.js';

const env = { INBOUND_EMAIL_WEBHOOK_SECRET: 'test-secret-not-real' };

function request(secret, ip = '203.0.113.58') {
  const headers = { 'CF-Connecting-IP': ip };
  if (secret !== undefined) headers['X-Webhook-Secret'] = secret;
  return new Request('https://premier-housing-demo.pages.dev/api/enquire/probe', {
    method: 'POST',
    headers,
  });
}

async function body(response) {
  return JSON.parse(await response.text());
}

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  __test.resetRateLimit();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  __test.resetRateLimit();
});

test('returns only a short fingerprint for the matching secret without forwarding', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  const response = await onRequestPost({ request: request(env.INBOUND_EMAIL_WEBHOOK_SECRET), env });
  assert.equal(response.status, 200);
  const payload = await body(response);
  assert.equal(payload.ok, true);
  assert.match(payload.binding_fingerprint, /^[a-f0-9]{12}$/);
  assert.equal(
    payload.binding_fingerprint,
    createHash('sha256').update(env.INBOUND_EMAIL_WEBHOOK_SECRET).digest('hex').slice(0, 12),
  );
  assert.equal(JSON.stringify(payload).includes(env.INBOUND_EMAIL_WEBHOOK_SECRET), false);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(forwards, 0);
});

test('fails closed for absent, incorrect, and missing configured secrets', async () => {
  for (const options of [
    { request: request(), env },
    { request: request('wrong-secret'), env },
    { request: request('test-secret-not-real'), env: {} },
  ]) {
    const response = await onRequestPost(options);
    assert.equal(response.status, 401);
    assert.deepEqual(await body(response), { error: 'Unauthorized' });
  }
});

test('rejects every supported non-POST method without a fingerprint', async () => {
  for (const [method, handler] of [
    ['GET', onRequestGet],
    ['HEAD', onRequestHead],
    ['OPTIONS', onRequestOptions],
    ['PUT', onRequestPut],
    ['PATCH', onRequestPatch],
    ['DELETE', onRequestDelete],
  ]) {
    const response = await handler({
      request: new Request('https://premier-housing-demo.pages.dev/api/enquire/probe', { method }),
      env,
    });
    assert.equal(response.status, 405);
    assert.deepEqual(await body(response), { error: 'Method not allowed' });
  }
});

test('rate limits repeated attempts without returning a fingerprint', async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await onRequestPost({
      request: request('wrong-secret', '203.0.113.99'),
      env,
    });
    assert.equal(response.status, 401);
  }

  const limited = await onRequestPost({
    request: request(env.INBOUND_EMAIL_WEBHOOK_SECRET, '203.0.113.99'),
    env,
  });
  assert.equal(limited.status, 429);
  assert.deepEqual(await body(limited), { error: 'Too many requests' });
  assert.equal(limited.headers.get('Retry-After'), '600');
});
