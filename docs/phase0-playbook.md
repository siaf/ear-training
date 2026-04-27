# Fifths — Phase 0 Launch Playbook

> **Purpose:** operational runbook for the 2-week validation sprint. The goal is **300 waitlist signups** (product-plan §9.2). Below that threshold, we revisit positioning; above it, we commit to Week-1 infra per [infra-plan.md](./infra-plan.md).

---

## 1. Pre-launch (T-minus 2 weeks → T-minus 0)

### Account warmup (do this NOW if not already)

Reddit's spam filter hates:
- New accounts (<30 days)
- Zero/low karma accounts
- Accounts with history of only link-drops

**What to do in the 2 weeks before launch:**
- Post 5-10 genuine replies per week in the target subs. No links. Share actual perspective.
- Comment on 3-5 posts/day across r/musictheory, r/EarTraining, r/piano, r/jazztheory — answer questions honestly.
- Avoid any self-promo. You're earning the right to post, not warming a link gun.

### Domain + deployment

- [ ] `fifths.io` registered (via Cloudflare Registrar, ~$32/yr)
- [ ] Umami website created, website ID copied
- [ ] All placeholders in the 5 HTML files replaced with real Umami ID
- [ ] Cloudflare Pages project `fifths-marketing` created and deployed — see [deploy-checklist.md](./deploy-checklist.md)
- [ ] `fifths.io` (apex) and `www.fifths.io` both resolve to the Pages project
- [ ] D1 database `fifths` created, schema run, binding attached
- [ ] End-to-end smoketest passed (per [deploy-checklist.md](./deploy-checklist.md) §5)

### Pre-launch social

- [ ] Create a landing-page Twitter/X handle (`@fifths_io` if available)
- [ ] Claim `fifths` on Product Hunt (Upcoming / Coming Soon)
- [ ] Warm the email list with a "pre-launch" note from your personal network — 10-20 early sign-ins bias the social-proof signal

---

## 2. Launch sequence (14-day calendar)

Space posts out. Never drop the same copy to two subs the same day — mods do talk.

### Week 1 — safe subs, build momentum

| Day | Channel | URL (short path) | Angle |
|---|---|---|---|
| **Mon** | r/SideProject | `/r/sideproject` | "I built a thing, looking for honest feedback." |
| **Tue** | r/EarTraining | `/r/eartraining` | "If you've done the apps and still can't transcribe, here's why." |
| **Wed** | r/pianolearning | `/r/pianolearning` | "Hearing scale degrees changed how I play." |
| **Thu** | X / Twitter thread | `/x` | Hook → matrix screenshot → waitlist CTA. 6-tweet thread. |
| **Fri** | r/guitarlessons | `/r/guitarlessons` | "Figuring out songs by ear — the skill that never gets taught." |
| **Sat** | — (quiet day, respond to replies from the week) | — | — |
| **Sun** | r/musictheory | `/r/musictheory` | Tool-share angle: "Built this to surface what ear trainers don't tell you." |

### Week 2 — higher-signal wedges, Ask HN

| Day | Channel | URL (short path) | Angle |
|---|---|---|---|
| **Mon** | r/jazztheory | `/r/jazztheory` | "Altered dominants, modal interchange — with a matrix." |
| **Tue** | r/classicalmusic | `/r/classicalmusic` | "Ear training with actual functional analysis." |
| **Wed** | r/piano | `/r/piano` | Scale-degree framing, beginner-to-intermediate. |
| **Thu** | r/WeAreTheMusicMakers | `/r/wearethemusicmakers` | Builder-narrative angle: "I was tired of subscription apps." |
| **Fri** | **Ask HN** (NOT Show HN — landing pages violate Show HN guidelines) | `/hn` | "Ask HN: would you pay for ear training that shows you *what* you miss?" |
| **Sat** | r/composer | `/r/composer` | Inner-hearing + composition angle. |
| **Sun** | r/musiced | `/r/musiced` | Teacher-adjacent, adult-returner framing. |

**Mandatory flair checks:**
- r/selfhosted (skip — not our sub, but if ever reused: mandatory `Self-Promotion`)
- r/musictheory: flair is required, use `Discussion` or `Ear Training`
- r/jazztheory: flair is optional but `Resources` or `Discussion` fits
- r/SideProject: no flair requirement, but the body must read as a project share, not a sales pitch
- r/classicalmusic: flair is required, use `Discussion` (NOT `Announcement` — that's for events)

**Strict-rule subs we are NOT posting links to directly** (link-less text posts only, DM link if asked):
- r/personalfinance (banned outright — just skip)
- r/entrepreneur (link-less only, low value anyway)

### Reply cadence

- **First 6 hours** after each post: respond to every comment within 30 minutes. Removal risk is highest here.
- **Days 1-3** post-drop: check twice/day, reply to anyone with a genuine question.
- **Day 4+**: once a day, thank people who upvoted, engage if anything surfaces.

---

## 3. Monitoring ritual (daily, 5 min)

Run this query via the Cloudflare Developer Platform MCP (`d1_database_query`) or the D1 dashboard console every morning:

```sql
SELECT
  COUNT(*) AS total,
  COUNT(survey_completed_at) AS with_survey,
  (SELECT utm_campaign FROM waitlist GROUP BY utm_campaign
   ORDER BY COUNT(*) DESC LIMIT 1) AS top_campaign,
  (SELECT use_case FROM waitlist WHERE use_case != ''
   GROUP BY use_case ORDER BY COUNT(*) DESC LIMIT 1) AS top_use_case
FROM waitlist;
```

Also check:
- Umami dashboard → see which landings are getting traffic vs. converting
- Cloudflare Web Analytics → traffic-source breakdown
- Each Reddit post → removed by automod? karma count? top comments?

Full query cookbook in [queries.md](./queries.md).

---

## 4. Day-14 decision framework

Per product-plan §9.2, the validation gate is **300 signups**. Read the data honestly.

| Signal | Threshold | Decision |
|---|---|---|
| **🟢 Green** | 300+ signups, >50% survey completion, concentrated intent in 1-2 use cases | Commit to Week-1 infra. Start building. |
| **🟡 Yellow** | 100-300 signups, mixed intent | Extend sprint 1-2 weeks. Sharpen positioning based on survey data. Re-launch targeted subs with revised copy. |
| **🔴 Red** | <100 signups | Revisit the wedge. The positioning or the audience is wrong. Don't build on this signal. |

### Decision query

```sql
-- Hit or miss, in one query:
SELECT
  COUNT(*)                                                         AS total_signups,
  ROUND(100.0 * COUNT(survey_completed_at) / COUNT(*), 1)          AS survey_pct,
  SUM(CASE WHEN utm_campaign LIKE 'r%'             THEN 1 ELSE 0 END) AS from_reddit,
  SUM(CASE WHEN utm_source   = 'hackernews'        THEN 1 ELSE 0 END) AS from_hn,
  SUM(CASE WHEN utm_source   = 'x'                 THEN 1 ELSE 0 END) AS from_x,
  SUM(CASE WHEN utm_campaign = 'rsideproject'      THEN 1 ELSE 0 END) AS rsideproject,
  SUM(CASE WHEN utm_campaign = 'reartraining'      THEN 1 ELSE 0 END) AS reartraining,
  SUM(CASE WHEN utm_campaign = 'rmusictheory'      THEN 1 ELSE 0 END) AS rmusictheory,
  SUM(CASE WHEN utm_campaign = 'rjazztheory'       THEN 1 ELSE 0 END) AS rjazztheory
FROM waitlist;
```

Run this at T+14 days and write the decision into a short note: "Going green because X, Y, Z" or "Going yellow/red because [specific thing missed]."

---

## 5. What not to do

- **Don't pay for Reddit ads on day 1.** Organic signal + paid signal mixed together is uninterpretable. If you want to run Reddit ads, do it starting Day 8 as a separate, UTM-distinct campaign (`utm_source=reddit&utm_medium=paid&utm_campaign=rads-<subreddit>`).
- **Don't make up numbers.** No "join 200+ on the waitlist" until there are 200+ on the waitlist. Real number beats fake proof every time.
- **Don't reply defensively to criticism.** If someone in r/musictheory drags the pitch, respond with thanks, ask what's missing, and update the page. That thread becomes your best social proof.
- **Don't post the same title to multiple subs.** Vary the opening sentence. Reddit's anti-shingling algorithm catches near-duplicates across subs.
