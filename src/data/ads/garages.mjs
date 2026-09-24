export const garagesAd = {
  searchIntent: 'AI receptionist for garages',
  slug: 'garages',
  headline: 'AI receptionist for garages',
  headlineAccent: 'Every call answered.',
  description:
    'An AI receptionist for UK garages. It answers the call, books MOTs and services, and texts the customer to confirm. Free trial, no card needed.',
  eyebrow: 'For UK garages and MOT centres',
  intro:
    'It picks up while you are under a car, books the MOT or service into the diary, and texts the customer to confirm. It answers during the day, in the evening, and at the weekend.',
  trialPromise: [
    'Books MOTs, services and repairs on the call',
    'Looks up the vehicle and MOT date from the reg',
    'Flags breakdowns and urgent jobs straight to you',
  ],
  micro: ['No card needed', 'UK phone number', 'Set up for you'],
  example: {
    status: 'Incoming call at 18:52',
    title: 'Garage booking line',
    lines: [
      { from: 'ai', text: 'Hi, you are through to the garage. How can I help?' },
      { from: 'caller', text: 'My MOT is due next week, and it needs a service.' },
      { from: 'ai', text: 'No problem. What is the reg?' },
      { from: 'caller', text: 'It is the Focus, you have had it before. James Hartley.' },
      { from: 'ai', text: 'Thanks James. Found it, MOT due on the 3rd. Thursday at 9 is free. Book it?' },
      { from: 'caller', text: 'Perfect, yes please.' },
      { from: 'ai', text: 'Booked. I will text you a confirmation now.' },
    ],
    booking: [
      { label: 'Customer', value: 'James Hartley' },
      { label: 'Vehicle', value: '2018 Ford Focus' },
      { label: 'Job', value: 'MOT and service' },
      { label: 'Booked', value: 'Thu 09:00' },
    ],
  },
  strip: [
    { title: 'First ring', text: 'Every call picked up' },
    { title: 'Out of hours', text: 'Evenings and weekends' },
    { title: 'Books the slot', text: 'Not just a message' },
    { title: 'Texts to confirm', text: 'With an easy way to change' },
  ],
  problem: {
    heading: 'Every missed call is a booking for the garage down the road.',
    text: 'You cannot answer the phone with your hands in an engine. Most callers will not leave a voicemail. They ring the next garage on Google.',
    missed: [
      { title: 'MOT booking', when: '08:40, while the first car was on the ramp' },
      { title: 'Service quote', when: '12:15, lunch rush at the counter' },
      { title: 'Breakdown, will not start', when: '17:55, closing up' },
      { title: 'Tyres and tracking', when: '20:30, after hours' },
    ],
  },
  howItWorks: {
    heading: 'Set up for you. No new software to learn.',
    steps: [
      {
        title: 'We set it up for you',
        text: 'Your services, the prices you are happy to share, opening hours, and how you like bookings taken.',
      },
      {
        title: 'It answers and books',
        text: 'Calls are answered on the first ring. Bookings go in the diary and the customer gets a text.',
      },
      {
        title: 'You see every call',
        text: 'Recordings, transcripts and summaries sit in the Dashboard. Urgent calls are flagged to you straight away.',
      },
    ],
  },
  featureCards: [
    {
      kicker: 'MOT',
      title: 'MOT and service bookings',
      text: 'Takes the booking instead of a message, and confirms it by text.',
    },
    {
      kicker: 'Reg',
      title: 'Vehicle lookup from the reg',
      text: 'Checks the make, model and MOT date using UK vehicle data.',
    },
    {
      kicker: 'Urgent',
      title: 'Urgent jobs flagged',
      text: 'Breakdowns and safety issues come straight to you, not the diary.',
    },
    {
      kicker: 'Ask',
      title: 'Common questions answered',
      text: 'Courtesy cars, parts, opening hours and directions, the same way every time.',
    },
    {
      kicker: 'Night',
      title: 'Evenings and weekends',
      text: 'The calls that come in after you lock up get answered too.',
    },
    {
      kicker: 'Pass',
      title: 'Hands over when it should',
      text: 'If a caller needs a person, it takes the detail and books a callback.',
    },
  ],
  setupOffer: '',
  priceIncludes: [
    'Your own UK phone number, or divert your existing one',
    'AI receptionist trained on your garage',
    'Bookings, texts and vehicle lookups',
    'Dashboard with recordings and transcripts',
    'Set up and tuned for you',
    'Your data stays yours',
  ],
  faq: [
    {
      question: 'Can I keep my existing garage number?',
      answer:
        'Yes. You can divert calls when you are busy or closed, or all the time. We help you set that up.',
    },
    {
      question: 'Will it sound robotic?',
      answer:
        'It is tuned for UK callers and for the way garages talk about jobs. The call on this page is illustrative, so you can judge the shape of it before a trial.',
    },
    {
      question: 'What if it gets something wrong?',
      answer:
        'We test it against awkward calls before it goes live. When it is not sure, it takes the detail and books a callback instead of guessing.',
    },
    {
      question: 'How long does setup take?',
      answer: 'We do the setup for you. Most of it is a short call about your services and hours.',
    },
  ],
  final: {
    heading: 'Stop losing bookings to voicemail.',
    text: 'Try the AI receptionist free. No card needed, and we set it up for you.',
  },
  utmCampaign: 'garages',
  vertical: 'garage',
};
