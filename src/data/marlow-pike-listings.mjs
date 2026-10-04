// Single authoritative Marlow & Pike demo catalogue, exported as an ordinary
// ESM default so both native Node 22 and the esbuild bundled with Wrangler
// 3.x (esbuild 0.17.19, which cannot parse JSON import attributes and does
// not bundle them reliably) compile it. Data values and order are identical
// to the original JSON catalogue this module replaces; the JSON file is
// deleted, so this module is the only source. Deep-frozen at load: the
// catalogue is immutable at runtime for the page and the enquiry endpoint.
//
// Fictional demonstration data for the Marlow & Pike rental demo. Every
// property, street and monthly rent is invented and shown as illustrative
// demo imagery. Property refs MP001-MP006 are the stable enquiry identifiers.

const catalogue = {
  note: 'Fictional demonstration data for the Marlow & Pike rental demo. Every property, street and monthly rent is invented and shown as illustrative demo imagery. Property refs MP001-MP006 are the stable enquiry identifiers.',
  agent: {
    name: 'Marlow & Pike',
    tagline: 'Demonstration rental site',
    areas: 'Marlow area',
  },
  listings: [
    {
      ref: 'MP001',
      type: '2 bed cottage',
      price: 1750,
      beds: 2,
      baths: 1,
      living: 1,
      location: 'Mill Lane, Marlow',
      local_image: '/images/properties/property-1.jpg',
    },
    {
      ref: 'MP002',
      type: '3 bed semi-detached house',
      price: 2200,
      beds: 3,
      baths: 2,
      living: 1,
      location: 'Orchard Rise, Marlow',
      local_image: '/images/properties/property-2.jpg',
    },
    {
      ref: 'MP003',
      type: '1 bed apartment',
      price: 1250,
      beds: 1,
      baths: 1,
      living: null,
      location: 'Cedar Court, Marlow',
      local_image: '/images/properties/property-3.jpg',
    },
    {
      ref: 'MP004',
      type: '4 bed detached house',
      price: 3200,
      beds: 4,
      baths: 2,
      living: 1,
      location: 'Holloway Croft, Marlow',
      local_image: '/images/properties/property-4.jpg',
    },
    {
      ref: 'MP005',
      type: '2 bed flat',
      price: 1550,
      beds: 2,
      baths: 1,
      living: null,
      location: 'Bridge Walk, Marlow',
      local_image: '/images/properties/property-5.png',
    },
    {
      ref: 'MP006',
      type: 'Studio apartment',
      price: 950,
      beds: 0,
      baths: 1,
      living: null,
      location: 'Anchor Yard, Marlow',
      local_image: '/images/properties/property-6.jpg',
    },
  ],
  testimonials: [
    {
      name: 'Alex',
      role: 'Illustrative tenant scenario',
      service: 'Rental enquiry handled',
      quote: 'A clear enquiry, a slot offer and a confirmation. That is the whole rental journey this demo shows.',
      illustrative: true,
    },
    {
      name: 'Priya',
      role: 'Illustrative landlord scenario',
      service: 'Letting enquiry handled',
      quote: 'Every enquiry carries the property reference, so nothing is lost between the form and the letting follow-up.',
      illustrative: true,
    },
    {
      name: 'Sam',
      role: 'Illustrative tenant scenario',
      service: 'Demo slot managed',
      quote: 'The demo slot board keeps Saturday viewings in order instead of in a spreadsheet and a memory.',
      illustrative: true,
    },
  ],
};

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const property of Object.values(value)) deepFreeze(property);
    Object.freeze(value);
  }
  return value;
}

const listingsCatalog = deepFreeze(catalogue);
export default listingsCatalog;
