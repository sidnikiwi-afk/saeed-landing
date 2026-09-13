const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const TURNSTILE_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_ACTION = 'brackstone-contact';
const CANONICAL_SOURCE = 'brackstonedigital.co.uk/contact';
const RESEND_EMAILS = 'https://api.resend.com/emails';
const MAIL_DOMAIN = 'brackstonedigital.co.uk';
const DEFAULT_FROM_EMAIL = `noreply@${MAIL_DOMAIN}`;
const DEFAULT_NOTIFY_TO = `saeed@${MAIL_DOMAIN}`;
const CANONICAL_EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

const rateLimitBuckets = globalThis.__contactLeadRateLimitBuckets || new Map();
globalThis.__contactLeadRateLimitBuckets = rateLimitBuckets;

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
  const configuredOrigins = clean(env.CONTACT_ALLOWED_ORIGINS || '', 2000)
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
    Vary: 'Origin',
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

function submittedAt(value, now = new Date()) {
  const raw = clean(value, 40);
  if (!raw) return now.toISOString();
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return now.toISOString();
  return new Date(parsed).toISOString();
}

function turnstileToken(payload = {}) {
  return clean(
    payload['cf-turnstile-response'] || payload.turnstile_token || payload.turnstileToken,
    2048
  );
}

function validate(payload = {}) {
  const data = {
    name: clean(payload.name, 120),
    email: clean(payload.email, 160).toLowerCase(),
    business: clean(payload.business, 160),
    message: clean(payload.message, 1200),
    website: clean(payload.website, 200),
    turnstile_token: turnstileToken(payload),
    submitted_at: submittedAt(payload.submitted_at),
  };

  if (data.website) return { ok: true, honeypot: true, data };
  if (data.name.length < 2) return { ok: false, error: 'Name is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: 'Valid email is required' };
  }
  return { ok: true, honeypot: false, data };
}

function domainEmail(value, domain = MAIL_DOMAIN) {
  if (typeof value !== 'string') return '';
  if (!/^[\x21-\x7E]+$/.test(value)) return '';
  const raw = value.toLowerCase();
  if (!raw || raw.length > 254) return '';
  if (!CANONICAL_EMAIL_RE.test(raw)) return '';
  const [localPart, host] = raw.split('@');
  if (localPart.length > 64) return '';
  if (host !== domain) return '';
  return raw;
}

function fromEmail(env = {}) {
  const value = env && env.CONTACT_FROM_EMAIL;
  if (value === undefined || value === '') return DEFAULT_FROM_EMAIL;
  return domainEmail(value);
}

function notifyTo(env = {}) {
  const value = env && env.CONTACT_NOTIFY_TO;
  if (value === undefined || value === '') return DEFAULT_NOTIFY_TO;
  return domainEmail(value);
}

function resendApiKey(env = {}) {
  const key = env && env.RESEND_API_KEY;
  if (typeof key !== 'string') return '';
  const raw = key.trim();
  if (!raw || raw.length > 200) return '';
  if (!/^[\x21-\x7E]+$/.test(raw)) return '';
  return raw;
}

function mailConfigured(env = {}) {
  return Boolean(resendApiKey(env) && fromEmail(env) && notifyTo(env));
}

function enquiryEmail(data, env = {}) {
  const from = fromEmail(env);
  const to = notifyTo(env);
  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Business: ${data.business || '(not given)'}`,
    '',
    'What keeps slipping:',
    data.message || '(not given)',
    '',
    `Source: ${CANONICAL_SOURCE}`,
    `Submitted: ${data.submitted_at}`,
  ];
  return {
    from: `Brackstone <${from}>`,
    to: [to],
    reply_to: data.email,
    subject: clean(`New enquiry: ${data.name}`, 200),
    text: lines.join('\n'),
  };
}

function allowedTurnstileHostnames(env = {}) {
  const extra = clean(env.TURNSTILE_ALLOWED_HOSTNAMES || '', 2000)
    .split(',')
    .map((host) => clean(host, 253).toLowerCase())
    .filter(Boolean);
  return new Set([
    'brackstonedigital.co.uk',
    'www.brackstonedigital.co.uk',
    'premier-housing-demo.pages.dev',
    'localhost',
    ...extra,
  ]);
}

function turnstileHostnameAllowed(hostname, env = {}) {
  const host = clean(hostname, 253).toLowerCase();
  if (!host) return true;
  return allowedTurnstileHostnames(env).has(host);
}

async function verifyTurnstile(token, request, env) {
  const secret = configured(env, 'TURNSTILE_SECRET_KEY');
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, skipped: false };

  let result;
  try {
    const response = await fetch(TURNSTILE_SITEVERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: clientIp(request),
      }),
    });
    result = await response.json();
  } catch (_err) {
    return { ok: false, skipped: false };
  }

  if (!result || result.success !== true) return { ok: false, skipped: false };
  if (result.action && result.action !== TURNSTILE_ACTION) return { ok: false, skipped: false };
  if (!turnstileHostnameAllowed(result.hostname, env)) return { ok: false, skipped: false };
  return { ok: true, skipped: false };
}

async function sendEnquiryEmail(data, env) {
  const apiKey = resendApiKey(env);
  const payload = enquiryEmail(data, env);
  return fetch(RESEND_EMAILS, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
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

  const turnstile = await verifyTurnstile(validation.data.turnstile_token, request, env);
  if (!turnstile.ok) {
    return json({ error: 'That did not send. Please try again in a moment.' }, { status: 400 }, request, env);
  }

  if (!mailConfigured(env)) {
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

  let response;
  try {
    response = await sendEnquiryEmail(validation.data, env);
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
  DEFAULT_FROM_EMAIL,
  DEFAULT_NOTIFY_TO,
  RESEND_EMAILS,
  TURNSTILE_ACTION,
  allowedOrigins,
  allowedTurnstileHostnames,
  corsHeaders,
  enquiryEmail,
  fromEmail,
  mailConfigured,
  notifyTo,
  originAllowed,
  resetRateLimit,
  turnstileHostnameAllowed,
  validate,
  verifyTurnstile,
};
