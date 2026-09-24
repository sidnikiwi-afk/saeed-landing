export const aiReceptionistAd = {
  searchIntent: 'AI receptionist',
  slug: 'ai-receptionist',
  headline: 'AI receptionist',
  headlineAccent: 'Every call answered.',
  description:
    'An AI receptionist for UK businesses. It answers the calls, emails and web forms a business already gets. Free trial, no card needed.',
  eyebrow: 'For UK businesses',
  intro:
    'It picks up every call, reads the emails and web forms you already get, and passes the urgent ones to you straight away. It answers during the day, in the evening, and at the weekend.',
  trialPromise: [
    'Answers the calls a business already gets',
    'Reads your emails and web form enquiries',
    'Flags the urgent ones straight to you',
  ],
  micro: ['No card needed', 'UK phone number', 'Set up for you'],
  example: {
    status: 'Incoming call at 17:48',
    title: 'General enquiries line',
    lines: [
      { from: 'ai', text: 'Good afternoon, how can I help?' },
      { from: 'caller', text: 'Hi, I called earlier and got no answer. Are you open on Saturdays?' },
      { from: 'ai', text: 'We are, from 9 until 1. I can take your name and number so someone can call you back.' },
      { from: 'caller', text: 'Yes please. It is Priya Sharma.' },
      { from: 'ai', text: 'Thanks Priya. Someone will call you back this afternoon, and I will text you to confirm.' },
      { from: 'caller', text: 'Brilliant, thanks.' },
    ],
    booking: [
      { label: 'Caller', value: 'Priya Sharma' },
      { label: 'Question', value: 'Saturday hours' },
      { label: 'Next step', value: 'Callback booked' },
      { label: 'When', value: 'This afternoon' },
    ],
  },
  strip: [
    { title: 'First ring', text: 'Every call picked up' },
    { title: 'Out of hours', text: 'Evenings and weekends' },
    { title: 'Emails and forms', text: 'Read and passed on' },
    { title: 'Urgent ones', text: 'Straight to you, not voicemail' },
  ],
  problem: {
    heading: 'Every missed call is a customer for someone else.',
    text: 'Most callers will not leave a voicemail. They ring the next business on Google, and the emails and web forms sit there until someone has a minute.',
    missed: [
      { title: 'New enquiry', when: '08:40, before anyone was at the desk' },
      { title: 'Quote request', when: '12:15, when everyone was busy' },
      { title: 'Callback request', when: '17:55, as people were leaving' },
      { title: 'Web form enquiry', when: '22:10, after hours' },
    ],
  },
  howItWorks: {
    heading: 'Set up for you. No new software to learn.',
    steps: [
      {
        title: 'We set it up for you',
        text: 'How you greet callers, your opening hours, and what to do with the messages, emails and forms that come in.',
      },
      {
        title: 'It answers',
        text: 'Calls are answered on the first ring. Emails and web form enquiries are read too, so nothing sits in voicemail or an untouched inbox.',
      },
      {
        title: 'You see everything',
        text: 'Recordings, transcripts and summaries sit in the Dashboard. Urgent ones are flagged to you straight away.',
      },
    ],
  },
  featureCards: [
    {
      kicker: 'Calls',
      title: 'Every call answered',
      text: 'Picked up on the first ring, during the day, in the evening, and at the weekend.',
    },
    {
      kicker: 'Mail',
      title: 'Emails read and passed on',
      text: 'Enquiries in the inbox are read and sent to the right person, not left overnight.',
    },
    {
      kicker: 'Forms',
      title: 'Web forms handled',
      text: 'Submissions from your website are read and passed on, not left sitting in a form inbox.',
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
      text: 'If a caller needs a person, it takes the detail and books a callback.',
    },
  ],
  setupOffer: '',
  priceIncludes: [
    'Your own UK phone number, or divert your existing one',
    'AI receptionist set up for your business',
    'Calls answered, plus emails and web forms read',
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
        'It is tuned for UK callers. The call on this page is illustrative, so you can judge the shape of it before a trial.',
    },
    {
      question: 'What if it gets something wrong?',
      answer:
        'We test it against awkward calls before it goes live. When it is not sure, it takes the detail and passes it on instead of guessing.',
    },
    {
      question: 'Does it do more than answer calls?',
      answer:
        'Yes. It also reads the emails and web form enquiries a business already gets, and passes them on with the detail.',
    },
  ],
  final: {
    heading: 'Stop losing enquiries to voicemail.',
    text: 'Try the AI receptionist free. No card needed, and we set it up for you.',
  },
  utmCampaign: 'ai-receptionist',
  vertical: 'general',
};
