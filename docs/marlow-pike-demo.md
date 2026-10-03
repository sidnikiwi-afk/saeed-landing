# Marlow & Pike demo site

Standalone rental demonstration for the fictional agency **Marlow & Pike**, using the Premier Housing demo's visual layout. Everything on the page is fictional: six invented rental homes (refs MP001-MP006) in the Marlow area with monthly (pcm) rents, illustrative imagery, and clearly labelled illustrative scenarios instead of reviews. The page is `noindex, nofollow`.

## Files (all new; no existing file was modified)

- `src/pages/marlow-pike-demo.astro` - the demo route (`/marlow-pike-demo/`)
- `src/layouts/MarlowPikeLayout.astro` - shared head, SEO, noindex default
- `src/components/marlow-pike/` - Nav, Hero, Services, Divider, Listings, Process, Testimonials, Closing, EnquireModal, `phone.js`
- `src/data/marlow-pike-listings.json` - fixture listings (monthly pcm rents) and illustrative scenarios
- `public/marlow-pike-favicon.svg`
- `functions/api/marlow-pike-enquire.js` - isolated enquiry endpoint
- `scripts/build-marlow-pike-pages.mjs` - standalone Pages artifact builder
- `tests/marlow-pike-enquire-function.test.mjs`

## Enquiry flow

The modal on any `[data-enquire]` trigger POSTs JSON to the fixed same-origin endpoint `/api/marlow-pike-enquire`. There is no environment-selected host and no Premier fallback. Each submission carries `property_ref` (MP001-MP006) as its own field; the modal's initial default message also mentions the ref, but if the visitor edits the message, their custom text is sent unchanged and nothing is appended to it. The server validates `property_ref` and restates the reference in the forwarded inquiry body (`provider_metadata.property_ref` and a `Property reference:` line in the forwarded text), so the dashboard sees it even when the visitor's message omits it.

Success copy says the enquiry was received; it never claims a booking was confirmed and makes no response-time promise.

The footer/nav phone comes only from `PUBLIC_MP_DEMO_PHONE` after strict UK format validation. If it is unset or invalid the site shows "Number not connected" and never falls back to any other number. No email address is published on the page.

## Endpoint isolation

`functions/api/marlow-pike-enquire.js` is a mechanical copy of `functions/api/enquire.js` (the Premier endpoint) with:

- all environment names renamed `PH_*`/`INBOUND_EMAIL_WEBHOOK_SECRET`/`DASHBOARD_WEBHOOK_URL` to `MP_INBOUND_RECIPIENT`, `MP_INBOUND_TOKEN`, `MP_INBOUND_EMAIL_WEBHOOK_SECRET`, `MP_DASHBOARD_WEBHOOK_URL`
- **no default allowed origins**: `MP_ALLOWED_ORIGINS` must be a nonempty comma-separated list of validated HTTPS origins, and the request `Origin` must belong to that explicit set. Missing/empty config fails closed (403/503) before any fetch. No Premier or marketing origin is accepted.
- source metadata `marlow_pike_demo_site` / `mp_website_enquiry_v1`, message id prefix `mp-form:`, rate-limit bucket `__mpEnquireRateLimitBuckets`
- canonical recipient, payload shape, body size, rate limit, token and webhook-host (`dashboard.brackstonedigital.co.uk`) validation preserved exactly
- the browser can never influence the recipient; a spoofed `recipient`/`to`/`mail_to` is ignored

## Environment variables (names only; values are set at activation)

| Name | Purpose |
| --- | --- |
| `MP_ALLOWED_ORIGINS` | Comma-separated HTTPS origins allowed to POST (required) |
| `MP_DASHBOARD_WEBHOOK_URL` | Dashboard base URL on `dashboard.brackstonedigital.co.uk` (required) |
| `MP_INBOUND_EMAIL_WEBHOOK_SECRET` | Shared secret sent as `X-Webhook-Secret` (required) |
| `MP_INBOUND_TOKEN` | Inbound token stamped into the payload (required) |
| `MP_INBOUND_RECIPIENT` | Server-only canonical dashboard recipient (required) |
| `PUBLIC_MP_DEMO_PHONE` | Optional public demo phone; unset shows "Number not connected" |

## Local verification

```sh
node --test tests/marlow-pike-enquire-function.test.mjs   # 15 mocked tests
npm run test:premier-enquire                              # existing Premier tests still pass
npm run build                                             # Astro build
node scripts/build-marlow-pike-pages.mjs                  # -> dist-marlow-pike-pages
```

## Proposed deploy (activation pending; nothing published)

- New Cloudflare Pages project, e.g. `marlow-pike-demo`, building `astro build` then `node scripts/build-marlow-pike-pages.mjs`, output directory `dist-marlow-pike-pages`.
- Attach the five required `MP_*` variables above plus the optional `PUBLIC_MP_DEMO_PHONE`; set `MP_ALLOWED_ORIGINS` to the project's own `*.pages.dev` origin (and any custom domain later).
- Activation of the enquiry channel is gated separately by the controller. Until then the deployed artifact still fails closed server-side if variables are absent.
