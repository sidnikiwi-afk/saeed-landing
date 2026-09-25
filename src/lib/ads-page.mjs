const TRIAL_URL = 'https://dashboard.brackstonedigital.co.uk/trial-request';

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

export function trialHref({ campaign, placement, vertical = '', landing = '' } = {}) {
  const url = new URL(TRIAL_URL);
  const incoming = landingParams(landing);
  const pairs = [
    ...DEFAULTS,
    ['utm_campaign', campaign],
    ['utm_content', placement],
  ];
  for (const [key, value] of pairs) {
    const override = incoming.get(key);
    url.searchParams.set(key, present(override) || value);
  }
  const own = new Set(pairs.map(([key]) => key));
  for (const [key, value] of incoming) {
    if (!key.startsWith('utm_') || own.has(key) || !present(value)) continue;
    url.searchParams.set(key, present(value));
  }
  const verticalValue = present(vertical);
  if (verticalValue) url.searchParams.set('vertical', verticalValue);
  const gclid = present(incoming.get('gclid'));
  if (gclid) url.searchParams.set('gclid', gclid);
  return url.toString();
}

export function callHref(phone) {
  const trimmed = present(phone);
  if (!trimmed) return '';
  const compact = trimmed.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return compact ? `tel:${compact}` : '';
}

export function adsVisibility({ demoLine = '', startingPrice = '' } = {}) {
  const phone = present(demoLine);
  const price = present(startingPrice);
  return {
    showCall: phone.length > 0,
    phone,
    callHref: phone ? callHref(phone) : '',
    showPrice: price.length > 0,
    price,
  };
}

export function applyLandingUtms(doc, landing = '') {
  if (!doc || typeof doc.querySelectorAll !== 'function') return;
  for (const node of doc.querySelectorAll('[data-trial]')) {
    const placement = node.getAttribute('data-trial');
    const campaign = node.getAttribute('data-campaign');
    const vertical = node.getAttribute('data-vertical');
    if (!placement || !campaign) continue;
    node.setAttribute('href', trialHref({ campaign, placement, vertical, landing }));
  }
}
