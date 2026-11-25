---
name: user-status
description: Check how Fifths learners are doing since the last check — sign-ups, lessons, where people quit, returning learners, plans and purchases, where visitors come from, and new errors — from Supabase, PostHog, Sentry and Loops, then report in plain language. Use when asked "how are our users doing", "check on the users", "user behaviour since last time", "any sign-ups", or similar.
---

# User status check

A read-only look at how real learners are doing, compared with the last check. It reads Supabase, PostHog, Sentry and (if asked or relevant) Loops. **It changes nothing**: no Loops writes, no Sentry resolves, no deploys, unless the user asks for that separately.

## 1. Pick the window

Read [history.md](history.md) in this folder. The window is **since the last check listed there**. With no entry, use the last 7 days. Also note the latest deploys, since a change in the numbers often lines up with one:

```bash
git for-each-ref --sort=-creatordate --count=3 --format='%(refname:short) %(creatordate:iso)' refs/tags/deploy/app
```

## 2. Leave the team's own account out

The owner tests on the live app (including real purchases). Never put the owner's email in a query or report. Their account is matched by the hash in `src/lib/owner.ts`:

- Supabase user id: `31e003ab-f32e-4cd0-b45a-5e355d10aa5a` (re-derive if in doubt):
  `select id from auth.users where encode(sha256(convert_to(lower(trim(email)),'UTF8')),'hex') = '<OWNER_EMAIL_SHA256 from src/lib/owner.ts>'`
- PostHog: add this to every `WHERE`:
  `AND person_id NOT IN (SELECT person_id FROM person_distinct_ids WHERE distinct_id = '31e003ab-f32e-4cd0-b45a-5e355d10aa5a')`

## 3. Supabase (project `azsedefwatnqjogotudi`, `mcp__supabase__execute_sql`)

Supabase is the reliable count of signed-in learners. PostHog misses anyone whose browser blocks trackers (Opera, Brave, uBlock and so on), so when the two disagree, trust Supabase and say PostHog is undercounting.

PostHog has two sign-up events. `fifths_signup` comes from the browser and misses learners whose blockers stop PostHog altogether (about a quarter in mid-November). `account_confirmed` with `$source = 'server'` comes from `functions/api/account-confirmed.js`, once per confirmed account, and is complete. Use it for sign-up counts in PostHog. Once the `/ingest` proxy is live (built 2026-11-25; check the deploy tags), PostHog's other events should undercount much less; compare with Supabase to check.

```sql
-- Sign-ups per day, and how many confirmed their email
select created_at::date as day, count(*) as signups, count(email_confirmed_at) as confirmed
from auth.users where created_at > now() - interval '7 days' and id <> '31e003ab-f32e-4cd0-b45a-5e355d10aa5a'
group by 1 order by 1;

-- Each recent sign-up: lessons synced, lessons completed, last sign-in
select u.created_at, u.email_confirmed_at is not null as confirmed,
  (select count(*) from public.sessions s where s.user_id = u.id) as lessons,
  coalesce(array_length(p.completed_levels, 1), 0) as completed, u.last_sign_in_at
from auth.users u left join public.profiles p on p.user_id = u.id
where u.created_at > now() - interval '7 days' and u.id <> '31e003ab-f32e-4cd0-b45a-5e355d10aa5a' order by u.created_at;

-- Lessons per day (signed-in learners only)
select started_at::date as day, count(*) as lessons, count(distinct user_id) as learners, round(avg(accuracy)::numeric, 1) as avg_accuracy
from public.sessions where started_at > now() - interval '7 days' and user_id <> '31e003ab-f32e-4cd0-b45a-5e355d10aa5a'
group by 1 order by 1;

-- Returning learners: lessons in the window by people who signed up before it (the retention signal)
select count(distinct s.user_id) as returning_learners, count(*) as lessons
from public.sessions s join auth.users u on u.id = s.user_id
where s.started_at > now() - interval '3 days' and u.created_at < now() - interval '3 days'
  and s.user_id <> '31e003ab-f32e-4cd0-b45a-5e355d10aa5a';

-- Per-lesson results in the window (accuracy near 50% on a two-choice lesson means guessing)
select level_id, count(*) as runs, round(avg(accuracy)::numeric, 0) as avg_accuracy
from public.sessions where started_at > now() - interval '7 days' and user_id <> '31e003ab-f32e-4cd0-b45a-5e355d10aa5a'
group by 1 order by runs desc;
```

`auth.sessions.user_agent` shows a learner's browser, which explains a learner who's in Supabase but missing from PostHog.

## 4. PostHog (project 408097, `mcp__posthog__exec`)

Use `call execute-sql {"query": "..."}` and keep the `conversation_id` it returns for later calls. HogQL notes: `count()` not `count(*)`, always bound `timestamp`, count people with `uniq(person_id)`. App events have `properties.$host = 'app.fifths.io'`; the marketing site is `fifths.io`.

Event names worth knowing: `session_started`, `session_completed`, `session_abandoned` (with `level_id`), `deep_link_start`, `onboarding_choice`, `signin_gate_shown`, `auth_sheet_opened`, `fifths_signup`, `paywall_viewed`, `paywall_plan_selected`, `purchase_started`, `purchase_cancelled`, `fifths_purchase`, `voice_check_completed`, `voice_check_skipped`, `mic_failed`, `level_unlocked`, `lesson_repeated`, `path_coming_soon_tapped`, `share_opened`, `share_completed`, `tool_*` (free tools), `blog_quiz_*`. If one returns nothing, list what exists before concluding anything: `SELECT event, count() FROM events WHERE timestamp >= now() - INTERVAL 3 DAY AND event NOT LIKE '$%' GROUP BY event ORDER BY 2 DESC`.

```sql
-- Daily funnel (add the owner filter from step 2)
SELECT toDate(timestamp) AS day,
  uniqIf(person_id, properties.$host = 'fifths.io') AS site_visitors,
  uniqIf(person_id, properties.$host = 'app.fifths.io') AS app_visitors,
  uniqIf(person_id, event = 'session_started') AS started_lesson,
  uniqIf(person_id, event = 'session_completed') AS finished_lesson,
  uniqIf(person_id, event = 'fifths_signup') AS signups,
  uniqIf(person_id, event = 'paywall_viewed') AS saw_plans,
  uniqIf(person_id, event = 'purchase_started') AS started_checkout,
  uniqIf(person_id, event = 'fifths_purchase') AS bought
FROM events WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY day ORDER BY day

-- Where people quit, by lesson
SELECT properties.level_id AS lesson, countIf(event = 'session_started') AS started,
  countIf(event = 'session_completed') AS completed, countIf(event = 'session_abandoned') AS quit,
  uniqIf(person_id, event = 'session_abandoned') AS quitters
FROM events WHERE timestamp >= now() - INTERVAL 7 DAY
  AND event IN ('session_started', 'session_completed', 'session_abandoned')
GROUP BY lesson ORDER BY quit DESC LIMIT 30

-- Where people arriving straight into a lesson came from
SELECT timestamp, properties.utm_source AS source, properties.utm_medium AS medium,
  properties.utm_campaign AS campaign, properties.$referrer AS referrer, properties.$browser AS browser
FROM events WHERE timestamp >= now() - INTERVAL 7 DAY AND event = 'deep_link_start' ORDER BY timestamp
```

For a person worth following (a deep-link visitor who left, someone who reached checkout), list their events in order with `$pathname`, and their `fifths.io` page views by `person_id`, to see what they did before and after the app.

**Purchases:** there is no RevenueCat connection here, so count `fifths_purchase` with the owner filter. Purchases by the owner are tests.

**Singing lessons (`sing_attempt`):** one event per singing question once the release after `6d6f677` is live, saying what the mic and pitch detector heard (`src/lib/singTelemetry.ts`). It answers why people quit Match the Pitch. Read it by outcome and browser:

```sql
SELECT properties.level_id AS lesson, properties.outcome AS outcome, properties.$os AS os, properties.$browser AS browser,
  count() AS questions, uniq(person_id) AS people,
  countIf(properties.mic_problem IS NOT NULL) AS mic_problem,
  round(avg(toFloat(properties.ms_to_mic))) AS ms_to_mic,
  round(avg(toFloat(properties.muted_ms))) AS muted_ms,
  round(avg(toFloat(properties.voice_ms))) AS voice_ms,
  round(avg(toFloat(properties.in_tune_ms))) AS in_tune_ms,
  round(avg(toFloat(properties.best_hold_ms))) AS best_hold_ms,
  round(avg(toFloat(properties.breaks_dropout)), 1) AS breaks_dropout,
  round(avg(toFloat(properties.breaks_off_pitch)), 1) AS breaks_off_pitch,
  round(avg(toFloat(properties.median_abs_cents))) AS abs_cents
FROM events WHERE timestamp >= now() - INTERVAL 7 DAY AND event = 'sing_attempt'
GROUP BY lesson, outcome, os, browser ORDER BY questions DESC
```

How to read the questions that ended `left` or `skipped`:

- **The mic:** `mic_problem` set, a long `ms_to_mic` (the permission prompt), or `voice_ms` near 0 with no problem reported (a mic that's on but hears nothing).
- **Muted at the start:** the app mutes the mic while it plays the note and lets it ring out (about 2.5–3.5 s, `muted_ms`). People leaving at around that time, with `voice_ms` near 0, didn't wait for it.
- **The matching code:** `in_tune_ms` well over `hold_ms` (900 for Match the Pitch) but `best_hold_ms` under it, with `breaks_dropout` high. They were in tune but the detector kept losing them, and every dropout restarts the hold.
- **The singing:** plenty of `voice_ms`, little `in_tune_ms`, and `abs_cents` far off (100+ is a semitone or more). Compare questions that ended `matched`.

## 5. Sentry (org `ketabian-llc`, project `fifths-web`)

`mcp__sentry__search_issues` with `query: "is:unresolved lastSeen:-3d"` (or the window), and `firstSeen:-3d` for new ones. Open anything new with `get_issue_details`: the tags give the browser, device and release. `release` is the commit the app was built from; compare it with the latest `deploy/app/*` tag, since errors from an old release usually mean an old copy of the app, not a new bug. Expected noise is archived (people refusing the microphone).

## 6. Loops (only when the question is about email or sign-ups)

Read-only: `mcp__loops__execute`. Welcome workflow `cmoge46v43u1b0h2vu97paqq3` (starts on `account_confirmed`), Day 1 Reactivation `cmogeyhhy0dgd0i2usqobkn71`. Node metrics: `/v1/workflows/{id}/nodes/{nodeId}/metrics`. Contacts can only be found by email. Never write to Loops from this check.

## 7. Report

Write for the owner, in plain language, short:

1. **Headline**: one or two sentences, the most important change since the last check.
2. **Since the last check**: sign-ups (confirmed), learners and lessons, returning learners, plans and purchases, traffic. Compare with the previous check's numbers from history.md.
3. **Where people quit**: a small table of the worst lessons. Say when numbers are too small to mean much.
4. **Where visitors came from**, if something stands out (a new source, a page that sends people to a hard lesson).
5. **Errors**: new Sentry issues and whether they matter.
6. **What I'd do next**: at most three suggestions, most valuable first. Don't start any of them without being asked.

Rules:

- **No customer names, emails or account ids** in the report. Describe people by what they did ("the learner who signed up Tuesday morning", "an Opera user").
- If two sources disagree, say so and explain it (blockers, timing, the owner's own activity) rather than pick one silently. Check before calling something a bug: PostHog ignores headless browsers, so testing the live app with Playwright shows no events either way.
- Don't change anything. Offer.

## 8. Record the check

Append one entry to [history.md](history.md): the date and time (UTC), the window, and the headline numbers. Aggregates only, never names or emails. The next check starts from it.
