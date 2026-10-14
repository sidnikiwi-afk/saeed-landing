import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SIGNUP_INDUSTRY_GROUPS } from '../src/lib/get-started.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const bannedToolNames = [
  'Zapier',
  'Make',
  'n8n',
  'HubSpot',
  'Xero',
  'QuickBooks',
  'Calendly',
  'WhatsApp',
];

const namedEntities = {
  mdash: '\u2014',
};

function decodeCodePoint(code) {
  if (!Number.isInteger(code) || code < 0 || code > 0x10FFFF || (code >= 0xD800 && code <= 0xDFFF)) {
    return '';
  }
  return String.fromCodePoint(code);
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => decodeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => decodeCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => namedEntities[name] ?? match);
}

export function copyProblems(html, relPath = 'page.html') {
  const text = decodeHtmlEntities(html);
  const problems = [];
  if (text.includes('\u2014')) {
    problems.push(`${relPath} contains an em dash`);
  }
  if (/\p{Extended_Pictographic}/u.test(text)) {
    problems.push(`${relPath} contains an emoji`);
  }
  for (const name of bannedToolNames) {
    const flags = name === 'Make' ? '' : 'i';
    if (new RegExp(`\\b${name}\\b`, flags).test(text)) {
      problems.push(`${relPath} names ${name}`);
    }
  }
  return problems;
}

function walkHtml(dir, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkHtml(path, found);
    else if (name.endsWith('.html')) found.push(path);
  }
  return found;
}

function isPremierHousingDemo(relPath) {
  return relPath.split('/').some((part) => part.startsWith('premier-housing-demo'));
}

export function mediaBlocks(css) {
  const blocks = [];
  const start = /@media[^{]*\{/g;
  let match;
  while ((match = start.exec(css))) {
    let index = match.index + match[0].length;
    let depth = 1;
    while (index < css.length && depth > 0) {
      if (css[index] === '{') depth += 1;
      else if (css[index] === '}') depth -= 1;
      index += 1;
    }
    blocks.push({
      query: match[0].slice(0, -1),
      body: css.slice(match.index + match[0].length, index - 1),
    });
  }
  return blocks;
}

function linkedCss(html) {
  const parts = [];
  for (const match of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    parts.push(match[1]);
  }
  for (const match of html.matchAll(/href="([^"]+\.css)"/g)) {
    const relUrl = decodeAttr(match[1]).replace(/^\//, '');
    parts.push(readFileSync(join(dist, relUrl), 'utf8'));
  }
  return parts.join('\n');
}

export function sectionLayoutProblems(css) {
  const problems = [];
  const blocks = mediaBlocks(css);
  const pillarRule = /\[data-pillars\][^{]*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/;
  if (!pillarRule.test(css)) {
    problems.push('pillars are not three equal columns');
  }
  const pillarPhone = blocks.filter(
    (block) => /max-width:\s*960px/.test(block.query) && block.body.includes('data-pillars'),
  );
  if (!pillarPhone.some((block) => /grid-template-columns:\s*1fr\s*[;}]/.test(block.body))) {
    problems.push('pillars do not stack on a phone');
  }

  const phone = blocks.filter(
    (block) => /max-width:\s*860px/.test(block.query) && block.body.includes('data-day-story'),
  );
  const phoneCss = phone.map((block) => block.body).join('\n');
  if (!/flex-direction:\s*column/.test(phoneCss) || !/opacity:\s*1/.test(phoneCss)) {
    problems.push('day story is not readable on a phone');
  }

  const reduced = blocks.filter(
    (block) => /prefers-reduced-motion:\s*reduce/.test(block.query) && block.body.includes('data-day-story'),
  );
  const reducedCss = reduced.map((block) => block.body).join('\n');
  if (!/opacity:\s*1/.test(reducedCss) || /opacity:\s*0/.test(reducedCss) || /height:\s*320vh/.test(reducedCss)) {
    problems.push('day story needs motion to be read');
  }

  const motion = blocks.filter(
    (block) =>
      /min-width:\s*861px/.test(block.query) &&
      /prefers-reduced-motion:\s*no-preference/.test(block.query) &&
      block.body.includes('data-day-story'),
  );
  if (motion.length === 0) {
    problems.push('day story motion is not limited to wide screens that allow motion');
  }
  return problems;
}

function decodeAttr(value) {
  return decodeHtmlEntities(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function anchors(html) {
  const found = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const hrefMatch = match[1].match(/href\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) continue;
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    found.push({ href: decodeAttr(hrefMatch[2]), text });
  }
  return found;
}

function heroRegion(html) {
  const match = html.match(/<section\b[^>]*class="[^"]*\bhero\b[^"]*"[\s\S]*?<\/section>/);
  return match ? match[0] : html;
}

function anchorHref(html, label) {
  const found = anchors(heroRegion(html)).filter((anchor) => anchor.text === label);
  if (found.length !== 1) {
    throw new Error(`expected one "${label}" link, found ${found.length}`);
  }
  return found[0].href;
}

// Tracking and consent scripts may still know about the trial URL, so only
// markup counts as a public link.
function visibleMarkup(html) {
  return html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
}

// Homepage hero contract: the teardown button goes to the contact page, and
// no public trial link is allowed anywhere on the page.
export function heroLinkProblems(html) {
  const problems = [];
  let teardown = '';
  try {
    teardown = anchorHref(html, 'Book a 15-minute teardown');
  } catch (error) {
    problems.push(error.message);
  }
  if (teardown && teardown !== '/contact/') {
    problems.push(`teardown button points at ${teardown}, expected /contact/`);
  }
  if (/dashboard\.brackstonedigital\.co\.uk\/trial-request/.test(visibleMarkup(html))) {
    problems.push('page still links to the trial request');
  }
  return problems;
}

export function trialCopyProblems(html, relPath = 'page') {
  const text = visibleMarkup(html);
  const problems = [];
  for (const phrase of ['free trial', 'Start free trial', 'Start a free trial', 'No card needed', 'Try it free']) {
    if (new RegExp(phrase, 'i').test(text)) {
      problems.push(`${relPath} still says "${phrase}"`);
    }
  }
  return problems;
}

function isCopiedFromPublic(relPath) {
  const top = relPath.split('/')[0];
  if (!top || top === 'index.html') return false;
  const publicPath = join(root, 'public', top);
  return existsSync(publicPath) && statSync(publicPath).isDirectory();
}

test('ads links and demo line follow the page settings', async () => {
  const { signupHref, adsVisibility, applySignupParams } = await import('../src/lib/ads-page.mjs');
  const { adsSettings } = await import('../src/data/ads/settings.mjs');
  const { garagesAd } = await import('../src/data/ads/garages.mjs');

  assert.equal(adsSettings.demoLine, '');
  assert.equal(garagesAd.searchIntent, 'AI receptionist for garages');
  assert.equal(garagesAd.slug, 'garages');
  assert.equal(garagesAd.utmCampaign, 'garages');
  assert.equal(garagesAd.vertical, 'garage');
  assert.equal(garagesAd.headline.includes(garagesAd.searchIntent), true);
  assert.equal(garagesAd.setupOffer, '');
  for (const key of ['intro', 'trialPromise', 'featureCards', 'faq']) {
    assert.ok(garagesAd[key], `garages entry is missing ${key}`);
  }

  assert.deepEqual(adsVisibility({ demoLine: '' }), {
    showCall: false,
    phone: '',
    callHref: '',
  });
  assert.deepEqual(adsVisibility({ demoLine: ' 0800 111 222 ' }), {
    showCall: true,
    phone: '0800 111 222',
    callHref: 'tel:0800111222',
  });
  assert.equal(adsVisibility({ demoLine: '+44 1274 000000' }).callHref, 'tel:+441274000000');

  const hero = signupHref({ industry: 'garages', campaign: 'garages', placement: 'hero' });
  assert.equal(
    hero,
    '/get-started/?industry=garages&utm_source=google&utm_medium=cpc&utm_campaign=garages&utm_content=hero',
  );

  const overridden = new URL(signupHref({
    industry: 'garages',
    campaign: 'garages',
    placement: 'hero',
    landing: 'https://brackstonedigital.co.uk/garages/?utm_source=newsletter&utm_campaign=spring&utm_content=ad-1&utm_term=mot&utm_medium=',
  }), 'https://brackstonedigital.co.uk');
  assert.equal(overridden.searchParams.get('utm_source'), 'newsletter');
  assert.equal(overridden.searchParams.get('utm_medium'), 'cpc');
  assert.equal(overridden.searchParams.get('utm_campaign'), 'spring');
  assert.equal(overridden.searchParams.get('utm_content'), 'ad-1');
  assert.equal(overridden.searchParams.get('utm_term'), 'mot');
  assert.equal(overridden.searchParams.get('gclid'), null);

  const attrs = new Map([
    ['href', hero],
    ['data-signup', ''],
    ['data-industry', 'garages'],
    ['data-campaign', 'garages'],
    ['data-placement', 'hero'],
  ]);
  const node = {
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, value),
  };
  applySignupParams({ querySelectorAll: () => [node] }, '?utm_campaign=spring');
  assert.equal(new URL(attrs.get('href'), 'https://brackstonedigital.co.uk').searchParams.get('utm_campaign'), 'spring');
  assert.equal(new URL(attrs.get('href'), 'https://brackstonedigital.co.uk').searchParams.get('utm_content'), 'hero');
  assert.equal(new URL(attrs.get('href'), 'https://brackstonedigital.co.uk').searchParams.get('utm_source'), 'google');
});

function assertSignupDefaults(signups, industry, campaign) {
  assert.ok(signups.length >= 4, `${campaign} is missing sign-up buttons`);
  const placements = new Set();
  for (const anchor of signups) {
    assert.ok(
      anchor.href.startsWith(`/get-started/?industry=${industry}`),
      `${campaign} sign-up link does not point at /get-started/`,
    );
    const params = new URL(anchor.href, 'https://brackstonedigital.co.uk').searchParams;
    assert.equal(params.get('utm_source'), 'google', `${campaign} sign-up is missing utm_source=google`);
    assert.equal(params.get('utm_medium'), 'cpc', `${campaign} sign-up is missing utm_medium=cpc`);
    assert.equal(params.get('utm_campaign'), campaign, `${campaign} sign-up is missing its campaign`);
    assert.ok(params.get('utm_content'), `${campaign} sign-up is missing utm_content`);
    placements.add(params.get('utm_content'));
  }
  for (const placement of ['header', 'hero', 'price', 'mobile-bar', 'final']) {
    assert.ok(placements.has(placement), `${campaign} is missing the ${placement} sign-up link`);
  }
}

function trialHrefs(html) {
  const hrefs = [];
  const re = /href="(https:\/\/dashboard\.brackstonedigital\.co\.uk\/trial-request[^"]*)"/g;
  for (const match of html.matchAll(re)) hrefs.push(decodeAttr(match[1]));
  return hrefs;
}

test('copy scanner flags em dashes, emoji, and banned tool names', () => {
  assert.deepEqual(copyProblems('Book a teardown'), []);
  assert.ok(copyProblems('A real line \u2014 and more').length > 0);
  assert.ok(copyProblems('A real line &mdash; and more').some((problem) => problem.includes('em dash')));
  assert.ok(copyProblems('A real line &#8212; and more').some((problem) => problem.includes('em dash')));
  assert.ok(copyProblems('Status \u{1F389}').length > 0);
  assert.ok(copyProblems('Status &#127881;').some((problem) => problem.includes('emoji')));
  assert.ok(copyProblems('Status &#x1F389;').some((problem) => problem.includes('emoji')));
  for (const name of bannedToolNames) {
    assert.ok(copyProblems(`We use ${name} here.`).some((problem) => problem.includes(name)));
  }
  assert.deepEqual(copyProblems('we make admin easier'), []);
  assert.ok(copyProblems('We use Make here.').some((problem) => problem.includes('Make')));
});

test('hero link checker rejects a bad teardown link or a leftover trial link', () => {
  const good = '<a href="/contact/">Book a 15-minute teardown</a>';
  assert.deepEqual(heroLinkProblems(good), []);

  const wrongTeardown = good.replace('href="/contact/"', 'href="/book/"');
  assert.ok(heroLinkProblems(wrongTeardown).some((problem) => problem.includes('/contact/')));

  const missingTeardown = '';
  assert.ok(heroLinkProblems(missingTeardown).some((problem) => problem.includes('teardown')));

  const withTrial = [
    good,
    '<a href="https://dashboard.brackstonedigital.co.uk/trial-request?utm_source=website">Start a free trial</a>',
  ].join('');
  assert.ok(heroLinkProblems(withTrial).some((problem) => problem.includes('trial request')));
});

test('built site hides the preview and keeps copy clean', () => {
  execFileSync('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    // A dummy site key keeps the Turnstile widget in the built contact page
    // even when the real key is not configured locally.
    env: {
      ...process.env,
      PUBLIC_TURNSTILE_SITE_KEY: process.env.PUBLIC_TURNSTILE_SITE_KEY || 'test-site-key',
    },
  });

  const previewPath = join(dist, 'preview', 'index.html');
  assert.equal(existsSync(previewPath), false, '/preview/ must not exist');

  // The contact form must keep posting to the same endpoint with the same
  // fields, so the redesign cannot silently break enquiries.
  const contactHtml = readFileSync(join(dist, 'contact', 'index.html'), 'utf8');
  assert.match(
    contactHtml,
    /premier-housing-demo\.pages\.dev\/api\/contact/,
    'contact form must post to the same endpoint',
  );
  for (const field of ['name', 'email', 'business', 'message', 'website']) {
    assert.match(
      contactHtml,
      new RegExp(`name=["']${field}["']`),
      `contact form is missing the ${field} field`,
    );
  }
  assert.match(contactHtml, /cf-turnstile-response/, 'contact form must send the Turnstile token field');
  assert.match(contactHtml, /data-sitekey=/, 'contact page must render the Turnstile widget');
  assert.match(contactHtml, /challenges\.cloudflare\.com\/turnstile/, 'contact page must load Turnstile');

  const homeHtml = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.match(
    homeHtml,
    /<title>Brackstone - the work your business drops, running on its own<\/title>/,
  );
  assert.match(homeHtml, /rel="canonical"[^>]*href="https:\/\/brackstonedigital\.co\.uk\/"/);
  assert.doesNotMatch(homeHtml, /noindex/i, 'the homepage must be indexed');
  assert.doesNotMatch(homeHtml, /\/preview\//, 'homepage links must not point at /preview/');
  assert.match(homeHtml, /href="\/#what"/);
  assert.match(homeHtml, /Book a teardown/);
  assert.match(
    homeHtml,
    /<input[^>]*class="menu-toggle[^"]*"[^>]*type="checkbox"[^>]*id="nav-menu-toggle"/,
    'the phone menu needs a no-JavaScript checkbox toggle',
  );
  assert.match(homeHtml, /<label[^>]*for="nav-menu-toggle"[^>]*>Menu<\/label>/);
  const navCss = linkedCss(homeHtml);
  const phoneNav = mediaBlocks(navCss).filter((block) => /max-width:\s*860px/.test(block.query));
  assert.ok(
    phoneNav.some((block) => /\.links[^{,]*\{[^}]*display:\s*none/.test(block.body)),
    'at 860px and below the menu links start closed',
  );
  assert.ok(
    phoneNav.some((block) => /\.menu-toggle[^{:]*:checked\s*~\s*\.links[^{]*\{[^}]*display:\s*grid/.test(block.body)),
    'the checked toggle opens the menu',
  );
  assert.match(navCss, /\.menu-button[^{]*\{[^}]*display:\s*none/, 'desktop has no menu button');
  assert.match(homeHtml, /Illustrative/);
  assert.match(homeHtml, /Privacy/);
  assert.match(homeHtml, /\/fonts\/Geist-Variable\.woff2/);
  assert.match(homeHtml, /\/fonts\/GeistMono-Variable\.woff2/);
  assert.doesNotMatch(homeHtml, /fonts\.googleapis\.com/);
  assert.deepEqual(heroLinkProblems(homeHtml), []);
  assert.deepEqual(trialCopyProblems(homeHtml, 'homepage'), []);
  assert.match(homeHtml, /Every enquiry handled/);
  assert.match(homeHtml, /Running on its own/);
  assert.match(homeHtml, /Calls, emails, web forms/);
  assert.match(homeHtml, /Quote for a rewire/);
  assert.match(homeHtml, /Book a viewing/);
  assert.match(homeHtml, /Booking line, how can I help/);
  assert.match(homeHtml, /Email read/);
  assert.match(homeHtml, /Form received/);
  assert.match(homeHtml, /Answered on first ring/);

  assert.match(homeHtml, /id="what"/);
  assert.match(homeHtml, /Every enquiry answered, whatever the channel/);
  assert.match(homeHtml, /The admin moves itself on/);
  assert.match(homeHtml, /One dashboard for all of it/);
  assert.match(homeHtml, /AI phone receptionist[\s\S]{0,240}Most popular/);
  assert.match(homeHtml, /Email enquiry handling/);
  assert.match(homeHtml, /Web form and portal enquiries/);
  assert.match(homeHtml, /Bookings and confirmations/);
  assert.match(homeHtml, /Custom dashboards/);

  assert.match(homeHtml, /id="day"/);
  assert.match(homeHtml, /You are not losing work to better firms/);
  assert.match(homeHtml, /Tuesday-afternoon problem/);
  for (const line of [
    'A quote request lands in a busy inbox',
    'A viewing request comes through the website',
    'A customer rings while everyone is on a job',
    'A quote from last week has gone quiet',
    'The phone rings after you have gone home',
    'It sits under forty other emails until Friday.',
    'Read, job created, reply sent with survey slots.',
    'Five enquiries across three channels. None dropped.',
  ]) {
    assert.match(homeHtml, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.ok((homeHtml.match(/>Without</g) ?? []).length >= 5, 'day story is missing the without state');
  assert.ok((homeHtml.match(/>With Brackstone</g) ?? []).length >= 5, 'day story is missing the with state');

  assert.match(homeHtml, /id="tools"/);
  assert.match(homeHtml, /Keep the software you run on/);
  for (const tool of ['ServiceM8', 'Stripe', 'Twilio', 'Square', 'DVLA']) {
    assert.match(homeHtml, new RegExp(`\\b${tool}\\b`));
  }

  assert.match(homeHtml, /id="built"/);
  for (const hint of [
    'An AI receptionist that books MOTs and services',
    'A dealer website with an AI line that knows the stock',
    'Portal enquiries turned into booked viewings',
    'Reporting straight from a job-management system',
    'A quoting helper that works from drawings',
    'A multi-business dashboard with billing built in',
  ]) {
    assert.match(homeHtml, new RegExp(hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(homeHtml, /Things we have built[\s\S]{0,1600}Illustrative/);

  const previewCss = linkedCss(homeHtml);
  assert.deepEqual(sectionLayoutProblems(previewCss), []);

  const garagesPath = join(dist, 'garages', 'index.html');
  let garagesHtml;
  try {
    garagesHtml = readFileSync(garagesPath, 'utf8');
  } catch {
    assert.fail('/garages/ does not exist yet');
  }

  assert.match(
    garagesHtml,
    /<h1\b[^>]*>[\s\S]*AI receptionist for garages[\s\S]*<\/h1>/i,
    'garages headline does not repeat the search',
  );
  assert.doesNotMatch(garagesHtml, /noindex/i, 'garages page must be indexed');
  assert.doesNotMatch(garagesHtml, /tel:/i, 'empty demo line still renders a call link');
  assert.match(garagesHtml, /<p class="plan"[^>]*>Garage edition<\/p>/, 'garage plan name is missing');
  assert.match(garagesHtml, /<p class="amount"[^>]*>£249 a month<\/p>/, 'garage price line is missing');
  assert.match(garagesHtml, /400 minutes included/, 'garage minutes line is missing');
  assert.match(garagesHtml, /<p class="lead"[^>]*>£299 one-off setup\. We build and test it for you\.<\/p>/, 'garage setup line is missing');
  assert.match(garagesHtml, /Extra minutes 45p each\./, 'extra minutes line is missing');
  assert.doesNotMatch(garagesHtml, /£99|£149|150 minutes/, 'garages page shows the general plan');
  assert.match(garagesHtml, /<h3[^>]*>Workshop mode<\/h3>/, 'workshop mode card is missing');
  for (const action of ['Call back', 'Quote', 'Booked', 'Complete', 'Follow up']) {
    assert.match(garagesHtml, new RegExp(`<li[^>]*>${action}</li>`), `workshop mode is missing ${action}`);
  }
  assert.doesNotMatch(garagesHtml, /teardown/i, 'ads page still says teardown');
  assert.doesNotMatch(garagesHtml, /Hear it answer a call/, 'empty sample call still renders a link');
  assert.doesNotMatch(garagesHtml, /fonts\.googleapis\.com/);
  assert.match(garagesHtml, /garage caller/, 'garages feature heading is missing');
  assert.match(garagesHtml, /Illustrative/);
  assert.match(garagesHtml, /\/fonts\/Geist-Variable\.woff2/);

  // Ads pages send the visitor to the site's trial form, never the
  // dashboard's old trial request page (ADR 0005).
  assert.deepEqual(trialHrefs(garagesHtml), [], 'garages page still links to the dashboard trial request');
  const garagesSignup = anchors(garagesHtml).filter((anchor) => anchor.text === 'Start your 7-day free trial');
  assert.ok(garagesSignup.length >= 4, 'garages page is missing sign-up buttons');
  assertSignupDefaults(garagesSignup, 'garages', 'garages');

  const styles = [...garagesHtml.matchAll(/<(?:link[^>]+href="([^"]+\.css)"|style\b[^>]*>)/g)];
  const cssParts = [garagesHtml];
  for (const match of garagesHtml.matchAll(/href="([^"]+\.css)"/g)) {
    const relUrl = match[1].replace(/^\//, '');
    cssParts.push(readFileSync(join(dist, relUrl), 'utf8'));
  }
  assert.match(cssParts.join('\n'), /prefers-reduced-motion/, 'ads page CSS drops reduced-motion support');
  assert.equal(styles.length > 0, true);

  const sitemapFiles = readdirSync(dist).filter((name) => /^sitemap.*\.xml$/.test(name));
  assert.ok(sitemapFiles.length > 0, 'expected a sitemap in dist');
  let sitemapText = '';
  for (const name of sitemapFiles) {
    const xml = readFileSync(join(dist, name), 'utf8');
    sitemapText += xml;
    assert.doesNotMatch(xml, /\/preview\/?/i, `${name} includes the preview URL`);
  }
  assert.match(sitemapText, /\/garages\/?/, 'sitemap is missing /garages/');
  assert.doesNotMatch(sitemapText, /\/get-started\/?/i, 'sitemap includes /get-started/');

  const signupHtml = readFileSync(join(dist, 'get-started', 'index.html'), 'utf8');
  assert.match(signupHtml, /noindex/i, 'sign-up page must be noindex');
  assert.match(signupHtml, /We'll set up your receptionist within 7 days, usually sooner, and email you when it's live\./);
  // Without JavaScript the general plan shows with a garage note. Both plans
  // are in the page so the script can show the garage one for ?industry=garages.
  const visiblePlans = [...signupHtml.matchAll(/<div class="plan after"[^>]*data-plan="(\w+)"[^>]*>/g)]
    .filter((match) => !/\shidden\b/.test(match[0]))
    .map((match) => match[1]);
  assert.deepEqual(visiblePlans, ['receptionist']);
  assert.match(signupHtml, /data-plan="garage"[^>]*hidden|hidden[^>]*data-plan="garage"/);
  assert.match(signupHtml, /From £99 a month/);
  assert.match(signupHtml, /150 minutes included/);
  assert.match(signupHtml, /£149 one-off setup\. We build and test it for you\./);
  assert.match(signupHtml, /£249 a month/);
  assert.match(signupHtml, /400 minutes included/);
  assert.match(signupHtml, />£299 one-off setup\. We build and test it for you\.</);
  for (const [key, name] of [['receptionist', 'AI receptionist'], ['garage', 'Garage edition']]) {
    assert.match(
      signupHtml,
      new RegExp(`data-plan="${key}"[^>]*>\\s*<p class="plan-name"[^>]*>${name}</p>\\s*<p class="price"`),
      `sign-up ${key} plan is missing its name above the price`,
    );
  }
  assert.match(signupHtml, /Extra minutes 45p each\./);
  assert.match(signupHtml, /<p class="extra"[^>]*id="garage-note"[^>]*>Garage edition from £249<\/p>/);
  for (const [slug, industry, campaign] of [
    ['ai-receptionist', 'general', 'ai-receptionist'],
    ['estate-agents', 'estate-agents', 'estate-agents'],
  ]) {
    const otherHtml = readFileSync(join(dist, slug, 'index.html'), 'utf8');
    assert.doesNotMatch(otherHtml, /Workshop mode/, `${slug} shows the garage workshop mode`);
    assertSignupDefaults(
      anchors(otherHtml).filter((anchor) => anchor.text === 'Start your 7-day free trial'),
      industry,
      campaign,
    );
  }
  const generalHtml = readFileSync(join(dist, 'ai-receptionist', 'index.html'), 'utf8');
  assert.match(generalHtml, /Illustrative role-play with AI voices, not a real customer call\./);
  assert.doesNotMatch(garagesHtml, /Illustrative role-play with AI voices/);
  assert.match(signupHtml, /action="https:\/\/dashboard\.brackstonedigital\.co\.uk\/api\/trial-requests"/);
  for (const field of ['email', 'business_name', 'industry', 'other_industry', 'phone', 'notes', 'website', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'landing_page']) {
    assert.match(
      signupHtml,
      new RegExp(`name=["']${field}["']`),
      `sign-up form is missing the ${field} field`,
    );
  }
  assert.match(signupHtml, /<label[^>]*for="email"[^>]*>Email<\/label>/);
  assert.match(signupHtml, /<label[^>]*for="business"[^>]*>Business name<\/label>/);
  assert.match(signupHtml, /<label[^>]*for="chosen-industry"[^>]*>Industry<\/label>/);
  assert.match(signupHtml, /<label[^>]*for="phone"[^>]*>Phone<\/label>/);
  assert.match(signupHtml, /<label[^>]*for="missed"[^>]*>What happens to calls you miss today\? <span class="optional"[^>]*>\(optional\)<\/span><\/label>/);
  // Every industry option sits in its group, after the empty "Choose one".
  const select = signupHtml.match(/<select[^>]*id="chosen-industry"[^>]*>([\s\S]*?)<\/select>/)[1];
  assert.match(select, /^\s*<option value=""[^>]*selected[^>]*>Choose one<\/option>/);
  const builtGroups = [...select.matchAll(/<optgroup label="([^"]+)"[^>]*>([\s\S]*?)<\/optgroup>/g)].map((match) => ({
    group: decodeAttr(match[1]),
    options: [...match[2].matchAll(/<option value="([^"]+)"[^>]*>([^<]+)<\/option>/g)].map((option) => {
      assert.equal(decodeAttr(option[1]), decodeAttr(option[2]));
      return decodeAttr(option[2]);
    }),
  }));
  assert.deepEqual(builtGroups, SIGNUP_INDUSTRY_GROUPS);
  // Without JavaScript the Other field is always there.
  assert.match(signupHtml, /<div class="field"[^>]*id="other-industry-field"[^>]*>/);
  assert.doesNotMatch(signupHtml, /id="other-industry-field"[^>]*hidden/);
  assert.match(signupHtml, /<label[^>]*for="other-industry"[^>]*>What kind of business\?<\/label>/);
  assert.match(signupHtml, /<input[^>]*name="other_industry"/);
  assert.match(signupHtml, /cf-turnstile-response|data-sitekey=/);

  const pages = walkHtml(dist).filter((path) => {
    const rel = relative(dist, path);
    return !isPremierHousingDemo(rel) && !isCopiedFromPublic(rel);
  });
  const problems = pages.flatMap((path) => copyProblems(readFileSync(path, 'utf8'), relative(dist, path)));
  assert.deepEqual(problems, []);
});
