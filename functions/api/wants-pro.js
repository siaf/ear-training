// Cloudflare Pages Function — POST /api/wants-pro (fifths.io)
//
// While paid plans aren't open, the app tells a signed-in learner who taps "subscribe"
// that we'll email them when Pro opens. This keeps that promise: it marks their Loops
// contact with wantsPro = true, so a launch email can go to everyone who asked.
//
// It lives on fifths-marketing because that project holds LOOPS_API_KEY. The app calls
// it cross-origin from app.fifths.io with the learner's Supabase access token. The email
// comes from Supabase, never from the request, so nobody can add someone else's address.

const SUPABASE_URL = "https://azsedefwatnqjogotudi.supabase.co";

function allowedOrigin(origin) {
  if (origin === "https://app.fifths.io") return origin;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return origin; // npm run dev
  return null;
}

function cors(request) {
  const origin = allowedOrigin(request.headers.get("origin") || "");
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, apikey",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : {};
}

function json(request, body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(request) },
  });
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: cors(request) });
}

export async function onRequestPost({ request, env }) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  // The project's publishable key. It's public, and only works against SUPABASE_URL above.
  const apikey = request.headers.get("apikey") || "";
  if (!token || !apikey) return json(request, { error: "Not signed in" }, 401);
  if (!env.LOOPS_API_KEY) return json(request, { error: "Not configured" }, 503);

  let email;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return json(request, { error: "Not signed in" }, 401);
    email = ((await res.json()).email || "").toLowerCase();
  } catch (err) {
    console.error("wants-pro: Supabase check failed", err && err.message);
    return json(request, { error: "Server error" }, 502);
  }
  if (!email) return json(request, { error: "No email on account" }, 400);

  try {
    const res = await fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "PUT",
      headers: { Authorization: `Bearer ${env.LOOPS_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, wantsPro: true }),
    });
    if (!res.ok) {
      console.error("wants-pro: Loops returned", res.status);
      return json(request, { error: "Server error" }, 502);
    }
  } catch (err) {
    console.error("wants-pro: Loops failed", err && err.message);
    return json(request, { error: "Server error" }, 502);
  }
  return json(request, { ok: true }, 200);
}
