# Brackstone Digital website

## Contact form spam protection

The public teardown form at `/contact` posts JSON to the Cloudflare Pages
Function at `https://premier-housing-demo.pages.dev/api/contact` (override
with `PUBLIC_CONTACT_ENDPOINT`). After checks pass, the function emails
`saeed@brackstonedigital.co.uk` through Resend. It does not call n8n or
Railway.

The source-controlled function is `functions/api/contact.js`. It:

- accepts only allowlisted HTTPS origins;
- silently absorbs honeypot submissions (`website` filled);
- verifies a Cloudflare Turnstile token with Siteverify when
  `TURNSTILE_SECRET_KEY` is set, and runs honeypot-only until that secret exists;
- applies a light per-isolate/IP rate limit;
- sends one Resend email (`POST https://api.resend.com/emails`) with the
  existing form fields (`name`, `email`, `business`, `message`) plus
  `source` and `submitted_at`;
- sets `Reply-To` to the visitor so Saeed can reply from his inbox;
- never emails the honeypot value or the Turnstile token;
- fails closed with generic errors and never returns its secrets.

The contact page does not collect a phone number, so the email does not
include one.

### Env / secrets still needed

Set these on the `premier-housing-demo` Cloudflare Pages **production**
environment (Settings → Environment variables). Do not commit them.

| Name | Where | Required for |
| --- | --- | --- |
| `RESEND_API_KEY` | Cloudflare Pages secret | Send the enquiry email. Without it the function returns 503. |
| `TURNSTILE_SECRET_KEY` | Cloudflare Pages secret | Server-side Turnstile Siteverify |
| `CONTACT_NOTIFY_TO` | Cloudflare Pages (optional) | Override the inbox. Default `saeed@brackstonedigital.co.uk`. Must be `@brackstonedigital.co.uk`. |
| `CONTACT_FROM_EMAIL` | Cloudflare Pages (optional) | Override the verified sender. Default `noreply@brackstonedigital.co.uk`. Must be `@brackstonedigital.co.uk`. |
| `CONTACT_ALLOWED_ORIGINS` | Cloudflare Pages (optional) | Extra HTTPS origins for local / preview |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Cloudflare Pages (optional) | Extra hostnames accepted from Siteverify |
| `PUBLIC_TURNSTILE_SITE_KEY` | GitHub Actions **variable** (not a secret) | Renders the Turnstile widget on the static contact page |
| `PUBLIC_CONTACT_ENDPOINT` | GitHub Actions **variable** (optional) | Override the function URL baked into the static page |

Create the widget in Cloudflare Dashboard → Turnstile. Add
`brackstonedigital.co.uk` and `www.brackstonedigital.co.uk` as hostnames.
Use a **managed** widget. The page sends `data-action="brackstone-contact"`.

Until `PUBLIC_TURNSTILE_SITE_KEY` is set on the GitHub Pages build, the page
ships honeypot-only (no widget). Until `TURNSTILE_SECRET_KEY` is set on the
function, the function also stays honeypot-only. Mail still requires
`RESEND_API_KEY`.

`brackstonedigital.co.uk` is the verified Resend sending domain (eu-west-1).
Do not point `CONTACT_FROM_EMAIL` at any other domain.

### Cutover (do not deploy from this PR)

1. Create a Resend API key that can send from `brackstonedigital.co.uk`.
2. Set `RESEND_API_KEY` (and optionally `TURNSTILE_SECRET_KEY`) on
   `premier-housing-demo` production.
3. Deploy `functions/` to that Pages project (same wrangler path as Premier
   Housing).
4. Set `PUBLIC_TURNSTILE_SITE_KEY` on the GitHub repo if the widget should
   render, then merge so GitHub Pages rebuilds `/contact` against the live
   function.
5. Send one real human test lead and confirm the email arrives for Saeed.
6. After that, the old Railway n8n webhook can be left unused. This repo no
   longer calls it.

### Local checks

```sh
npm run test:contact
```

The function is deployed with the existing Premier Housing Pages artifact
(`functions/` is picked up from the repo root on `wrangler pages deploy`).
Do not deploy from this PR.

## Premier Housing enquiry bridge

The public Premier Housing demo is served at
`https://brackstonedigital.co.uk/premier-housing-demo/`. Its form posts to the
Cloudflare Pages Function at
`https://premier-housing-demo.pages.dev/api/enquire`.

The source-controlled function is `functions/api/enquire.js`. It:

- accepts only allowlisted HTTPS origins;
- validates and bounds the public form fields;
- silently absorbs honeypot submissions;
- applies a light per-isolate/IP rate limit;
- accepts only approved Zoopla and Brackstone listing URLs;
- forwards only to the fixed Brackstone dashboard inbound-email route;
- binds the request to the correct dashboard tenant using the server-side
  canonical recipient (`PH_INBOUND_RECIPIENT`) together with the
  `X-Webhook-Secret` sourced from `INBOUND_EMAIL_WEBHOOK_SECRET`; the recipient
  is validated as one strict ASCII email address and is never taken from or
  overridden by the browser payload;
- creates a stable provider message ID so the dashboard's persisted
  idempotency layer can deduplicate retries;
- fails closed with generic errors and never returns its secrets.

Set these values only in the `premier-housing-demo` Cloudflare Pages production
environment:

- `DASHBOARD_WEBHOOK_URL`
- `INBOUND_EMAIL_WEBHOOK_SECRET`
- `PH_INBOUND_TOKEN`
- `PH_INBOUND_RECIPIENT` (the canonical dashboard recipient address; a single
  strict ASCII email - a malformed value fails closed with a generic error)
- `PH_ALLOWED_ORIGINS` (optional additional HTTPS origins)

Do not commit or print their values.

Run the focused verification locally:

```sh
npm run verify:premier-enquire
```

This creates `dist-premier-housing-pages/`, a Cloudflare Pages artifact whose
root page is the Premier Housing demo and whose `/api/enquire` function is
loaded from the repository `functions/` directory.

After the reviewed commit is merged and the normal provider gate is approved,
deploy the exact merge commit from a clean checkout:

```sh
npx wrangler pages deploy dist-premier-housing-pages \
  --project-name premier-housing-demo \
  --branch main \
  --commit-hash <MERGE_SHA>
```

Verify the deployment ID, exact commit hash, allowed-origin OPTIONS response,
honeypot/no-forward response, public demo endpoint, and the controlled
firm-58 end-to-end canary before calling it production-ready.

Rollback is a Cloudflare Pages rollback to the previous production deployment,
followed by verification that the public form either reaches that reviewed
function or fails visibly without sending.

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
