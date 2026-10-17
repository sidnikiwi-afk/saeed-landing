# Spec: 7-day free trial of the AI receptionist (managed, card-free, 50 trial minutes)

Kanban: `t_bafceb82` on board `brackstone-site` (source of truth; this file is a copy).

Repos: `sidnikiwi-afk/saeed-landing` (site) and `sidnikiwi-afk/brackstone-dashboard` (dashboard). Glossary: `CONTEXT.md` in saeed-landing (branch `docs/free-trial-7day` until merged). Decisions: ADR 0004 (managed card-free 7-day trial), ADR 0005 (trial request taken on the site, accepted by the dashboard; supersedes ADR 0003).

## Problem Statement

Small UK businesses arriving from Google Ads see a paid offer (from £99 a month, or £249 for the Garage edition) with a setup fee and no way to try the AI receptionist first. Competitors offer a free trial, and a cold visitor will not pay monthly for something they have not heard answer their own calls. Saeed wants to let a business try the receptionist on its real phone line for a short, bounded period, without Brackstone giving away open-ended setup work or call minutes, and to turn the people who try it into paying customers.

## Solution

Every ads page and the get-started page offer a free trial: card-free, 7 days from go-live, 50 trial minutes, whichever ends first. A business submits a trial request on the site; the dashboard checks and records it; Brackstone sets the receptionist up within the onboarding window (up to 7 days, usually sooner) and the trial goes live. The business forwards its calls to its receptionist, follows its trial in a "Your trial" panel in the dashboard, and receives a nurture sequence of emails from Saeed that react to what has happened on its trial. When the trial ends, calls go to a simple voicemail and the messages are emailed to the business; everything is held for 14 days so upgrading is instant. Upgrading during the trial, or within 48 hours of it ending, waives the setup fee.

## User Stories

### Visitor and trial request
1. As a business owner on an ads page, I want a clear "Start your 7-day free trial" button, so that I can try the receptionist before paying.
2. As a business owner, I want to see "No card needed. 50 minutes of calls. Then from £99 a month." (or "then £249 a month for the Garage edition" on the garages page), so that I know exactly what the trial is and what it costs afterwards.
3. As a business owner, I want to be told the receptionist will be set up within 7 days, usually sooner, so that my expectations are right.
4. As a garage owner, I want the trial to include workshop mode and vehicle lookup from the registration, so that I can judge the Garage edition properly.
5. As a business owner, I want a short form that asks only what is needed (business name, email, phone, industry from the grouped list, optional note on missed calls, website), so that requesting a trial takes about a minute.
6. As a business owner who chooses "Other", I want to say what kind of business I run, so that the setup fits me.
7. As a business owner, I want a clear line on the form saying I'll be emailed about my trial and can unsubscribe at any time, so that I know what I'm agreeing to.
8. As a business owner, I want to see a confirmation once my request is accepted, so that I know it went through.
9. As a business owner whose request is rejected for a fixable reason (missing field, failed security check), I want a clear message on the form, so that I can correct it.
10. As a business owner without JavaScript, I want the form to still work, so that I am not locked out.
11. As Saeed, I want each trial request recorded in the dashboard with the ad click ID and tracking tags, so that I know which ad and search brought it in.
12. As Saeed, I want to be notified of every new trial request, so that I can start onboarding.
13. As Saeed, I want a repeat request from the same business (same phone number, email domain other than free webmail, or website) flagged to me rather than silently rejected, so that a genuine second branch is not lost.
14. As Saeed, I want the existing security check and rate limits on trial requests, so that bots cannot flood me.
15. As Saeed, I want the primary conversion to fire only after the dashboard has accepted the request, and only when the visitor accepted cookies, so that Google Ads optimises for real trial requests.
16. As a visitor who declined cookies, I want my request to work exactly the same, so that tracking never blocks me.

### Onboarding and go-live
17. As Saeed, I want to review each trial request and set the receptionist up (business facts, greeting, UK number, text summaries, and for garages workshop mode and vehicle lookup), so that every trial starts in good shape.
18. As Saeed, I want to mark a trial as gone live when its receptionist is ready, so that the 7 days start then and not at the request.
19. As Saeed, I want trials still waiting on the business during onboarding to be visible, so that I can chase them.
20. As a business owner, I want a "You're live" email with forwarding steps for my phone line and a prompt to ring my own number, so that I can start straight away.
21. As a business owner, I want my receptionist to answer once my calls are forwarded, so that I can hear it handle real callers.
22. As Saeed, I want forwarding confirmed automatically from the first real call that arrives through the business's own number (or, where the carrier does not pass the forwarding number, the first real call from anyone other than Brackstone's test numbers), so that I never have to tick it by hand.
23. As Saeed, I want an alert if a live trial has had no calls 24 hours after go-live, so that I can help the business fix forwarding.
24. As Saeed, I want an admin override for forwarding confirmed, so that odd carrier cases do not block a trial.

### During the trial
25. As a business owner, I want a "Your trial" panel showing days left, trial minutes used and left, calls answered, and forwarding status, so that I always know where I stand.
26. As a business owner, I want an upgrade button in the panel, so that I can move to a paid plan whenever I am ready.
27. As a business owner, I want only AI-answered call time to count as trial minutes, counted to the second, so that time after a call is passed to a person is not charged against me.
28. As a business owner, I want a warning email when I have used 40 of my 50 trial minutes, so that I am not surprised by the pause.
29. As a business owner, I want a "2 days left" email on day 5 with my usage and the plan price, so that I can decide in time.
30. As a business owner, I want to see my calls, summaries and (for garages) the workshop mode view during the trial, so that I experience the real product.
31. As Saeed, I want a live call that would cross the 50-minute limit to be allowed to finish rather than cut off mid-call, so that callers are never dropped.
32. As Saeed, I want trial minutes counted from Retell call data and reconciled per call, so that usage is accurate.

### End of trial and upgrade
33. As a business owner, I want my trial to pause at 7 days from go-live or 50 trial minutes, whichever comes first, so that the trial has a clear end.
34. As a business owner, I want callers to reach a simple voicemail after my trial pauses, with each message emailed to me, so that I never lose a customer's call.
35. As a business owner, I want a "Your trial has paused" email explaining the voicemail, how to upgrade, the setup waiver (no setup fee if I upgrade within 48 hours of the trial ending), and how to turn forwarding off, so that I know my options.
36. As a business owner, I want an upgrade link that takes me to a Stripe checkout with my plan already chosen (AI receptionist plan, or Garage edition for garages and MOT centres, not bodyshops or car dealers), so that upgrading takes a minute.
37. As a business owner who upgrades during my trial or within 48 hours of it ending, I want no setup fee, so that deciding quickly is rewarded.
38. As a business owner who upgrades after 48 hours but within 14 days, I want my receptionist, number and settings still there and the setup fee charged as normal, so that switching back on is instant.
39. As a business owner who upgrades, I want my receptionist answering again straight away, so that there is no gap.
40. As Saeed, I want a paused trial's number and setup released 14 days after the trial ends if the business does not upgrade, so that costs stop. A checkout the business has already started holds the release until that checkout expires.
41. As Saeed, I want the trial never to charge a card or bill overage automatically, so that there is no surprise billing.

### Nurture sequence
42. As a business owner, I want every trial email to come from Saeed at Brackstone Digital, with replies going to Saeed, so that I can just reply with questions.
43. As a business owner, I want a day 1 email that reacts to my trial: "check your forwarding" if no calls have come in, or "it took N calls for you" if it has answered calls, so that the email is relevant.
44. As a business owner, I want a day 3 email with proof for my trade (garage or estate agent, general otherwise) and the cost of missed calls, so that I see the value.
45. As Saeed, I want a day 10 check-in drafted for me to send personally, never sent automatically, so that it is genuinely personal.
46. As Saeed, I want a business that submitted a trial request but stalled before go-live because Brackstone is waiting on it, or went live but never had forwarding confirmed, to receive two emails over three days, so that stalled trials are rescued.
47. As a visitor who typed into the form but never submitted it, I want to receive no emails, so that my privacy is respected.
48. As a business owner, I want an unsubscribe link on every trial email that works immediately, so that I control what I receive.
49. As a business owner who unsubscribed, I want marketing emails to stop at once while emails about my live trial (go-live, warnings, pause) still arrive, so that I am not left uninformed about something I asked for.
50. As Saeed, I want each email sent once only, even if a job retries, so that businesses are never spammed.
51. As Saeed, I want every email draft reviewed by me (after the humanizer pass) before any goes to a real prospect, so that the copy is right.

### Ads and the existing offers
52. As Saeed, I want the Google Ads copy change handed to Faris as a brief, not edited live by a worker, so that the week-1 ads test is not disturbed.
53. As Saeed, I want the 7-day / 50-minute trial to be the only public trial while longer manual trials remain available for my private use and the garage founding offer stays switched off, so that the offer is consistent.

## Implementation Decisions

- **Trial shape.** A new trial kind alongside the existing managed trials: 7 days from go-live, 50 trial minutes (3,000 seconds), card-free, no automatic charge or overage, one live number. It becomes the default public trial. The existing 14-day / 100-minute managed trial remains for private manual use; the garage founding offer stays behind its existing feature switch, off.
- **Trial module (dashboard).** Generalise the garage trial machinery (activation evidence, per-call usage reservation and finalisation, inbound admission policy, pause, conversion, Stripe checkout, usage alerts) into one trial module that both the garage offer and the new trial use. Its interface is a small set of actions: record go-live; admit an inbound call (live: answer with AI; paused: voicemail; released: refuse); reserve and finalise usage per call from Retell call data; evaluate the trial at a point in time (pause on 7 days or 50 minutes, release 14 days after the trial ends, held while a started checkout has not expired); start an upgrade (plan chosen by industry, setup line omitted when within the setup waiver: during the trial or within 48 hours of it ending); record forwarding confirmed. Trial state transitions are explicit (onboarding, live, paused on time, paused on minutes, upgraded, released), with timestamps and the reason for each change.
- **Trial minute.** AI-answered call time from Retell, counted to the second, excluding time after a transfer to a person. A call in progress when the 50 minutes is reached completes; the trial pauses when it ends.
- **Forwarding confirmed.** Recorded by the trial module from inbound call data: the first inbound call whose forwarded-from number matches the business's number, or failing that the first inbound call not from a Brackstone test number. Admin override available. No automated outbound test calls to the business.
- **Paused voicemail.** For a paused trial, the inbound voice path plays a short recorded greeting, records a message, and emails the transcript and a link to the call in the dashboard to the business. No trial minutes are used. Built as a separate fixed-script Retell voicemail agent (Saeed, 2026-10-14). Applies for 14 days after the trial ends, then the trial is flagged for Saeed, who releases the number.
- **Trial request endpoint (dashboard).** A public endpoint the site posts trial requests to. It reuses the dashboard's existing trial request checks: security check token verification, per-connection and per-email rate limits. It adds the one-trial-per-business check (phone number, email domain other than free webmail, website), which flags repeats to Saeed rather than rejecting. It stores the request with ad click ID, tracking tags, landing page and industry, notifies Saeed, and answers the site with a clear accepted or not-accepted result (with a reason the site can show). It allows only the site's origin. The dashboard's own trial request page is retired once this path is live.
- **Site get-started form.** Posts to the trial request endpoint instead of the contact email endpoint. Copy changes to the trial: button "Start your 7-day free trial"; supporting line "No card needed. 50 minutes of calls. Then from £99 a month." (garages: "then £249 a month for the Garage edition"); promise "We'll set up your receptionist within 7 days, usually sooner, and email you when it's live."; consent line "We'll email you about your trial. You can unsubscribe at any time." The conversion fires only after an accepted response and only with ad consent. Ads pages switch their primary call to action to the trial. Prices carry no VAT.
- **Your trial panel and upgrade step (dashboard UI).** New, built by Opus 5.5 on the Calls redesign's components and brand. Shows days left, trial minutes used and left, calls answered, forwarding status, and an upgrade button. Login, welcome and billing pages are refreshed by the separate dashboard redesign workstream; this spec lists them as pages the redesign must reach before the trial goes public.
- **Nurture planner (dashboard).** Given a trial's recorded events (request accepted, go-live, forwarding confirmed, calls answered, minutes used, paused, upgraded, unsubscribed) and the current time, decides which nurture sequence email is due: day 0 live (service), day 1 activity-based (marketing), day 3 trade proof (marketing), 40-minute warning (service), day 5 two days left (service), paused (service), day 10 check-in (drafted for Saeed, never sent), abandoned sign-up emails 1 and 2 over three days (marketing). Days count from go-live, except abandoned sign-up, which counts from the request. Each email is sent at most once per trial (idempotent). Marketing emails stop on unsubscribe; service emails continue while the trial is active.
- **Sending.** Through the dashboard's existing Resend integration on the Brackstone account, from "Saeed at Brackstone Digital" <saeed@brackstonedigital.co.uk>, reply-to Saeed. Every email carries a one-click unsubscribe link and the matching list-unsubscribe header. Copy is drafted by Opus 5.5, passed through the humanizer, and approved by Saeed before any real send; until approved, the planner runs with sending disabled.
- **Consent.** Service emails rely on the trial the business asked for; marketing emails use the soft opt-in from a submitted trial request. Nobody who did not submit a trial request is emailed.
- **Primary conversion.** Defined per ADR 0005: a trial request the dashboard has accepted, reported to Google Ads from the site after the accepted response, gated by cookie consent. The existing "Get started form submitted" conversion action is reused (or renamed by Faris/controller), with the same tag and label.
- **Ads hand-off.** The controller writes a brief for Faris with the new ad copy (trial headline and description lines, sitelink changes). No worker edits live ads.
- **Guardrails.** No worker changes live Twilio, Retell or Stripe configuration or provisions numbers; runtime code that does those things is built and tested against test modes and switched on live only with Saeed's yes. No merges, deploys, ad edits or real sends without Saeed's yes.

## Testing Decisions

- Good tests check external behaviour at the agreed seams, not internals: given inputs and recorded events, assert the visible outcome (response, state, email due, page content). Time is injected, never read from the wall clock, so 7-day, 48-hour and 14-day boundaries are tested exactly.
- Seam 1, site get-started form: built-page tests for the trial copy on every ads page and the get-started page, the consent line, the no-VAT prices, and JavaScript-off rendering; unit tests for the request sender covering accepted, not accepted with a reason, network failure, the ad click ID and tracking tags carried, and the conversion firing only after an accepted response with consent. Prior art: the existing get-started, ads page and consent tests.
- Seam 2, trial request endpoint: route tests for accepted, missing fields, failed security check, rate limits, repeat business flagged (each matching rule), origin restriction, and stored tracking fields. Prior art: the garage offer route behaviour and contract tests and the existing trial request tests.
- Seam 3, trial module: database-backed tests for go-live starting the clock, inbound admission per state, per-call minute reservation and finalisation, the in-progress call that crosses 50 minutes, pause at exactly 7 days and at exactly 3,000 seconds, forwarding confirmed from forwarded-from data and from the fallback rule, upgrade during the live trial and within and after 48 hours of the trial ending (the setup waiver), release at 14 days and held by a started checkout until it expires, and the garage offer still behaving as before. Prior art: the garage trial lifecycle, usage, conversion and Stripe checkout tests.
- Seam 4, nurture planner: tests for each email's trigger and timing, the day 1 branch, trade-specific day 3, the 40-minute warning, abandoned sign-up only for submitted requests, at-most-once sending under retries, unsubscribe stopping marketing but not service emails, the check-in only drafted, and every email carrying an unsubscribe link and header. Prior art: abandoned checkout reminders and email idempotency tests.
- The dashboard's provider network guard stays on in tests; no test calls Twilio, Retell, Stripe or Resend for real.

## Out of Scope

- Changing live Google Ads (handed to Faris as a brief).
- The full dashboard redesign, including login, welcome and billing pages (owned by the Calls redesign workstream; listed as a dependency).
- Self-serve, instant trials; card-up-front trials; automatic conversion to paid.
- Diary or CRM integrations, confirmed bookings and custom call flows during a trial (setup offers).
- Enhanced conversions or uploading personal data to Google.
- Changing the price of the paid plans.
- Sending any nurture email to real prospects before Saeed approves the copy.

## Further Notes

- Pages the dashboard redesign must reach before the trial goes public: login and two-step verification, welcome, billing and plan change. The controller will send that workstream a short note.
- Pull request 1181 (store the ad click ID on dashboard trial requests) is superseded by the trial request endpoint storing it from the site; close or fold it in during ticketing.
- Model roster: Opus 5.5 controller and all UI and email copy; Codex GPT-6.1 SOL for dashboard back end; Grok 4.7 reviewers on every ticket; GLM 5.3 as an extra reviewer on billing, telephony and public-endpoint tickets.
- Saeed is not VAT registered; no VAT wording anywhere.
