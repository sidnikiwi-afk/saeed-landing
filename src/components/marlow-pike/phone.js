// Build-time helper for the Marlow & Pike demo's dedicated enquiry phone.
// The number comes only from PUBLIC_MP_DEMO_PHONE. Unset or not a strictly
// valid UK phone format means the site shows "Number not connected" and
// never falls back to any other number.

// Strict UK format: optional +44 country form or a 0-leading geographic /
// mobile number, digits with single spaces only. No other separators.
const UK_PHONE_RE = /^(?:\+44\s?\d{4}\s?\d{6}|0\s?1\d{3}\s?\d{6}|0\s?1\d{2}\s?\d{7}|0\s?2\d\s?\d{4}\s?\d{4}|0\s?3\d{3}\s?\d{6}|0\s?7\d{3}\s?\d{6}|0\s?8(?:00|45)\s?\d{3}\s?\d{3}|0\s?8(?:00|45)\s?\d{7})$/;

export function demoPhone(env = import.meta.env) {
  const raw = String(env.PUBLIC_MP_DEMO_PHONE || '').trim();
  if (!raw) return null;
  if (raw.length > 20) return null;
  return UK_PHONE_RE.test(raw) ? raw : null;
}
