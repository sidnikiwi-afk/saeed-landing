// Advanced-mode Pages Worker entry for the standalone Marlow & Pike demo
// artifact. Bundled by scripts/build-marlow-pike-pages.mjs into the
// artifact's `_worker.js`.
//
// Isolation contract:
// - This entry imports ONLY the Marlow enquiry API module. No Premier,
//   contact or marketing endpoint is imported or reachable.
// - Because the artifact ships an advanced-mode `_worker.js`, Cloudflare
//   Pages ignores the repository-root `functions/` tree for this
//   deployment entirely (documented Pages advanced-mode behaviour), so the
//   legacy `/api/contact`, `/api/enquire` and `/api/enquire/probe` routes
//   cannot exist here even though those source files remain in the repo.
// - Only the exact path `/api/marlow-pike-enquire` reaches the existing
//   Marlow handlers (POST, OPTIONS, 405 for everything else, with the
//   module's own fail-closed origin and configuration checks untouched).
// - Every other `/api/*` path returns 404 without touching env.ASSETS or
//   calling fetch, so static assets are never served for API-like paths.
// - Ordinary static requests delegate to env.ASSETS.fetch(request).
//
// This file deliberately lives under /scripts, not /functions: a file under
// the root functions tree would be compiled into a routed Pages Function,
// which is exactly the exposure this isolation removes.
import {
  onRequestOptions,
  onRequestPost,
  onRequestGet,
} from '../functions/api/marlow-pike-enquire.js';

const MARLOW_ENDPOINT = '/api/marlow-pike-enquire';

function notFound() {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === MARLOW_ENDPOINT) {
      const context = { request, env, params: {}, ctx, next: () => env.ASSETS.fetch(request) };
      if (request.method === 'POST') return onRequestPost(context);
      if (request.method === 'OPTIONS') return onRequestOptions(context);
      // Existing unsupported-method behaviour (405 with Allow header).
      return onRequestGet(context);
    }

    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      // No legacy API, no ASSETS fallback for API paths.
      return notFound();
    }

    return env.ASSETS.fetch(request);
  },
};
