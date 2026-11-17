// Cloudflare Pages Function — POST /api/account-confirmed (fifths.io)
//
// Loops gets a contact the moment Supabase creates an account, which happens when someone
// asks for a magic link, before they click it. So Loops can't tell who actually got in.
// The app calls this once it has a confirmed account (src/lib/loopsConfirm.ts). It asks
// Supabase for the account, and only if the email is confirmed marks the Loops contact
// emailConfirmed = true and sends the `account_confirmed` event, which starts the Welcome
// email. A contact that's already marked gets no second event, so other devices and
// repeat calls are harmless.
//
// Like wants-pro.js, it lives on fifths-marketing because that project holds LOOPS_API_KEY.

const SUPABASE_URL = "https://azsedefwatnqjogotudi.supabase.co";

function allowedOrigin(origin) {
  if (origin === "https://app.fifths.io") return origin;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return origin; // npm run dev
  if (/^capacitor:\/\/localhost$|^https?:\/\/localhost$/.test(origin)) return origin; // iOS and Android apps
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

  let user;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return json(request, { error: "Not signed in" }, 401);
    user = await res.json();
  } catch (err) {
    console.error("account-confirmed: Supabase check failed", err && err.message);
    return json(request, { error: "Server error" }, 502);
  }
  const email = ((user && user.email) || "").toLowerCase();
  if (!user || !user.id || !email) return json(request, { error: "No email on account" }, 400);
  if (user.is_anonymous || !(user.email_confirmed_at || user.confirmed_at)) {
    return json(request, { error: "Email not confirmed" }, 409);
  }

  const loops = { Authorization: `Bearer ${env.LOOPS_API_KEY}`, "Content-Type": "application/json" };
  try {
    const found = await fetch(`https://app.loops.so/api/v1/contacts/find?email=${encodeURIComponent(email)}`, { headers: loops });
    if (!found.ok) throw new Error(`find returned ${found.status}`);
    const [contact] = await found.json();
    if (contact && contact.emailConfirmed === true) return json(request, { ok: true, already: true }, 200);

    // One call: marks the contact (creating it if Supabase's sync hasn't yet) and starts Welcome.
    const res = await fetch("https://app.loops.so/api/v1/events/send", {
      method: "POST",
      headers: { ...loops, "Idempotency-Key": `account_confirmed-${user.id}` },
      body: JSON.stringify({ email, userId: user.id, eventName: "account_confirmed", emailConfirmed: true }),
    });
    // 409: this exact event already went out in the last 24 hours.
    if (!res.ok && res.status !== 409) throw new Error(`events/send returned ${res.status}`);
  } catch (err) {
    console.error("account-confirmed: Loops failed", err && err.message);
    return json(request, { error: "Server error" }, 502);
  }
  return json(request, { ok: true }, 200);
}
