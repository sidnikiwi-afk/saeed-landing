# Marlow & Pike demo site

Standalone rental demonstration for the fictional agency **Marlow & Pike**, using the Premier Housing demo's visual layout. Everything on the page is fictional: six invented rental homes (refs MP001-MP006) in the Marlow area with monthly (pcm) rents, illustrative imagery, and clearly labelled illustrative scenarios instead of reviews. The page is `noindex, nofollow`.

## Files (all new; no existing file was modified)

- `src/pages/marlow-pike-demo.astro` - the demo route (`/marlow-pike-demo/`)
- `src/layouts/MarlowPikeLayout.astro` - shared head, SEO, noindex default
- `src/components/marlow-pike/` - Nav, Hero, Services, Divider, Listings, Process, Testimonials, Closing, EnquireModal, `phone.js`
- `src/data/marlow-pike-listings.mjs` - fixture listings (monthly pcm rents) and illustrative scenarios, as an ordinary ESM module (the original JSON file is deleted; this module is the single authoritative catalogue)
- `public/marlow-pike-favicon.svg`
- `functions/api/marlow-pike-enquire.js` - isolated enquiry endpoint
- `scripts/build-marlow-pike-pages.mjs` - standalone Pages artifact builder
- `scripts/marlow-pike-worker-entry.mjs` - advanced-mode Worker entry (bundled into the artifact's `_worker.js`)
- `tests/marlow-pike-enquire-function.test.mjs`
- `tests/marlow-pike-worker-routing.test.mjs` - executes the generated Worker module
- `tests/marlow-pike-artifact.test.mjs`

## Enquiry flow

The modal form uses native browser constraint validation (no `novalidate`): blank required name, phone or email fields, or a malformed email, are blocked with the browser's own feedback and never reach pending state or the endpoint. `name`, `phone` and `email` are the required fields; the message field is optional and the server substitutes a default when it is blank.

The modal on any `[data-enquire]` trigger POSTs JSON to the fixed same-origin endpoint `/api/marlow-pike-enquire`. There is no environment-selected host and no Premier fallback. Every trigger on the page (`Hero`, `Listings`) sets `data-property-ref` to its canonical fixture ref (MP001-MP006); a submission must carry `property_ref` as exactly one of those six values. The server checks the raw string by exact membership, with no trimming or case folding: an empty value, an unknown ref (for example MP999), a lower-case or whitespace-padded value, or a ref derived from a property title is rejected with 400 and never forwarded. No ref is invented from a fallback. The forwarded property description is derived on the server from the same validated catalog the page renders (`src/data/marlow-pike-listings.mjs`); caller-supplied property text is never forwarded, so a forged or empty property value cannot influence the forwarded property line, subject or body. The modal's initial default message also mentions the ref, but if the visitor edits the message, their custom text is sent unchanged and nothing is appended to it. The server restates the reference in the forwarded inquiry body (`provider_metadata.property_ref` and a `Property reference:` line in the forwarded text), so the dashboard sees it even when the visitor's message omits it.

The Hero search form filters the Listings grid client-side. Criteria combine with AND: the area select, an exact bedroom count (studio matches 0 beds), and an inclusive maximum monthly rent. Defaults (any / any / all) restore all six homes, and a status message appears when nothing matches.

The mobile nav menu uses a generation counter around its 320ms hide callback, so closing and reopening the menu inside that window (including pressing Escape while it is already closed) never leaves a stale timer hiding the reopened menu.

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
| `MP_SITE_ORIGIN` | Build-time only: exact HTTPS origin of the standalone deployment (required by the artifact builder, not a Pages runtime variable) |
| `PUBLIC_MP_DEMO_PHONE` | Optional public demo phone; unset shows "Number not connected" |

## Local verification

```sh
node --test tests/marlow-pike-enquire-function.test.mjs   # mocked endpoint tests
node --test tests/marlow-pike-artifact.test.mjs           # builder fixture tests
npm run test:premier-enquire                              # existing Premier tests still pass
npm run build                                             # Astro build
MP_SITE_ORIGIN=https://<dedicated-demo-origin> node scripts/build-marlow-pike-pages.mjs   # -> dist-marlow-pike-pages
```

## Standalone artifact builder

`scripts/build-marlow-pike-pages.mjs` requires `MP_SITE_ORIGIN`: the exact HTTPS origin of the dedicated standalone deployment, with no path, query, fragment or user credentials. It is validated before anything is written; a missing, insecure or over-specified value fails the build and no artifact is produced. With a valid value the builder rewrites only the standalone `index.html`'s `rel="canonical"` and `og:url` to the origin root and `og:image`/`twitter:image` to the same origin keeping the image pathname. The marketing site's own build metadata is untouched, and no default hosted URL or claimed deployed identity is ever fabricated. The demo route is also excluded from the marketing sitemap (`astro.config.mjs`), and the standalone artifact never ships a sitemap.

## Advanced-mode Worker isolation

The artifact ships an advanced-mode `_worker.js` (built by `scripts/build-marlow-pike-pages.mjs` from `scripts/marlow-pike-worker-entry.mjs` after the origin and page prerequisites have passed). Because Cloudflare Pages advanced mode serves the `_worker.js` for all requests, Pages **ignores the repository-root `functions/` tree entirely** for this standalone deployment: no Premier, contact or marketing endpoint from `functions/` is compiled into or routed by this artifact. The entry itself lives under `scripts/` (not `functions/`) so it can never be picked up as a routed Function of the main site.

Routing in the Worker:

- `/api/marlow-pike-enquire` (exact path only) dispatches to the existing Marlow handlers: POST and OPTIONS behave exactly as before (fail-closed origin and configuration checks included), any other method returns the existing 405.
- Every other `/api/*` path returns 404 without touching `env.ASSETS` and without any outbound call, so legacy routes (`/api/contact`, `/api/enquire`, `/api/enquire/probe`) do not exist here even if legacy environment variables were somehow supplied.
- All other requests (the demo page, images, fonts, robots.txt) delegate to `env.ASSETS.fetch(request)` as ordinary static assets.

The enquiry API module's catalogue import is bundled into `_worker.js` at build time (the esbuild already declared inside the installed Wrangler dependency is reused via `createRequire`; nothing new is installed), so there is no runtime import and the catalogue remains the single authoritative source. Compatibility evidence: the esbuild declared by both cached Wrangler 3.114.0 and the provider's Wrangler 3.114.17 is exactly 0.17.19, which cannot parse static `with { type: 'json' }` import attributes and also rejects the dynamic import-options form ("import options property must be named assert"), leaving the JSON unresolved at runtime. The catalogue is therefore an ordinary ESM module (`src/data/marlow-pike-listings.mjs`, deep-frozen default export, data deep-equal to the original JSON, which is deleted) statically imported by the API module, the Hero, Listings and Testimonials components, so both native Node 22 and esbuild 0.17.19 compile it. No static or dynamic JSON import remains.

This Worker isolation belongs to the proposed dedicated deployment below. It is distinct from the already-existing automatic PR preview builds: those compile the repository-root `functions/` tree with the Pages project's own compiler, which is why the endpoint source must stay parseable there too.

## Proposed dedicated deploy (activation pending)

- New Cloudflare Pages project, e.g. `marlow-pike-demo`, building `astro build` then `MP_SITE_ORIGIN=https://<dedicated-demo-origin> node scripts/build-marlow-pike-pages.mjs`, output directory `dist-marlow-pike-pages`, with `MP_SITE_ORIGIN` set in the build environment to the project's own origin. Advanced mode requires no extra configuration: Pages serves the artifact's `_worker.js` automatically and ignores the root `functions/` tree for this project.
- Attach the five required `MP_*` variables above plus the optional `PUBLIC_MP_DEMO_PHONE`; set `MP_ALLOWED_ORIGINS` to the project's own `*.pages.dev` origin (and any custom domain later).
- Activation of the enquiry channel is gated separately by the controller. Until then the deployed artifact still fails closed server-side if variables are absent.
