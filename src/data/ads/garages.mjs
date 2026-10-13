export const garagesAd = {
  searchIntent: 'AI receptionist for garages',
  slug: 'garages',
  headline: 'AI receptionist for garages',
  headlineAccent: 'Every call answered.',
  description:
    'An AI receptionist for UK garages. It answers the call, books MOTs and services, and texts the customer to confirm.',
  eyebrow: 'For UK garages and MOT centres',
  intro:
    'It picks up while you are under a car, books the MOT or service into the diary, and texts the customer to confirm. It answers during the day, in the evening, and at the weekend.',
  trialPromise: [
    'Books MOTs, services and repairs on the call',
    'Looks up the vehicle and MOT date from the reg',
    'Flags breakdowns and urgent jobs straight to you',
  ],
  micro: ['Answers out of hours', 'UK phone number', 'Set up for you'],
  example: {
    status: 'Incoming call at 08:12',
    title: 'Garage booking line',
    lines: [
      { from: 'ai', text: "Morning, you're through to the workshop. How can I help?" },
      { from: 'caller', text: 'Hiya, I need to book the car in for a service.' },
      { from: 'ai', text: "No problem. What's the registration?" },
      { from: 'caller', text: 'LM21 XRT.' },
      { from: 'ai', text: "Thanks. That's a silver 2021 Ford Focus?" },
      { from: 'caller', text: "That's the one." },
      {
        from: 'ai',
        text: "While I've got it up, your MOT runs out in 14 days. Shall I book the MOT in with the service, so it's one visit?",
      },
      { from: 'caller', text: "Oh, I'd completely forgotten. Yeah, go on." },
      { from: 'ai', text: 'I can do Tuesday at half eight or Thursday at nine.' },
      { from: 'caller', text: "Tuesday's good." },
      {
        from: 'ai',
        text: "Done. Service and MOT, Tuesday half eight, for LM21 XRT. I'll text you a confirmation now.",
      },
      { from: 'caller', text: 'Cheers.' },
    ],
    booking: [
      { label: 'Caller', value: 'Reg LM21 XRT' },
      { label: 'Vehicle', value: 'Silver 2021 Ford Focus' },
      { label: 'Job', value: 'Service and MOT' },
      { label: 'Booked', value: 'Tue 08:30' },
    ],
    caption: 'Registration and details in this call are made up.',
    audio: {
      heading: 'Hear it answer a garage call',
      src: '/audio/garage-demo-call.mp3',
      caption: 'AI voices. Registration and details made up.',
    },
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
  featureEyebrow: 'Built for garages',
  featureHeading: 'It knows what a garage caller needs.',
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
  workshopMode: {
    kicker: 'Jobs',
    title: 'Workshop mode',
    text: 'Every garage call shows up as a job on one screen in your Brackstone dashboard, with a button for the next step.',
    actions: ['Call back', 'Quote', 'Booked', 'Complete', 'Follow up'],
  },
  setupOffer: '',
  priceIncludes: [
    'Your own UK phone number, or divert your existing one',
    'AI receptionist trained on your garage',
    'Workshop mode: every call as a job in the Dashboard',
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
        'It is tuned for UK callers and for the way garages talk about jobs. The call on this page is illustrative, so you can judge the shape of it before you book.',
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
    text: 'We set it up for you, and we show you how it is doing.',
  },
  utmCampaign: 'garages',
  vertical: 'garage',
};
