// Cloudflare Pages Function — POST /waitlist
// Stores waitlist submissions in a Cloudflare D1 database, then sends a
// confirmation email via Loops (best-effort; D1 insert is the source of truth).
//
// Bindings required on the Pages project:
//   - DB              (D1 database, name the binding exactly "DB")
//   - LOOPS_API_KEY   (secret, set via `wrangler pages secret put`)
//
// Schema: see schema.sql at the repo root. The `email` column is UNIQUE,
// so every submission operates on "one row per email":
//
//   - form_source = "hero" | "bottom"  → INSERT ... ON CONFLICT DO NOTHING
//     (first-touch attribution: the first UTM a visitor brings in wins)
//
//   - form_source = "survey"           → INSERT ... ON CONFLICT DO UPDATE
//     (fills in use_case/concern/survey_completed_at on the existing row,
//      or inserts a fresh row if the survey POST race-wins the hero POST)

export async function onRequestPost({ request, env }) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let data = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      new URLSearchParams(text).forEach((value, key) => {
        data[key] = value;
      });
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        data[key] = typeof value === "string" ? value : "";
      });
    } else if (contentType.includes("application/json")) {
      data = await request.json();
    } else {
      return json({ error: "Unsupported content-type" }, 415);
    }

    const email = (data.email || "").toString().trim().toLowerCase();
    if (!email || !email.includes("@") || email.length > 254) {
      return json({ error: "Invalid email" }, 400);
    }

    // Keep text fields bounded so we don't accept arbitrarily large payloads.
    const clip = (v, n) => (v == null ? "" : String(v).slice(0, n));
    const now = new Date().toISOString();
    const formSource = clip(data.form_source, 32);

    if (formSource === "survey") {
      // Survey submission — upsert so survey answers attach to the existing
      // row if present, or create a full row if (rare) the survey POST wins
      // the race against the initial email POST. ON CONFLICT only overwrites
      // the survey-specific fields; original UTMs and form_source are kept.
      await env.DB.prepare(
        `INSERT INTO waitlist (
          email, form_source,
          utm_source, utm_medium, utm_campaign, utm_content,
          referrer, user_agent, ip_country,
          use_case, concern, survey_completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          use_case = excluded.use_case,
          concern = excluded.concern,
          survey_completed_at = excluded.survey_completed_at`
      )
        .bind(
          email,
          formSource,
          clip(data.utm_source, 128),
          clip(data.utm_medium, 128),
          clip(data.utm_campaign, 128),
          clip(data.utm_content, 128),
          clip(data.referrer, 512),
          clip(request.headers.get("user-agent"), 512),
          clip(request.headers.get("cf-ipcountry"), 8),
          clip(data.use_case, 64),
          clip(data.concern, 2000),
          now,
          now
        )
        .run();
    } else {
      // Initial email submission (hero or bottom form) — insert a new row,
      // or no-op if this email already signed up (preserves first-touch UTM).
      await env.DB.prepare(
        `INSERT INTO waitlist (
          email, form_source,
          utm_source, utm_medium, utm_campaign, utm_content,
          referrer, user_agent, ip_country, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO NOTHING`
      )
        .bind(
          email,
          formSource || "hero",
          clip(data.utm_source, 128),
          clip(data.utm_medium, 128),
          clip(data.utm_campaign, 128),
          clip(data.utm_content, 128),
          clip(data.referrer, 512),
          clip(request.headers.get("user-agent"), 512),
          clip(request.headers.get("cf-ipcountry"), 8),
          now
        )
        .run();
    }

    // Best-effort: enroll in Loops audience + tag with the most recent form
    // submission. Failures here don't break the user-facing response — the
    // D1 insert above is authoritative.
    if (env.LOOPS_API_KEY) {
      try {
        await fetch("https://app.loops.so/api/v1/contacts/update", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${env.LOOPS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            source: "waitlist",
            userGroup: formSource === "survey" ? "waitlist-surveyed" : "waitlist",
            // first-touch UTM attribution (matches what's stored in D1)
            utmSource: clip(data.utm_source, 128),
            utmMedium: clip(data.utm_medium, 128),
            utmCampaign: clip(data.utm_campaign, 128),
            utmContent: clip(data.utm_content, 128),
            // survey enrichment, only present on the survey POST
            useCase: clip(data.use_case, 64),
            concern: clip(data.concern, 2000),
          }),
        });

        // Fire the "waitlist confirmation" event so a Loops automation can
        // send the welcome email. Only fires on the initial hero/bottom POST,
        // not the survey POST (we don't want a second confirmation email).
        if (formSource !== "survey") {
          await fetch("https://app.loops.so/api/v1/events/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.LOOPS_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              eventName: "waitlist_signup",
              eventProperties: {
                formSource: formSource || "hero",
              },
            }),
          });
        }
      } catch (loopsErr) {
        console.error("Loops sync error (non-fatal):", loopsErr && loopsErr.message);
      }
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error("Waitlist insert error:", err && err.message);
    return json({ error: "Server error" }, 500);
  }
}

// Any non-POST method auto-returns 405 since only onRequestPost is exported.

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
