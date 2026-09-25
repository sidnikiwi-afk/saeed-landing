# Spec: Brackstone site redesign and ads pages

Status: ready-for-agent
Source: redesign handoff (`brackstone-dashboard` repo, branch `prototype/site-redesign`, `demos/cloudflare-demo-pages/site-redesign/HANDOFF.md`) and the grill session of 2026-09-24.
Language: see `CONTEXT.md`. Decisions: see `docs/adr/`.

## Problem Statement

Brackstone's homepage no longer matches what Brackstone sells. It reads as a narrow service, while the business now sells three equal pillars: enquiries on every channel, admin automation, and custom dashboards and integrations. There is also nowhere good to send paid search traffic. A garage owner who searches "AI receptionist for garages" and clicks an ad would land on a general homepage that does not repeat what they searched for, does not lead with the free trial, and gives Google Ads nothing to measure except a visit. Saeed cannot start Google Ads until there are fast, focused ads pages and a way to count real free trial requests.

## Solution

Rebuild the homepage in the chosen Design B ("Product-led, balanced") so that it sells the three pillars and leads with the teardown. Build it on a hidden preview route, section by section, and swap it in as the homepage in one release. Restyle the contact and privacy pages to match.

Add ads pages, one per search intent, from one shared template: garages first, then estate agents, then a general AI receptionist page. Each ads page repeats the search in its headline, sells only the AI receptionist, and leads with the free trial. The starting price appears once it is set. The first release has no demo line: the page shows an illustrative example call instead, and the template keeps a demo line setting, empty, for later.

Add cookie consent and tracking so that each free trial request submitted on the dashboard counts as the primary conversion for the ad that brought the visitor, and taps on the trial button and the demo line count as secondary conversions.

## User Stories

### Homepage visitor

1. As a small business owner, I want the homepage headline to say plainly that every enquiry is handled and every job moves on, so that I know within seconds whether Brackstone is for me.
2. As a small business owner, I want to see the three pillars given equal weight, so that I understand Brackstone does more than answer phones.
3. As a small business owner, I want the AI receptionist marked as the most popular option inside the enquiries pillar, so that I know where most customers start.
4. As a small business owner, I want a clear "Book a 15-minute teardown" button, so that I can talk to someone about my own business.
5. As a small business owner, I want a secondary "Start a free trial" button, so that I can try the receptionist without a call.
6. As a small business owner, I want the hero to show an email, a web form and a call being handled, with an automation log, so that I can see what "handled" means in practice.
7. As a small business owner, I want to see the problems described in terms of my day (a quote in a busy inbox, a call while everyone is on a job, a quote gone quiet, a call after hours), so that I recognise my own business.
8. As a small business owner, I want to see that Brackstone works with the software I already run on, so that I do not fear a rip-and-replace.
9. As a small business owner, I want to see the kinds of things Brackstone has built, without client names, so that I believe the work is real.
10. As a small business owner, I want to see the process (teardown, build, test, run and improve), so that I know what happens after I get in touch.
11. As a small business owner, I want to see what my customer gets and what my team sees at 8am, so that I understand the result on both sides.
12. As a garage or estate agent owner, I want the Industries section to link to my trade's page, so that I can read about my trade specifically.
13. As a small business owner, I want a fair comparison of doing it by hand, buying a tool, or having it built, so that I can judge the options myself.
14. As a sceptical owner, I want to see what kinds of calls Brackstone tests against (such as a wrong number, an angry caller, a price question), so that I trust it before my customers hear it.
15. As a sceptical owner, I want a short FAQ answering the questions people ask on a second call, so that I do not need to book a call to learn the basics.
16. As a small business owner, I want a closing section that asks what my team keeps doing by hand, so that I have a clear next step.
17. As a visitor who has turned on reduced motion, I want animations to stop or become still, so that the page is comfortable to use.
18. As a visitor with JavaScript off or slow, I want all content to be visible, so that scroll animations never hide the page.
19. As a mobile visitor, I want every section to read well on a phone, so that I do not need a desktop to understand the offer.

### Ads page visitor

20. As a garage owner who searched for an AI receptionist for garages, I want the headline to repeat what I searched for, so that I know I am in the right place.
21. As an ads page visitor, I want the main button to start a free trial with no card, so that I can try it with no risk.
22. As a mobile ads page visitor, I want a sticky bar with the trial button and a call button, so that the next step is always one tap away.
23. As an ads page visitor, I want to see an illustrative example of the receptionist taking a call, so that I can judge how it handles a caller. (A tap-to-call demo line is deferred; see Further Notes.)
24. As an ads page visitor, I want to see a starting price, so that I know if it is in my budget before I sign up.
25. As an ads page visitor, I want a short FAQ, so that my last doubts are answered on the page.
26. As an ads page visitor, I want the page to load fast on a phone signal, so that I do not bounce back to Google.
27. As an ads page visitor, I want a simple header with no full site menu, so that I am not pulled away from the one thing the page offers.
28. As a garage owner, I want to see that the receptionist books MOTs, services and repairs, looks up the vehicle from the reg, and flags urgent jobs, so that I know it understands a garage.
29. As an estate agent, I want to see that the receptionist captures every viewing request and valuation lead and tells me who to call first, so that I know what the free trial does for me.
30. As an estate agent, I want to see, as a separate line, that Brackstone can set up viewings booked straight into my diary from calls and emails, so that I know the next step exists.
31. As a business owner whose trade has no ads page, I want a general AI receptionist page, so that a general search still lands somewhere relevant.
32. As an ads page visitor, I want any transcript or example to be labelled illustrative, so that I am not misled.

### Saeed (owner and operator)

33. As Saeed, I want paid traffic to land only on ads pages, so that ad spend goes to pages built to convert.
34. As Saeed, I want each ads page to come from one shared template with its own content, so that a new trade is a content change, not a rebuild.
35. As Saeed, I want the demo line button and the price box hidden until I provide them, so that pages can be published before those decisions are made.
36. As Saeed, I want every trial link to carry UTM tags that say which page and which button sent the visitor, so that I can see which placements work.
37. As Saeed, I want the ad click ID carried from the ads page to the free trial request, so that Google Ads can credit the right ad.
38. As Saeed, I want a submitted free trial request to count as the primary conversion, so that Google Ads optimises for real trials, not clicks.
39. As Saeed, I want trial button taps and demo line taps to count as secondary conversions, so that I can see interest before trials arrive.
40. As Saeed, I want nothing tracked until a visitor accepts cookies, so that the site follows UK PECR and UK GDPR.
41. As Saeed, I want the ads pages to be findable in normal search, so that they also earn organic traffic.
42. As Saeed, I want the new homepage built out of sight and swapped in at once, so that visitors never see a half-finished site.
43. As Saeed, I want the contact form to keep working exactly as it does now, so that no teardown requests are lost during the redesign.
44. As Saeed, I want a check that fails the build if copy contains em dashes, emojis or tool names we have not built with, so that honesty rules hold without manual review.
45. As Saeed, I want the premier-housing demo pages left untouched, so that client demos keep working.

### Future maintainer

46. As a maintainer, I want the domain language in `CONTEXT.md` and the hard decisions in ADRs, so that I do not undo a deliberate choice.
47. As a maintainer, I want the old homepage components, unused components and old fonts removed at the swap, so that there is one design system to maintain.
48. As a maintainer, I want the marketing site and the dashboard to agree on the consent cookie and the click ID parameter, so that tracking does not silently break across the two sites.

## Implementation Decisions

### Hosting and release

- The site stays on GitHub Pages (ADR 0001). Merging to master is a production release, so merged but unfinished work must be hidden. Every pull request gets a Cloudflare Pages preview URL, which is where each ticket is reviewed before merge.
- The new homepage is built at a hidden preview route that is set to noindex and left out of the sitemap. Each homepage ticket merges to master behind that route. A final swap ticket makes it the homepage and removes the preview route.

### Design system

- The new brand (Geist and Geist Mono, self-hosted; purple, mint, ink, background and line colours from the handoff) is added as a new layer used only by the new layout. The live homepage keeps the old tokens and fonts until the swap. The swap removes the old tokens, the Sora and Manrope fonts, the old homepage components and the unused direction-2 components.
- The prototype's look and interactions are ported into Astro components with scoped styles. The prototype is not pasted in wholesale.
- All scroll reveals must leave content visible when JavaScript is off and when reduced motion is on.
- Shared pieces: a site layout (head, SEO, consent), nav, footer, buttons, and an illustrative-label caption.

### Homepage

- Sections follow Design B in order: hero, pillars, problem and day scroll, tools map, things we have built, process, customer view and team view, industries, comparison, what we test, FAQ, closing section.
- Primary button: "Book a 15-minute teardown" to the contact page. Secondary: "Start a free trial" to the dashboard's trial request page with homepage UTM tags.
- The tools map names only tools on the approved list. Things we have built use the approved hint list with no client names.
- "What we test" lists the kinds of test cases and shows no scores or metrics.
- The Industries section reads the same list of ads pages as the ads page template, so it links to a trade's ads page only when one exists.
- No missed-calls calculator.

### Ads pages

- One template, many instances. Each instance is a content entry holding: search intent, URL slug, headline, intro, trial promise points, feature cards, optional setup offer line, FAQ, UTM campaign value, and the dashboard vertical value for the trial link.
- URLs: garages at `/garages/`, estate agents at `/estate-agents/`, general at `/ai-receptionist/`. All are indexed and in the sitemap.
- The header shows only the logo, the call button and the trial button. There is no site menu. The footer is minimal (privacy and teardown link).
- Every trial link carries `utm_source=google`, `utm_medium=cpc`, `utm_campaign` set to the page's campaign value, and `utm_content` set to the placement (header, hero, pricing, final, mobile-bar). Real UTM tags already on the landing URL take precedence over the defaults, so ad-level tags survive.
- The demo line number and the starting price are site-wide settings. When a setting is empty, every element that uses it is left out of the page, not shown as a placeholder. The demo line setting stays empty for the first release.
- The estate agents page leads with the trial promise (captures viewing requests and valuation leads, tells you who to call first). Booking viewings into a diary appears only as a separately labelled setup offer. It never says the trial books viewings.
- Ads pages ship no heavy JavaScript. Animation is light, respects reduced motion, and must not delay the largest contentful paint.

### Contact and privacy pages

- Restyled to the new design. The contact form's fields, endpoint, Turnstile, honeypot and behaviour are unchanged. The privacy page is updated to describe the analytics and advertising cookies once tracking exists.

### Consent and tracking

- Google Consent Mode v2 with every storage type denied by default. A small banner on every public page offers accept and decline. The hidden preview route stays free of page scripts, so it does not carry the banner. No analytics or advertising cookie is set before acceptance.
- The consent choice is stored in a cookie scoped to the parent domain, so the dashboard's trial request page can read the same choice. Its name and values are the shared contract below. Do not invent a second name.
- The marketing site loads GA4 and the Google Ads tag only after consent. It reports secondary conversions: a tap on any free trial link and a tap on the demo line.
- The ads page reads `gclid` from its own URL and appends it to every trial link, alongside the UTM tags.

### Shared consent and click ID contract

Fixed here for the marketing site and the dashboard. Do not invent a second cookie name or a second click ID parameter.

- Consent cookie name: `brackstone_consent`
- Accepted value: `accepted`
- Declined value: `declined`
- Any other value, or no cookie, means the visitor has not accepted.
- Domain: `.brackstonedigital.co.uk` (set when the host is `brackstonedigital.co.uk` or a subdomain; other hosts store a host-only cookie so a preview can still remember the choice)
- Path: `/`
- SameSite: `Lax`
- Secure: set when the page is HTTPS
- Lifetime: 180 days (`Max-Age=15552000`)
- Click ID parameter: `gclid`, copied from the ads page URL onto every trial link

The dashboard reads this cookie on the trial request success page and fires the primary conversion only when the value is `accepted`.
- Tag IDs (GA4 measurement ID, Google Ads conversion ID and labels) are site-wide settings. When empty, no tag loads. Agents do not create or edit anything in Google Ads.
- Dashboard change (ADR 0003): the trial request route stores `gclid` inside the existing attribution data (no schema change), and the success page fires the primary conversion only when the shared consent cookie says accepted. This is a public route, so it needs Codex review.

## Testing Decisions

- A good test checks what a visitor or Google would see in the built output, not how components are put together. Tests must not depend on class names or markup structure beyond what is needed to find the element.
- Seam 1, the built site: a node test builds the site, then reads the generated pages. It follows the same approach as the existing premier-enquire verification, which builds the site and then checks its output, and it runs in CI before every deploy. It checks:
  - the preview route is noindex and not in the sitemap, and the ads pages are indexed and in the sitemap;
  - each ads page headline matches its search intent;
  - every trial link carries the expected UTM tags and placement;
  - the demo line and the price are absent when their settings are empty, and present when set;
  - no page contains em dashes, emojis, or a banned tool name (Zapier, Make, n8n, HubSpot, Xero, QuickBooks, Calendly, WhatsApp);
  - the estate agents page does not claim the trial books viewings;
  - no tracking tag is present in the HTML before consent;
  - the contact page still posts to the same endpoint with the same fields.
- The `gclid` pass-through and consent behaviour are browser behaviour. They are covered by a small script test run against the built page's script where possible, and by a manual check in the tracking go-live ticket.
- Seam 2, the dashboard: the trial request route's existing route tests gain cases for storing `gclid` in attribution, and for the success page including the conversion only when consent is accepted.
- The existing contact function tests must stay green throughout.
- Speed and accessibility are checked by hand with Lighthouse (mobile) on the homepage and every ads page in the final ticket, with results recorded on the card.

## Out of Scope

- Moving hosting to Cloudflare or changing DNS.
- Industry pages other than the ads pages (ADR 0002).
- The missed-calls calculator.
- Making viewing booking part of every estate agent's free trial. It is dashboard product work.
- Creating or editing Google Ads campaigns, conversion actions or budgets. Changing live Retell or Twilio config. Any spend.
- A live demo line. Saeed decided on 2026-09-24 not to add one for now, because a public number costs money per minute and there are no cost guards for public callers yet.
- Lettings-only or trades ads pages. They wait for conversion data from the first three.
- The premier-housing demo pages and their functions.
- Changes to the contact form's backend.

## Further Notes

- Human-only inputs, each tracked as an Approval Inbox card: the public starting price, and the GA4 property plus Google Ads conversion ID and labels. Pages can ship before these exist. Ads must not start until the price and tracking are both live.
- Demo line, deferred: decide again after the ads have run and there is data. If added later, it needs cost guards before it goes public (a short maximum call length, a Twilio spending alert, a limit on simultaneous calls, a block on repeat callers). The dashboard's concurrent call limit is only a design today, and no guard for a public demo line was found in the code. The existing shared demo number is set up for another demo and must not be pointed at ad traffic without Saeed's approval. The setup would be a /wizard job for Saeed.
- Past work may only be hinted at from the approved list. "Booking viewings from calls and emails" is confirmed as built for one estate agency and may appear only as a setup offer.
- Suggested model routing: a strong model for the hero, the day scroll and review; a cheaper model is fine for well-specified section ports and content instances. Do not use the byesu relay sandbox for this repo.
