import assert from 'node:assert/strict';
import { test } from 'node:test';
import { demoPhone } from '../src/components/marlow-pike/phone.js';

// Synthetic fixtures only. No real numbers, no environment overrides.
const env = (value) => ({ PUBLIC_MP_DEMO_PHONE: value });

test('accepts conventional +44 landline groupings', () => {
  assert.equal(demoPhone(env('+44 20 7946 0123')), '+44 20 7946 0123');
  assert.equal(demoPhone(env('+44 113 496 0000')), '+44 113 496 0000');
});

test('accepts 0800 with four-digit final grouping and short form', () => {
  assert.equal(demoPhone(env('0800 123 4567')), '0800 123 4567');
  assert.equal(demoPhone(env('0800 123 456')), '0800 123 456');
  assert.equal(demoPhone(env('08001234567')), '08001234567');
  assert.equal(demoPhone(env('0845 123 4567')), '0845 123 4567');
});

test('accepts unspaced equivalents of the conventional formats', () => {
  assert.equal(demoPhone(env('+442079460123')), '+442079460123');
  assert.equal(demoPhone(env('+441134960000')), '+441134960000');
});

test('preserves the configured display string exactly', () => {
  assert.equal(demoPhone(env('0161 496 0000')), '0161 496 0000');
  assert.equal(demoPhone(env('07700 900123')), '07700 900123');
  assert.equal(demoPhone(env('0300 123 4567')), '0300 123 4567');
  assert.equal(demoPhone(env('020 7946 0123')), '020 7946 0123');
});

test('rejects empty, unset and whitespace-only values', () => {
  assert.equal(demoPhone(env('')), null);
  assert.equal(demoPhone({}), null);
  assert.equal(demoPhone(env('   ')), null);
});

test('rejects malformed separators and extensions', () => {
  for (const bad of ['0161  496 0000', '0161 496 0000 x123', '0161 496 0000 ext 2',
    '0161\t496 0000', '0161\n496 0000', '0161-496-0000', '(0161) 496 0000',
    '0161 496 0000,', '+44 20 7946 0123.']) {
    assert.equal(demoPhone(env(bad)), null, JSON.stringify(bad));
  }
});

test('rejects invalid characters and misplaced plus', () => {
  for (const bad of ['abc', '0161 496 OOOO', '+44 20 7946 01234', '44 20 7946 0123',
    '0161 496 000+', '++44 20 7946 0123', '0161+496 0000']) {
    assert.equal(demoPhone(env(bad)), null, JSON.stringify(bad));
  }
});

test('rejects non-UK and malformed country prefixes', () => {
  for (const bad of ['+33123456789', '+12125550123', '+441234', '+44']) {
    assert.equal(demoPhone(env(bad)), null, JSON.stringify(bad));
  }
});

test('rejects overlong values', () => {
  assert.equal(demoPhone(env('0161 496 0000 0000 000')), null);
  assert.equal(demoPhone(env('0'.repeat(21))), null);
});

test('accepts the +44 international form of every supported domestic shape', () => {
  // Domestic display and its +44 equivalent must agree, spaced and dense.
  const pairs = [
    ['0161 496 0000', '+44 161 496 0000'],
    ['020 7946 0123', '+44 20 7946 0123'],
    ['0113 496 0000', '+44 113 496 0000'],
    ['0300 123 4567', '+44 300 123 4567'],
    ['07700 900123', '+44 7700 900123'],
    ['0800 123 4567', '+44 800 123 4567'],
    ['0800 123 456', '+44 800 123 456'],
    ['0845 123 4567', '+44 845 123 4567'],
  ];
  for (const [domestic, intl] of pairs) {
    assert.equal(demoPhone(env(domestic)), domestic, domestic);
    assert.equal(demoPhone(env(intl)), intl, intl);
    const dense = intl.replaceAll(' ', '');
    assert.equal(demoPhone(env(dense)), dense, dense);
  }
});

test('rejects +44 values whose national part is not a supported domestic shape', () => {
  for (const bad of ['+44 0000 000000', '+44 0161 496 0000', '+44 9161 496 0000',
    '+44 1234', '+4412345678', '+44 12345678901']) {
    assert.equal(demoPhone(env(bad)), null, JSON.stringify(bad));
  }
});

test('never falls back to other phone environment variables', () => {
  const mixed = {
    PUBLIC_MP_DEMO_PHONE: '',
    PUBLIC_PHONE: '07700 900123',
    PUBLIC_DEMO_PHONE: '+44 20 7946 0123',
    MP_PHONE: '0161 496 0000',
  };
  assert.equal(demoPhone(mixed), null);
});
