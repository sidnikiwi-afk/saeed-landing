// Build-time helper for the Marlow & Pike demo's dedicated enquiry phone.
// The number comes only from PUBLIC_MP_DEMO_PHONE. Unset or not a strictly
// valid UK phone format means the site shows "Number not connected" and
// never falls back to any other number.

// Characters: ASCII digits, ordinary spaces, and an optional leading plus.
// No other separators, no doubled spaces.
const PHONE_CHARS_RE = /^\+?[0-9]+(?: [0-9]+)*$/;

// Digit shapes after stripping spaces. Same accepted UK prefix/length
// semantics as before, plus the conventional forms the original grouping
// regex rejected: +44 geographic (2+3+4 or 3+3+3 groups) and 0800/0845
// with a four-digit final group. A leading plus means the +44 country form
// only; a bare 44 without the plus is not a valid UK domestic number.
// The +44 form is the same domestic number with the trunk 0 swapped for
// the country code, so its national part must satisfy the same regex.
const UK_DOMESTIC_DIGITS_RE = /^0(?:1\d{3}\d{6}|1\d{2}\d{7}|2\d{9}|3\d{3}\d{6}|7\d{3}\d{6}|8(?:00|45)\d{6}|8(?:00|45)\d{7})$/;
const UK_COUNTRY_PREFIX = '+44';

export function demoPhone(env = import.meta.env) {
  const raw = String(env.PUBLIC_MP_DEMO_PHONE || '').trim();
  if (!raw) return null;
  if (raw.length > 20) return null;
  if (!PHONE_CHARS_RE.test(raw)) return null;
  const spaced = raw.replaceAll(' ', '');
  let digits = spaced;
  if (spaced.startsWith('+')) {
    if (!spaced.startsWith(UK_COUNTRY_PREFIX)) return null;
    // National part of the +44 form; the trunk 0 is reattached so the
    // domestic regex alone decides validity.
    digits = '0' + spaced.slice(UK_COUNTRY_PREFIX.length);
  }
  return UK_DOMESTIC_DIGITS_RE.test(digits) ? raw : null;
}
