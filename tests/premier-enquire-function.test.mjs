import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  __test,
  onRequestGet,
  onRequestOptions,
  onRequestPost,
} from '../functions/api/enquire.js';

const endpoint = 'https://premier-housing-demo.pages.dev/api/enquire';
const allowedOrigin = 'https://brackstonedigital.co.uk';
const env = {
  DASHBOARD_WEBHOOK_URL: 'https://dashboard.brackstonedigital.co.uk',
  INBOUND_EMAIL_WEBHOOK_SECRET: 'test-secret-not-real',
  PH_INBOUND_TOKEN: 'test-firm-58-token-not-real',
  PH_INBOUND_RECIPIENT: 'firm-58@dashboard.brackstonedigital.co.uk',
};
const validPayload = {
  name: 'Saeed Test',
  phone: '07700 900310',
  email: 'saeed.test@example.com',
  message: 'I would like to arrange a viewing.',
  property: 'Pasture Walk, Bradford BD14',
  listing_url: 'https://www.zoopla.co.uk/to-rent/details/73196230/',
  submission_id: '9adcdace-4e48-4e84-86ce-d8fa311dca0e',
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

function streamedRequest(chunks, options = {}) {
  let index = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index]);
      index += 1;
    },
  });
  return new Request(endpoint, {
    method: 'POST',
    headers: {
      Origin: allowedOrigin,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': options.ip || '203.0.113.10',
    },
    body,
    duplex: 'half',
  });
}

async function responseJson(response) {
  return JSON.parse(await response.text());
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
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

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
  assert.equal(forwards, 0);
});

test('silently accepts the honeypot without requiring secrets or forwarding', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  const response = await onRequestPost({
    request: request('POST', { ...validPayload, company: 'bot-company' }),
    env: {},
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), { ok: true });
  assert.equal(forwards, 0);
});

test('validates required fields, body type and listing host', async () => {
  const badEmail = await onRequestPost({
    request: request('POST', { ...validPayload, email: 'not-an-email' }),
    env,
  });
  assert.equal(badEmail.status, 400);

  const badListing = await onRequestPost({
    request: request('POST', {
      ...validPayload,
      listing_url: 'https://evil.example/listing/1',
    }),
    env,
  });
  assert.equal(badListing.status, 400);

  const badType = await onRequestPost({
    request: request('POST', validPayload, { contentType: 'text/plain' }),
    env,
  });
  assert.equal(badType.status, 415);

  const badSubmissionId = await onRequestPost({
    request: request('POST', { ...validPayload, submission_id: 'bad id!' }),
    env,
  });
  assert.equal(badSubmissionId.status, 400);
});

test('rejects an oversized request before forwarding', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

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
  assert.equal(forwards, 0);
});

test('rejects a streamed request once its accumulated bytes exceed the limit', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  const encoder = new TextEncoder();
  const response = await onRequestPost({
    request: streamedRequest([
      encoder.encode('x'.repeat(8 * 1024)),
      encoder.encode('x'.repeat(8 * 1024)),
      encoder.encode('x'),
    ]),
    env,
  });

  assert.equal(response.status, 413);
  assert.equal(forwards, 0);
});

test('enforces the request limit in UTF-8 bytes for multibyte JSON', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  const rawBody = JSON.stringify({
    ...validPayload,
    message: '£'.repeat(9 * 1024),
  });
  assert.equal(rawBody.length < 16 * 1024, true);
  assert.equal(new TextEncoder().encode(rawBody).byteLength > 16 * 1024, true);

  const response = await onRequestPost({
    request: request('POST', validPayload, { rawBody }),
    env,
  });

  assert.equal(response.status, 413);
  assert.equal(forwards, 0);
});

test('fails closed when firm binding or dashboard configuration is missing', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  const missing = await onRequestPost({
    request: request('POST'),
    env: { ...env, PH_INBOUND_TOKEN: '' },
  });
  const wrongHost = await onRequestPost({
    request: request('POST'),
    env: { ...env, DASHBOARD_WEBHOOK_URL: 'https://evil.example/webhook' },
  });

  assert.equal(missing.status, 503);
  assert.equal(wrongHost.status, 503);
  assert.equal(forwards, 0);
});

test('forwards one fixed-destination, firm-bound synthetic enquiry', async () => {
  const forwards = [];
  globalThis.fetch = async (url, init) => {
    forwards.push({ url, init, payload: JSON.parse(init.body) });
    return new Response('{"ok":true}', { status: 202 });
  };

  const response = await onRequestPost({ request: request(), env });
  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), { ok: true });
  assert.equal(forwards.length, 1);

  const forwarded = forwards[0];
  assert.equal(forwarded.url, 'https://dashboard.brackstonedigital.co.uk/webhook/inbound-email');
  assert.equal(forwarded.init.method, 'POST');
  assert.equal(forwarded.init.headers['X-Webhook-Secret'], env.INBOUND_EMAIL_WEBHOOK_SECRET);
  assert.equal(forwarded.payload.provider, 'synthetic');
  assert.equal(forwarded.payload.inbound_token, env.PH_INBOUND_TOKEN);
  assert.equal(forwarded.payload.recipient, env.PH_INBOUND_RECIPIENT);
  assert.equal(forwarded.payload.from, validPayload.email);
  assert.match(forwarded.payload.provider_message_id, /^ph-form:/);
  assert.equal(forwarded.payload.provider_metadata.source, 'ph_property_group_demo_site');
  assert.equal(forwarded.payload.provider_metadata.source_version, 'ph_website_enquiry_v1');
  assert.match(forwarded.payload.text, /Pasture Walk, Bradford BD14/);
  assert.equal(JSON.stringify(forwarded.payload).includes(env.INBOUND_EMAIL_WEBHOOK_SECRET), false);
});

test('repeated identical submissions produce the same durable provider message id', async () => {
  const ids = [];
  globalThis.fetch = async (_url, init) => {
    ids.push(JSON.parse(init.body).provider_message_id);
    return new Response('{"ok":true}', { status: 202 });
  };

  const first = await onRequestPost({ request: request(), env });
  const second = await onRequestPost({ request: request(), env });

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(ids.length, 2);
  assert.equal(ids[0], ids[1]);

  const changed = await __test.intakePayload(
    { ...validPayload, message: 'A different viewing request.' },
    env,
    new Date('2026-07-30T10:00:00Z')
  );
  assert.notEqual(changed.provider_message_id, ids[0]);
});

test('legacy callers without a submission id do not collapse distinct enquiries', async () => {
  const legacyPayload = { ...validPayload, submission_id: '' };
  const first = await __test.intakePayload(
    legacyPayload,
    env,
    new Date('2026-07-30T10:00:00Z')
  );
  const second = await __test.intakePayload(
    legacyPayload,
    env,
    new Date('2026-07-30T10:00:00Z')
  );

  assert.notEqual(first.provider_message_id, second.provider_message_id);
  assert.equal(first.provider_metadata.submission_id_present, false);
  assert.equal(second.provider_metadata.submission_id_present, false);
});

test('rate limits repeated real submissions but does not expose configuration', async () => {
  globalThis.fetch = async () => new Response('{"ok":true}', { status: 202 });
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

test('binds the forwarded enquiry to the server-only canonical recipient', async () => {
  const forwarded = await __test.intakePayload(
    validPayload,
    env,
    new Date('2026-07-30T10:00:00Z')
  );
  assert.equal(forwarded.recipient, env.PH_INBOUND_RECIPIENT);
});

test('ignores any browser-supplied recipient and never lets it override the binding', async () => {
  const forwards = [];
  globalThis.fetch = async (_url, init) => {
    forwards.push(JSON.parse(init.body));
    return new Response('{"ok":true}', { status: 202 });
  };

  const response = await onRequestPost({
    request: request('POST', {
      ...validPayload,
      recipient: 'attacker@evil.example',
      to: 'attacker@evil.example',
      mail_to: 'attacker@evil.example',
    }),
    env,
  });

  assert.equal(response.status, 200);
  assert.equal(forwards.length, 1);
  assert.equal(forwards[0].recipient, env.PH_INBOUND_RECIPIENT);
  assert.equal(JSON.stringify(forwards[0]).includes('attacker@evil.example'), false);
});

test('fails closed without forwarding when the canonical recipient is missing', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  const response = await onRequestPost({
    request: request('POST'),
    env: { ...env, PH_INBOUND_RECIPIENT: '' },
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await responseJson(response), {
    error: 'Enquiry forwarding is not configured',
  });
  assert.equal(forwards, 0);
});

test('fails closed without forwarding when the canonical recipient is malformed', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  for (const bad of [
    'not-an-email',
    'firm-58@dashboard',
    'firm-58@@dashboard.brackstonedigital.co.uk',
    'firm-58@dashboard.brackstonedigital.co.uk, evil@evil.example',
    'firm 58@dashboard.brackstonedigital.co.uk',
    'firm-58@dashboard.brackstöne.co.uk',
    'K@dashboard.brackstonedigital.co.uk',
    'firm\r-58@dashboard.brackstonedigital.co.uk',
    'firm\u0000-58@dashboard.brackstonedigital.co.uk',
    '\u00a0firm-58@dashboard.brackstonedigital.co.uk\u00a0',
    `${'a'.repeat(65)}@dashboard.brackstonedigital.co.uk`,
    `firm-58@${'a'.repeat(64)}.brackstonedigital.co.uk`,
  ]) {
    const response = await onRequestPost({
      request: request('POST'),
      env: { ...env, PH_INBOUND_RECIPIENT: bad },
    });
    assert.equal(response.status, 503, `expected 503 for ${bad}`);
    assert.deepEqual(await responseJson(response), {
      error: 'Enquiry forwarding is not configured',
    });
    __test.resetRateLimit();
  }

  assert.equal(forwards, 0);
});

test('canonicalRecipient accepts one strict ASCII address and rejects the rest', () => {
  assert.equal(
    __test.canonicalRecipient({ PH_INBOUND_RECIPIENT: 'Firm-58@Dashboard.Brackstonedigital.co.uk' }),
    'firm-58@dashboard.brackstonedigital.co.uk'
  );
  assert.equal(__test.canonicalRecipient({ PH_INBOUND_RECIPIENT: 'K@C.CO' }), 'k@c.co');
  assert.equal(__test.canonicalRecipient({}), '');
  assert.equal(__test.canonicalRecipient({ PH_INBOUND_RECIPIENT: '' }), '');
  assert.equal(__test.canonicalRecipient({ PH_INBOUND_RECIPIENT: 'no-at-symbol' }), '');
  assert.equal(__test.canonicalRecipient({ PH_INBOUND_RECIPIENT: 'a@b' }), '');
  assert.equal(
    __test.canonicalRecipient({ PH_INBOUND_RECIPIENT: 'a@b.co, c@d.co' }),
    ''
  );
  assert.equal(
    __test.canonicalRecipient({ PH_INBOUND_RECIPIENT: 'a b@c.co' }),
    ''
  );
  assert.equal(
    __test.canonicalRecipient({ PH_INBOUND_RECIPIENT: 'unïcode@c.co' }),
    ''
  );
  assert.equal(
    __test.canonicalRecipient({ PH_INBOUND_RECIPIENT: `${'a'.repeat(64)}@c.co` }),
    `${'a'.repeat(64)}@c.co`
  );
  assert.equal(
    __test.canonicalRecipient({ PH_INBOUND_RECIPIENT: `${'a'.repeat(65)}@c.co` }),
    ''
  );
  assert.equal(
    __test.canonicalRecipient({ PH_INBOUND_RECIPIENT: `a@${'b'.repeat(63)}.co` }),
    `a@${'b'.repeat(63)}.co`
  );
  assert.equal(
    __test.canonicalRecipient({ PH_INBOUND_RECIPIENT: `a@${'b'.repeat(64)}.co` }),
    ''
  );
});

test('returns a generic error for provider failures and blocks unsupported methods', async () => {
  globalThis.fetch = async () => new Response('provider detail', { status: 500 });
  const failed = await onRequestPost({ request: request(), env });
  assert.equal(failed.status, 502);
  assert.deepEqual(await responseJson(failed), { error: 'Enquiry could not be sent' });

  const get = await onRequestGet({ request: request('GET'), env });
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('Allow'), 'POST, OPTIONS');
});
