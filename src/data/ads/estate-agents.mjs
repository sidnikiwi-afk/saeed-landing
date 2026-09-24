export const estateAgentsAd = {
  searchIntent: 'AI receptionist for estate agents',
  slug: 'estate-agents',
  headline: 'AI receptionist for estate agents',
  headlineAccent: 'Every enquiry captured.',
  description:
    'An AI receptionist for UK estate agents. It captures every viewing request and valuation lead on the call, and says who will call back first. Free trial, no card needed.',
  eyebrow: 'For UK estate and letting agents',
  intro:
    'It picks up while your negotiators are out on viewings or with vendors, captures the viewing request or valuation enquiry in full, and passes it straight to whoever should call back first. It answers in office hours, in the evening, and at the weekend.',
  trialPromise: [
    'Captures every viewing request on the call',
    'Takes valuation leads and routes them to your valuer',
    'Tells the caller who will ring back, and when',
  ],
  micro: ['No card needed', 'UK phone number', 'Set up for you'],
  example: {
    status: 'Incoming call at 19:14',
    title: 'Branch enquiry line',
    lines: [
      { from: 'ai', text: 'Hi, you are through to the branch. How can I help?' },
      { from: 'caller', text: 'Hello, I saw the three bed on Victoria Road. Could I see it on Saturday?' },
      { from: 'ai', text: 'Of course. Can I take your name and the best number for you?' },
      { from: 'caller', text: 'Daniel Rowe. You should have my number, I registered last month.' },
      { from: 'ai', text: 'Found you, Daniel. I have noted Saturday morning and passed the request to Priya, who looks after Victoria Road. She will ring you this afternoon to fix the exact slot.' },
      { from: 'caller', text: 'Saturday morning would be perfect.' },
      { from: 'ai', text: 'Noted on the request. I will text you a summary now so you have it in writing.' },
    ],
    booking: [
      { label: 'Caller', value: 'Daniel Rowe' },
      { label: 'Enquiry', value: 'Viewing, 3 bed on Victoria Road' },
      { label: 'Preferred', value: 'Saturday morning' },
      { label: 'Goes to', value: 'Priya, sales negotiator' },
    ],
  },
  strip: [
    { title: 'First ring', text: 'Every call picked up' },
    { title: 'Out of hours', text: 'Evenings, weekends and bank holidays' },
    { title: 'Viewing requests', text: 'Taken in full, not a rushed message' },
    { title: 'Right person first', text: 'Passed to whoever owns the enquiry' },
  ],
  problem: {
    heading: 'Every missed call is a viewing for the agent up the road.',
    text: 'The phone rings while your negotiators are out on viewings or tied up with vendors. Most callers will not leave a message. They ring the next agent on the high street.',
    missed: [
      { title: 'Viewing request', when: '10:20, while the whole branch was out on viewings' },
      { title: 'Valuation enquiry', when: '13:05, mid vendor call' },
      { title: 'Lettings renewal', when: '18:40, after the branch shut' },
      { title: 'Question about a listing', when: '21:15, after hours' },
    ],
  },
  howItWorks: {
    heading: 'Set up for you. No new software to learn.',
    steps: [
      {
        title: 'We set it up for you',
        text: 'Your branches, your patch, who handles sales and who handles lettings, and how you like enquiries passed on.',
      },
      {
        title: 'It answers and captures',
        text: 'Calls are answered on the first ring. Viewing requests and valuation leads are captured in full and sent to the right person.',
      },
      {
        title: 'You see every call',
        text: 'Recordings, transcripts and summaries sit in the Dashboard. Hot leads are flagged to you straight away.',
      },
    ],
  },
  featureCards: [
    {
      kicker: 'Viewings',
      title: 'Every viewing request captured',
      text: 'Takes the name, contact details, property and preferred times, then passes it on.',
    },
    {
      kicker: 'Value',
      title: 'Valuation leads routed to the valuer',
      text: 'Vendor and landlord enquiries reach whoever books the appraisals, with the detail attached.',
    },
    {
      kicker: 'Both',
      title: 'Sales and lettings covered',
      text: 'One line can take both, or each branch and desk can have its own.',
    },
    {
      kicker: 'Ask',
      title: 'Common questions answered',
      text: 'Opening hours, how a viewing works, what to bring, and directions, the same way every time.',
    },
    {
      kicker: 'Night',
      title: 'Evenings and weekends',
      text: 'House hunters call when the branch is shut. Those calls get answered too.',
    },
    {
      kicker: 'Pass',
      title: 'Hands over when it should',
      text: 'If a caller needs a person, it takes the detail and gets someone to call back.',
    },
  ],
  setupOffer:
    'Booking viewings into your diary is a paid setup: we can have confirmed slots land in the calendar you already use.',
  priceIncludes: [
    'Your own UK phone number, or divert your existing one',
    'AI receptionist trained on your agency',
    'Viewing requests and valuation leads captured and routed',
    'Dashboard with recordings and transcripts',
    'Set up and tuned for you',
    'Your data stays yours',
  ],
  faq: [
    {
      question: 'Can I keep my existing branch number?',
      answer:
        'Yes. You can divert calls when the branch is busy or shut, or all the time. We help you set that up.',
    },
    {
      question: 'Does it cover lettings as well as sales?',
      answer:
        'Yes. One line can handle both, with enquiries routed to the right desk, or each branch can have its own number.',
    },
    {
      question: 'Will it sound robotic?',
      answer:
        'It is tuned for UK callers and for the way agents talk to applicants and vendors. The call on this page is illustrative, so you can judge the shape of it before a trial.',
    },
    {
      question: 'What if it gets something wrong?',
      answer:
        'We test it against awkward calls before it goes live. When it is not sure, it takes the detail and passes it to a person instead of guessing.',
    },
  ],
  final: {
    heading: 'Stop losing enquiries to voicemail.',
    text: 'Try the AI receptionist free. No card needed, and we set it up for you.',
  },
  utmCampaign: 'estate-agents',
  vertical: 'estate-agent',
};
