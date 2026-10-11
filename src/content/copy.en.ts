/**
 * ALL text on the site lives here. Edit freely — the layout adapts.
 * A Greek version can later be added as copy.el.ts with the same shape.
 */
export const copy = {
  meta: {
    title: 'mendelX — AI for precision agriculture',
    description:
      'mendelX combines tractor-mounted LiDAR and satellite imagery with AI to optimize fertilizer use across every part of the field. Join our pilot programme.',
    tagline: 'AI for the future of agriculture.',
  },

  nav: {
    links: [
      { label: 'Technology', href: '/#technology' },
      { label: 'Vision', href: '/#vision' },
      { label: 'Team', href: '/#team' },
      { label: 'Pilot', href: '/#pilot' },
    ],
    cta: 'Join the pilot',
    menu: 'Menu',
    close: 'Close',
    skip: 'Skip to content',
  },

  hero: {
    label: '01 / Field intelligence',
    title: 'Shaping the future of agriculture',
    sub: 'LiDAR and satellite intelligence that tells your tractor how much fertilizer each part of the field really needs.',
    primary: 'Join the pilot programme',
    secondary: 'Partner with us',
    scroll: 'Scroll',
    coords: '37.97°N 23.72°E',
  },

  problem: {
    label: '02 / The problem',
    title: 'Fields are not uniform. Fertilizer application usually is.',
    body: 'Soil, moisture and crop vigour change from one corner of a field to the next. Spreading the same dose everywhere means some zones get more than they can use while others get less than they need — wasting inputs, money and soil health.',
    figureCaption: 'Variable field, uniform dose',
  },

  how: {
    label: '03 / How it works',
    title: 'From orbit to every row',
    steps: [
      {
        label: '01 / See from orbit',
        title: 'See from orbit',
        body: 'Satellite imagery maps how the whole field develops across the season.',
      },
      {
        label: '02 / Sense on the ground',
        title: 'Sense on the ground',
        body: 'LiDAR mounted on the tractor reads crop structure in real time, row by row.',
      },
      {
        label: '03 / Act',
        title: 'Act',
        body: 'AI fuses both views into a zone-by-zone fertilizer prescription, applied as the machine moves.',
      },
    ],
  },

  vision: {
    label: '04 / Vision',
    title: 'Built for the machines farmers already own',
    body: 'mendelX is designed to mount on existing tractors and, over time, more of the machinery already working the land. No new fleet — just a smarter one.',
    points: [
      { title: 'Less waste', body: 'Fertilizer goes where the crop can use it.' },
      { title: 'Same fields, sharper decisions', body: 'Data from orbit and the ground, in one view.' },
      { title: 'Lighter footprint', body: 'Precision that is better for soil and water.' },
    ],
  },

  team: {
    label: '05 / Team',
    title: 'The founders',
    people: [
      {
        name: 'Pavlos Mazomenos',
        role: 'CEO',
        initials: 'PM',
        bio: 'Mechanical engineer with an MSc in Automation Systems and years of hands-on experience with crop fields and tractors through his family’s company, Arcadia Terra.',
      },
      {
        name: 'Dr. Georgios Athanasiou',
        role: 'CTO',
        initials: 'GA',
        bio: 'PhD in Deep Learning, with a strong record building AI systems across academia and industry.',
      },
    ],
  },

  pilot: {
    label: '06 / Pilot programme',
    title: 'Join our first pilot farms',
    body: 'We are selecting a small group of farms to test mendelX in real conditions. Pilot partners get early access and help shape the system around how they actually work.',
    fields: {
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      region: 'Region / location',
      farmSize: 'Farm size',
      farmSizeHint: 'In stremmata or hectares',
      crops: 'Main crops',
      tractor: 'Tractor brand and model',
      notes: 'Anything else we should know?',
      optional: 'Optional',
      consentBefore: 'I agree that mendelX may store these details to contact me about the pilot programme. See the',
      consentLink: 'privacy notice',
    },
    submit: 'Apply to the pilot',
    sending: 'Sending…',
    success: 'Thank you — we’ll be in touch.',
    error: 'Something went wrong. Please try again in a moment.',
    required: 'Please fill in this field.',
    invalidEmail: 'Please enter a valid email address.',
    consentRequired: 'Please confirm you agree before applying.',
    closed: 'Applications open soon.',
  },

  partners: {
    label: '07 / Partners',
    title: 'Build this with us',
    body: 'We are speaking with investors, incubators and industry partners who want to help bring precision agriculture to more farms.',
    cta: 'Get in touch',
  },

  footer: {
    links: [
      { label: 'Technology', href: '/#technology' },
      { label: 'Team', href: '/#team' },
      { label: 'Pilot', href: '/#pilot' },
      { label: 'Privacy', href: '/privacy' },
    ],
    rights: 'All rights reserved.',
    builtIn: 'Built in Greece',
  },

  notFound: {
    label: 'Error / 404',
    title: 'Off the field',
    body: 'The page you were looking for isn’t here.',
    cta: 'Back to home',
  },
} as const;

export type Copy = typeof copy;
