const FINGERPRINT_LENGTH = 12;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

const rateLimitBuckets = globalThis.__phBindingProbeRateLimitBuckets || new Map();
globalThis.__phBindingProbeRateLimitBuckets = rateLimitBuckets;

function configured(env, key) {
  return typeof env?.[key] === 'string' ? env[key].trim() : '';
}

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(hash);
}

function equal(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function clientIp(request) {
  return String(
    request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0]
      || 'unknown',
  ).trim().slice(0, 120);
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

function resetRateLimit() {
  rateLimitBuckets.clear();
}

function response(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (isRateLimited(clientIp(request))) {
    return response({ error: 'Too many requests' }, 429, { 'Retry-After': '600' });
  }

  const configuredSecret = configured(env, 'INBOUND_EMAIL_WEBHOOK_SECRET');
  const presentedSecret = request.headers.get('X-Webhook-Secret') || '';
  if (!configuredSecret || !presentedSecret) return response({ error: 'Unauthorized' }, 401);

  const [expected, presented] = await Promise.all([digest(configuredSecret), digest(presentedSecret)]);
  if (!equal(expected, presented)) return response({ error: 'Unauthorized' }, 401);

  const fingerprint = Array.from(expected)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, FINGERPRINT_LENGTH);
  return response({ ok: true, binding_fingerprint: fingerprint });
}

export const onRequestGet = () => response({ error: 'Method not allowed' }, 405);
export const onRequestHead = onRequestGet;
export const onRequestOptions = onRequestGet;
export const onRequestPut = onRequestGet;
export const onRequestPatch = onRequestGet;
export const onRequestDelete = onRequestGet;

export const __test = {
  resetRateLimit,
};
