// Edge rate limiting template for a future protected custom domain.
// Not active on GitHub Pages until deployed to Cloudflare and routed through that domain.
// GitHub Pages remains a public bypass: do not claim this prevents downloading originals.
const ORIGIN = "https://ognyan-peev.github.io";
const contentPath = /^\/assets\/data\/[-a-z0-9]+\.js$/i;

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const incoming = new URL(request.url);
    if (contentPath.test(incoming.pathname)) {
      // Generous per-IP limit to protect readers who share a network.
      // This is approximate and scoped per Cloudflare location.
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.CONTENT_RATE_LIMIT.limit({ key: ip });
      if (!success) {
        return new Response("Прекалено много заявки. Опитайте отново след малко.", {
          status: 429,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Retry-After": "60",
            "Cache-Control": "no-store"
          }
        });
      }
    }
    const target = new URL(incoming.pathname + incoming.search, ORIGIN);
    const upstream = await fetch(new Request(target, {
      method: request.method,
      headers: { "Accept": request.headers.get("Accept") || "*/*" },
      redirect: "follow"
    }));
    // Avoid making a cached error look like a successful read.
    const headers = new Headers(upstream.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
