# Stay on GitHub Pages for the redesign

The live site is a static Astro build that GitHub Actions publishes to GitHub Pages, with DNS at Namecheap. The contact form's function runs on a separate Cloudflare Pages project, `premier-housing-demo`. The repo also holds a `wrangler.jsonc` and a `functions/` folder, which suggest a Cloudflare deploy, but neither serves the live domain. We decided to keep GitHub Pages for the redesign and the ads pages. Both are static, and moving hosts would mean changing DNS on the live domain in the middle of a redesign, which is a separate and riskier change.

## Consequences

- There are no per-branch preview URLs, so unfinished pages need another way to be previewed before they go live.
- Custom response headers and server-side redirects are not available. Redirects need static redirect pages.
- Anything that needs a server, such as the contact form, stays on Cloudflare Pages and is called from the browser.
