// Demo line stays empty until a public number exists. Each ads page shows
// the plan named in pagePlans; /get-started/ picks one from ?industry=.
export const adsSettings = {
  demoLine: '',
  plans: {
    receptionist: {
      name: 'AI receptionist',
      amount: 'From £99 a month + VAT',
      minutes: '150 minutes included',
      setup: '£149 one-off setup. We build and test it for you.',
    },
    garage: {
      name: 'Garage edition',
      amount: '£249 a month + VAT',
      minutes: '400 minutes included',
      setup: '£299 one-off setup. We build and test it for you.',
    },
  },
  extraMinutes: 'Extra minutes 45p each.',
  pagePlans: {
    garages: 'garage',
    'estate-agents': 'receptionist',
    'ai-receptionist': 'receptionist',
  },
  // "Get started form submitted" in Google Ads. Fires after a successful
  // /get-started/ sign-up, and only with ad consent.
  googleAdsConversion: { id: 'AW-18471816578', label: 'uX_RCNbj7ZsdEIKbhuhE' },
  sampleCalls: {
    garages: '',
    'estate-agents': '',
    'ai-receptionist': 'https://www.tiktok.com/@brackstonedigital/video/7695742730831514913',
  },
};
