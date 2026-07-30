const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const DASHBOARD_HOST = 'dashboard.brackstonedigital.co.uk';
const SOURCE_NAME = 'ph_property_group_demo_site';
const SOURCE_VERSION = 'ph_website_enquiry_v1';

const rateLimitBuckets = globalThis.__phEnquireRateLimitBuckets || new Map();
globalThis.__phEnquireRateLimitBuckets = rateLimitBuckets;

function clean(value, max = 500) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function configured(env, key) {
  return clean(env && env[key], 3000);
}

function normalizeOrigin(value) {
  const origin = clean(value, 500).replace(/\/$/, '');
  if (!origin) return '';
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:' || parsed.origin !== origin) return '';
    return parsed.origin;
  } catch (_err) {
    return '';
  }
}

function allowedOrigins(env = {}) {
  const configuredOrigins = clean(env.PH_ALLOWED_ORIGINS || '', 2000)
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  return new Set([
    'https://brackstonedigital.co.uk',
    'https://www.brackstonedigital.co.uk',
    'https://premier-housing-demo.pages.dev',
    ...configuredOrigins,
  ]);
}

function requestOrigin(request) {
  return normalizeOrigin(request?.headers?.get('Origin'));
}

function originAllowed(request, env = {}) {
  const origin = requestOrigin(request);
  return Boolean(origin && allowedOrigins(env).has(origin));
}

function corsHeaders(request, env = {}) {
  const origin = requestOrigin(request);
  if (!origin || !allowedOrigins(env).has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(body, init = {}, request, env) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
      ...(init.headers || {}),
    },
  });
}

function clientIp(request) {
  return clean(
    request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0]
      || 'unknown',
    120
  );
}

function isRateLimited(key, now = Date.now()) {
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now - bucket.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

function pruneRateLimit(now = Date.now()) {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.startedAt > RATE_LIMIT_WINDOW_MS) rateLimitBuckets.delete(key);
  }
}

function resetRateLimit() {
  rateLimitBuckets.clear();
}

async function readJson(request) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return { ok: false, status: 415, body: { error: 'Expected JSON' } };
  }

  const contentLengthHeader = request.headers.get('Content-Length') || '';
  if (/^\d+$/.test(contentLengthHeader) && Number(contentLengthHeader) > MAX_BODY_BYTES) {
    return { ok: false, status: 413, body: { error: 'Request too large' } };
  }

  let reader;
  let raw = '';
  try {
    reader = request.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.byteLength;
        if (totalBytes > MAX_BODY_BYTES) {
          await reader.cancel().catch(() => {});
          return { ok: false, status: 413, body: { error: 'Request too large' } };
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    }
  } catch (_err) {
    return { ok: false, status: 400, body: { error: 'Invalid request body' } };
  } finally {
    reader?.releaseLock();
  }

  try {
    const payload = JSON.parse(raw || '{}');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, status: 400, body: { error: 'Invalid JSON object' } };
    }
    return { ok: true, payload };
  } catch (_err) {
    return { ok: false, status: 400, body: { error: 'Invalid JSON' } };
  }
}

function listingUrlAllowed(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return [
      'zoopla.co.uk',
      'brackstonedigital.co.uk',
      'premier-housing-demo.pages.dev',
    ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch (_err) {
    return false;
  }
}

function validate(payload = {}) {
  const data = {
    name: clean(payload.name, 120),
    phone: clean(payload.phone, 80),
    email: clean(payload.email, 160).toLowerCase(),
    message: clean(payload.message, 1200),
    property: clean(payload.property, 220),
    listing_url: clean(payload.listing_url, 500),
    company: clean(payload.company, 120),
    submission_id: clean(payload.submission_id, 120),
  };

  if (data.company) return { ok: true, honeypot: true, data };
  if (data.name.length < 2) return { ok: false, error: 'Name is required' };
  if (!/^[+()0-9\s-]{8,30}$/.test(data.phone)) {
    return { ok: false, error: 'Valid phone is required' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: 'Valid email is required' };
  }
  if (!data.property) return { ok: false, error: 'Property is required' };
  if (!listingUrlAllowed(data.listing_url)) {
    return { ok: false, error: 'Valid listing URL is required' };
  }
  if (data.submission_id && !/^[A-Za-z0-9_-]{8,120}$/.test(data.submission_id)) {
    return { ok: false, error: 'Invalid submission identifier' };
  }
  return { ok: true, honeypot: false, data };
}

function webhookUrl(baseUrl) {
  const raw = clean(baseUrl, 2000);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.hostname !== DASHBOARD_HOST) return '';
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    url.pathname = '/webhook/inbound-email';
    return url.toString();
  } catch (_err) {
    return '';
  }
}

function syntheticZooplaBody(data) {
  const lines = [
    `You have received an enquiry from ${data.name}.`,
    '',
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Property: ${data.property}`,
  ];

  if (data.listing_url) lines.push(`Zoopla listing: ${data.listing_url}`);

  lines.push(
    '',
    'Message:',
    data.message || `I would like to arrange a viewing of ${data.property}.`,
    '',
    'Source: PH Property Group demo website',
    'Enquiry type: viewing request'
  );

  return lines.join('\n');
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function payloadFingerprint(data) {
  return sha256([
    data.name,
    data.phone,
    data.email,
    data.message,
    data.property,
    data.listing_url,
  ].join('\n'));
}

function createServerSubmissionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function intakePayload(data, env, now = new Date()) {
  const fingerprint = await payloadFingerprint(data);
  const submissionId = data.submission_id || createServerSubmissionId();
  const providerMessageId = `ph-form:${submissionId}:${fingerprint.slice(0, 32)}`;
  return {
    provider: 'synthetic',
    provider_message_id: providerMessageId,
    inbound_token: configured(env, 'PH_INBOUND_TOKEN'),
    from: data.email,
    subject: clean(`New enquiry: ${data.property}`, 300),
    text: syntheticZooplaBody(data),
    received_at: now.toISOString(),
    provider_metadata: {
      source: SOURCE_NAME,
      source_version: SOURCE_VERSION,
      listing_url_present: Boolean(data.listing_url),
      payload_fingerprint: fingerprint,
      submission_id_present: Boolean(data.submission_id),
    },
  };
}

function missingEnv(env) {
  const missing = ['INBOUND_EMAIL_WEBHOOK_SECRET', 'PH_INBOUND_TOKEN', 'DASHBOARD_WEBHOOK_URL']
    .filter((key) => !configured(env, key));
  if (configured(env, 'DASHBOARD_WEBHOOK_URL') && !webhookUrl(env.DASHBOARD_WEBHOOK_URL)) {
    missing.push('DASHBOARD_WEBHOOK_URL_INVALID');
  }
  return missing;
}

export async function onRequestOptions({ request, env }) {
  if (!originAllowed(request, env)) {
    return json({ error: 'Origin not allowed' }, { status: 403 }, request, env);
  }
  return new Response(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!originAllowed(request, env)) {
    return json({ error: 'Origin not allowed' }, { status: 403 }, request, env);
  }

  const parsed = await readJson(request);
  if (!parsed.ok) return json(parsed.body, { status: parsed.status }, request, env);

  const validation = validate(parsed.payload);
  if (!validation.ok) return json({ error: validation.error }, { status: 400 }, request, env);
  if (validation.honeypot) return json({ ok: true }, {}, request, env);

  const missing = missingEnv(env);
  if (missing.length) {
    return json({ error: 'Enquiry forwarding is not configured' }, { status: 503 }, request, env);
  }

  pruneRateLimit();
  const rateKey = `${requestOrigin(request)}:${clientIp(request)}`;
  if (isRateLimited(rateKey)) {
    return json(
      { error: 'Too many enquiries. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': '600' } },
      request,
      env
    );
  }

  const forwardUrl = webhookUrl(env.DASHBOARD_WEBHOOK_URL);
  const forwardedPayload = await intakePayload(validation.data, env);
  let response;
  try {
    response = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': env.INBOUND_EMAIL_WEBHOOK_SECRET,
      },
      body: JSON.stringify(forwardedPayload),
    });
  } catch (_err) {
    return json({ error: 'Enquiry could not be sent' }, { status: 502 }, request, env);
  }

  if (!response.ok) {
    return json({ error: 'Enquiry could not be sent' }, { status: 502 }, request, env);
  }
  return json({ ok: true }, {}, request, env);
}

function methodNotAllowed({ request, env }) {
  return json({ error: 'Method not allowed' }, {
    status: 405,
    headers: { Allow: 'POST, OPTIONS' },
  }, request, env);
}

export const onRequestGet = methodNotAllowed;
export const onRequestPut = methodNotAllowed;
export const onRequestPatch = methodNotAllowed;
export const onRequestDelete = methodNotAllowed;

export const __test = {
  allowedOrigins,
  corsHeaders,
  intakePayload,
  listingUrlAllowed,
  missingEnv,
  originAllowed,
  payloadFingerprint,
  resetRateLimit,
  syntheticZooplaBody,
  validate,
  webhookUrl,
};
