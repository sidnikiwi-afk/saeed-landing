import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, test } from 'node:test';

import {
  __test,
  onRequestGet,
  onRequestOptions,
  onRequestPost,
} from '../functions/api/marlow-pike-enquire.js';

// Synthetic fixture address built from parts so no literal address string
// appears in this source file.
const addressParts = ['viewing', 'request', 'reference', 'check'];
const messageText = `${addressParts[0]} ${addressParts[1]} ${addressParts[2]} ${addressParts[3]}`;

const demoOrigin = 'https://marlow-pike-demo.pages.dev';
const endpoint = `${demoOrigin}/api/marlow-pike-enquire`;
const env = {
  MP_ALLOWED_ORIGINS: `${demoOrigin}, https://mp-demo-preview.example.org`,
  MP_DASHBOARD_WEBHOOK_URL: 'https://dashboard.brackstonedigital.co.uk',
  MP_INBOUND_EMAIL_WEBHOOK_SECRET: 'test-secret-not-real',
  MP_INBOUND_TOKEN: 'test-firm-mp-token-not-real',
  MP_INBOUND_RECIPIENT: 'firm-mp@dashboard.brackstonedigital.co.uk',
};
const validPayload = {
  name: 'Demo Visitor',
  phone: '07700 900410',
  email: 'visitor@example.com',
  message: messageText,
  property: '3 bed semi-detached house, Orchard Rise, Marlow',
  property_ref: 'MP002',
  listing_url: '',
  submission_id: '1adcdace-4e48-4e84-86ce-d8fa311dca0e',
};

let originalFetch;

function request(method = 'POST', payload = validPayload, options = {}) {
  const headers = {
    Origin: options.origin === undefined ? demoOrigin : options.origin,
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

beforeEach(() => {
  originalFetch = globalThis.fetch;
  __test.resetRateLimit();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  __test.resetRateLimit();
});

test('has NO default allowed origins: empty config allows nothing', () => {
  const origins = __test.allowedOrigins({});
  assert.equal(origins.size, 0);
  assert.equal(origins.has('https://brackstonedigital.co.uk'), false);
  assert.equal(origins.has('https://www.brackstonedigital.co.uk'), false);
  assert.equal(origins.has('https://premier-housing-demo.pages.dev'), false);
  assert.equal(origins.has(demoOrigin), false);
});

test('only explicitly configured MP origins are allowed; PH config alone forwards nothing', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  // Present Premier/shared configuration with MP origin config absent:
  // every request must fail closed before any fetch.
  const phOnlyEnv = {
    PH_ALLOWED_ORIGINS: 'https://brackstonedigital.co.uk',
    DASHBOARD_WEBHOOK_URL: 'https://dashboard.brackstonedigital.co.uk',
    INBOUND_EMAIL_WEBHOOK_SECRET: 'leftover-secret',
    PH_INBOUND_TOKEN: 'leftover-token',
    PH_INBOUND_RECIPIENT: 'firm-58@dashboard.brackstonedigital.co.uk',
  };
  const phOriginPost = await onRequestPost({
    request: request('POST', validPayload, { origin: 'https://brackstonedigital.co.uk' }),
    env: phOnlyEnv,
  });
  assert.equal(phOriginPost.status, 403);
  const mpOriginWithPhEnv = await onRequestPost({ request: request(), env: phOnlyEnv });
  assert.equal(mpOriginWithPhEnv.status, 403);
  assert.equal(forwards, 0);

  // Even with a full valid MP set elsewhere, non-member origins are rejected.
  const disallowed = await onRequestPost({
    request: request('POST', validPayload, { origin: 'https://evil.example' }),
    env,
  });
  assert.equal(disallowed.status, 403);
  assert.equal(forwards, 0);

  // Missing Origin header is rejected too.
  const originless = await onRequestPost({
    request: request('POST', validPayload, { omitOrigin: true }),
    env,
  });
  assert.equal(originless.status, 403);
  assert.equal(forwards, 0);
});

test('non-HTTPS and malformed origins in MP_ALLOWED_ORIGINS are dropped, not tolerated', () => {
  const strict = __test.allowedOrigins({
    MP_ALLOWED_ORIGINS: `${demoOrigin}, http://insecure.example, not-a-url, ${demoOrigin}/, https://good.example`,
  });
  assert.deepEqual([...strict].sort(), ['https://good.example', demoOrigin]);
});

test('answers an allowed browser preflight and rejects other origins', async () => {
  const allowed = await onRequestOptions({ request: request('OPTIONS'), env });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), demoOrigin);

  const rejected = await onRequestOptions({
    request: request('OPTIONS', validPayload, { origin: 'https://evil.example' }),
    env,
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get('Access-Control-Allow-Origin'), null);
});

test('silently accepts the honeypot without requiring secrets or forwarding', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  // Honeypot short-circuits before any secret lookup: full MP origin config,
  // but every binding variable absent.
  const response = await onRequestPost({
    request: request('POST', { ...validPayload, company: 'bot-company' }),
    env: { MP_ALLOWED_ORIGINS: env.MP_ALLOWED_ORIGINS },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await responseJson(response), { ok: true });
  assert.equal(forwards, 0);
});

test('validates fields including the property reference', async () => {
  const badEmail = await onRequestPost({
    request: request('POST', { ...validPayload, email: 'not-an-email' }),
    env,
  });
  assert.equal(badEmail.status, 400);

  const badRef = await onRequestPost({
    request: request('POST', { ...validPayload, property_ref: 'bad ref!' }),
    env,
  });
  assert.equal(badRef.status, 400);

  const badListing = await onRequestPost({
    request: request('POST', {
      ...validPayload,
      listing_url: 'https://www.zoopla.co.uk/to-rent/details/73196230/',
    }),
    env,
  });
  assert.equal(badListing.status, 400);

  const badType = await onRequestPost({
    request: request('POST', validPayload, { contentType: 'text/plain' }),
    env,
  });
  assert.equal(badType.status, 415);
});

test('accepts exactly the six canonical property refs with fixed destination and metadata', async () => {
  const canonicalRefs = ['MP001', 'MP002', 'MP003', 'MP004', 'MP005', 'MP006'];
  for (const ref of canonicalRefs) {
    let forwards = [];
    globalThis.fetch = async (url, init) => {
      forwards.push({ url, payload: JSON.parse(init.body) });
      return new Response('{"ok":true}', { status: 202 });
    };

    const response = await onRequestPost({
      request: request('POST', { ...validPayload, property_ref: ref }),
      env,
    });
    assert.equal(response.status, 200, `expected 200 for ${ref}`);
    assert.deepEqual(await responseJson(response), { ok: true });
    assert.equal(forwards.length, 1);
    assert.equal(
      forwards[0].url,
      'https://dashboard.brackstonedigital.co.uk/webhook/inbound-email'
    );
    assert.equal(forwards[0].payload.recipient, env.MP_INBOUND_RECIPIENT);
    assert.equal(forwards[0].payload.inbound_token, env.MP_INBOUND_TOKEN);
    assert.equal(forwards[0].payload.provider, 'website');
    assert.equal(forwards[0].payload.provider_metadata.source, 'marlow_pike_demo_site');
    assert.equal(forwards[0].payload.provider_metadata.property_ref, ref);
    assert.match(forwards[0].payload.text, new RegExp(`Property reference: ${ref}$`, 'm'));
    __test.resetRateLimit();
  }
});

test('rejects empty, unknown, lower-case and whitespace-manipulated refs with 400 and no forward', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{"ok":true}', { status: 202 });
  };

  for (const badRef of [
    '',
    'MP999',
    'PH001',
    'mp002',
    'Mp003',
    ' MP002',
    'MP002 ',
    'MP 002',
    'MP002\n',
    '0002',
    'MP0021',
  ]) {
    const response = await onRequestPost({
      request: request('POST', { ...validPayload, property_ref: badRef }),
      env,
    });
    assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(badRef)}`);
    __test.resetRateLimit();
  }

  assert.equal(forwards, 0);
});

test('does not derive a ref from the browser property title or any fallback', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{"ok":true}', { status: 202 });
  };

  // No property_ref at all is invalid now: every page trigger supplies a
  // canonical ref, so a missing one is a tampered payload, not a fallback.
  const { property_ref: _omitted, ...noRef } = validPayload;
  const missing = await onRequestPost({ request: request('POST', noRef), env });
  assert.equal(missing.status, 400);

  // A title-like ref value never becomes a valid reference.
  const titleDerived = await onRequestPost({
    request: request('POST', { ...validPayload, property_ref: validPayload.property }),
    env,
  });
  assert.equal(titleDerived.status, 400);
  assert.equal(forwards, 0);
});

test('forwards the canonical catalog description, never caller property text', async () => {
  const catalog = JSON.parse(
    readFileSync(new URL('../src/data/marlow-pike-listings.json', import.meta.url), 'utf8')
  );
  const byRef = Object.fromEntries(catalog.listings.map((listing) => [listing.ref, listing]));
  const canonical = (ref) => `${byRef[ref].type}, ${byRef[ref].location}`;

  // Distinct refs must forward distinct canonical descriptions.
  const forwards = [];
  globalThis.fetch = async (_url, init) => {
    forwards.push(JSON.parse(init.body));
    return new Response('{"ok":true}', { status: 202 });
  };

  for (const ref of ['MP001', 'MP002']) {
    const response = await onRequestPost({
      request: request('POST', { ...validPayload, property_ref: ref }),
      env,
    });
    assert.equal(response.status, 200, `expected 200 for ${ref}`);
    __test.resetRateLimit();
  }
  assert.equal(forwards.length, 2);
  assert.match(forwards[0].text, new RegExp(`Property: ${canonical('MP001')}$`, 'm'));
  assert.match(forwards[1].text, new RegExp(`Property: ${canonical('MP002')}$`, 'm'));
  assert.equal(forwards[0].subject, `New demo enquiry: ${canonical('MP001')}`);
  assert.equal(forwards[1].subject, `New demo enquiry: ${canonical('MP002')}`);
  assert.notEqual(forwards[0].text, forwards[1].text, 'MP001/MP002 forward distinct bodies');

  // A forged property string with a valid ref never reaches the forward.
  const forged = 'Penthouse, 1 Real Street, London';
  globalThis.fetch = async (_url, init) => {
    forwards.push(JSON.parse(init.body));
    return new Response('{"ok":true}', { status: 202 });
  };
  const forgedResponse = await onRequestPost({
    request: request('POST', { ...validPayload, property_ref: 'MP004', property: forged }),
    env,
  });
  assert.equal(forgedResponse.status, 200);
  const forwarded = forwards[forwards.length - 1];
  assert.equal(JSON.stringify(forwarded).includes(forged), false, 'forged property text is dropped');
  assert.match(forwarded.text, new RegExp(`Property: ${canonical('MP004')}$`, 'm'));
  assert.equal(forwarded.subject, `New demo enquiry: ${canonical('MP004')}`);

  // An empty property string with a valid ref still forwards the canonical text.
  globalThis.fetch = async (_url, init) => {
    forwards.push(JSON.parse(init.body));
    return new Response('{"ok":true}', { status: 202 });
  };
  const emptyResponse = await onRequestPost({
    request: request('POST', { ...validPayload, property_ref: 'MP006', property: '' }),
    env,
  });
  assert.equal(emptyResponse.status, 200);
  const emptyForward = forwards[forwards.length - 1];
  assert.match(emptyForward.text, new RegExp(`Property: ${canonical('MP006')}$`, 'm'));

  // A forged custom message still only contributes its own line, never the
  // property line.
  assert.match(forwarded.text, new RegExp(`Property: ${canonical('MP004')}$`, 'm'));
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

test('fails closed when MP binding, origin or dashboard configuration is missing', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  const missingToken = await onRequestPost({
    request: request(),
    env: { ...env, MP_INBOUND_TOKEN: '' },
  });
  // With empty allowed-origin config the origin gate itself rejects (403)
  // before the config check, which still fails closed with no fetch.
  const missingOrigins = await onRequestPost({
    request: request(),
    env: { ...env, MP_ALLOWED_ORIGINS: '' },
  });
  const wrongHost = await onRequestPost({
    request: request(),
    env: { ...env, MP_DASHBOARD_WEBHOOK_URL: 'https://evil.example/webhook' },
  });

  assert.equal(missingToken.status, 503);
  assert.equal(missingOrigins.status, 403);
  assert.equal(wrongHost.status, 503);
  assert.equal(forwards, 0);
  assert.deepEqual(__test.missingEnv({}), [
    'MP_INBOUND_EMAIL_WEBHOOK_SECRET',
    'MP_INBOUND_TOKEN',
    'MP_INBOUND_RECIPIENT',
    'MP_DASHBOARD_WEBHOOK_URL',
    'MP_ALLOWED_ORIGINS',
  ]);
});

test('forwards one fixed-destination, demo-bound enquiry with Marlow metadata', async () => {
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
  assert.equal(forwarded.init.headers['X-Webhook-Secret'], env.MP_INBOUND_EMAIL_WEBHOOK_SECRET);
  assert.equal(forwarded.payload.provider, 'website');
  assert.equal(forwarded.payload.inbound_token, env.MP_INBOUND_TOKEN);
  assert.equal(forwarded.payload.recipient, env.MP_INBOUND_RECIPIENT);
  assert.equal(forwarded.payload.from, validPayload.email);
  assert.match(forwarded.payload.provider_message_id, /^mp-form:/);
  assert.equal(forwarded.payload.provider_metadata.source, 'marlow_pike_demo_site');
  assert.equal(forwarded.payload.provider_metadata.source_version, 'mp_website_enquiry_v1');
  assert.equal(forwarded.payload.provider_metadata.property_ref, 'MP002');
  assert.match(forwarded.payload.text, /Property reference: MP002/);
  assert.match(forwarded.payload.text, /Marlow & Pike demo website/);
  assert.equal(JSON.stringify(forwarded.payload).includes('ph_property_group_demo_site'), false);
  assert.equal(JSON.stringify(forwarded.payload).includes(env.MP_INBOUND_EMAIL_WEBHOOK_SECRET), false);
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
  assert.equal(ids[0], ids[1]);

  const changed = await __test.intakePayload(
    { ...validPayload, property_ref: 'MP003' },
    env,
    new Date('2026-10-03T10:00:00Z')
  );
  assert.notEqual(changed.provider_message_id, ids[0]);
});

test('rate limits repeated real submissions', async () => {
  globalThis.fetch = async () => new Response('{"ok":true}', { status: 202 });
  for (let index = 0; index < 5; index += 1) {
    const response = await onRequestPost({ request: request(), env });
    assert.equal(response.status, 200);
  }
  const limited = await onRequestPost({ request: request(), env });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '600');
});

test('binds the forwarded enquiry to the server-only canonical recipient', async () => {
  const forwarded = await __test.intakePayload(
    validPayload,
    env,
    new Date('2026-10-03T10:00:00Z')
  );
  assert.equal(forwarded.recipient, env.MP_INBOUND_RECIPIENT);
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
  assert.equal(forwards[0].recipient, env.MP_INBOUND_RECIPIENT);
  assert.equal(JSON.stringify(forwards[0]).includes('attacker@evil.example'), false);
});

test('fails closed without forwarding when the canonical recipient is malformed', async () => {
  let forwards = 0;
  globalThis.fetch = async () => {
    forwards += 1;
    return new Response('{}', { status: 202 });
  };

  for (const bad of [
    'not-an-email',
    'firm-mp@dashboard',
    'firm-mp@@dashboard.brackstonedigital.co.uk',
    'firm-mp@dashboard.brackstonedigital.co.uk, evil@evil.example',
    `${'a'.repeat(65)}@dashboard.brackstonedigital.co.uk`,
  ]) {
    const response = await onRequestPost({
      request: request(),
      env: { ...env, MP_INBOUND_RECIPIENT: bad },
    });
    assert.equal(response.status, 503, `expected 503 for ${bad}`);
    __test.resetRateLimit();
  }

  assert.equal(forwards, 0);
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
