// Cloudflare Pages Function — POST /api/delete-account (fifths.io)
//
// "Delete account" in the app's settings. It removes everything we hold for the
// signed-in learner, in an order that can safely be retried if any step fails:
//
//   1. RevenueCat: refuses (409) while a subscription will still renew, because deleting
//      the customer doesn't stop the store charging them. Otherwise deletes the customer.
//   2. Loops: the email contact.
//   3. The waitlist row in D1, if they joined it with the same email.
//   4. Supabase: their saved progress (sessions, profiles), then the account itself.
//
// The account is deleted last: until then their sign-in still works, so a retry can
// finish the job. The user id and email come from Supabase, never from the request.
//
// Secrets on the fifths-marketing project:
//   SUPABASE_SERVICE_ROLE_KEY  required (Supabase > Project settings > API keys, secret key)
//   REVENUECAT_SECRET_KEY      required since checkout opened 2026-11-17 (RevenueCat > API keys, v1 secret)
//   LOOPS_API_KEY              already set, for wants-pro

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

/** Headers for Supabase as the server. New secret keys go on apikey only; old JWT keys on both. */
function serviceHeaders(key) {
  const headers = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

class StepFailed extends Error {
  constructor(step, detail) {
    super(`${step}: ${detail}`);
    this.step = step;
  }
}

async function check(step, promise, okStatuses = []) {
  let res;
  try {
    res = await promise;
  } catch (err) {
    throw new StepFailed(step, (err && err.message) || "network error");
  }
  if (!res.ok && !okStatuses.includes(res.status)) throw new StepFailed(step, `status ${res.status}`);
  return res;
}

/** A subscription that will charge again: not expired, and not cancelled. */
function hasRenewingSubscription(subscriber, now = Date.now()) {
  const subs = (subscriber && subscriber.subscriptions) || {};
  return Object.values(subs).some((s) => {
    if (!s || s.unsubscribe_detected_at || s.refunded_at) return false;
    if (s.store === "promotional") return false;
    return s.expires_date ? Date.parse(s.expires_date) > now : true;
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
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json(request, { error: "Not configured" }, 503);

  let user;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return json(request, { error: "Not signed in" }, 401);
    user = await res.json();
  } catch (err) {
    console.error("delete-account: Supabase check failed", err && err.message);
    return json(request, { error: "Server error" }, 502);
  }
  const id = user && user.id;
  const email = ((user && user.email) || "").toLowerCase();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return json(request, { error: "Not signed in" }, 401);

  try {
    // 1. RevenueCat
    if (env.REVENUECAT_SECRET_KEY) {
      const rc = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(id)}`;
      const rcHeaders = { Authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}` };
      const res = await check("revenuecat", fetch(rc, { headers: rcHeaders }), [404]);
      if (res.ok) {
        const body = await res.json();
        if (hasRenewingSubscription(body.subscriber)) {
          return json(request, { error: "Cancel your subscription first", code: "subscription_active" }, 409);
        }
      }
      await check("revenuecat", fetch(rc, { method: "DELETE", headers: rcHeaders }), [404]);
    }

    // 2. Loops (404: they were never on it)
    if (email && env.LOOPS_API_KEY) {
      await check(
        "loops",
        fetch("https://app.loops.so/api/v1/contacts/delete", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.LOOPS_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }),
        [404],
      );
    }

    // 3. Waitlist
    if (email && env.DB) {
      try {
        await env.DB.prepare("DELETE FROM waitlist WHERE email = ?").bind(email).run();
      } catch (err) {
        throw new StepFailed("waitlist", (err && err.message) || "D1 error");
      }
    }

    // 4. Supabase: progress, then the account.
    const service = serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY);
    for (const table of ["sessions", "profiles"]) {
      await check(
        `supabase_${table}`,
        fetch(`${SUPABASE_URL}/rest/v1/${table}?user_id=eq.${id}`, { method: "DELETE", headers: service }),
      );
    }
    await check(
      "supabase_user",
      fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: service }),
      [404],
    );
  } catch (err) {
    console.error("delete-account: failed at", err && err.message);
    return json(request, { error: "Server error", step: err && err.step }, 502);
  }

  return json(request, { ok: true }, 200);
}
