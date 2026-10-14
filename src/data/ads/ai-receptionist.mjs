export const aiReceptionistAd = {
  searchIntent: 'AI receptionist',
  slug: 'ai-receptionist',
  headline: 'AI receptionist',
  headlineAccent: 'Every call answered.',
  description:
    'An AI receptionist for UK businesses. It answers every call, takes the details, and passes each one to the right person.',
  eyebrow: 'For UK businesses',
  intro:
    'It picks up every call, takes the caller\'s details, and texts them so they know someone will be in touch. Urgent calls come to you straight away. It answers during the day, in the evening, and at the weekend.',
  trialPromise: [
    'Answers the calls a business already gets',
    'Takes the details and texts the caller',
    'Passes each call to the right person',
  ],
  micro: ['Answers out of hours', 'UK phone number', 'Set up for you'],
  example: {
    status: 'Incoming call at 18:06',
    title: 'General enquiries line',
    lines: [
      { from: 'ai', text: 'Good evening, thanks for calling. How can I help?' },
      { from: 'caller', text: "Hi, I rang earlier and couldn't get through. Are you open on Saturdays?" },
      {
        from: 'ai',
        text: 'We are, from nine until one. If you like, I can take your name and number and get someone to call you back.',
      },
      { from: 'caller', text: "Yes please. It's Ravi Sharma." },
      { from: 'ai', text: 'Thanks, Ravi. Is this the best number to reach you on?' },
      { from: 'caller', text: "Yeah, this one's fine." },
      {
        from: 'ai',
        text: "Lovely. Someone will call you back first thing tomorrow morning, and I'll text you now to confirm.",
      },
      { from: 'caller', text: 'Brilliant, thanks.' },
    ],
    booking: [
      { label: 'Caller', value: 'Ravi Sharma' },
      { label: 'Question', value: 'Saturday hours' },
      { label: 'Next step', value: 'Callback requested' },
      { label: 'When', value: 'Tomorrow morning' },
    ],
    audio: {
      heading: 'Hear it take an evening call',
      src: '/audio/ai-receptionist-demo-call.mp3',
      caption: 'AI voices. Names and details made up.',
    },
  },
  strip: [
    { title: 'First ring', text: 'Every call picked up' },
    { title: 'Out of hours', text: 'Evenings and weekends' },
    { title: 'Texts the caller', text: 'So they know what happens next' },
    { title: 'Urgent ones', text: 'Straight to you, not voicemail' },
  ],
  problem: {
    heading: 'Every missed call is a customer for someone else.',
    text: 'Most callers will not leave a voicemail. They ring the next business on Google, and you never find out who it was.',
    missed: [
      { title: 'New enquiry', when: '08:40, before anyone was at the desk' },
      { title: 'Quote request', when: '12:15, when everyone was busy' },
      { title: 'Callback request', when: '17:55, as people were leaving' },
      { title: 'Price question', when: '22:10, after hours' },
    ],
  },
  howItWorks: {
    heading: 'Set up for you. No new software to learn.',
    steps: [
      {
        title: 'We set it up for you',
        text: 'How you greet callers, your opening hours, and who should get which messages.',
      },
      {
        title: 'It answers',
        text: 'Calls are answered on the first ring. The caller gets a text, and the details go to the right person instead of sitting in voicemail.',
      },
      {
        title: 'You see everything',
        text: 'Recordings, transcripts and summaries sit in the Dashboard. Urgent ones are flagged to you straight away.',
      },
    ],
  },
  featureEyebrow: 'Built for UK businesses',
  featureHeading: 'It knows what your callers need.',
  featureCards: [
    {
      kicker: 'Calls',
      title: 'Every call answered',
      text: 'Picked up on the first ring, during the day, in the evening, and at the weekend.',
    },
    {
      kicker: 'Text',
      title: 'A text for every caller',
      text: 'Every caller gets a text after the call, so they know someone has it.',
    },
    {
      kicker: 'Route',
      title: 'Passed to the right person',
      text: 'Each message goes to whoever should deal with it, with the detail attached.',
    },
    {
      kicker: 'Urgent',
      title: 'Urgent ones flagged',
      text: 'When something cannot wait, it comes straight to you instead of voicemail.',
    },
    {
      kicker: 'Ask',
      title: 'Common questions answered',
      text: 'Opening hours, directions and prices you are happy to share, the same way every time.',
    },
    {
      kicker: 'Pass',
      title: 'Hands over when it should',
      text: 'If a caller needs a person, it takes the detail and gets someone to call back.',
    },
  ],
  setupOffer: '',
  priceIncludes: [
    'Your own UK phone number, or divert your existing one',
    'AI receptionist set up for your business',
    'Every call answered, with a text to the caller',
    'Dashboard with recordings and transcripts',
    'Set up and tuned for you',
    'Your data stays yours',
  ],
  faq: [
    {
      question: 'Can I keep my existing number?',
      answer:
        'Yes. You can divert calls when you are busy or closed, or all the time. We help you set that up.',
    },
    {
      question: 'Will it sound robotic?',
      answer:
        'It is tuned for UK callers. The call on this page is illustrative, so you can judge the shape of it before you try it.',
    },
    {
      question: 'What if it gets something wrong?',
      answer:
        'We test it against awkward calls before it goes live. When it is not sure, it takes the detail and passes it on instead of guessing.',
    },
    {
      question: 'What happens after a call?',
      answer:
        'The caller gets a text, and the details go to the right person. You can see the recording, transcript and summary of every call in the Dashboard.',
    },
  ],
  final: {
    heading: 'Stop losing enquiries to voicemail.',
    text: 'We set it up for you, and we show you how it is doing.',
  },
  utmCampaign: 'ai-receptionist',
  vertical: 'general',
};
