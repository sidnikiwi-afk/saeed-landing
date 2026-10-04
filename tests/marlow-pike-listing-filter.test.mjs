import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';

// Portable regression for the Marlow & Pike hero filter controls: the hero
// search form must actually filter the listings grid with AND semantics,
// exact bedroom counts (studio = 0 beds), an inclusive max monthly rent, and
// a status message when nothing matches. Executes the ACTUAL inline Hero
// filter script in a Node vm against a synthetic DOM built from the real
// catalog data attributes. No browser, no network, no implementation mirror.
const here = dirname(fileURLToPath(import.meta.url));
const astroSource = readFileSync(join(here, '..', 'src', 'components', 'marlow-pike', 'Hero.astro'), 'utf8');

// Mirror of the immutable catalog, used ONLY to build the synthetic cards'
// data attributes exactly as Listings.astro renders them.
const catalog = (await import('../src/data/marlow-pike-listings.mjs')).default.listings;

function extractFilterScript(source) {
  const open = source.indexOf('<script>');
  const close = source.indexOf('</script>', open);
  assert.ok(open !== -1 && close > open, 'inline filter script not found in Hero.astro');
  return source.slice(open + '<script>'.length, close);
}

function makeSelect(options) {
  const select = {
    value: options[0].value,
    options,
    addEventListener() {},
  };
  return select;
}

function makeCard(listing) {
  const classes = new Set();
  const card = {
    tagName: 'ARTICLE',
    hidden: false,
    dataset: {
      listingRef: listing.ref,
      listingBeds: String(listing.beds),
      listingPrice: String(listing.price),
      listingArea: listing.location,
    },
    classList: {
      add(...cls) { cls.forEach((c) => classes.add(c)); },
      remove(...cls) { cls.forEach((c) => classes.delete(c)); },
      contains(cls) { return classes.has(cls); },
    },
    addEventListener() {},
  };
  return card;
}

function makeEnv(scriptSource) {
  const areaSelect = makeSelect([
    { value: 'all' }, { value: 'marlow' },
  ]);
  const bedroomsSelect = makeSelect([
    { value: 'any' }, { value: '0' }, { value: '1' }, { value: '2' }, { value: '3' }, { value: '4' },
  ]);
  const rentSelect = makeSelect([
    { value: 'any' }, { value: '1250' }, { value: '1750' }, { value: '2200' },
  ]);
  const cards = catalog.map(makeCard);
  const emptyMessage = { tagName: 'P', hidden: true };
  const listingsSection = {
    tagName: 'SECTION',
    id: 'listings',
    querySelectorAll: (selector) => (selector === '.bm-card' ? cards : []),
    querySelector: (selector) => (selector === '.bm-listings__empty' ? emptyMessage : null),
    scrollIntoView: () => scrollCalls.push('listings'),
  };
  let submitHandler = null;
  const form = {
    querySelector: (selector) => (
      { '[data-filter="area"]': areaSelect,
        '[data-filter="bedrooms"]': bedroomsSelect,
        '[data-filter="maxrent"]': rentSelect }[selector] || null
    ),
    addEventListener(type, fn) { if (type === 'submit') submitHandler = fn; },
  };
  const scrollCalls = [];

  const sandbox = {
    document: {
      querySelector: (selector) => (selector === '.bm-search' ? form : null),
      getElementById: (id) => (id === 'listings' ? listingsSection : null),
      querySelectorAll: (selector) => (
        selector === '#listings .bm-card' ? cards : []
      ),
    },
    window: { addEventListener() {} },
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptSource, sandbox);

  return {
    areaSelect, bedroomsSelect, rentSelect, cards, emptyMessage, scrollCalls,
    submit() {
      assert.equal(typeof submitHandler, 'function', 'hero form has a submit listener');
      submitHandler({ preventDefault() {} });
    },
    visibleRefs() {
      return cards.filter((card) => !card.hidden).map((card) => card.dataset.listingRef);
    },
    emptyVisible() { return !emptyMessage.hidden; },
  };
}

const ALL_REFS = ['MP001', 'MP002', 'MP003', 'MP004', 'MP005', 'MP006'];

test('defaults (any / any / all) show all six demo homes', () => {
  const env = makeEnv(extractFilterScript(astroSource));
  env.submit();
  assert.deepEqual(env.visibleRefs(), ALL_REFS);
  assert.equal(env.emptyVisible(), false);
});

test('exact bedroom count filters correctly, studio matched by beds 0', () => {
  const env = makeEnv(extractFilterScript(astroSource));
  env.bedroomsSelect.value = '2';
  env.submit();
  assert.deepEqual(env.visibleRefs(), ['MP001', 'MP005'], 'exact 2 bed homes only');

  env.bedroomsSelect.value = '0';
  env.submit();
  assert.deepEqual(env.visibleRefs(), ['MP006'], 'studio matches beds 0 exactly');

  env.bedroomsSelect.value = '3';
  env.submit();
  assert.deepEqual(env.visibleRefs(), ['MP002']);
});

test('max monthly rent is inclusive of the chosen amount', () => {
  const env = makeEnv(extractFilterScript(astroSource));
  env.rentSelect.value = '1750';
  env.submit();
  // MP001 at exactly 1750 must be included; MP002 at 2200 must not.
  assert.deepEqual(env.visibleRefs(), ['MP001', 'MP003', 'MP005', 'MP006']);
});

test('area filter passes all demo homes for the Marlow area and all', () => {
  const env = makeEnv(extractFilterScript(astroSource));
  env.areaSelect.value = 'all';
  env.submit();
  assert.deepEqual(env.visibleRefs(), ALL_REFS);
  env.areaSelect.value = 'marlow';
  env.submit();
  assert.deepEqual(env.visibleRefs(), ALL_REFS, 'every demo home sits in the Marlow area');
});

test('criteria combine with AND semantics', () => {
  const env = makeEnv(extractFilterScript(astroSource));
  env.bedroomsSelect.value = '2';
  env.rentSelect.value = '1750';
  env.submit();
  assert.deepEqual(env.visibleRefs(), ['MP001', 'MP005'], '2 bed AND at most 1750 pcm');
});

test('no matches shows the empty status message; resetting restores all six', () => {
  const env = makeEnv(extractFilterScript(astroSource));
  env.bedroomsSelect.value = '4';
  env.rentSelect.value = '1250';
  env.submit();
  assert.deepEqual(env.visibleRefs(), []);
  assert.equal(env.emptyVisible(), true, 'empty results show a status message');

  env.bedroomsSelect.value = 'any';
  env.rentSelect.value = 'any';
  env.areaSelect.value = 'all';
  env.submit();
  assert.deepEqual(env.visibleRefs(), ALL_REFS, 'reset restores all six homes');
  assert.equal(env.emptyVisible(), false);
});
