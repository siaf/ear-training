// Cloudflare Pages Function — POST /api/daily-nudges (fifths.io)
//
// Once a day, tells Loops which learners have stopped practising, so Loops workflows can
// email them. The scheduled Worker in workers/daily-nudges/ calls it; nothing else should.
//
// For every confirmed account with at least one synced lesson, it looks at the last lesson:
//
//   missed_a_day       last lesson 20–44 hours ago: the day after, when a nudge helps most
//   inactive_14_days   last lesson 14–15 days ago
//   inactive_30_days   last lesson 30–31 days ago
//   inactive_60_days   last lesson 60–61 days ago
//
// The windows are a day wide and the job runs once a day, so each quiet spell sends each
// event once. Event properties: streakDays (days in a row, in UTC, ending on the last
// lesson), lessonsDone, daysSinceLastSession and appUrl. Nothing about the learner's
// answers goes to Loops.
//
// The Idempotency-Key is the event, the account and the day of the last lesson, so a
// second run (a retry, or a manual one) sends nothing new. Learners who unsubscribed get
// no workflow emails: Loops checks that, not us.
//
// It lives on fifths-marketing because that project holds both keys it needs:
//   SUPABASE_SERVICE_ROLE_KEY  to read sessions and accounts
//   LOOPS_API_KEY              to send events
//   NUDGES_SECRET              shared with the Worker; requests without it are refused
//
// POST with ?dry=1 to see the counts without sending anything.

const SUPABASE_URL = "https://azsedefwatnqjogotudi.supabase.co";
const APP_URL = "https://app.fifths.io/?utm_source=loops&utm_medium=email&utm_campaign=";
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const LOOKBACK_DAYS = 62;

const WINDOWS = [
  { event: "missed_a_day", from: 20 * HOUR, to: 44 * HOUR },
  { event: "inactive_14_days", from: 14 * DAY, to: 15 * DAY },
  { event: "inactive_30_days", from: 30 * DAY, to: 31 * DAY },
  { event: "inactive_60_days", from: 60 * DAY, to: 61 * DAY },
];

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Compare without leaking the secret's length or contents through timing.
function sameSecret(given, expected) {
  const enc = new TextEncoder();
  const a = enc.encode(given);
  const b = enc.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i];
  return diff === 0;
}

// Supabase's secret keys (sb_secret_…) go in apikey only: sent as a Bearer token, they're
// refused. Only an old JWT service-role key (eyJ…) also goes in Authorization.
function serviceHeaders(key) {
  const headers = { apikey: key };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function fetchSessions(key, since) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const url = `${SUPABASE_URL}/rest/v1/sessions?select=user_id,started_at&started_at=gte.${encodeURIComponent(since)}&order=started_at.asc&limit=1000&offset=${offset}`;
    const res = await fetch(url, { headers: serviceHeaders(key) });
    if (!res.ok) throw new Error(`sessions returned ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function fetchAccounts(key) {
  const users = new Map();
  for (let page = 1; ; page++) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: serviceHeaders(key) });
    if (!res.ok) throw new Error(`admin/users returned ${res.status}`);
    const list = (await res.json()).users || [];
    for (const u of list) users.set(u.id, u);
    if (list.length < 1000) return users;
  }
}

const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Days in a row with a lesson, in UTC, ending on the day of the last one. */
function streakEnding(dayStrings, lastDay) {
  const days = new Set(dayStrings);
  let streak = 0;
  for (let t = Date.parse(`${lastDay}T00:00:00Z`); days.has(utcDay(t)); t -= DAY) streak++;
  return streak;
}

/** Who gets which event, from synced lessons and accounts. */
function pickNudges(sessions, accounts, now) {
  const byUser = new Map();
  for (const s of sessions) {
    const t = Date.parse(s.started_at);
    if (!Number.isFinite(t)) continue;
    const e = byUser.get(s.user_id) || { last: 0, count: 0, days: [] };
    e.last = Math.max(e.last, t);
    e.count++;
    e.days.push(utcDay(t));
    byUser.set(s.user_id, e);
  }
  const nudges = [];
  for (const [userId, e] of byUser) {
    const account = accounts.get(userId);
    const email = ((account && account.email) || "").toLowerCase();
    if (!account || !email || account.is_anonymous || !(account.email_confirmed_at || account.confirmed_at)) continue;
    const since = now - e.last;
    const window = WINDOWS.find((w) => since >= w.from && since < w.to);
    if (!window) continue;
    const lastDay = utcDay(e.last);
    nudges.push({
      userId,
      email,
      event: window.event,
      lastDay,
      properties: {
        streakDays: streakEnding(e.days, lastDay),
        lessonsDone: e.count,
        daysSinceLastSession: Math.floor(since / DAY),
        appUrl: APP_URL + window.event,
      },
    });
  }
  return nudges;
}

async function sendNudge(loopsKey, n) {
  const res = await fetch("https://app.loops.so/api/v1/events/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loopsKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${n.event}-${n.userId}-${n.lastDay}`,
    },
    body: JSON.stringify({ email: n.email, userId: n.userId, eventName: n.event, eventProperties: n.properties }),
  });
  // 409: this exact event already went out (a second run the same day).
  if (res.ok) return "sent";
  if (res.status === 409) return "already";
  throw new Error(`events/send returned ${res.status}`);
}

export async function onRequestPost({ request, env }) {
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.NUDGES_SECRET || !given || !sameSecret(given, env.NUDGES_SECRET)) return json({ error: "Forbidden" }, 403);
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.LOOPS_API_KEY) return json({ error: "Not configured" }, 503);

  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const now = Date.now();
  let nudges;
  try {
    const since = new Date(now - LOOKBACK_DAYS * DAY).toISOString();
    const [sessions, accounts] = await Promise.all([
      fetchSessions(env.SUPABASE_SERVICE_ROLE_KEY, since),
      fetchAccounts(env.SUPABASE_SERVICE_ROLE_KEY),
    ]);
    nudges = pickNudges(sessions, accounts, now);
  } catch (err) {
    console.error("daily-nudges: Supabase failed", err && err.message);
    return json({ error: "Server error" }, 502);
  }

  const counts = Object.fromEntries(WINDOWS.map((w) => [w.event, nudges.filter((n) => n.event === w.event).length]));
  if (dry) return json({ ok: true, dry: true, counts }, 200);

  // Loops allows about 10 requests a second: five at a time stays well under it.
  const result = { sent: 0, already: 0, failed: 0 };
  for (let i = 0; i < nudges.length; i += 5) {
    const batch = await Promise.allSettled(nudges.slice(i, i + 5).map((n) => sendNudge(env.LOOPS_API_KEY, n)));
    for (const r of batch) {
      if (r.status === "fulfilled") result[r.value]++;
      else {
        result.failed++;
        console.error("daily-nudges: Loops failed", r.reason && r.reason.message);
      }
    }
  }
  return json({ ok: result.failed === 0, counts, ...result }, result.failed ? 502 : 200);
}
