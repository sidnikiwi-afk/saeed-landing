// Demo line stays empty until a public number exists. Each ads page shows
// the plan named in pagePlans; /get-started/ picks one from ?industry=.
export const adsSettings = {
  demoLine: '',
  plans: {
    receptionist: {
      name: 'AI receptionist',
      amount: 'From £99 a month',
      minutes: '150 minutes included',
      setup: '£149 one-off setup. We build and test it for you.',
    },
    garage: {
      name: 'Garage edition',
      amount: '£249 a month',
      minutes: '400 minutes included',
      setup: '£299 one-off setup. We build and test it for you.',
    },
  },
  extraMinutes: 'Extra minutes 45p each.',
  // The free trial offer (ADR 0004). The supporting line follows the plan the
  // page sells, so the garages page names the Garage edition.
  trial: {
    button: 'Start your 7-day free trial',
    line: {
      receptionist: 'No card needed. 50 minutes of calls. Then from £99 a month.',
      garage: 'No card needed. 50 minutes of calls. Then £249 a month for the Garage edition.',
    },
    promise: "We'll set up your receptionist within 7 days, usually sooner, and email you when it's live.",
    consent: "We'll email you about your trial. You can unsubscribe at any time.",
  },
  pagePlans: {
    garages: 'garage',
    'estate-agents': 'receptionist',
    'ai-receptionist': 'receptionist',
  },
  // "Get started form submitted" in Google Ads. Fires only after the
  // dashboard accepts a /get-started/ trial request, and only with ad consent.
  googleAdsConversion: { id: 'AW-18471816578', label: 'uX_RCNbj7ZsdEIKbhuhE' },
  sampleCalls: {
    garages: '',
    'estate-agents': '',
    'ai-receptionist': 'https://www.tiktok.com/@brackstonedigital/video/7695742730831514913',
  },
};
