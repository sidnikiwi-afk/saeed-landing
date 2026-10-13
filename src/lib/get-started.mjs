import { readConsentChoice, CONSENT_ACCEPTED } from './consent.mjs';

export const SIGNUP_HIDDEN_FIELDS = [
  'industry',
  'gclid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'landing_page',
];

function clean(value) {
  return String(value ?? '').trim();
}

export function signupConversionTarget(settings = {}) {
  const conversion = settings.googleAdsConversion || {};
  const id = clean(conversion.id);
  const label = clean(conversion.label);
  if (!id || !label) return '';
  return `${id}/${label}`;
}

// Fires only after a real sign-up, and only when ad consent and both
// conversion values are present. Empty settings load nothing and call nothing.
export function fireSignupConversion(view, settings, cookieString) {
  const sendTo = signupConversionTarget(settings);
  if (!sendTo) return false;
  if (readConsentChoice(cookieString) !== CONSENT_ACCEPTED) return false;
  if (!view || typeof view.gtag !== 'function') return false;
  view.gtag('event', 'conversion', { send_to: sendTo });
  return true;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Names the fields that block a sign-up, in the order the form shows them.
export function signupErrors({ email = '', business = '', industry = '', phone = '' } = {}) {
  const errors = [];
  if (!EMAIL_PATTERN.test(clean(email))) errors.push('email');
  if (clean(business).length < 2) errors.push('business');
  if (!clean(industry)) errors.push('industry');
  if (!clean(phone)) errors.push('phone');
  return errors;
}

// Posts the sign-up and reports the conversion once the endpoint accepts it.
// A failed request throws before anything reaches Google. The conversion
// carries only send_to, never the form contents.
export async function sendSignup({ fetchImpl, endpoint, body, view, settings, cookieString }) {
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Endpoint returned ${res.status}`);
  fireSignupConversion(view, settings, cookieString);
  return res;
}

export function signupBody({
  businessName = '',
  email = '',
  chosenIndustry = '',
  phone = '',
  missedCalls = '',
  hidden = {},
  turnstileToken = '',
  submittedAt = '',
} = {}) {
  const carried = {};
  for (const field of SIGNUP_HIDDEN_FIELDS) {
    carried[field] = clean(hidden[field]);
  }

  const lines = [
    `gclid: ${carried.gclid || '(not given)'}`,
    `Landing page: ${carried.landing_page || '(not given)'}`,
    `Phone: ${clean(phone) || '(not given)'}`,
    `Industry: ${clean(chosenIndustry) || '(not given)'}`,
    `What happens to calls you miss today: ${clean(missedCalls) || '(not given)'}`,
    `Ads industry: ${carried.industry || '(not given)'}`,
    `utm_source: ${carried.utm_source || '(not given)'}`,
    `utm_medium: ${carried.utm_medium || '(not given)'}`,
    `utm_campaign: ${carried.utm_campaign || '(not given)'}`,
    `utm_term: ${carried.utm_term || '(not given)'}`,
    `utm_content: ${carried.utm_content || '(not given)'}`,
  ];

  return {
    name: clean(businessName),
    email: clean(email),
    business: clean(businessName),
    message: ['AI receptionist sign-up from /get-started/', ...lines].join('\n'),
    source: 'brackstonedigital.co.uk/get-started',
    submitted_at: submittedAt,
    'cf-turnstile-response': turnstileToken || '',
    ...carried,
  };
}
