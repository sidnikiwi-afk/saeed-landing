# Brackstone Digital Landing Page

brackstonedigital.co.uk — UK B2B lead gen agency site. Static HTML, GitHub Pages.

## Knowledge Base
Research wiki at `../wikis/`. Check before making changes:
- `../wikis/domains/cold-email/pages/` — Campaign strategy, lead sourcing, personalisation
- `../wikis/domains/data-infrastructure/pages/` — Webhook security, n8n patterns, Postgres

## Detail

Public-facing website for the lead generation business. Static HTML, hosted via GitHub Pages.

**Domain:** `brackstonedigital.co.uk` (CNAME configured)
**Design:** Navy hero (#1A2332), light body (#F8F9FA), teal accent (#16A085). Inter + DM Sans fonts.

**Files:**
- `index.html` — Main landing page (9 sections: Nav, Hero, Problems, How It Works, Services, Industries, Results, CTA+Quiz, Footer)
- `thank-you.html` — Post-form submission page with Meta Pixel Lead event
- `privacy.html` — UK GDPR privacy policy
- `CNAME` — Domain mapping file

**Quiz Funnel (built 2026-02-26):** 3-step multi-step quiz replaces old 2-field form.
- Step 1: Industry (6 clickable cards) + Postcode
- Step 2: Biggest challenge (4 options) + Team size (3 pills)
- Step 3: First name + Work email + GDPR consent
- POSTs 6 data points to `/webhook/brackstone-lead`, redirects to thank-you.html

**n8n Webhook (LIVE 2026-02-26):** Workflow `iL6PCYVnJNDAqMgU` ("Brackstone Lead Intake"), 5 nodes:
- Webhook → Code (prepare data + generate lead_id) → Postgres INSERT → Telegram notify → Respond OK
- Tested end-to-end successfully
- Postgres table: `brackstone_leads` (13 columns, upsert on email)

**Follow-up Sequence (drafted 2026-02-26):** 3 emails over 21 days:
- E1 (immediate): Report delivery + area highlights
- E2 (day 7): Insight nudge + soft 15-min call offer
- E3 (day 21): Area data refresh offer + soft close
- Not yet set up in Instantly

**Implementation Plan:** `meta-campaign-v0.2.0/brackstone-digital-implementation-plan-v3.md`
- 3 revenue streams: B2B outreach service (primary), homebuyer data for tradespeople, energy grant leads
- Focus on Stream 1 first (accountancy vertical)
- Pricing: £200-500/month retainer for done-with-you outreach

**Not yet done:**
- Meta Pixel ID (placeholder `YOUR_PIXEL_ID_HERE` in code)
- OG image (1200x630, placeholder in meta tags)
- `hello@brackstonedigital.co.uk` email setup
- Social proof (testimonials, sample report screenshots)
- Instantly follow-up campaign setup (3 emails drafted, not yet configured)
- Calendly/Cal.com booking link for sales calls
