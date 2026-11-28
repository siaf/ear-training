// Cloudflare Worker "fifths-daily-nudges": once a day, asks fifths.io to tell Loops who has
// stopped practising (functions/api/daily-nudges.js does the work, next to the keys).
// This Worker holds only NUDGES_SECRET, the same secret as on fifths-marketing.

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(run(env));
  },
};

export async function run(env, fetchImpl = fetch) {
  if (!env.NUDGES_SECRET) throw new Error("NUDGES_SECRET is not set");
  const res = await fetchImpl("https://fifths.io/api/daily-nudges", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.NUDGES_SECRET}` },
  });
  const body = await res.text();
  // Shows in the Worker's logs (wrangler tail, or the dashboard).
  console.log(`daily-nudges: ${res.status} ${body}`);
  // A thrown error marks the cron run as failed in Cloudflare's dashboard.
  if (!res.ok) throw new Error(`daily-nudges returned ${res.status}`);
}
