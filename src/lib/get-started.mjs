import { readConsentChoice, CONSENT_ACCEPTED } from './consent.mjs';

// Tracking the page fills from the address bar before it sends a request.
export const TRACKING_FIELDS = [
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

// The Industry select, in the order the form shows it. Each label is also the
// option value, so the request carries the label as chosen.
export const SIGNUP_INDUSTRY_GROUPS = [
  { group: 'Motor', options: ['Garage or MOT centre', 'Car dealership', 'Body shop', 'Tyre and exhaust centre'] },
  { group: 'Property', options: ['Estate or letting agent', 'Property management'] },
  {
    group: 'Trades',
    options: [
      'Plumber', 'Electrician', 'Heating and gas engineer', 'Roofer', 'Builder', 'Locksmith',
      'Cleaning company', 'Gardener or landscaper', 'Pest control', 'Removals',
    ],
  },
  { group: 'Health and care', options: ['Dental practice', 'Physiotherapy', 'Private clinic', 'Vet', 'Optician', 'Care provider'] },
  {
    group: 'Professional services',
    options: ['Solicitor', 'Accountant', 'Insurance broker', 'Mortgage broker', 'Recruitment agency'],
  },
  { group: 'Beauty', options: ['Hair salon', 'Barber', 'Beauty salon'] },
  { group: 'Hospitality', options: ['Restaurant or takeaway', 'Hotel or B&B'] },
  { group: 'Other', options: ['Other'] },
];

export const GARAGE_INDUSTRY = 'Garage or MOT centre';
export const OTHER_INDUSTRY = 'Other';

const INDUSTRY_PRESETS = {
  garages: GARAGE_INDUSTRY,
  'estate-agents': 'Estate or letting agent',
};

// The option ?industry= pre-selects. Anything else leaves "Choose one".
export function industryFromQuery(param) {
  return INDUSTRY_PRESETS[clean(param)] || '';
}

// Only the garage choice shows the Garage edition plan.
export function industryPlanKey(industry) {
  return clean(industry) === GARAGE_INDUSTRY ? 'garage' : 'receptionist';
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

// Names the fields that block a trial request, in the order the form shows
// them. Other needs a description, as the endpoint requires.
export function signupErrors({ email = '', business = '', industry = '', phone = '', otherIndustry = '' } = {}) {
  const errors = [];
  if (clean(business).length < 2) errors.push('business');
  if (!EMAIL_PATTERN.test(clean(email))) errors.push('email');
  if (!clean(phone)) errors.push('phone');
  if (!clean(industry)) errors.push('industry');
  else if (clean(industry) === OTHER_INDUSTRY && !clean(otherIndustry)) errors.push('other');
  return errors;
}

// The dashboard route that checks and records every trial request
// (docs/trial-request-endpoint.md in brackstone-dashboard).
export const TRIAL_REQUEST_ENDPOINT = 'https://dashboard.brackstonedigital.co.uk/api/trial-requests';

// Posts the trial request and reports the conversion only once the dashboard
// has stored it. The conversion carries only send_to, never the form contents.
export const TRIAL_NETWORK_ERROR = {
  accepted: false,
  reason: 'network_error',
  message: 'That did not send. Please check your connection and try again.',
};

// Used when the endpoint answers without a message the visitor can act on.
const TRIAL_UNKNOWN_REFUSAL = 'Something went wrong sending your trial request. Please try again.';

// Never throws: a dropped connection or a reply that is not the endpoint's
// JSON comes back as TRIAL_NETWORK_ERROR. Only a 201 with accepted true
// counts as accepted.
export async function sendTrialRequest({ fetchImpl, endpoint = TRIAL_REQUEST_ENDPOINT, body, view, settings, cookieString }) {
  let res;
  let data;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify(body),
    });
    data = await res.json();
  } catch (_err) {
    return { ...TRIAL_NETWORK_ERROR };
  }
  if (!data || typeof data !== 'object') return { ...TRIAL_NETWORK_ERROR };

  const accepted = res.status === 201 && data.accepted === true;
  const message = clean(data.message);
  const result = accepted
    ? { accepted: true, reason: 'accepted', message }
    : { accepted: false, reason: clean(data.reason) || 'unknown', message: message || TRIAL_UNKNOWN_REFUSAL };
  if (accepted) fireSignupConversion(view, settings, cookieString);
  return result;
}

// The fields the endpoint reads, named as its contract names them.
export function trialRequestBody({
  businessName = '',
  email = '',
  phone = '',
  industry = '',
  otherIndustry = '',
  website = '',
  notes = '',
  hidden = {},
  turnstileToken = '',
} = {}) {
  const body = {
    business_name: clean(businessName),
    email: clean(email),
    phone: clean(phone),
    industry: clean(industry),
    website: clean(website),
    notes: clean(notes),
    captcha_token: clean(turnstileToken),
  };
  if (body.industry.toLowerCase() === OTHER_INDUSTRY.toLowerCase()) {
    body.other_industry = clean(otherIndustry);
  }
  for (const field of TRACKING_FIELDS) body[field] = clean(hidden[field]);
  return body;
}
