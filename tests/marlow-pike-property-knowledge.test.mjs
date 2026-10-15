// Native node:test coverage for the Marlow & Pike property knowledge data.
// Scope: only the canonical module src/data/marlow-pike-listings.mjs. The
// untouched baseline module is read, read-only, from the explicit handoff
// path so the test proves the original fields were preserved losslessly.
// The controller may later replace the baseline import with a hash of the
// original fields; this file stays the single test source either way.

import test from 'node:test';
import assert from 'node:assert/strict';

import catalogue, {
  getPropertyKnowledge,
  exportPropertyKnowledge,
} from '../src/data/marlow-pike-listings.mjs';
import { createHash } from 'node:crypto';

const REFS = ['MP001', 'MP002', 'MP003', 'MP004', 'MP005', 'MP006'];
const ORIGINAL_LISTING_FIELDS = [
  'ref',
  'type',
  'price',
  'beds',
  'baths',
  'living',
  'location',
  'local_image',
];

test('all six exact MP references resolve, in canonical order', () => {
  assert.deepEqual(
    catalogue.listings.map((listing) => listing.ref),
    REFS,
  );
});

test('original catalogue fields retain the approved website snapshot', () => {
  const original = {
    note: catalogue.note,
    agent: catalogue.agent,
    listings: catalogue.listings.map((listing) => Object.fromEntries(
      ORIGINAL_LISTING_FIELDS.map((field) => [field, listing[field]]),
    )),
    testimonials: catalogue.testimonials,
  };
  assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),
    '55b25419a4efdada6c09ded58ffefa80e23bd23b27184a2d795ba78ea9882f4a');
  for (const listing of catalogue.listings) {
    assert.strictEqual(getPropertyKnowledge(listing.ref), listing.demo_knowledge);
  }
});

test('walking and driving minutes are present and differ for every amenity', () => {
  for (const ref of REFS) {
    const knowledge = getPropertyKnowledge(ref);
    const places = [
      knowledge.town_centre,
      knowledge.station,
      knowledge.supermarket,
      ...knowledge.primary_schools,
    ];
    for (const place of places) {
      assert.equal(typeof place.approximate_distance_m, 'number');
      assert.equal(typeof place.walking_minutes, 'number');
      assert.equal(typeof place.driving_minutes, 'number');
      assert.notEqual(
        place.walking_minutes,
        place.driving_minutes,
        `${ref} walking time must differ from driving time`,
      );
    }
  }
});

test('every record carries postcode, area, primary school and demo labelling', () => {
  for (const ref of REFS) {
    const knowledge = getPropertyKnowledge(ref);
    assert.match(knowledge.postcode, /^SL7 1[A-F]{2}$/);
    assert.match(knowledge.postcode_status, /illustrative demo postcode/i);
    assert.ok(knowledge.area.length > 0);
    assert.match(knowledge.address, /^\d+ .+, Marlow$/);
    assert.ok(knowledge.primary_schools.length >= 1);
    for (const school of knowledge.primary_schools) {
      assert.match(school.label, /\(fictional\)$/);
    }
    assert.equal(knowledge.demo_data, true);
    assert.match(knowledge.notes, /invented demo data/i);
    assert.deepEqual(knowledge.unknown_details, [
      'School catchment and admission eligibility',
      'Actual mapped routes and published travel times',
    ]);
  }
});

test('unknown and mixed references fail closed', () => {
  assert.equal(getPropertyKnowledge('MP007'), null);
  assert.equal(getPropertyKnowledge('MP001 MP002'), null);
  assert.equal(getPropertyKnowledge('MP001,MP002'), null);
  assert.equal(getPropertyKnowledge('mp001'), null);
  assert.equal(getPropertyKnowledge(' MP001'), null);
  assert.equal(getPropertyKnowledge(''), null);
  assert.equal(getPropertyKnowledge(null), null);
  assert.equal(getPropertyKnowledge(1), null);
  assert.equal(getPropertyKnowledge(['MP001', 'MP002']), null);
  assert.equal(getPropertyKnowledge({ ref: 'MP001' }), null);
  assert.equal(getPropertyKnowledge(undefined), null);
});

test('full export equals the canonical records field by field', () => {
  const exported = exportPropertyKnowledge();
  assert.deepEqual(
    exported.map((entry) => entry.ref),
    REFS,
  );
  for (let index = 0; index < REFS.length; index += 1) {
    assert.deepEqual(
      exported[index].demo_knowledge,
      JSON.parse(JSON.stringify(catalogue.listings[index].demo_knowledge)),
    );
  }
  assert.equal(exported.length, 6);
});

test('exports cannot drift from or mutate the canonical dataset', () => {
  const exported = exportPropertyKnowledge();
  exported[0].demo_knowledge.postcode = 'MUTATED';
  exported[0].ref = 'MUTATED';
  assert.equal(getPropertyKnowledge('MP001').postcode, 'SL7 1AA');
  assert.equal(catalogue.listings[0].ref, 'MP001');
  assert.ok(Object.isFrozen(catalogue));
  assert.ok(Object.isFrozen(catalogue.listings));
  assert.ok(Object.isFrozen(catalogue.listings[0]));
  assert.ok(Object.isFrozen(getPropertyKnowledge('MP001')));
});
