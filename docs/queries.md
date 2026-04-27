# Fifths — D1 Query Cookbook

> Run these via the Cloudflare Developer Platform MCP (`d1_database_query`) or the D1 dashboard console (Cloudflare → D1 → `fifths` → Console).

---

## 1. Headline numbers (daily ritual)

```sql
-- Total signups, survey completion rate, top campaign, top use case.
SELECT
  COUNT(*) AS total,
  COUNT(survey_completed_at) AS with_survey,
  ROUND(100.0 * COUNT(survey_completed_at) / NULLIF(COUNT(*), 0), 1) AS survey_pct,
  (SELECT utm_campaign FROM waitlist
   WHERE utm_campaign IS NOT NULL AND utm_campaign != ''
   GROUP BY utm_campaign ORDER BY COUNT(*) DESC LIMIT 1) AS top_campaign,
  (SELECT use_case FROM waitlist
   WHERE use_case != '' AND use_case IS NOT NULL
   GROUP BY use_case ORDER BY COUNT(*) DESC LIMIT 1) AS top_use_case
FROM waitlist;
```

## 2. Per-landing conversion

```sql
-- Which landing page pulls, based on utm_campaign prefix.
-- Note: not perfect — _redirects sets utm_content per-post, utm_campaign per-sub.
-- The landing page itself is encoded in the URL path (referrer logs).
SELECT
  CASE
    WHEN referrer LIKE '%/jazz%'         THEN '/jazz'
    WHEN referrer LIKE '%/classical%'    THEN '/classical'
    WHEN referrer LIKE '%/transcribing%' THEN '/transcribing'
    WHEN referrer LIKE '%/returning%'    THEN '/returning'
    ELSE '/'
  END AS landing_page,
  COUNT(*) AS signups,
  COUNT(survey_completed_at) AS completed_survey
FROM waitlist
GROUP BY landing_page
ORDER BY signups DESC;
```

## 3. Per-subreddit / per-campaign breakdown

```sql
SELECT
  utm_campaign,
  COUNT(*) AS signups,
  COUNT(survey_completed_at) AS with_survey,
  MIN(created_at) AS first_signup,
  MAX(created_at) AS last_signup
FROM waitlist
WHERE utm_campaign IS NOT NULL AND utm_campaign != ''
GROUP BY utm_campaign
ORDER BY signups DESC;
```

## 4. Per-angle (utm_content) performance — which hook worked?

```sql
SELECT
  utm_campaign,
  utm_content,
  COUNT(*) AS signups
FROM waitlist
WHERE utm_content IS NOT NULL AND utm_content != ''
GROUP BY utm_campaign, utm_content
ORDER BY signups DESC;
```

## 5. Day-over-day growth

```sql
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS signups,
  COUNT(survey_completed_at) AS with_survey
FROM waitlist
GROUP BY day
ORDER BY day;
```

## 6. Hero vs. Bottom form — does "scroll-depth intent" matter?

```sql
SELECT
  form_source,
  COUNT(*) AS signups,
  ROUND(100.0 * COUNT(survey_completed_at) / NULLIF(COUNT(*), 0), 1) AS survey_pct
FROM waitlist
GROUP BY form_source;
```

## 7. Use-case distribution (what to build first)

```sql
SELECT
  use_case,
  COUNT(*) AS n,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM waitlist WHERE use_case != ''), 1) AS pct
FROM waitlist
WHERE use_case != '' AND use_case IS NOT NULL
GROUP BY use_case
ORDER BY n DESC;
```

## 8. Open-ended concerns — read them all

```sql
SELECT
  use_case,
  concern,
  utm_campaign,
  created_at
FROM waitlist
WHERE concern != '' AND concern IS NOT NULL
ORDER BY created_at DESC
LIMIT 200;
```

Then read them in a coffee sitting and write a 10-line "themes I saw" note.

## 9. Geographic distribution (ip_country)

```sql
SELECT
  ip_country,
  COUNT(*) AS signups
FROM waitlist
WHERE ip_country IS NOT NULL AND ip_country != ''
GROUP BY ip_country
ORDER BY signups DESC
LIMIT 20;
```

## 10. Day-14 decision

```sql
SELECT
  COUNT(*)                                                         AS total_signups,
  ROUND(100.0 * COUNT(survey_completed_at) / NULLIF(COUNT(*), 0), 1) AS survey_pct,
  SUM(CASE WHEN utm_campaign LIKE 'r%'             THEN 1 ELSE 0 END) AS from_reddit,
  SUM(CASE WHEN utm_source   = 'hackernews'        THEN 1 ELSE 0 END) AS from_hn,
  SUM(CASE WHEN utm_source   = 'x'                 THEN 1 ELSE 0 END) AS from_x,
  SUM(CASE WHEN utm_campaign = 'rsideproject'      THEN 1 ELSE 0 END) AS rsideproject,
  SUM(CASE WHEN utm_campaign = 'reartraining'      THEN 1 ELSE 0 END) AS reartraining,
  SUM(CASE WHEN utm_campaign = 'rmusictheory'      THEN 1 ELSE 0 END) AS rmusictheory,
  SUM(CASE WHEN utm_campaign = 'rjazztheory'       THEN 1 ELSE 0 END) AS rjazztheory,
  SUM(CASE WHEN utm_campaign = 'rclassicalmusic'   THEN 1 ELSE 0 END) AS rclassicalmusic
FROM waitlist;
```

Decision:
- **total_signups ≥ 300 AND survey_pct ≥ 50** → 🟢 commit to Week-1 infra build
- **100 ≤ total_signups < 300** → 🟡 extend + iterate positioning
- **total_signups < 100** → 🔴 revisit wedge

## 11. Export for later import into Supabase

```sql
-- Full dump — adjust limit if the waitlist is bigger than a few thousand rows.
SELECT
  email, form_source,
  utm_source, utm_medium, utm_campaign, utm_content,
  referrer, ip_country, created_at,
  use_case, concern, survey_completed_at
FROM waitlist
ORDER BY created_at ASC
LIMIT 10000;
```

Download the CSV from the D1 dashboard → Console → Download results. Import into Supabase `waitlist_signups` table when Week 1 infra lands.

## 12. One-off cleanup — remove your own test rows

```sql
DELETE FROM waitlist WHERE email IN (
  'your-test-1@example.com',
  'your-test-2@example.com'
);

-- Reset the autoincrement counter so the next real row is ID 1:
DELETE FROM sqlite_sequence WHERE name = 'waitlist';
```

**Run this once before going live.** Test signups pad your count and look dishonest in retrospect.
