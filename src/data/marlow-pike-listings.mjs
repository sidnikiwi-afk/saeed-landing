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
      demo_knowledge: {
        demo_data: true,
        address: '7 Mill Lane, Marlow',
        postcode: 'SL7 1AA',
        postcode_status: 'Illustrative demo postcode. Do not use it for directions or delivery.',
        area: 'Marlow town centre, riverside side (illustrative)',
        town_centre: {
          label: 'Marlow town centre',
          approximate_distance_m: 550,
          walking_minutes: 8,
          driving_minutes: 3,
        },
        station: {
          label: 'Marlow Riverside station (fictional)',
          approximate_distance_m: 1100,
          walking_minutes: 15,
          driving_minutes: 4,
        },
        primary_schools: [
          {
            label: 'Mill Lane Primary School (fictional)',
            approximate_distance_m: 700,
            walking_minutes: 10,
            driving_minutes: 3,
          },
        ],
        supermarket: {
          label: 'Fourmount Supermarket, West Street (fictional)',
          approximate_distance_m: 800,
          walking_minutes: 11,
          driving_minutes: 4,
        },
        unknown_details: [
          'School catchment and admission eligibility',
          'Actual mapped routes and published travel times',
        ],
        notes:
          'All addresses, postcodes, places, distances and minutes for this record are invented demo data for the Marlow & Pike demonstration site.',
      },
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
      demo_knowledge: {
        demo_data: true,
        address: '12 Orchard Rise, Marlow',
        postcode: 'SL7 1BB',
        postcode_status: 'Illustrative demo postcode. Do not use it for directions or delivery.',
        area: 'Marlow town centre, west residential side (illustrative)',
        town_centre: {
          label: 'Marlow town centre',
          approximate_distance_m: 900,
          walking_minutes: 12,
          driving_minutes: 4,
        },
        station: {
          label: 'Orchard Halt station (fictional)',
          approximate_distance_m: 1500,
          walking_minutes: 20,
          driving_minutes: 6,
        },
        primary_schools: [
          {
            label: 'Orchard Rise Primary School (fictional)',
            approximate_distance_m: 450,
            walking_minutes: 7,
            driving_minutes: 2,
          },
          {
            label: 'Westfield Primary School (fictional)',
            approximate_distance_m: 1200,
            walking_minutes: 17,
            driving_minutes: 5,
          },
        ],
        supermarket: {
          label: 'Daylesh Stores, Orchard Rise (fictional)',
          approximate_distance_m: 350,
          walking_minutes: 5,
          driving_minutes: 2,
        },
        unknown_details: [
          'School catchment and admission eligibility',
          'Actual mapped routes and published travel times',
        ],
        notes:
          'All addresses, postcodes, places, distances and minutes for this record are invented demo data for the Marlow & Pike demonstration site.',
      },
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
      demo_knowledge: {
        demo_data: true,
        address: '3 Cedar Court, Marlow',
        postcode: 'SL7 1CC',
        postcode_status: 'Illustrative demo postcode. Do not use it for directions or delivery.',
        area: 'Marlow town centre, central side (illustrative)',
        town_centre: {
          label: 'Marlow town centre',
          approximate_distance_m: 250,
          walking_minutes: 4,
          driving_minutes: 2,
        },
        station: {
          label: 'Marlow Riverside station (fictional)',
          approximate_distance_m: 800,
          walking_minutes: 11,
          driving_minutes: 3,
        },
        primary_schools: [
          {
            label: 'Cedar Court Primary School (fictional)',
            approximate_distance_m: 950,
            walking_minutes: 13,
            driving_minutes: 4,
          },
        ],
        supermarket: {
          label: 'Fourmount Supermarket, West Street (fictional)',
          approximate_distance_m: 400,
          walking_minutes: 6,
          driving_minutes: 2,
        },
        unknown_details: [
          'School catchment and admission eligibility',
          'Actual mapped routes and published travel times',
        ],
        notes:
          'All addresses, postcodes, places, distances and minutes for this record are invented demo data for the Marlow & Pike demonstration site.',
      },
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
      demo_knowledge: {
        demo_data: true,
        address: '21 Holloway Croft, Marlow',
        postcode: 'SL7 1DD',
        postcode_status: 'Illustrative demo postcode. Do not use it for directions or delivery.',
        area: 'Marlow town centre, northern edge (illustrative)',
        town_centre: {
          label: 'Marlow town centre',
          approximate_distance_m: 1600,
          walking_minutes: 22,
          driving_minutes: 6,
        },
        station: {
          label: 'Holloway Gate station (fictional)',
          approximate_distance_m: 1000,
          walking_minutes: 14,
          driving_minutes: 4,
        },
        primary_schools: [
          {
            label: 'Holloway Croft Primary School (fictional)',
            approximate_distance_m: 600,
            walking_minutes: 9,
            driving_minutes: 3,
          },
        ],
        supermarket: {
          label: 'Grangefield Foodmarket, North Road (fictional)',
          approximate_distance_m: 1100,
          walking_minutes: 15,
          driving_minutes: 4,
        },
        unknown_details: [
          'School catchment and admission eligibility',
          'Actual mapped routes and published travel times',
        ],
        notes:
          'All addresses, postcodes, places, distances and minutes for this record are invented demo data for the Marlow & Pike demonstration site.',
      },
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
      demo_knowledge: {
        demo_data: true,
        address: '9 Bridge Walk, Marlow',
        postcode: 'SL7 1EE',
        postcode_status: 'Illustrative demo postcode. Do not use it for directions or delivery.',
        area: 'Marlow town centre, bridge end (illustrative)',
        town_centre: {
          label: 'Marlow town centre',
          approximate_distance_m: 300,
          walking_minutes: 5,
          driving_minutes: 2,
        },
        station: {
          label: 'Marlow Riverside station (fictional)',
          approximate_distance_m: 1400,
          walking_minutes: 19,
          driving_minutes: 5,
        },
        primary_schools: [
          {
            label: 'Bridge Walk Primary School (fictional)',
            approximate_distance_m: 850,
            walking_minutes: 12,
            driving_minutes: 4,
          },
        ],
        supermarket: {
          label: 'Quayside Mini Market, Bridge Street (fictional)',
          approximate_distance_m: 200,
          walking_minutes: 3,
          driving_minutes: 2,
        },
        unknown_details: [
          'School catchment and admission eligibility',
          'Actual mapped routes and published travel times',
        ],
        notes:
          'All addresses, postcodes, places, distances and minutes for this record are invented demo data for the Marlow & Pike demonstration site.',
      },
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
      demo_knowledge: {
        demo_data: true,
        address: '2 Anchor Yard, Marlow',
        postcode: 'SL7 1FF',
        postcode_status: 'Illustrative demo postcode. Do not use it for directions or delivery.',
        area: 'Marlow town centre, yard quarter (illustrative)',
        town_centre: {
          label: 'Marlow town centre',
          approximate_distance_m: 180,
          walking_minutes: 3,
          driving_minutes: 2,
        },
        station: {
          label: 'Anchor Wharf station (fictional)',
          approximate_distance_m: 1300,
          walking_minutes: 18,
          driving_minutes: 5,
        },
        primary_schools: [
          {
            label: 'Anchor Yard Primary School (fictional)',
            approximate_distance_m: 1000,
            walking_minutes: 14,
            driving_minutes: 4,
          },
        ],
        supermarket: {
          label: 'Fourmount Supermarket, West Street (fictional)',
          approximate_distance_m: 650,
          walking_minutes: 9,
          driving_minutes: 3,
        },
        unknown_details: [
          'School catchment and admission eligibility',
          'Actual mapped routes and published travel times',
        ],
        notes:
          'All addresses, postcodes, places, distances and minutes for this record are invented demo data for the Marlow & Pike demonstration site.',
      },
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

// Strict reference lookup over the exact canonical records. Returns the
// deep-frozen demo_knowledge object for the given MP reference, or null for
// any unknown, mixed or non-string reference so callers fail closed.
export function getPropertyKnowledge(ref) {
  if (typeof ref !== 'string') return null;
  const listing = listingsCatalog.listings.find((entry) => entry.ref === ref);
  return listing ? listing.demo_knowledge : null;
}

// JSON-safe full knowledge export derived from the same canonical records.
// A structured clone (unfrozen, plain objects) so dashboard setup and the
// agent can consume it without touching the frozen catalogue. No second
// dataset: any change here would have to change the canonical records too.
export function exportPropertyKnowledge() {
  return JSON.parse(
    JSON.stringify(
      listingsCatalog.listings.map((listing) => ({
        ref: listing.ref,
        demo_knowledge: listing.demo_knowledge,
      })),
    ),
  );
}
