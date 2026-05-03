# Google Ads Strategy — Fifths

The playbook for paid acquisition. Operational tracking lives in [TODO.md](../TODO.md); this doc is the strategy.

**Last updated:** 2026-04-27 (initial draft, post-tracking-deploy, pre-first-campaign).

---

## Goal

Reach the floor where Smart Bidding can self-optimize: ≥30 paid conversions of `purchase` signal, ≤30 days, payback ≤90 days. Below that floor, Smart Bidding is guessing; above it, Google's ML does the work.

**Success criteria for "ads are working":**
- CAC ≤ first-year LTV per paying user
- Brand SERP defended (first paid result on `fifths` / `fifths app` is ours)
- ≥1 organic-feeling rebill confirmed via attribution before scaling spend past $500/mo

**Kill criteria (any single one means pause + diagnose, not scale):**
- 0 conversions after $200 spent on a single campaign
- CAC > 2× expected first-year LTV after 30+ paid conversions
- Conversions firing but not landing in Google Ads Diagnostics within 24h (tracking break)
- Quality Score ≤ 4 on >50% of keywords in a campaign (relevance break)

---

## Funnel

```
Visit fifths.io           →  Anonymous use of app.fifths.io  →  account_signup  →  purchase
                              ↑                                  ↑                  ↑
                              engaged_anon                       Sign-up          Subscribe
                              (Page view)                        Secondary         Primary
                              Secondary
```

Three observed conversions, ordered by intent. Only one (`purchase`) optimizes bidding.

---

## Conversion taxonomy

| Action | Category | Bidding role | Count | Click window | Why this configuration |
|---|---|---|---|---|---|
| `engaged_anon` | Page view | Secondary | One | 30d | Earliest behavioral signal — user practiced ≥1 question and saw the results screen. Not a bidding target (would over-reward freebie traffic) but useful for audience modeling. |
| `account_signup` | Sign-up | Secondary | One | 30d | Mid-funnel checkpoint. Magic link is too cheap to bid on — would skew Google toward email-grabbers who never pay. |
| `purchase` | Subscribe | **Primary** | Every | 90d | Revenue event. `Subscribe` (not `Purchase`) because Fifths Pro is recurring; Google's reporting and Smart Bidding handle SaaS rebills correctly under this category. `Every` so renewals count. |

**Account default goal:** `Purchase`. Reports + Smart Bidding default to optimizing this.

**Why not bid on `account_signup`:** historical pattern across SaaS apps — bidding on signup events leads Smart Bidding to find the cheapest-converting users (free-tier hoarders, "save for later" types) who almost never upgrade. Bidding on `purchase` directly is harder to start (low signal) but converges to the right user shape within ~30 conversions.

**Why `engaged_anon` exists:** without it, Smart Bidding only sees users who give an email. With it, Bidding learns to recognize the *shape* of an engaged practitioner before they identify themselves — clicks that result in someone actually playing for ≥1 question. Pure secondary signal; never blocks bidding even if it underfires.

---

## Multi-product account structure

Ketabian LLC runs multiple products from one Google Ads account (Fifths + Speak Fluently + future). The right structure to scale without cross-contamination:

**One account, hard-isolated conversion goals per product.**

```
Ads account (Ketabian LLC, sahar.fathi.business@gmail.com)
├── Custom goal: Fifths
│   ├── fifths_purchase    Primary    (label _PtGCPWU6qMcENW__K0_)
│   ├── fifths_signup      Secondary  (label kllgCLWf6qMcENW__K0_)
│   └── fifths_engaged     Secondary  (label oLgZCMyB6qMcENW__K0_)
├── Custom goal: Speak Fluently
│   └── (sf_purchase / sf_signup / sf_engaged when those products' campaigns launch)
└── Account-default goals (Purchase / Sign-up / Page view): set to INACTIVE
    Reason: prevents new campaigns from auto-optimizing toward the wrong product's events.
```

**Naming convention:** every conversion action prefixed with the product slug (`fifths_*`, `sf_*`, `<next>_*`). Globally unique across the account. Reports become readable; cross-product attribution becomes impossible to mess up.

**Per-campaign attachment:** every campaign explicitly attaches **only its product's custom goal**. Don't rely on account-default goals — they auto-apply silently and contaminate Smart Bidding.

| Campaign | Conversion goal attached |
|---|---|
| Any Fifths campaign | Custom goal: Fifths |
| Any Speak Fluently campaign | Custom goal: Speak Fluently |

---

## Campaign structure (week 1 → week 8)

**Brand Defense skipped for Fifths.** At pre-launch awareness, no one Googles "fifths app" — defensive bidding is over-engineered. Revisit in month 4-6 if Reddit/organic mentions create branded search volume that competitors might intercept.

Two campaigns total: high-intent first, competitor offensive in week 4+.

### Campaign 1 — High-Intent Ear Training (launch first)

**Why first:** the actual growth campaign. Bids on cold-but-targeted keywords from people Googling for what we sell. Skips the "brand defense as soak test" step because there's no meaningful brand traffic to test on yet.

**Gating prerequisites:**
1. RevCat reconnected to Stripe live mode (otherwise we're paying for traffic that can't convert)
2. `fifths_purchase` event verified end-to-end via Tag Assistant on a sandbox $4.99 buy
3. Keyword Planner pass complete — keyword list grounded in real volume + competition data, not first-principles guesses

**Settings:**
- Type: **Search**, Google search only
- Locations: US, Canada, UK, Australia
- Bidding: **Maximize Clicks** with bid cap **$1.50** for the first 2–4 weeks. Switch to **Maximize Conversions** at ≥10 conversions, then **tCPA** at ≥30 conversions with target = 1× expected first-year LTV.
- Daily budget: **$10–15** (cap until conversion data justifies scaling — per-campaign caps protect against learning-period burn)
- Ad rotation: Optimize

**Ad groups (one per theme — keyword↔landing-page concept match drives Quality Score):**

1. **`ear-training-app`** → landing [https://fifths.io/](https://fifths.io/)
   - `"ear training app"`, `"ear training apps"`, `[ear training app]`
   - `"best ear training app"`, `"app for ear training"`
2. **`intervals-recognition`** → landing [https://fifths.io/](https://fifths.io/)
   - `"interval recognition app"`, `"learn intervals music"`, `"identify intervals by ear"`, `[interval ear training]`
3. **`relative-pitch`** → landing [https://fifths.io/](https://fifths.io/)
   - `"relative pitch app"`, `"relative pitch training"`, `[learn relative pitch]`
4. **`transcribing`** → landing [https://fifths.io/transcribing/](https://fifths.io/transcribing/)
   - `"transcribe songs by ear"`, `"how to transcribe music"`, `"learn to transcribe music"` (with `how to` negative removed for this group)
5. **`jazz-ear`** → landing [https://fifths.io/jazz/](https://fifths.io/jazz/)
   - `"jazz ear training"`, `"jazz interval recognition"`, `[jazz ear training app]`
6. **`classical-ear`** → landing [https://fifths.io/classical/](https://fifths.io/classical/)
   - `"solfege training"`, `"sight singing app"`, `"classical ear training"`

**Ad copy:** reuse the Brand Defense set, but tune headlines per ad group to mirror keyword theme. E.g. `intervals-recognition` group → "Learn Intervals By Ear · Free", "See Which Intervals You Miss Most", "Interval Drilling With Real Analytics".

**Negatives at campaign level (in addition to account-level):**
- `transcribe` (already covered by ad group 4 — exclude from groups 1-3 and 5-6)
- For `jazz-ear` and `classical-ear`: `lesson plan`, `sheet music` (irrelevant to ear training)

**Smart Bidding rule of thumb:**
- `<10` conversions → Manual CPC or Maximize Clicks (Smart Bidding doesn't have signal)
- `10–30` conversions → Maximize Conversions
- `30+` conversions → tCPA, target = expected first-year LTV. Adjust quarterly as cohort retention data accrues.

---

### Campaign 2 — Competitor Offensive (week 4+, gated on Campaign 1 profitability)

**Two angles, run in sequence, not in parallel:**

#### Angle A — Spy on competitors with Semrush, then bid on what works for them

The bigger lever. Reveals which keywords EarMaster / Sonofield / Meludia are *already* spending money on profitably — keywords they've validated. Cheaper than re-validating from scratch.

**Process:**
1. **Sign up for Semrush** ($120/mo Pro plan, **cancel after one month**). Or Spyfu ($40/mo, lower data quality but cheaper).
2. **Pull PPC keyword reports** for: `earmaster.com`, `sonofield.com`, `completeeartrainer.com`, `meludia.com`, `teoria.com`, `tonedear.com`, `ear-trainer.com`.
3. **Filter to keywords matching all three:**
   - They're spending real money on it (look at the `Traffic Cost` or `PPC Spend` column — anything ≥$50/mo means it's worth it for them, not just a test)
   - The keyword has clear buyer intent (skip generic terms like `music theory` — too top-of-funnel)
   - We have a defensible angle in the ad copy (skip `learn piano by ear` — Fifths isn't a piano-by-ear app)
4. **Look for asymmetric Quality Score plays:** keywords where competitors are paying high CPCs but their landing pages don't match well (Semrush shows landing-page URL per keyword). If Fifths' [/jazz/](../site/jazz/index.html) is a tighter match than EarMaster's generic homepage, we'll outrank them at lower bids.
5. **Add winning keywords to Campaign 1's high-intent ad groups** (or a new ad group if the theme doesn't fit).
6. **Cancel Semrush** at the end of the month. The intel is durable for ~6 months — competitors don't pivot keyword strategy quickly.

Budget impact: $120 one-time, no ongoing cost. Probably the highest-ROI single research investment for the whole Ads program.

#### Angle B — "Alternative" comparative searches

Smaller volume but very high intent — searcher is shopping comparatives. Run as a separate campaign so the higher CPCs don't drag down Campaign 1's average bid.

**Settings:**
- Type: **Search**, Google search only
- Bidding: **Manual CPC**, max $1.50
- Daily budget: **$5**
- Conversion goal: Custom goal: Fifths
- Ad rotation: Optimize

**Ad group: `competitor-alternative`**
- `"earmaster alternative"`
- `"sonofield alternative"`
- `"functional ear trainer alternative"`
- `"complete ear trainer alternative"`
- `"meludia alternative"`
- `"tonedear alternative"`
- `"teoria alternative"`

**Ad copy (CRITICAL — never use competitor names in headlines):**

*Allowed in headlines:*
- "Tired Of Generic Drills? See Your Weak Intervals"
- "The Ear Trainer That Tells You What You Miss"
- "Ear Training With Real Analytics · Free"

*Allowed in descriptions:*
- "Other ear trainers make you finish lessons. Fifths surfaces exactly which intervals trip you up — then drills those. Free to try at fifths.io."
- "Built for musicians who outgrew beginner apps but still can't transcribe a pop song. Real per-interval analytics. Free forever, $4.99/mo for Pro."

**Trademark risk:** Google Ads policy allows bidding on competitor names as keywords but disapproves ads with competitor names in **ad copy** (headlines, descriptions, display URL). Keep competitor names in keyword targeting only. If an ad gets disapproved, the campaign keeps running on the other ad variants — but rewrite the rejected one rather than appealing.

**Why this is gated on Campaign 1 profitability:** competitor terms are 2-3× more expensive than direct intent. If Campaign 1 isn't profitable yet, Campaign 2 won't be either — same product, lower-quality traffic, higher costs. Only layer in once the math is proven on cheaper traffic.

---

## Expansion roadmap (week 6+, gated on Campaign 1 ROI)

The Keyword Planner data ([docs/google-ads-keywords.md](google-ads-keywords.md)) revealed several segments left out of the Campaign 1 launch picks. These are the layered expansion paths, in priority order. Each only unlocks once Campaign 1 has positive ROI — don't fragment a not-yet-working campaign.

### Phase 2A — Vocal / singing segment

**Why:** the data surfaced a coherent vocal-ear-training cluster (`vocal ear training`, `singing ear training`, `ear training for singers`, `voice training app`) totaling ~6,500 monthly searches at $0.67-$1.27 bid floors. Direct competitors don't target this well. Fifths' product already supports it (sing mode, voice range calibration in the onboarding flow per [TODO.md](../TODO.md)) but the marketing doesn't yet.

**Required work:**
1. New marketing landing at `fifths.io/singing/` (sibling to /jazz/, /classical/, /transcribing/, /returning/) — emphasize sing mode + voice range calibration + the same data-analytics differentiator. Reuse the section structure from existing landings.
2. Add `gtag` + Google Ads conversion tracking to the new page (just the same gtag block from the others).
3. New ad group `singing` in Campaign 1 (or as a separate campaign if budget warrants), 5-7 keywords from the vocal cluster, lands on `/singing/`.

**Effort:** ~4 hours for landing + 30 min ad group setup. Estimated ~2× addressable audience for paid acquisition.

### Phase 2B — Aural skills (academic music education)

**Why:** terms like `aural skills`, `aural training`, `melodic dictation`, `harmonic dictation` are the language of music-school curricula (especially UK/Australia/Canada). Different searcher than the hobbyist musician — a music student who NEEDS this for an exam. Higher willingness to pay (parents-paying-tuition demographic), but smaller volume.

**Required work:**
1. New ad group `aural-skills` in Campaign 1, lands on existing [/classical/](../site/classical/index.html) (no new landing required — classical already speaks this audience).
2. ~5 keywords: `aural skills`, `aural training`, `aural skills practice`, `melodic dictation`, `harmonic dictation`.
3. Bid cap $1.00. Test for 14 days.

**Effort:** 30 min total. Pure ad-side play.

### Phase 2C — Instrument-themed landing pages

**Why:** searchers Google `[their instrument] ear training` more than the generic term. `ear training piano` 500/mo, `guitar ear training` 500/mo, plus long-tail. Fifths is instrument-agnostic but instrument-themed landings would lift Quality Score on these keywords (better landing-page concept match) AND open organic SEO for those terms.

**Required work:**
1. Template the existing landings into instrument variants: `/piano-ear-training/`, `/guitar-ear-training/`, `/bass-ear-training/`. Same product, instrument-specific copy + screenshots referencing those instruments.
2. Drop into Campaign 1 as ad groups, each targeting `[instrument] ear training` keyword cluster.

**Effort:** 6-8 hours for 3 landings (same template, different copy/images). Big SEO win on top of paid lift.

**Skip path:** if /singing/ (Phase 2A) doesn't perform, don't proceed with instrument landings — the pattern likely doesn't work. /singing/ is the cheapest test of the segmentation hypothesis.

### Phase 2D — YouTube + SEO content engine (separate workstream from ads)

**Why:** keywords filtered OUT of the ad plan as "tutorial intent" (`how to transcribe music`, `how to identify intervals`, `ear training tutorial`) represent **massive untapped organic search volume** (50,000+ monthly on `how to transcribe music` alone). Wrong audience for paid ads (won't buy from a search ad), right audience for content marketing.

**Required work (parallel track, not part of the ads program):**
1. Editorial calendar: 1 YouTube video + 1 SEO blog post per week, 12 weeks.
2. Each piece targets one tutorial-intent keyword. End with soft Fifths CTA ("practice this with the analytics in Fifths · free at fifths.io").
3. YouTube: 5-minute videos, watchable mobile, "transcribe any song in 30 seconds" framing.
4. Blog: same content as text + screenshots, hosted on `fifths.io/blog/` (would need a blog setup — not currently scoped).

**Effort:** 2-4 hours/week ongoing. **Compounds for years** — content stays ranked even if you stop posting; ads stop the moment you stop paying.

### Phase 2E — Geographic expansion

**Why:** UK uses `aural` terminology, AU/CA blend US + UK terms. Once Campaign 1 has 30+ days of data, splitting by geography lets us bid differently per market. Lower-competition markets often have cheaper CPCs.

**Required work:**
1. Duplicate Campaign 1 → "Campaign 1 - UK", change targeting to UK only, add aural-flavored keywords.
2. Same for AU.
3. Original Campaign 1 stays US + CA.

**Effort:** 30 min. Only do this once base campaign has 30+ days of data — splitting too early just dilutes signal.

### Phase 2F — App campaigns (UAC), gated on iOS/Android launch

**Why:** once Fifths ships on iOS and Android (gated on Apple Developer + Google Play enrollment per [TODO.md](../TODO.md)), Google's **Universal App Campaigns** become available — completely different campaign type from search, optimized for in-app installs and events. Current keyword data caught a lot of `play store` / `app store` / `android app` / `ios app` noise that we filtered out for web ads — that pool becomes targetable when the apps exist.

**Required work:**
1. Wire RC SDK + native event tracking on iOS + Android (already partially scoped in [TODO.md](../TODO.md)).
2. Configure Firebase Analytics for app-install attribution (Firebase → Google Ads link).
3. Spin up UAC campaign with Custom goal: Fifths attached. Optimization target: in-app `purchase` events.

**Effort:** 4-6 hours of config once mobile is shipping. Don't start until mobile is stable in TestFlight + Play internal track.

---

## What the keyword data told us NOT to expand into

| Tempting expansion | Why we skip |
|---|---|
| `perfect pitch` head term (50,000/mo) | Wrong product positioning — Fifths teaches relative pitch. Searchers wanting perfect pitch mostly fail (it's largely innate); the rare successes have a different cognitive profile. Would burn budget on bouncing traffic. |
| `chord progressions` / `music theory` head terms | Fifths isn't a theory app — searchers want chord-charts and theory lessons, not interval drills. Wrong-funnel intent. |
| `sight reading` (5,000/mo) | Fifths doesn't currently teach sight reading. Either skip (mismatch) or treat as a product expansion signal (build sight-reading drills as a future Pro feature). Don't bid on it until the product matches. |
| Comparison shoppers (`vs`, `review of`) | Already in negative keyword list. These users want side-by-side reviews, not a search ad. Better captured via SEO comparison pages. |
| Free-app seekers (`free ear training app`) | Will not convert to paid. Better captured organically — the "Best Free Ear Training Apps" comparison post on the blog could rank and funnel the few who *would* pay. |

---

## Negative keyword list (account-level, apply before any campaign launches)

```
free
youtube
pdf
tutorial
how to
reddit
kids
children
beginner
course
lesson plan
sheet music
guitar tabs
piano tutorial
jobs
apk
crack
mod
download
torrent
review of
vs
cheat
hack
worksheet
exercise sheet
school
classroom
```

Reasoning: `free` filters out users seeking exclusively-free apps (we have a free tier but they won't convert to paid). `youtube` / `pdf` / `tutorial` / `how to` filter out content-seekers (not buyers). `kids` / `children` / `beginner` / `school` / `classroom` filter out demographic mismatches — Fifths targets musicians who've outgrown beginner apps. `apk` / `crack` / `mod` / `torrent` filter pirates. `vs` / `review of` filter comparison shoppers (different intent than buyers).

---

## Bidding philosophy

**Don't trust Smart Bidding under signal volume.** Smart Bidding's algorithms (tCPA, Maximize Conversions, ROAS) need ≥30 conversions in a 30-day window per campaign to perform better than manual. Below that floor, they over-fit to noise — typical failure mode is spending the entire budget on 1-2 random keywords that happened to convert once.

**Manual CPC under low volume.** For Campaigns 1 and 3, manual CPC is correct because the goal is signal collection, not yield optimization.

**Maximize Clicks > Maximize Conversions early.** For Campaign 2's first 2-4 weeks, Maximize Clicks (with a bid cap) is safer than Max Conversions because it doesn't try to predict conversion likelihood. Once we have 10+ conversions, Max Conversions starts to make better predictions than coin-flips.

**tCPA at 30+.** Target = first-year LTV ≈ $30 for a Pro Annual conversion (40% of price after refund/cancellation discount, which is conservative). Adjust based on actual 30/60/90-day cohort retention.

---

## Conversion lag handling (subscription gotcha)

Subscription value isn't truly known for 30+ days because of cancellations and refunds. Two options:

**Option A — guess first-year LTV upfront (chosen for week 1).**
- Fire `purchase` with `value = subscription_price` (already implemented in [src/lib/billing.ts](../src/lib/billing.ts) — passes $4.99/$39.99/$99 directly).
- Pro: simple, immediate signal.
- Con: ROAS is overstated until churn materializes.
- Acceptable because we're not on ROAS bidding yet.

**Option B — server-side adjusted upload (target state, week 3+).**
- Fire `purchase` with `value = 0` at purchase time (or skip the client-side fire entirely).
- Cloudflare Worker on RevCat webhook (`webhooks.fifths.io/revenuecat`, also documented in [TODO.md](../TODO.md) for the Loops bridge) POSTs to Google Ads' [Offline Conversion Import API](https://developers.google.com/google-ads/api/docs/conversions/upload-clicks):
  - `INITIAL_PURCHASE` event → upload conversion with actual value at T+30 days (when refund window closes).
  - `RENEWAL` events → upload as additional conversion units with their realized value.
- Pro: accurate; recovers the ~30% lost to client-side blockers.
- Con: requires the Worker scaffolding + persisting `gclid` from localStorage to Supabase profile at signup time.

**Migration path:** stay on Option A for first 30 paid conversions. When CAC stabilizes, build the OCI bridge alongside the Loops webhook bridge (one Worker, two outputs).

---

## Tracking architecture

| Layer | What | Where |
|---|---|---|
| Page-level tag | GA4 + Google Ads | `gtag('config', 'G-LJYKXFDR9L')` and `gtag('config', 'AW-17007845333')` on all 7 marketing pages + React app `index.html` |
| Cross-domain stitching | GA4 linker (`_gl=…`) | Configured in GA4 Admin → data stream → "Configure your domains" |
| First-touch capture | gclid + utm_* | [site/app.js](../site/app.js) on landing, persisted to `localStorage['fifths.attribution.v1']` with 90d TTL; outbound `app.fifths.io` links auto-rewritten to forward |
| First-touch capture (app side) | same | [src/lib/attribution.ts](../src/lib/attribution.ts) `captureAttribution()`, called from [src/main.tsx](../src/main.tsx) |
| Conversion firing | gtag events | [src/lib/attribution.ts](../src/lib/attribution.ts) — env-var-driven labels, silent no-op when missing |
| Enhanced Conversions | hashed email | `gtag('set', 'user_data', { email })` called before `account_signup` and `purchase` events |
| Server-side recovery (future) | OCI | Cloudflare Worker on RevCat webhook (deferred) |

**Env-var contract** (`.env.local`):
```
VITE_GOOGLE_ADS_ID=AW-17007845333
VITE_GADS_LABEL_SIGNUP=kllgCLWf6qMcENW__K0_
VITE_GADS_LABEL_PURCHASE=_PtGCPWU6qMcENW__K0_
VITE_GADS_LABEL_ENGAGED=oLgZCMyB6qMcENW__K0_
```

If env vars are missing on a build, conversion functions silently no-op — safe to deploy without them. Renaming an action in Google Ads requires updating the corresponding env var only; no code change.

---

## What we are NOT doing (and why)

- **Performance Max:** needs ≥30 paid conversions to learn. Until then it'd burn budget on YouTube/Display garbage placements. Defer to month 3 minimum.
- **Display campaigns:** awareness-only; doesn't convert ear-training users (they don't buy from banner ads). Worth revisiting only after we have a remarketing audience >5k users.
- **YouTube ads:** same reason. Could work for awareness later but expensive per converting user.
- **Shopping ads:** subscription products aren't allowed in Google Shopping.
- **Performance Max conversion goals:** even if we ran PMax, we wouldn't let it optimize to `engaged_anon` — too cheap a signal, would over-reward low-intent traffic.
- **App campaigns (UAC):** gated on iOS/Android dev account approval and the native app shipping. Web campaign first; app campaigns when there's a Play Store listing to point at.

---

## Decision log

- **2026-04-27 — Waitlist removed from funnel.** Decided to send all traffic directly to `app.fifths.io` (free use → upsell) instead of capturing email first. Why: app is live, waitlist adds friction, "free first" is a stronger value prop for cold paid traffic than "give us your email and wait."
- **2026-04-27 — Google sign-in primary, magic link secondary.** AuthSheet ([src/components/AuthSheet.tsx](../src/components/AuthSheet.tsx)) flipped. Why: magic-link flow drops 30–50% of paid-traffic users due to Promotions/spam landing + cold-domain reputation; Google sign-in completes in-session. Confirmed across multiple SaaS A/B tests in 2024-2025.
- **2026-04-27 — `engaged_anon` added as third conversion action.** Originally planned 2 events (signup + purchase); added `engaged_anon` to give Smart Bidding earlier behavioral signal without polluting the optimization target. Set as Secondary so it never blocks bidding.
- **2026-04-27 — Brand Defense launches before high-intent.** Diverged from "launch the growth campaign first" instinct because (a) RevCat is broken until Stripe reconnect, so high-intent would burn ad spend on un-purchasable traffic, (b) Brand Defense at $2/day is a near-zero-risk way to verify the entire pipeline first.
- **2026-04-27 — Brand Defense REVERSED.** Skipped entirely for Fifths. Reason: at pre-launch awareness, no one Googles `fifths app` — defensive bidding is over-engineered. Revisit in month 4-6 if organic mentions create branded search volume that competitors might intercept. Pipeline verification will instead come from the first $50 of high-intent spend after RC fix.
- **2026-04-27 — Multi-product account architecture.** Decided to run all Ketabian LLC products from a single Google Ads account with hard-isolated **Custom Goals** per product (vs. one account per product). Reason: account-level reputation (verification, spend trust, billing) accrues to one account; splitting splits the trust and restarts every new product from cold-start warmup. Conversion actions globally namespaced with product slugs (`fifths_*`, `sf_*`).
- **2026-04-27 — Conversion actions renamed.** `purchase` → `fifths_purchase`, `Sign-up` → `fifths_signup`, `engaged_anon` → `fifths_engaged`. Pure UI rename — labels (the underlying conversion identifiers) are immutable, no code change needed. Done before any campaign data accumulated to keep history clean.
- **2026-04-27 — Competitor strategy reframed.** Originally planned a competitor "alternative" campaign as week-3 optional. Restructured into two angles: (A) Semrush-based intelligence pull for $120 one-time — primary lever, gives access to competitors' validated keyword sets; (B) "alternative" comparative search — secondary, runs as smaller separate campaign once Campaign 1 is profitable.
- **2026-04-27 — Keyword Planner pass complete.** 6 CSVs processed (fifths/seeds/earmaster/completeeartrainer/sonofield/tonegym), 3,092 raw keywords filtered to 440 ear-training-relevant, then curated to 38 launch picks across 6 ad groups. Highest-confidence pick: `relative pitch` (5,000/mo, $0 floor, totally unclaimed). Full keyword list, bidding strategy, and kill criteria documented in [docs/google-ads-keywords.md](google-ads-keywords.md).
- **2026-04-27 — Expansion roadmap defined.** Five phases (vocal/singing, aural skills, instrument-themed landings, YouTube+SEO content, geographic split, mobile UAC) ordered by ROI and effort. All gated on Campaign 1 reaching positive ROI first to avoid fragmenting an unproven campaign. /singing/ landing identified as cheapest test of the segmentation hypothesis ($4 hours of work, ~2× addressable audience). Non-expansion: confirmed we will NOT chase `perfect pitch`, `chord progressions`, `music theory`, or `sight reading` head terms — wrong product fit.

---

## Review cadence

- **Daily, week 1:** check Google Ads → Conversions → Diagnostics for "Recording" status on all 3 actions; check campaign clicks + impressions.
- **Weekly, weeks 1-4:** review search-term reports for Campaign 2; add negatives based on irrelevant queries that triggered ads. Adjust bid caps if CPCs are pacing too high.
- **Monthly, ongoing:** check 30-day cohort retention against assumed first-year LTV; recalibrate `purchase` conversion value if needed.
- **Quarterly:** revisit campaign mix. Add Campaign 3 if 1 and 2 are profitable. Consider PMax once ≥30 conversions/month sustained.
