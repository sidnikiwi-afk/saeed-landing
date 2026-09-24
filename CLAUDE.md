# Brackstone Digital marketing site

brackstonedigital.co.uk. The public site for Brackstone Digital: small UK businesses, three pillars (enquiries on every channel, admin automation, custom dashboards and integrations).

Read `CONTEXT.md` for the domain language and `docs/adr/` for decisions before changing anything.

## Knowledge Base
Research wiki at `../wikis/`. Check before making changes:
- `../wikis/domains/cold-email/pages/` for campaign strategy, lead sourcing, personalisation
- `../wikis/domains/data-infrastructure/pages/` for webhook security, n8n patterns, Postgres

## Stack and deploy

- Astro 6, `output: 'static'`, Tailwind 4, React islands where needed.
- Deploys to **GitHub Pages**: `.github/workflows/deploy.yml` builds on every push to `master` and publishes `dist`. DNS is at Namecheap. See `docs/adr/0001-stay-on-github-pages.md`.
- Merging to `master` is a production release.
- Previews: the repo is connected to the Cloudflare Pages project `brackstone-digital`, which builds every branch and pull request. The PR's "Cloudflare Pages" check links the preview (`https://<branch>.brackstone-digital.pages.dev`). It does not serve the live domain.
- `functions/api/contact.js` is the contact form's Cloudflare Pages Function. The live form calls it on the separate `premier-housing-demo` Cloudflare Pages project (`https://premier-housing-demo.pages.dev/api/contact`). See `README.md` for its secrets.
- CI runs `npm run test:contact` and `npm run verify:premier-enquire` before deploying.

## Layout

- `src/pages/`: `index`, `contact`, `privacy`, and the `premier-housing-demo` pages.
- `src/components/home/`: homepage sections. `src/components/direction-2/` is unused.
- `src/styles/theme.css`: design tokens. `src/layouts/Layout.astro`: shared head and SEO.
- Do not touch the `premier-housing-demo` pages, `functions/api/enquire*`, or `scripts/build-premier-housing-pages.mjs`.

## Conventions

- UK English. No em dashes in user-facing copy. No emojis in code or copy.
- Only name tools actually built with. Do not name clients. Label made-up examples as illustrative. The approved lists are in the redesign handoff (`brackstone-dashboard` repo, `demos/cloudflare-demo-pages/site-redesign/HANDOFF.md`).
- Respect `prefers-reduced-motion`. Content must be visible without JavaScript.
- Agents must not touch Google Ads, spend money, provision phone numbers, or change live Retell or Twilio config.
