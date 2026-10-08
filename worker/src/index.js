// MTCSTW App - serves static site with SPA fallback
// Static assets handled by [assets] config; this worker is a fallback
export default {
  async fetch(request, env) {
    // Assets are served automatically; this is a safety net
    return new Response("MTCSTW App", { status: 200 });
  }
};
