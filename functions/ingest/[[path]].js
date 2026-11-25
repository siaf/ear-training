// Cloudflare Pages Function — /ingest/* on fifths.io and app.fifths.io
//
// PostHog through our own domain. Tracker blockers (uBlock, Brave, Opera, Firefox's strict
// mode) block posthog.com, so learners using them never reached the numbers. Both Pages
// projects deploy this functions/ folder, so the app and the site each proxy on their own
// origin, which also holds up against blockers that look behind a CNAME.
//
// Routing follows PostHog's proxy reference: /static/* (the SDK) and /array/* (remote
// config) from the assets host, everything else from the API host.

const API_HOST = "us.i.posthog.com";
const ASSETS_HOST = "us-assets.i.posthog.com";

export function upstreamFor(url) {
  const path = url.pathname.replace(/^\/ingest/, "") || "/";
  const host = path.startsWith("/static/") || path.startsWith("/array/") ? ASSETS_HOST : API_HOST;
  return new URL(`https://${host}${path}${url.search}`);
}

export async function onRequest({ request }) {
  const target = upstreamFor(new URL(request.url));
  const headers = new Headers(request.headers);
  // Our own cookies (Supabase session, the internal-device flag) stay with us. PostHog's
  // SDK sends its token in the body, or as a Bearer header, which goes through.
  headers.delete("cookie");
  const auth = headers.get("authorization");
  if (auth && !/^Bearer\s/i.test(auth)) headers.delete("authorization");
  // Cloudflare's own request headers must not go on: PostHog is behind Cloudflare too,
  // which refuses them from a Worker (error 1000).
  for (const name of [...headers.keys()]) {
    if (name.startsWith("cf-") || name.startsWith("x-forwarded-") || name === "x-real-ip" || name === "host") headers.delete(name);
  }
  // PostHog sees the visitor's address directly today; keep it that way for country.
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers.set("x-forwarded-for", ip);

  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  return fetch(target, init);
}
