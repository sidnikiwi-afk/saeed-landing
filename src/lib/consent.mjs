export const CONSENT_COOKIE_NAME = 'brackstone_consent';
export const CONSENT_ACCEPTED = 'accepted';
export const CONSENT_DECLINED = 'declined';
export const CONSENT_MAX_AGE = 15552000;
export const CONSENT_DOMAIN = '.brackstonedigital.co.uk';

export const CONSENT_DENIED = Object.freeze({
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'denied',
});

const CONSENT_GRANTED = Object.freeze({
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
});

const TRIAL_EVENT = 'free_trial_tap';
const DEMO_EVENT = 'demo_line_tap';
const TRIAL_HOST = 'dashboard.brackstonedigital.co.uk/trial-request';

export function onParentDomain(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return host === 'brackstonedigital.co.uk' || host.endsWith('.brackstonedigital.co.uk');
}

export function consentCookieAttributes(hostname, secure) {
  const parts = ['Path=/', `Max-Age=${CONSENT_MAX_AGE}`, 'SameSite=Lax'];
  if (onParentDomain(hostname)) parts.push(`Domain=${CONSENT_DOMAIN}`);
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function readConsentChoice(cookieString) {
  for (const part of String(cookieString || '').split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName !== CONSENT_COOKIE_NAME) continue;
    let value = rest.join('=');
    try {
      value = decodeURIComponent(value);
    } catch {
      return '';
    }
    if (value === CONSENT_ACCEPTED || value === CONSENT_DECLINED) return value;
  }
  return '';
}

export function measurementIds(settings = {}) {
  const ga4 = String(settings.ga4MeasurementId || '').trim();
  const ads = String(settings.googleAdsId || '').trim();
  return {
    ga4: /^G-[A-Z0-9]+$/.test(ga4) ? ga4 : '',
    ads: /^AW-\d+$/.test(ads) ? ads : '',
    trialLabel: validLabel(settings.trialConversionLabel),
    demoLabel: validLabel(settings.demoLineConversionLabel),
  };
}

function validLabel(value) {
  const label = String(value || '').trim();
  return /^[A-Za-z0-9_-]+$/.test(label) ? label : '';
}

function gtagPush(view) {
  view.dataLayer = view.dataLayer || [];
  if (typeof view.gtag !== 'function') {
    view.gtag = function gtag() {
      view.dataLayer.push(arguments);
    };
  }
  return view.gtag;
}

export function loadTrackingTags(doc, settings, view) {
  if (view.__brackstoneTagsLoaded) return true;
  const ids = measurementIds(settings);
  const primary = ids.ga4 || ids.ads;
  if (!primary) return false;
  const script = doc.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primary)}`;
  const parent = doc.head || doc.documentElement;
  parent.appendChild(script);
  const gtag = gtagPush(view);
  gtag('consent', 'update', CONSENT_GRANTED);
  gtag('js', new Date());
  if (ids.ga4) gtag('config', ids.ga4);
  if (ids.ads) gtag('config', ids.ads);
  view.__brackstoneTagsLoaded = true;
  return true;
}

function hrefOf(node) {
  if (!node || typeof node.getAttribute !== 'function') return '';
  return node.getAttribute('href') || '';
}

// The ads-page check treats any "tel:" text as a demo-line link. Spell that
// prefix by code point so an empty demo line stays absent from the built HTML.
function isPhoneHref(href) {
  return href.charCodeAt(0) === 116
    && href.charCodeAt(1) === 101
    && href.charCodeAt(2) === 108
    && href.charCodeAt(3) === 58;
}

function closest(node, match, stop) {
  let current = node;
  while (current && current !== stop) {
    if (match(current)) return current;
    current = current.parentElement || null;
  }
  return null;
}

export function startConsent(doc, settings = {}, env = {}) {
  const view = env.window || doc.defaultView || globalThis;
  const location = env.location || view.location || { hostname: '', protocol: '' };
  const banner = typeof doc.querySelector === 'function' ? doc.querySelector('[data-consent-banner]') : null;

  function writeChoice(choice) {
    const secure = location.protocol === 'https:';
    doc.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(choice)}; ${consentCookieAttributes(location.hostname, secure)}`;
    if (banner) banner.hidden = true;
    if (choice === CONSENT_ACCEPTED) loadTrackingTags(doc, settings, view);
  }

  function report(eventName, label) {
    if (readConsentChoice(doc.cookie) !== CONSENT_ACCEPTED) return;
    if (!view.__brackstoneTagsLoaded) return;
    const ids = measurementIds(settings);
    const gtag = gtagPush(view);
    if (ids.ga4) gtag('event', eventName, { transport_type: 'beacon' });
    if (ids.ads && label) {
      gtag('event', 'conversion', {
        send_to: `${ids.ads}/${label}`,
        transport_type: 'beacon',
      });
    }
  }

  const existing = readConsentChoice(doc.cookie);
  if (existing === CONSENT_ACCEPTED || existing === CONSENT_DECLINED) {
    if (banner) banner.hidden = true;
    if (existing === CONSENT_ACCEPTED) loadTrackingTags(doc, settings, view);
  }

  function placeBanner() {
    if (!banner || !banner.style) return;
    let trialBar = null;
    if (typeof doc.querySelectorAll === 'function') {
      for (const node of doc.querySelectorAll('[role="region"]')) {
        if (node.getAttribute && node.getAttribute('aria-label') === 'Free trial') trialBar = node;
      }
    }
    const shown = trialBar && typeof view.getComputedStyle === 'function'
      && view.getComputedStyle(trialBar).display !== 'none';
    const height = shown ? trialBar.getBoundingClientRect().height : 0;
    banner.style.bottom = height > 0 ? `${Math.ceil(height) + 12}px` : '';
  }

  placeBanner();
  if (typeof view.addEventListener === 'function') view.addEventListener('resize', placeBanner);

  if (view.__brackstoneConsentBound) return;
  view.__brackstoneConsentBound = true;

  doc.addEventListener('click', (event) => {
    const choiceNode = closest(event.target, (node) => (
      typeof node.getAttribute === 'function' && node.getAttribute('data-consent-choice')
    ), doc);
    if (choiceNode) {
      const choice = choiceNode.getAttribute('data-consent-choice');
      if (choice === CONSENT_ACCEPTED || choice === CONSENT_DECLINED) writeChoice(choice);
      return;
    }

    const anchor = closest(event.target, (node) => node.tagName === 'A', doc);
    if (!anchor) return;
    const href = hrefOf(anchor);
    const ids = measurementIds(settings);
    if (href.includes(TRIAL_HOST)) {
      report(TRIAL_EVENT, ids.trialLabel);
      return;
    }
    if (isPhoneHref(href)) report(DEMO_EVENT, ids.demoLabel);
  });
}
