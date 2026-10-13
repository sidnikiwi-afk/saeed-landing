const DEFAULTS = [
  ['utm_source', 'google'],
  ['utm_medium', 'cpc'],
];

export function landingParams(landing = '') {
  const raw = String(landing ?? '').trim();
  if (!raw) return new URLSearchParams();
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return new URL(raw).searchParams;
  }
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : raw.replace(/^\?/, '');
  return new URLSearchParams(query);
}

function present(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || '';
}

export function callHref(phone) {
  const trimmed = present(phone);
  if (!trimmed) return '';
  const compact = trimmed.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return compact ? `tel:${compact}` : '';
}

export function adsVisibility({ demoLine = '' } = {}) {
  const phone = present(demoLine);
  return {
    showCall: phone.length > 0,
    phone,
    callHref: phone ? callHref(phone) : '',
  };
}

// The plan an ads page or /get-started/ industry sells. Returns null when the
// plan has no price line, so the price block is left out.
export function planFor(settings = {}, key = '') {
  const plan = settings.plans?.[present(key)];
  if (!plan || !present(plan.amount)) return null;
  return { ...plan, extraMinutes: present(settings.extraMinutes) };
}

export function pagePlan(settings = {}, slug = '') {
  return planFor(settings, settings.pagePlans?.[slug] ?? '');
}

export function signupPlanKey(industry = '') {
  return present(industry) === 'garages' ? 'garage' : 'receptionist';
}

const SIGNUP_PATH = '/get-started/';

export function signupIndustry(slug) {
  if (slug === 'garages' || slug === 'estate-agents') return slug;
  return 'general';
}

export function signupHref({ industry = 'general', campaign = '', placement = '', landing = '' } = {}) {
  const params = new URLSearchParams();
  params.set('industry', present(industry) || 'general');
  const incoming = landingParams(landing);
  const pairs = [
    ...DEFAULTS,
    ['utm_campaign', campaign],
    ['utm_content', placement],
  ];
  for (const [key, value] of pairs) {
    const chosen = present(incoming.get(key)) || present(value);
    if (chosen) params.set(key, chosen);
  }
  const own = new Set(pairs.map(([key]) => key));
  for (const [key, value] of incoming) {
    if (!key.startsWith('utm_') || own.has(key) || !present(value)) continue;
    params.set(key, present(value));
  }
  const gclid = present(incoming.get('gclid'));
  if (gclid) params.set('gclid', gclid);
  return `${SIGNUP_PATH}?${params.toString()}`;
}

export function applySignupParams(doc, landing = '') {
  if (!doc || typeof doc.querySelectorAll !== 'function') return;
  for (const node of doc.querySelectorAll('[data-signup]')) {
    const industry = node.getAttribute('data-industry');
    if (!industry) continue;
    node.setAttribute('href', signupHref({
      industry,
      campaign: node.getAttribute('data-campaign') || '',
      placement: node.getAttribute('data-placement') || '',
      landing,
    }));
  }
}

export function sampleCallUrl(sampleCalls = {}, slug = '') {
  return present(sampleCalls?.[slug]);
}
