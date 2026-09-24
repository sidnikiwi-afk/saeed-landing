# Stay on GitHub Pages for the redesign

The live site is a static Astro build that GitHub Actions publishes to GitHub Pages, with DNS at Namecheap. The repo is also connected to a Cloudflare Pages project, `brackstone-digital`, which builds every branch and pull request into a preview URL, but it does not serve the live domain. The contact form's function runs on another Cloudflare Pages project, `premier-housing-demo`. We decided to keep GitHub Pages for the redesign and the ads pages. Both are static, and moving hosts would mean changing DNS on the live domain in the middle of a redesign, which is a separate and riskier change.

## Consequences

- Every pull request gets a Cloudflare Pages preview URL, which is the place to review a change. Merging to master is still a production release on GitHub Pages, so merged but unfinished pages must stay hidden.
- Custom response headers and server-side redirects are not available. Redirects need static redirect pages.
- Anything that needs a server, such as the contact form, stays on Cloudflare Pages and is called from the browser.
