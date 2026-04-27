# Fifths — Product & Monetization Plan

> **Status:** Design document. Decisions locked in brackets `[LOCKED]`. Decisions deferred in brackets `[DEFERRED]`.
> **Domain / Brand:** fifths.io — `[LOCKED]`
> **Stage:** Pre-paywall. App exists as a free SPA on GitHub Pages with curriculum, drone-based contextual training, and in-session analytics (confusion matrix, scale-degree tracking).

---

## 1. Vision

**Fifths is the ear training app that tells you exactly what you keep missing — and drills it.**

Every existing app in the category has the same failure mode: users finish drills, pass tests, and still can't apply ear training to real music. They don't know *why* they're stuck. Fifths flips the product: the data we already generate during a session — which intervals you confused, which scale degrees trip you up, which directions/presentations you fail most — becomes the product.

We serve two audiences with one product:
- **The intermediate hobbyist** who finished EarMaster and still can't hear scale degrees in songs. (Wedge 1)
- **The serious musician** — jazz students, conservatory players, working musicians — who needs advanced chord, modal, and functional ear training. (Wedge 3)

One app, two audiences, shared engine, differentiated landing pages.

---

## 2. Market positioning

### 2.1 Primary wedges [LOCKED]

- **Wedge 1 — Contextual / functional training, done smarter.** Our drone engine, scale-degree-in-key training, and confusion-matrix analytics deliver Sonofield-style contextual training with visibility nobody else offers. Under half Sonofield's price.
- **Wedge 3 — Serious musician companion.** Advanced chord qualities (modal interchange, altered dominants, quartal, upper-structure triads, post-tonal). Additive content to the same codebase; serves a higher-willingness-to-pay audience.

### 2.2 Why not Wedge 2 (real-song transcription) as the primary

- Licensing and legal risk around transcribing copyrighted material.
- Polyphonic pitch detection / source separation is ML-heavy; solo-builder unfriendly.
- Time to revenue > 6 months; no lift from current codebase.
- Door stays open for a **Wedge 2-lite** feature (public-domain melody dictation + user MIDI upload) in month 3–6.

### 2.3 Competitive framing

| Competitor | Our angle |
|---|---|
| **EarMaster** ($3–6/mo, 2500+ lessons) | Fifths is not trying to out-feature them. We out-analyze them. "Fifths tells you exactly what you're missing; EarMaster tells you to practice more." |
| **Sonofield** ($18.95/mo, iOS-only, drone-based) | Fifths is ~4x cheaper, web-first (works everywhere), and pairs the drone method with analytics they don't surface. |
| **Perfect Ear** (free, ad-supported) | Fifths is ad-free on free tier. Paid tier has genuine differentiation, not just "remove ads." |
| **Functional Ear Trainer** (free, narrow) | Respect the method; extend it with curriculum, mic input, and analytics. |
| **Complete Ear Trainer, Tenuto, EarBeater** | Positioned as beginners' tools. Fifths targets the "finished a beginner app, need more" market. |

### 2.4 Taglines to A/B test

- *"Stop finishing ear training drills you can't apply."*
- *"The ear training app that tells you exactly what you keep missing."*
- *"Hear scale degrees in any key. In weeks, not years."*
- *"Ear training with feedback that actually helps."*
- *(Wedge 3 variant)* *"Ear training for jazz and classical musicians who've outgrown their app."*

---

## 3. Personas

### 3.1 "The stalled hobbyist" (Wedge 1 primary)

- 25–45 yr old, plays piano or guitar 3–7 years, self-taught or lightly taught.
- Has tried EarMaster or Perfect Ear, finished some modules, still can't transcribe a simple pop melody by ear.
- Willing to pay $5/mo without thinking; balks at $20/mo.
- Practices 15–30 min, 3–5×/week. Motivation fluctuates; streaks matter.
- Finds us via Reddit, YouTube tutorials, or Google ("how to hear intervals").

### 3.2 "The serious musician" (Wedge 3 primary)

- 18–35 yr old, conservatory student, jazz gigging musician, or advanced amateur.
- Sings solfege daily, knows theory cold, needs speed and depth (altered dominants, modes, functional analysis under performance pressure).
- Willing to pay $10–15/mo; values tools that respect their level.
- Finds us via jazz YouTube channels, music-school word of mouth, or direct search.

### 3.3 "The returning adult" (Wedge 1 secondary)

- 35–55 yr old, took lessons as a kid, returned to music in adulthood.
- Resistant to subscriptions. **Primary target for the Lifetime tier.**
- Practices irregularly but consistently over years. High LTV if they stay.

---

## 4. Product scope

### 4.1 What exists today

- 30-level curriculum across 4 segments: Pitch, Intervals, Rhythm, Advanced.
- Training modes: scale degrees (7 levels), intervals (15), triads (4), seventh chords (4), modes (2).
- Session structure: 24 questions, 3 random scale roots, auto-play or manual.
- In-session analytics: confusion matrix, per-scale-degree accuracy, per-interval direction/presentation accuracy, per-item mastery, auto-generated insights.
- Drone synth, Salamander Grand Piano samples, sine/saw fallback synths, playback speed control.
- React 18 + TypeScript + Vite + Tone.js + Tailwind. Mobile-responsive. PWA-ready.
- localStorage only; no backend, no auth, no payments, no cross-device sync.

### 4.2 Free tier [LOCKED — feature-cap, no usage caps]

Every user, forever:

- All existing curriculum (Pitch, Intervals, current Advanced).
- Rhythm segment (when built).
- Unlimited practice in all session modes.
- In-session confusion matrix, in-session scale-degree and interval feedback (as today).
- Basic persistent dashboard: last 7 days, accuracy summary, 1 insight, mastery map.
- Streaks and daily goals.
- Vocal range setting.
- 1 instrument (Salamander Grand Piano).
- Cross-device sync with last 30 days of history.
- Shareable weakness card (PNG export — organic growth loop).
- No ads, ever.

### 4.3 Pro tier — $4.99/mo or $39/yr [LOCKED]

- **Persistent analytics dashboard** — unlimited history, full interactive confusion matrix, all grids, insights feed.
- **Mic input / sing-back scoring** (Beta at launch).
- **"Practice your weak items"** — auto-generated custom sessions from the confusion matrix.
- **Advanced chord modules** — modal interchange, altered dominants, quartal/quintal, upper-structure triads, post-tonal ear training. (Wedge 3 content.)
- **Custom exercise builder** — user-defined drill sets.
- **All instrument sound packs** — electric piano, guitar, strings, horns.
- **Offline mode** (PWA with cached drill data).
- **Data export** (CSV of practice history).
- **Advanced analytics** — time-of-day patterns, response-time trends, per-item mastery curves.

### 4.4 Lifetime tier — $99 [LOCKED]

- Capped at **first 100 buyers**. Validation gate — if we don't sell 100, the wedge is wrong.
- Lifetime access to all Pro features that exist at time of purchase, plus all Pro features shipped in the first 24 months after launch.
- Founders-only Discord or email channel.
- Optional credit on a "founding members" page.
- **Disappears from pricing page once the cap is hit. Never reopens.**

### 4.5 What is explicitly *not* in v1

- Real-song transcription from copyrighted audio.
- Polyphonic pitch detection / source separation.
- Full mobile-app-store presence (PWA only at launch; native apps deferred).
- User-to-user social features (leaderboards, following).
- Teacher mode / classroom assignments.
- AI-generated drills based on user taste.

---

## 5. Feature deep-dives

### 5.1 Persistent analytics dashboard (Pro headline feature)

**Job-to-be-done:** *"Show me if I'm getting better, where I'm stuck, and what to practice next — using data Fifths already has about me."*

**Route:** `/progress` (its own top-level page, not a tab).

#### 5.1.1 Data model (schema sketch)

| Table | Purpose | Key fields |
|---|---|---|
| `users` | identity + plan | `id, email, plan, created_at, vocal_range_low, vocal_range_high` |
| `sessions` | one practice sitting | `id, user_id, started_at, ended_at, mode, level_id, total_q, correct_q` |
| `attempts` | one question answered | `session_id, idx, item_type, item_id, root_note, scale_degree, direction, presentation, user_answer, correct_answer, is_correct, response_time_ms` |
| `item_mastery` | rolling accuracy per drill item (denormalized) | `user_id, item_id, attempts, correct, last_seen_at, rolling_accuracy_30d` |
| `insights` | generated observations | `user_id, generated_at, kind, payload_json, dismissed_at` |

`item_id` is a canonical string: `interval:minor_third:ascending:harmonic`, `chord:dom7:root_position`, `scale_degree:3:major`. Stable across app versions — the single most important design choice in this feature.

`attempts` is partitioned by month from day one to avoid a migration later.

`item_mastery` is updated in a post-session job, not computed live. Dashboard load budget: <300ms.

#### 5.1.2 Dashboard sections (in order)

**A. Hero card — "Your ear today"**
- Overall accuracy (7 / 30 / all-time toggle).
- Current streak, sessions this week, minutes this week.
- Single headline insight: *"Descending minor 7ths are your weakest interval — 41% over 23 attempts."* With a **[Practice now]** button.
- On mobile, this is the only section above the fold.

**B. Weakness map (the differentiator)**

Three toggleable views:
- **Confusion matrix heatmap** — 12×12 interval grid; cell color = frequency of confusion. Click → drill.
- **Interval accuracy grid** — rows = interval; columns = ascending/descending × harmonic/melodic. Color = accuracy.
- **Scale-degree accuracy bar** — 7 bars, per question type.

No competitor surfaces this. This is the marketing screenshot.

**C. Progress over time**
- Line chart: accuracy per module, 90-day window.
- Sessions-per-week bar strip underneath.
- **"Mastered, now slipping"** callout — items that were ≥85% and dropped below 70%. Unique retention hook.

**D. Mastery & curriculum progression**
- The 30-level path colored by performance (gold mastered, green passed, yellow near unlock, gray locked).
- *"You're 8 questions away from unlocking Level 12."*

**E. Insights feed**
- Auto-generated, dismissable, 3–5 visible at a time.
- Rendered from hand-authored templates gated on real thresholds (not ML). Start with ~6 templates; expand later.
- Examples:
  - *"You improved 18% on ascending M3 this month."*
  - *"Your response time drops 23% in morning sessions."*
  - *"You've avoided augmented chords for 3 weeks — try Level 2.4."*

#### 5.1.3 Free vs Pro split (inside the dashboard)

| Element | Free | Pro |
|---|---|---|
| Hero card | Yes, 7-day window only | Yes, full history |
| Confusion matrix | **Blurred preview** with "Unlock your weaknesses" CTA | Full, interactive |
| Interval / scale-degree grids | Top-level summary (7 days) | Full, drill-down, all-time |
| Progress chart | Last 30 days | All-time |
| "Practice your weak items" | Limited to top 1 weakness | Top 10, custom session builder |
| Mastery map | Yes | Yes |
| Insights feed | 1 insight visible | Full feed + history |
| CSV export | No | Yes |
| Session history list | Last 10 sessions | Unlimited |

The blurred confusion matrix is the primary conversion asset. It previews enough to be intriguing without giving away the value.

#### 5.1.4 Edge cases and polish

- **Cold start.** First session shows an onboarding placeholder: *"3 more sessions to unlock your weakness map"* with a progress indicator. Never show empty charts.
- **Privacy toggle** in settings: *"Store detailed per-question data (recommended)"* vs *"Aggregate only."* Ship both from day one.
- **Shareable weakness card.** PNG export of the matrix with Fifths brand mark. Free tier included.

### 5.2 Mic input (Beta at launch)

**Scope [LOCKED — narrow]:**

- Single drill mode: *"Sing the note/scale degree you hear."*
- Play reference → user sings for 2 seconds → score = cents accuracy × % time in tune.
- One feedback screen with cents-deviation number and "in tune / flat / sharp" indicator.
- Uses `pitchy` (YIN) or equivalent; runs entirely client-side.

**Labeled "Beta" on the UI for the first 60 days.** Sets expectations and gives permission to iterate.

**Browser support at launch:** Chrome desktop, Safari desktop, Chrome Android. iOS Safari in month 2. Stated plainly on the pricing page: *"Mic input best on desktop; iPhone support coming soon."*

**Out of scope for v1:** real-time pitch graph, note-onset detection, multi-note phrase scoring, sustained-tone vocal coaching UI. Deferred to Tier 2.

**Why it ships in Tier 1:** it's the demo feature. Wedge 3 users sing solfege daily; without it their willingness to pay drops sharply. Confusion matrix carries the Wedge 1 demo weight.

### 5.3 Cross-device sync

- Table stakes; ships as a free feature (not a paywall).
- Free users get 30 days of synced history; Pro users get unlimited.
- First-login flow preserves the user's existing `overtone.v1` localStorage — merge into server state, never wipe.

### 5.4 Vocal range setting

- Global setting: `vocalRangeLow` / `vocalRangeHigh` on the user profile.
- Free feature (goodwill; addresses top market complaint).
- When set, the app transposes drill playback so notes sit within the user's comfortable octave.

### 5.5 Advanced chord modules (Wedge 3 content, Pro)

Ships incrementally post-launch:

- **Modal interchange** — borrowing from parallel modes.
- **Altered dominants** — ♭9, #9, #11, ♭13 tensions.
- **Quartal and quintal voicings.**
- **Upper-structure triads** — triad-over-bass voicings.
- **Post-tonal / atonal** — interval classes, set theory basics.

Content authoring is the moat — takes domain expertise to do well. Plan 1–2 new modules per month after launch.

---

## 6. Pricing [LOCKED]

| Tier | Price | Cap |
|---|---|---|
| Free | $0 | — |
| Pro monthly | $4.99/mo | — |
| Pro annual | $39/yr (save $21) | — |
| Lifetime (founding member) | $99 one-time | First 100 buyers, then retired |

**Design principles:**
- Pro undercuts EarMaster ($6/mo) and is ~4x cheaper than Sonofield ($18.95/mo).
- Annual discount positions the yearly plan as the "obvious" choice for committed users.
- No free trial of Pro. The feature-cap model *is* the trial.
- No ads on free tier, ever.
- Lifetime is a validation gate, not a long-term pricing strategy.

---

## 7. Launch timeline (8–10 week arc)

| Week | Focus |
|---|---|
| 1–2 | Infrastructure [decision deferred]: auth, DB, Stripe integration, feature-gate component, hosting move off GitHub Pages. |
| 3–4 | Persistent analytics dashboard (backend + frontend) + cross-device sync. Migrate localStorage on first login. Ship to internal test users. |
| 5 | Vocal range setting. "Practice your weak items" flow from confusion matrix. |
| 6–7 | Mic input (narrow Beta). Browser testing matrix. |
| 8 | Paywall goes live. Lifetime offer opens. Marketing site + multi-landing-page goes live. Instrumentation in place. |
| 9–10 | First paying users. Checkout survey + paywall-hit tracking in production. Iterate paywall based on first data. |
| Post-launch monthly | Advanced chord modules drip-release (Wedge 3). Tier 2 features (PWA offline, custom exercise builder, instrument sound packs) based on paying-user signals. |

---

## 8. Go-to-market

### 8.1 Multi-landing-page strategy [LOCKED]

One codebase, multiple marketing entry points. All share the same signup/pricing flow.

| Route | Audience | Headline angle |
|---|---|---|
| `fifths.io/` | Default / broad | *"The ear training app that tells you exactly what you keep missing."* |
| `fifths.io/jazz` | Wedge 3 — jazz musicians | *"Ear training for jazz musicians who've outgrown their app."* Altered dominants, modal interchange, functional chord hearing front and center. |
| `fifths.io/classical` | Wedge 3 — classical students | *"Ear training for conservatory students and serious amateurs."* Sight singing, solfege, chord function. |
| `fifths.io/transcribing` | Wedge 1 — "can't play by ear" | *"Stop finishing drills you can't apply. Hear scale degrees in any key."* |
| `fifths.io/returning` | Wedge 1 — adult returners | *"Picked up your instrument again? Train your ear the way you wish you had the first time."* Lifetime tier featured prominently. |

Each landing page targets a specific Reddit / YouTube / search traffic source and messages the same product differently. Shared components: pricing table, feature grid, signup CTA. Copy differs; bullets emphasized differ.

### 8.2 Subreddits to check and promote in

**Always**: participate before you promote. Build karma and rapport over 3–6 weeks. Use self-post format with a real story ("I built this because I kept failing to transcribe songs") — never drop a link with no context. Check each subreddit's self-promo rules (many require 10:1 contribution ratio; some have dedicated self-promo threads).

**Wedge 1 (intermediate hobbyist) — highest priority:**

| Subreddit | Size | Notes |
|---|---|---|
| r/musictheory | ~900k | Mainline audience. Tool-sharing threads happen; genuine "I built this" posts do well if well-framed. |
| r/EarTraining | small (~10k) | Exact audience. High intent. Small but worth every post. |
| r/WeAreTheMusicMakers | ~2M | Producers and musicians; self-promo rules are strict but the audience is real. |
| r/piano | ~700k | Piano learners; large overlap with our user. |
| r/pianolearning | ~60k | More beginner, but serious ones convert. |
| r/guitarlessons | ~1M | Guitar-learner audience; ear training is a known pain point. |
| r/guitar | ~2.5M | Broader; post carefully, avoid looking promotional. |

**Wedge 3 (jazz / classical / pro) — lower volume, higher conversion:**

| Subreddit | Size | Notes |
|---|---|---|
| r/jazztheory | ~80k | Direct target. High-intent and underserved. |
| r/Jazz | ~400k | Broader jazz culture; lighter theory content. |
| r/classicalmusic | ~1M | Audience skews listener, not player; check first. |
| r/composer | ~60k | Composers need ear skills; often neglected market. |
| r/musiced | ~60k | Music educators; potential B2B wedge later (teacher mode). |
| r/saxophone, r/trumpet, r/cello, r/violinist | varies | Instrument-specific; smaller but laser-targeted. |

**Mic-input-featured (Wedge 3 crossover):**

| Subreddit | Size | Notes |
|---|---|---|
| r/singing | ~350k | Sing-back scoring is directly relevant. |
| r/Vocalists | smaller | Serious singers; solfege and ear training valued. |
| r/choralmusic | ~30k | Sight-singing audience. |

**How to actually post** (rough playbook; detailed content calendar deferred):
1. **Before launch**: answer questions genuinely in 3–5 of these subs. Build account history.
2. **Launch week**: one personal "I built this and here's why" post in r/EarTraining, r/musictheory, and one jazz sub. Space them across 2 weeks.
3. **Ongoing**: reply to "how do I train my ear" questions with genuine advice; mention Fifths only when directly relevant. Better to be cited by others than to self-cite.
4. **Avoid**: posting the same launch copy in multiple subs on the same day. Mods talk.

---

## 9. Instrumentation & validation

### 9.1 Day-one instrumentation

- **Paywall-impression tracking.** Every time a free user sees a gated feature (blurred matrix, locked button, Pro modal), log `user_id, feature_id, timestamp, context`.
- **Checkout survey.** One required question at Pro/Lifetime purchase: *"Which feature pushed you to subscribe?"* (single select from the Pro feature list).
- **Cancel-reason survey.** One required question at Pro cancellation: *"What didn't deliver for you?"* Free text + tag suggestions.
- **Basic funnel events.** Landing page view → signup → first session completed → first-week active → Pro checkout view → Pro checkout complete.
- **Privacy-respecting by default.** Use a self-hosted or privacy-focused tool (Umami, Plausible, or custom) — no Google Analytics.

### 9.2 Validation gates

| Gate | Threshold | Decision if missed |
|---|---|---|
| **Waitlist / signup interest before launch** | 300 email signups | If below, revisit the wedge or positioning before building Pro features. |
| **Lifetime validation** | 100 lifetime sales within 6 months | If below, the wedge or price is wrong. Re-evaluate before iterating on Pro features. |
| **Free → Pro conversion** | 3–5% of DAU converting to Pro within 30 days of their first session | Below 1% → paywall features misaligned. Reshuffle based on paywall-hit data. |
| **Pro monthly churn** | <8% monthly churn after month 3 | Above 12% → Pro isn't retaining. Interview churned users. |

### 9.3 What good looks like at month 6

- 100 lifetime seats sold.
- 100–300 active Pro subscribers.
- $500–1,500 MRR from subs + $9,900 lifetime = runway to keep building.
- Confusion matrix is the screenshot on 5+ Reddit / YouTube references to the product.
- Clear signal on which wedge is pulling — budget shifts accordingly.

---

## 10. Open decisions

### 10.1 Deferred (separate decisions in flight)

- **Auth / backend stack.** Decision in progress; blocks week-1 work but not this plan.

### 10.2 Post-launch, to decide when data exists

- **Teacher / classroom mode.** Is there a B2B wedge (music schools, private teachers buying seat licenses)? Revisit after month 6 based on inbound from r/musiced and music-school word of mouth.
- **Wedge 2-lite (public-domain melody dictation + user MIDI upload).** Ship in month 3–6 if Pro-user interviews consistently name "songs I care about" as a gap.
- **Native mobile apps.** PWA first. Native apps only if PWA friction visibly costs conversions.
- **Raising Pro price to $6.99/$7.99.** Revisit at year 1 based on retention and competitive landscape.

### 10.3 Recurring review cadence

- **Weekly** (first 3 months post-launch): funnel metrics, paywall-hit data, latest churn/checkout survey responses.
- **Monthly**: Pro feature reshuffling if paywall data warrants.
- **Quarterly**: pricing review, wedge-weight review (is Wedge 3 pulling enough to justify content investment?).
