import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

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

function anchorHref(html, label) {
  const found = anchors(html).filter((anchor) => anchor.text === label);
  if (found.length !== 1) {
    throw new Error(`expected one "${label}" link, found ${found.length}`);
  }
  return found[0].href;
}

// Homepage hero contract: teardown goes to the contact page, and the trial
// link carries homepage UTM tags plus a placement in utm_content.
export function heroLinkProblems(html) {
  const problems = [];
  let teardown = '';
  let trialHref = '';
  try {
    teardown = anchorHref(html, 'Book a 15-minute teardown');
  } catch (error) {
    problems.push(error.message);
  }
  try {
    trialHref = anchorHref(html, 'Start a free trial');
  } catch (error) {
    problems.push(error.message);
  }
  if (teardown && teardown !== '/contact/') {
    problems.push(`teardown button points at ${teardown}, expected /contact/`);
  }
  if (trialHref) {
    let trial;
    try {
      trial = new URL(trialHref);
    } catch {
      problems.push(`trial button is not an absolute URL: ${trialHref}`);
      trial = null;
    }
    if (trial) {
      const path = trial.pathname.replace(/\/$/, '') || '/';
      if (trial.origin !== 'https://dashboard.brackstonedigital.co.uk' || path !== '/trial-request') {
        problems.push(`trial button points at ${trial.origin}${path}, expected the dashboard trial request`);
      }
      if (trial.searchParams.get('utm_source') !== 'website') {
        problems.push('trial link is missing utm_source=website');
      }
      if (trial.searchParams.get('utm_medium') !== 'homepage') {
        problems.push('trial link is missing utm_medium=homepage');
      }
      const placement = trial.searchParams.get('utm_content');
      if (!placement || !placement.trim()) {
        problems.push('trial link is missing a placement utm_content');
      }
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
  const { trialHref, adsVisibility, applyLandingUtms } = await import('../src/lib/ads-page.mjs');
  const { adsSettings } = await import('../src/data/ads/settings.mjs');
  const { garagesAd } = await import('../src/data/ads/garages.mjs');

  assert.equal(adsSettings.demoLine, '');
  assert.equal(adsSettings.startingPrice, '');
  assert.equal(garagesAd.searchIntent, 'AI receptionist for garages');
  assert.equal(garagesAd.slug, 'garages');
  assert.equal(garagesAd.utmCampaign, 'garages');
  assert.equal(garagesAd.vertical, 'garage');
  assert.equal(garagesAd.headline.includes(garagesAd.searchIntent), true);
  assert.equal(garagesAd.setupOffer, '');
  for (const key of ['intro', 'trialPromise', 'featureCards', 'faq']) {
    assert.ok(garagesAd[key], `garages entry is missing ${key}`);
  }

  assert.deepEqual(adsVisibility({ demoLine: '', startingPrice: '  ' }), {
    showCall: false,
    phone: '',
    callHref: '',
    showPrice: false,
    price: '',
  });
  assert.deepEqual(adsVisibility({ demoLine: ' 0800 111 222 ', startingPrice: '149' }), {
    showCall: true,
    phone: '0800 111 222',
    callHref: 'tel:0800111222',
    showPrice: true,
    price: '149',
  });
  assert.equal(adsVisibility({ demoLine: '+44 1274 000000', startingPrice: '90' }).callHref, 'tel:+441274000000');

  const hero = trialHref({ campaign: 'garages', placement: 'hero', vertical: 'garage' });
  assert.equal(
    hero,
    'https://dashboard.brackstonedigital.co.uk/trial-request?utm_source=google&utm_medium=cpc&utm_campaign=garages&utm_content=hero&vertical=garage',
  );

  const overridden = new URL(trialHref({
    campaign: 'garages',
    placement: 'hero',
    vertical: 'garage',
    landing: 'https://brackstonedigital.co.uk/garages/?utm_source=newsletter&utm_campaign=spring&utm_content=ad-1&utm_term=mot&utm_medium=',
  }));
  assert.equal(overridden.searchParams.get('utm_source'), 'newsletter');
  assert.equal(overridden.searchParams.get('utm_medium'), 'cpc');
  assert.equal(overridden.searchParams.get('utm_campaign'), 'spring');
  assert.equal(overridden.searchParams.get('utm_content'), 'ad-1');
  assert.equal(overridden.searchParams.get('utm_term'), 'mot');
  assert.equal(overridden.searchParams.get('vertical'), 'garage');

  const attrs = new Map([
    ['href', hero],
    ['data-trial', 'hero'],
    ['data-campaign', 'garages'],
    ['data-vertical', 'garage'],
  ]);
  const node = {
    getAttribute: (name) => attrs.get(name) ?? null,
    setAttribute: (name, value) => attrs.set(name, value),
  };
  applyLandingUtms({ querySelectorAll: () => [node] }, '?utm_campaign=spring');
  assert.equal(new URL(attrs.get('href')).searchParams.get('utm_campaign'), 'spring');
  assert.equal(new URL(attrs.get('href')).searchParams.get('utm_content'), 'hero');
});

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

test('hero link checker rejects a bad teardown or a trial link without UTM tags', () => {
  const good = [
    '<a href="/contact/">Book a 15-minute teardown</a>',
    '<a href="https://dashboard.brackstonedigital.co.uk/trial-request?utm_source=website&amp;utm_medium=homepage&amp;utm_content=hero">Start a free trial</a>',
  ].join('');
  assert.deepEqual(heroLinkProblems(good), []);
  assert.deepEqual(heroLinkProblems(good.replaceAll('&amp;', '&#38;')), []);

  const wrongTeardown = good.replace('href="/contact/"', 'href="/book/"');
  assert.ok(heroLinkProblems(wrongTeardown).some((problem) => problem.includes('/contact/')));

  const wrongTrial = good.replace('/trial-request', '/login');
  assert.ok(heroLinkProblems(wrongTrial).some((problem) => problem.includes('trial request')));

  const missingPlacement = good.replace('&amp;utm_content=hero', '');
  assert.ok(heroLinkProblems(missingPlacement).some((problem) => problem.includes('utm_content')));

  const missingMedium = good.replace('utm_medium=homepage', 'utm_medium=email');
  assert.ok(heroLinkProblems(missingMedium).some((problem) => problem.includes('utm_medium')));

  const missingSource = good.replace('utm_source=website', 'utm_source=google');
  assert.ok(heroLinkProblems(missingSource).some((problem) => problem.includes('utm_source')));
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
  let previewHtml;
  try {
    previewHtml = readFileSync(previewPath, 'utf8');
  } catch {
    assert.fail('/preview/ does not exist yet');
  }

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

  assert.match(
    previewHtml,
    /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i,
    'preview page is missing noindex',
  );
  assert.match(previewHtml, /Book a teardown/);
  assert.match(previewHtml, /Illustrative/);
  assert.match(previewHtml, /Privacy/);
  assert.match(previewHtml, /\/fonts\/Geist-Variable\.woff2/);
  assert.match(previewHtml, /\/fonts\/GeistMono-Variable\.woff2/);
  assert.doesNotMatch(previewHtml, /fonts\.googleapis\.com/);
  assert.doesNotMatch(previewHtml, /<script\b/i);
  assert.deepEqual(heroLinkProblems(previewHtml), []);
  assert.match(previewHtml, /Every enquiry handled/);
  assert.match(previewHtml, /Running on its own/);
  assert.match(previewHtml, /Calls, emails, web forms/);
  assert.match(previewHtml, /Quote for a rewire/);
  assert.match(previewHtml, /Book a viewing/);
  assert.match(previewHtml, /Booking line, how can I help/);
  assert.match(previewHtml, /Email read/);
  assert.match(previewHtml, /Form received/);
  assert.match(previewHtml, /Answered on first ring/);

  assert.match(previewHtml, /id="what"/);
  assert.match(previewHtml, /Every enquiry answered, whatever the channel/);
  assert.match(previewHtml, /The admin moves itself on/);
  assert.match(previewHtml, /One dashboard for all of it/);
  assert.match(previewHtml, /AI phone receptionist[\s\S]{0,240}Most popular/);
  assert.match(previewHtml, /Email enquiry handling/);
  assert.match(previewHtml, /Web form and portal enquiries/);
  assert.match(previewHtml, /Bookings and confirmations/);
  assert.match(previewHtml, /Custom dashboards/);

  assert.match(previewHtml, /id="day"/);
  assert.match(previewHtml, /You are not losing work to better firms/);
  assert.match(previewHtml, /Tuesday-afternoon problem/);
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
    assert.match(previewHtml, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.ok((previewHtml.match(/>Without</g) ?? []).length >= 5, 'day story is missing the without state');
  assert.ok((previewHtml.match(/>With Brackstone</g) ?? []).length >= 5, 'day story is missing the with state');

  assert.match(previewHtml, /id="tools"/);
  assert.match(previewHtml, /Keep the software you run on/);
  for (const tool of ['ServiceM8', 'Stripe', 'Twilio', 'Square', 'DVLA']) {
    assert.match(previewHtml, new RegExp(`\\b${tool}\\b`));
  }

  assert.match(previewHtml, /id="built"/);
  for (const hint of [
    'An AI receptionist that books MOTs and services',
    'A dealer website with an AI line that knows the stock',
    'Portal enquiries turned into booked viewings',
    'Reporting straight from a job-management system',
    'A quoting helper that works from drawings',
    'A multi-business dashboard with billing built in',
  ]) {
    assert.match(previewHtml, new RegExp(hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(previewHtml, /Things we have built[\s\S]{0,1600}Illustrative/);

  const previewCss = linkedCss(previewHtml);
  assert.deepEqual(sectionLayoutProblems(previewCss), []);

  const homeHtml = readFileSync(join(dist, 'index.html'), 'utf8');
  assert.match(homeHtml, /fonts\.googleapis\.com/);
  assert.doesNotMatch(homeHtml, /Geist-Variable\.woff2/);

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
  assert.doesNotMatch(garagesHtml, /£/, 'empty starting price still renders a price');
  assert.doesNotMatch(garagesHtml, /fonts\.googleapis\.com/);
  assert.match(garagesHtml, /Illustrative/);
  assert.match(garagesHtml, /\/fonts\/Geist-Variable\.woff2/);

  const hrefs = trialHrefs(garagesHtml);
  assert.ok(hrefs.length > 0, 'garages page has no trial links');
  const placements = hrefs.map((href) => new URL(href).searchParams.get('utm_content')).sort();
  assert.deepEqual(placements, ['final', 'header', 'hero', 'mobile-bar']);
  for (const href of hrefs) {
    const url = new URL(href);
    assert.equal(`${url.origin}${url.pathname}`, 'https://dashboard.brackstonedigital.co.uk/trial-request');
    assert.equal(url.searchParams.get('utm_source'), 'google');
    assert.equal(url.searchParams.get('utm_medium'), 'cpc');
    assert.equal(url.searchParams.get('utm_campaign'), 'garages');
    assert.equal(url.searchParams.get('vertical'), 'garage');
  }

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

  const pages = walkHtml(dist).filter((path) => {
    const rel = relative(dist, path);
    return !isPremierHousingDemo(rel) && !isCopiedFromPublic(rel);
  });
  const problems = pages.flatMap((path) => copyProblems(readFileSync(path, 'utf8'), relative(dist, path)));
  assert.deepEqual(problems, []);
});
