export const garagesAd = {
  searchIntent: 'AI receptionist for garages',
  slug: 'garages',
  headline: 'AI receptionist for garages',
  headlineAccent: 'Every call answered.',
  description:
    'An AI receptionist for UK garages. It answers the call, takes the job details, looks up the vehicle from the reg, and texts you a summary.',
  eyebrow: 'For UK garages and MOT centres',
  intro:
    'It picks up while you are under a car, takes down the MOT, service or repair, and texts you a summary. The customer gets a text too, so they know you have it. Urgent jobs come straight to you. It answers during the day, in the evening, and at the weekend.',
  trialPromise: [
    'Takes MOT, service and repair requests on the call',
    'Looks up the vehicle and MOT date from the reg',
    'Shows every call as a job in workshop mode',
  ],
  micro: ['Answers out of hours', 'UK phone number', 'Set up for you'],
  example: {
    status: 'Incoming call at 08:12',
    title: 'Workshop line',
    lines: [
      { from: 'ai', text: "Morning, you're through to the workshop. How can I help?" },
      { from: 'caller', text: 'Hiya, I need to get the car in for a service.' },
      { from: 'ai', text: "No problem. What's the registration?" },
      { from: 'caller', text: 'LM21 XRT.' },
      { from: 'ai', text: "Thanks. That's a silver 2021 Ford Focus?" },
      { from: 'caller', text: "That's the one." },
      {
        from: 'ai',
        text: "While I've got it up, your MOT runs out in 14 days. Do you want the MOT done at the same time?",
      },
      { from: 'caller', text: "Oh, I've completely forgotten. Yeah, go on." },
      { from: 'ai', text: 'And when would suit you?' },
      { from: 'caller', text: 'Tuesday morning, ideally.' },
      {
        from: 'ai',
        text: "Lovely. I've passed that on, and someone from the workshop will ring you back today to fix the time. I'll text you a summary now.",
      },
      { from: 'caller', text: 'Cheers.' },
    ],
    booking: [
      { label: 'Vehicle', value: 'LM21 XRT, silver Ford Focus' },
      { label: 'Job', value: 'Service and MOT' },
      { label: 'Wants', value: 'Tuesday morning' },
      { label: 'Next step', value: 'Garage to call back' },
    ],
    caption: 'Registration and details made up.',
    audio: {
      heading: 'Hear it answer a garage call',
      src: '/audio/garage-demo-call.mp3',
      caption: 'AI voices. Registration and details made up.',
    },
  },
  strip: [
    { title: 'First ring', text: 'Every call picked up' },
    { title: 'Out of hours', text: 'Evenings and weekends' },
    { title: 'Vehicle lookup', text: 'The car and its MOT date, from the reg' },
    { title: 'Text summaries', text: 'To you, with a text to the customer' },
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
        text: 'Your services, the prices you are happy to share, opening hours, and who should get which jobs.',
      },
      {
        title: 'It answers and takes the job',
        text: 'Calls are answered on the first ring. You get a text summary of the job, and the customer gets a text too.',
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
      title: 'MOT and service requests',
      text: 'Takes the reg, the job and when suits the customer, then texts you a summary and texts them to say it is with you.',
    },
    {
      kicker: 'Reg',
      title: 'Vehicle lookup from the reg',
      text: 'Checks the make, model and MOT date using UK vehicle data.',
    },
    {
      kicker: 'Urgent',
      title: 'Urgent jobs flagged',
      text: 'Breakdowns and safety issues come straight to you, not to the back of the queue.',
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
      text: 'If a caller needs a person, it takes the detail and gets someone to call back.',
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
    'A text summary to you after every call, and a text to the customer',
    'Vehicle lookups from the reg',
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
        'It is tuned for UK callers and for the way garages talk about jobs. The call on this page is illustrative, so you can judge the shape of it before you try it.',
    },
    {
      question: 'What if it gets something wrong?',
      answer:
        'We test it against awkward calls before it goes live. When it is not sure, it takes the detail and passes it to you instead of guessing.',
    },
    {
      question: 'How long does setup take?',
      answer: 'We do the setup for you. Most of it is a short call about your services and hours.',
    },
  ],
  final: {
    heading: 'Stop losing jobs to voicemail.',
    text: 'We set it up for you, and we show you how it is doing.',
  },
  utmCampaign: 'garages',
  vertical: 'garage',
};
