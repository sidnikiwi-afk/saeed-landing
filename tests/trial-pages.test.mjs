import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Its own outDir so this file can build alongside the other built-page tests.
const outDir = join(root, 'dist-trial');

const BUTTON = 'Start your 7-day free trial';
const LINE = 'No card needed. 50 minutes of calls. Then from £99 a month.';
const GARAGE_LINE = 'No card needed. 50 minutes of calls. Then £249 a month for the Garage edition.';
const PROMISE = "We'll set up your receptionist within 7 days, usually sooner, and email you when it's live.";
const CONSENT = "We'll email you about your trial. You can unsubscribe at any time.";
const ENDPOINT = 'https://dashboard.brackstonedigital.co.uk/api/trial-requests';

function decode(value) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// What a visitor reads: markup without scripts and styles, entities decoded.
function visibleText(html) {
  return decode(html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
}

function anchorTexts(html) {
  return [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => visibleText(match[1]).trim());
}

let built = false;
function page(slug) {
  if (!built) {
    execFileSync('npx', ['astro', 'build', '--outDir', outDir], {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
      },
    });
    built = true;
  }
  return readFileSync(join(outDir, slug, 'index.html'), 'utf8');
}

const PAGES = [
  ['ai-receptionist', LINE],
  ['estate-agents', LINE],
  ['garages', GARAGE_LINE],
  ['get-started', LINE],
];

test('every ads page and the get-started page offer the 7-day free trial in the agreed words', () => {
  for (const [slug, line] of PAGES) {
    const html = page(slug);
    const text = visibleText(html);
    assert.ok(text.includes(BUTTON), `${slug} is missing the trial button`);
    assert.ok(text.includes(line), `${slug} is missing "${line}"`);
    assert.ok(text.includes(PROMISE), `${slug} is missing the 7-day promise`);
    assert.ok(text.includes(CONSENT), `${slug} is missing the consent line`);
    assert.doesNotMatch(text, /Get your AI receptionist/, `${slug} still shows the old call to action`);
    assert.doesNotMatch(html, /VAT/, `${slug} mentions VAT`);
  }
  assert.equal(visibleText(page('garages')).includes(LINE), false, 'garages shows the general price line');
});

test('the trial is the primary call to action on every ads page', () => {
  for (const slug of ['ai-receptionist', 'estate-agents', 'garages']) {
    const html = page(slug);
    const trialLinks = anchorTexts(html).filter((text) => text === BUTTON);
    assert.ok(trialLinks.length >= 4, `${slug} has too few trial buttons`);
    const hero = html.match(/<div class="ctas"[^>]*>\s*<a\b([^>]*)>([\s\S]*?)<\/a>/);
    assert.ok(hero, `${slug} has no hero buttons`);
    assert.equal(visibleText(hero[2]).trim(), BUTTON, `${slug} hero leads with something else`);
    assert.match(hero[1], /class="btn solid"/, `${slug} hero trial button is not the solid button`);
    assert.match(decode(hero[1]), /href="\/get-started\/\?industry=/);
    assert.match(html, new RegExp(`data-mobile-cta[\\s\\S]*?>${BUTTON}</a>`), `${slug} mobile bar is not the trial`);
  }
});

test('without JavaScript the trial form renders but has no native path to the endpoint', () => {
  const html = page('get-started');
  const form = html.match(/<form\b([^>]*)>([\s\S]*?)<\/form>/);
  assert.ok(form, 'get-started has no form');
  const [, attrs, body] = form;
  // The endpoint wants JSON with a captcha token, which only the script sends.
  // A native post would send form fields and leave the visitor on raw JSON.
  assert.doesNotMatch(attrs, /\baction=/, 'the form must not post natively');
  assert.doesNotMatch(attrs, /\bmethod=/, 'the form must not post natively');
  assert.doesNotMatch(body, /\bformaction=/, 'no control may post natively');
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  assert.ok(!decode(markup).includes(ENDPOINT), 'the endpoint is reachable from markup without the script');
  assert.doesNotMatch(html, /premier-housing-demo\.pages\.dev\/api\/contact/, 'get-started still posts to the contact endpoint');

  for (const name of ['business_name', 'email', 'phone', 'industry']) {
    assert.match(body, new RegExp(`name="${name}"[^>]*required|required[^>]*name="${name}"`), `${name} is not a required field`);
  }
  for (const name of ['other_industry', 'website', 'notes', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
    assert.match(body, new RegExp(`name="${name}"`), `form is missing ${name}`);
  }
  // A plain post still says where the request came from.
  assert.match(body, /name="landing_page" value="\/get-started\/"/);
  // The Other field shows without the script, and nothing in the form starts hidden but the error.
  assert.doesNotMatch(body, /id="other-industry-field"[^>]*hidden/);
  assert.match(body, /<button type="submit"[^>]*>[\s\S]*?Start your 7-day free trial[\s\S]*?<\/button>/);
  assert.match(body, /class="cf-turnstile"[^>]*data-sitekey=/, 'the existing security check widget is missing');

  // The only submit control ships disabled, which also blocks submitting with
  // Enter, so without the script nothing can be sent.
  const buttons = [...body.matchAll(/<button\b([^>]*)>/g)].map((match) => match[1]);
  const submits = buttons.filter((attrs) => !/type="(button|reset)"/.test(attrs));
  assert.equal(submits.length, 1, 'the form must have exactly one submit control');
  assert.match(submits[0], /\bdisabled\b/, 'the submit button must start disabled');
  assert.doesNotMatch(body, /<input\b[^>]*type="(submit|image)"/, 'no other submit control is allowed');

  // The email route shows without the script, and also when the script fails
  // to load, so it is plain markup rather than a noscript block.
  const note = body.match(/<p\b([^>]*)id="noscript-note"([^>]*)>([\s\S]*?)<\/p>/);
  assert.ok(note, 'no fallback for visitors without JavaScript');
  assert.doesNotMatch(note[1] + note[2], /\bhidden\b/, 'the email note must be visible without the script');
  assert.match(note[3], /href="mailto:saeed@brackstonedigital\.co\.uk/);
  assert.match(visibleText(note[3]), /needs JavaScript/);
});

test('with JavaScript the script enables the button, hides the note and still posts JSON', () => {
  const source = readFileSync(join(root, 'src/pages/get-started.astro'), 'utf8');
  const script = source.slice(source.indexOf('<script>\n  import'));
  assert.match(script, /if \(btn\) btn\.disabled = false;/);
  assert.match(script, /noScriptNote\.hidden = true/);
  assert.match(script, /event\.preventDefault\(\)/);
  assert.match(script, /await sendTrialRequest\(\{[\s\S]*?body: trialRequestBody\(\{/);
});

// The trial answers calls, takes the details, texts the caller and passes the
// job on. Booking into a diary and handling emails or web forms are paid
// setups, so the hero and the bullet lists must not promise them.
const TRIAL_ONLY = [
  [/\bbook(s|ing)?\b/i, 'booking'],
  [/\bdiary\b/i, 'a diary'],
  [/\breads? (your )?emails?\b/i, 'reading emails'],
  [/\bweb forms?\b/i, 'web forms'],
];

function between(html, start, end) {
  const from = html.search(start);
  assert.ok(from >= 0, `missing ${start}`);
  const rest = html.slice(from);
  const to = rest.search(end);
  assert.ok(to > 0, `missing ${end} after ${start}`);
  return rest.slice(0, to);
}

for (const slug of ['ai-receptionist', 'estate-agents', 'garages']) {
  test(`${slug} hero and bullets promise only what the trial gives`, () => {
    const html = page(slug);
    const parts = {
      hero: between(html, /<section class="hero"/, /<div class="example"/),
      strip: between(html, /<section class="strip"/, /<\/section>/),
      includes: between(html, /<ul class="includes"/, /<\/ul>/),
    };
    assert.match(visibleText(parts.hero), /Start your 7-day free trial/, `${slug} hero lost the trial button`);
    for (const [name, part] of Object.entries(parts)) {
      const text = visibleText(part);
      for (const [pattern, what] of TRIAL_ONLY) {
        assert.doesNotMatch(text, pattern, `${slug} ${name} promises ${what}: "${text.match(pattern)?.[0]}"`);
      }
    }
  });
}

// The example call sits beside the trial button, so it must not show the
// receptionist booking a slot or confirming one. A person rings back to fix
// the time.
const NO_SLOT = [
  [/\bbooked\b/i, 'booked'],
  [/\bbook(ing)?\b(\s+\w+){0,3}\s+in\b/i, 'book in'],
  [/\bconfirmation\b/i, 'confirmation'],
];

for (const slug of ['ai-receptionist', 'estate-agents', 'garages']) {
  test(`${slug} example call and summary card confirm no slot`, () => {
    const html = page(slug);
    const example = between(html, /<div class="example"/, /<section class="listen"|<\/section>/);
    assert.match(example, /<dl class="booking"/, `${slug} example lost its summary card`);
    const text = visibleText(example);
    for (const [pattern, what] of NO_SLOT) {
      assert.doesNotMatch(text, pattern, `${slug} example call shows ${what}: "${text.match(pattern)?.[0]}"`);
    }
  });
}
