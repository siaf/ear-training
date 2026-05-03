# TODO — shipping to stores

These are the known gaps before the app is ready for TestFlight / Play Store review. Everything that needs an external account or asset is flagged.

> **Current phase: Phase 0 LIVE + Phase 1 infra build in flight.** Marketing site, app, custom domains, D1 waitlist, Supabase cloud sync, and the RevenueCat SDK scaffold are all deployed. The remaining work is dev-account enrollment + store-submission polish.

## ✅ Done

### Marketing + waitlist (Phase 0 deployed 2026-04-25)
- 5 landings live at [`fifths.io`](https://fifths.io/), [`/jazz`](https://fifths.io/jazz/), [`/classical`](https://fifths.io/classical/), [`/transcribing`](https://fifths.io/transcribing/), [`/returning`](https://fifths.io/returning/).
- Privacy policy live at [`fifths.io/privacy`](https://fifths.io/privacy/) — covers Apple/Google requirement.
- D1 database `fifths` (UUID `c59006a9-89f7-4985-b5bf-1578b4e3534e`) bound as `DB` on Cloudflare Pages project `fifths-marketing`.
- `POST /waitlist` writes signups + survey enrichment with full UTM attribution.
- Reddit launch URLs (`/r/sideproject`, `/r/eartraining`, etc.) 302 with UTM tags.
- Umami analytics wired (website ID `8cc10640-f114-49ab-8572-036552f64527`).

### App hosting
- React app live at [`app.fifths.io`](https://app.fifths.io) on Cloudflare Pages project `fifths-app`.
- New build script `npm run build:web` (`WEB_APP_BUILD=1`) emits `base=/` for the Cloudflare deploy. `npm run build:mobile` still produces the Capacitor bundle.

### Cloud sync (Supabase)
- Supabase project `azsedefwatnqjogotudi` with tables `public.profiles` + `public.sessions`, strict RLS (`auth.uid() = user_id`), and 2 aggregate views (`session_daily_stats`, `session_overall_totals`).
- Supabase MCP wired so the agent can apply migrations, query, and run advisors directly.
- Magic-link auth via [`AuthSheet`](src/components/AuthSheet.tsx), exposed from Settings → "cloud sync" card.
- [`syncEngine.ts`](src/lib/syncEngine.ts): pull-on-sign-in, debounced 2s push on any local mutation, last-write-wins on profile, append-only sessions deduped on `(user_id, id)`.
- End-to-end smoketest passed: signup → profile row → session row landed correctly with RLS enforcement.

### RevenueCat + Stripe Web Billing (LIVE in sandbox)
- Both SDKs installed: `@revenuecat/purchases-capacitor@^9.2.2` (native) + `@revenuecat/purchases-js` (web).
- [`billing.ts`](src/lib/billing.ts) is platform-aware: same public API (`initBilling`, `isPro`, `purchaseProduct`, `restorePurchases`, `subscribeBilling`, `identifyUser`) routes to web SDK in browser and Capacitor SDK on iOS/Android. Both SDKs lazy-loaded via dynamic import.
- `initBilling()` fires from [`main.tsx`](src/main.tsx) on every platform. No-op when API key is missing.
- Anonymous web user IDs persist in `localStorage` (`fifths.rc.anon_id`) so entitlements survive page reloads.
- Sync engine's Supabase auth handler calls `identifyUser(supabase.user.id)` — anonymous purchases merge into the email-identified RC account on sign-in.
- RevCat dashboard configured: Stripe (Web Billing) connected, 3 products (`fifths_pro_monthly` / `fifths_pro_annual` / `fifths_lifetime`), `pro` entitlement, `default` offering with 3 packages.
- [`Paywall.tsx`](src/routes/Paywall.tsx) wired: Pro → `purchaseProduct(proMonthly)`, Pro Annual → `proAnnual`. Prices match RevCat ($4.99/mo, $39.99/yr).
- [`Settings.tsx`](src/routes/Settings.tsx) + [`Path.tsx`](src/routes/Path.tsx) gate upsells on `isPro` — Pro users see "Fifths Pro · active" instead of upsell.
- **Sandbox key in `.env.local`** (`rcb_sb_…`) → all purchases route through Stripe TEST mode. Verified end-to-end: `4242 4242 4242 4242` → entitlement granted → `isPro()` returns true → UI flips → survives reload.
- **Going live:** Ketabian LLC's Stripe account is **already verified, in live mode, and bank-connected** (from prior apps). No business-verification paperwork needed for Fifths. Final step: reconnect RevCat's Stripe OAuth to the Ketabian account, swap `rcb_sb_…` → production `rcb_…` key, redeploy. See "Stripe live mode" section below.

### OAuth, error monitoring, and analytics (deployed 2026-04-26)
- **Google OAuth** wired via Supabase Auth → `signInWithGoogle` button in [`AuthSheet.tsx`](src/components/AuthSheet.tsx). Google Cloud OAuth client + Supabase provider published; consent screen verified.
- **Sentry** error monitoring live at https://ketabian-llc.sentry.io/issues — `@sentry/react` SDK wired in [`main.tsx`](src/main.tsx) with replay-on-error + 10% perf trace sampling. ErrorBoundary calls `Sentry.captureException`. Production smoketest passed (4 manual error types all landed in dashboard).
- **Cloudflare Web Analytics** enabled on both `fifths-marketing` and `fifths-app` Pages projects (account-level dashboard at Cloudflare → Web Analytics, edge-injected beacons). Coexists with Umami on the marketing site.
- **www → apex 301 redirect** via Cloudflare Bulk Redirects ("Redirect from WWW to root" template). `www.fifths.io/*` → `https://fifths.io/$1`.

### Email infrastructure (deployed 2026-04-26 to 2026-04-27)
- **Loops account login:** `sahar+loops-fifths@ketabian.com` (plus-aliased; routes to `sahar@ketabian.com`'s Gmail). Per the multi-app SaaS signup convention. **Don't lose this** — Loops dedupes on full email so a different alias would create a different free-tier workspace.
- **Cloudflare Email Routing** for `hello@fifths.io` → forwards to `sahar@ketabian.com`.
- **Loops + Supabase SMTP** routing all auth emails. Magic Link + Confirm Signup transactional templates uploaded to Loops with branded MJML (logo + Fable mascot + engagement coda after CTA), `transactionalIds` recorded:
  - `magic-link` → `cmog8e6560lxy0i1t5v9ggqf2`
  - `confirm-signup` → `cmog8c1pw3rx80i1iylz0dxhl`
  - `payment-failed` → `cmogb9ojl1tv60i0z0r3b8c32` (uploaded; trigger pipeline future work)
  - `cancelled` → `cmogbi46942h90h1a7s9mal6m` (uploaded; trigger pipeline future work)
- **Loops audience sync via Supabase webhooks.** SQL trigger function `loops_sync_auth_user_event()` on `auth.users` fires for INSERT/UPDATE/DELETE → POSTs to `https://app.loops.so/api/v1/webhooks/supabase/...` with the right event payload + Loops-Secret header. Loops-side: User Created → triggers custom `signup` event; User Updated/Deleted → audience sync. All 3 round-trips smoketested via MCP.
- **Lifecycle Loops uploaded:** `welcome` (event-triggered on `signup`, fires automatically) and `day-1-reactivation` (time-triggered, 24h after contact created). The other 4 lifecycle templates (`first-insight`, `streak-break`, `weekly-digest`, `win-back`) are built but not yet uploaded — pending the deferred event-firing infrastructure (CF Worker + Supabase sessions trigger).
- **Welcome email smoketested end-to-end:** new signup via fresh `+` alias → magic link → both Confirm Signup AND Welcome emails arrived → click confirm → signed in → contact synced to Loops audience.
- **Phase 0 deliverability:** SPF + DKIM + DMARC all PASS for `fifths.io`. Sender details set to `Fifths <hello@fifths.io>`. First emails to brand-new Gmail addresses currently land in spam (cold-domain reputation), resolves passively over 1–2 weeks of engagement.

### Brand asset transparency pass ✅ done (2026-04-26)
All mascots (4 × 6 expressions = 24 files) + logo variants re-exported from Figma with proper alpha. Synced across `public/brand/` (source), `dist/`, iOS/Android Capacitor bundles, and both Cloudflare Pages projects.

### Phase 2 polish ✅ done (2026-04-26)
- ✅ www → apex 301 redirect (Cloudflare Bulk Redirects)
- ✅ CF Web Analytics enabled on both Pages projects
- ✅ Brand asset transparency pass
- ⏭️ Stripe receipt branding — moved into the "Stripe live mode" batched session below (single Stripe-dashboard session covers branding + production flip)

---

## Tier 1 — shipping blockers (still open)

### Apple Developer + Google Play enrollment
**Hard blocker for everything else.** Without these, no IAP products, no TestFlight/Play tracks, no real RevenueCat testing.
- [ ] Apple Developer Program ($99/yr) — enrollment takes 1–2 days.
- [ ] Google Play Developer ($25 one-time) — usually instant, can take up to 7 days.

### Native RevenueCat (iOS + Android, blocked on enrollment above)
Web (Stripe) is already shipped. To add native platforms once dev accounts are approved:
- [ ] In RevenueCat: add iOS app, connect App Store Connect (API key).
- [ ] In RevenueCat: add Android app, connect Play Console (service account JSON).
- [ ] App Store Connect: create `fifths_pro_monthly` ($4.99/mo), `fifths_pro_annual` ($39.99/yr), `fifths_lifetime` ($99 one-time, capped at first 100 — track cap server-side).
- [ ] Play Console: same three products.
- [ ] Map StoreKit/Play products to RevenueCat (RC dashboard).
- [ ] Drop iOS + Android API keys into [`.env.local`](./.env.local) (`VITE_REVENUECAT_IOS_KEY`, `VITE_REVENUECAT_ANDROID_KEY`).
- [ ] Sandbox-test a full purchase on a TestFlight build with an Apple sandbox tester.
- [ ] License-test on the Play internal track.

### Stripe live mode — FINAL STEP before launch (do AFTER Phase 3 UX testing passes)
**Stripe is already verified, in live mode, and bank-connected at the Ketabian LLC account level** (from prior apps). The orphan Stripe accounts that were created for Fifths have been deleted. No business-verification paperwork needed.

**Order matters:** all Phase 3 testing must happen in Stripe **sandbox** with `4242` test cards. If RC is flipped to live mode first, every test purchase costs real money.

- [ ] **In RevCat:** Project settings → Apps → **Ketabian LLC (Web Billing)** → if Stripe connection currently points at a now-deleted orphan account, click **Disconnect**, then **Connect with Stripe** → Stripe OAuth → select the Ketabian LLC account → authorize. (If Stripe doesn't show an account picker, log out of Stripe in the browser first, then redo.)
- [ ] Confirm RevCat's Stripe connection panel now shows the Ketabian LLC account name.
- [ ] Copy the production `rcb_…` Web Billing API key (NOT the `rcb_sb_…` sandbox key) from RevCat → Project settings → API Keys → Web Billing.
- [ ] Paste it; I swap `VITE_REVENUECAT_WEB_KEY` in `.env.local` and redeploy `app.fifths.io`.
- [ ] One real-card smoketest: buy Pro Monthly ($4.99) with your own card, verify entitlement lands in RC + the charge appears in Stripe Live mode, refund yourself within 14 days (per [Terms](https://fifths.io/terms)). Stripe charges no refund fee — costs $0.

**Stripe receipt branding (do in the same Stripe dashboard session, Option C — Ketabian LLC account-level + per-product differentiation):**
- [ ] **Stripe → Settings → Public details:** confirm or set:
  - Public business name: `Ketabian LLC`
  - Legal business name: `Ketabian LLC`
  - Support email: pick one — `hello@fifths.io` if Ketabian uses Fifths' inbox as primary support, or a Ketabian-generic address if one exists. (This is shared across products in the account.)
  - Public address: required for activation; Ketabian LLC's registered address.
  - Public phone: optional.
- [ ] **Stripe → Settings → Branding:**
  - Logo: a Ketabian wordmark if one exists; otherwise leave blank or use a neutral mark. Don't use Fifths-specific logo since the account hosts multiple products.
  - Brand color: `#2a1d3a` (neutral dark) or whatever's already set if other Ketabian products are using it.
  - Accent color: leave default or pick a neutral.
- [ ] **Per-product overrides** (Stripe → Products → each Fifths product → Statement descriptor field):
  - Set statement descriptor to `FIFTHS` for `fifths_pro_monthly` / `fifths_pro_annual` / `fifths_lifetime`. Max 22 chars, all caps. Appears on the cardholder's bank statement so they recognize the charge as Fifths and not just generic Ketabian.
- [ ] Confirm product display names in Stripe / RevCat include the Fifths prefix (e.g., `Fifths Pro Monthly`) so the line item on the receipt is unambiguous.

### RevCat sandbox cleanup (cosmetic, optional)
Earlier test purchases left orphaned anonymous RC users in the dashboard (one per page-load before the persistent anon ID landed).
- [ ] RevenueCat dashboard → **Customers** → filter by `$RCAnonymousID:*` → bulk-delete the orphans (keep the most recent one tied to your live testing).
- Skip if you don't care about a tidy customer list — sandbox data doesn't affect production.

### Free trial (deferred indefinitely — revisit only if conversion data demands it)
The free tier already gives users 22+ lessons + last-7-days analytics, which functions as a perpetual evaluation period. Adding a 7-day trial would add complexity (trial-end notifications, cancellation flow, abuse via repeat-trial emails) without solving a problem we currently have. Skipped intentionally for launch.
- If revisiting later: add trial period to `fifths_pro_monthly` + `fifths_pro_annual` in RevenueCat, change Paywall CTA copy back to "start 7-day trial", regenerate the deleted `trial-ending` and `trial-converted` MJML templates from the brand pattern in `loops-templates/`.

### RevenueCat → Loops webhook bridge (do AFTER Stripe live activation)
The `payment-failed` and `cancelled` Loops transactional templates are uploaded with their `transactionalId`s, but **no trigger pipeline exists yet** — when a Stripe charge fails or a user cancels, nothing fires those emails today. To wire them up:
- [ ] Build a Cloudflare Worker (or Pages Function under `fifths-marketing`) at `webhooks.fifths.io/revenuecat` that:
  - Verifies the `Authorization` / signature header from RevCat against a shared secret
  - Maps RevCat event types → Loops Transactional API calls
  - POSTs to `https://app.loops.so/api/v1/transactional` with the right `transactionalId` + `dataVariables`
- [ ] Store Loops API key as a Cloudflare secret on the project hosting the worker (`wrangler pages secret put LOOPS_API_KEY`).
- [ ] Generate a webhook secret, store as another Cloudflare secret (`REVENUECAT_WEBHOOK_SECRET`).
- [ ] In RevenueCat dashboard → **Project settings → Integrations → Webhooks → Add new** → URL = the worker endpoint, Authorization header = the secret.
- [ ] Sandbox-test: trigger a cancel + a failed payment in RevCat sandbox → verify the right Loops transactional email arrives.
- [ ] Live-test: same after Stripe goes live, with a real card refunded.

**Event → template mapping:**
| RevCat event | Loops template | Variables to populate |
|---|---|---|
| `BILLING_ISSUE` | `payment-failed` | `nextRetryDate`, `updateUrl` |
| `CANCELLATION` | `cancelled` | `accessUntilDate`, `resubUrl` |
| (future) `RENEWAL` | (future receipt template) | — |
| (future) `PRODUCT_CHANGE` | (future change-confirmation template) | — |

### Stripe receipt email branding (merged into Stripe live mode section above — do in same session as the live activation)

### Google Ads readiness (paid acquisition prep)
**Strategy doc:** [docs/google-ads-strategy.md](docs/google-ads-strategy.md) — the full playbook (funnel, conversion taxonomy, campaign structure, bidding, expansion roadmap, kill criteria). **Keyword plan:** [docs/google-ads-keywords.md](docs/google-ads-keywords.md) — 6 ad groups × 38 keywords with bid floors and rationale. **Raw research:** [ads-research/](ads-research/) — 6 Keyword Planner CSVs (fifths, seeds, earmaster, completeeartrainer, sonofield, tonegym). This TODO section tracks only what's outstanding operationally.

**Funnel:** `Visit fifths.io → anonymous use of app.fifths.io → account_signup (Google primary, magic-link fallback) → purchase`. Waitlist removed from the path 2026-04-27 — app is live, users go straight to it.

**~~Done 2026-04-27 (account + tracking infra):~~**
- ~~Google Ads account created (`sahar.fathi.business@gmail.com`), Conversion ID `AW-17007845333`, umbrella tag `GT-57Z7JZDC`. Advertiser Verification carried over from the existing Ketabian LLC account — no re-review.~~
- ~~GA4 property `Fifths.IO` (ID `534842759`), Measurement ID `G-LJYKXFDR9L`, cross-domain stitching configured for `fifths.io` ↔ `app.fifths.io`, GA4 ↔ Ads link active.~~
- ~~`gtag('config', 'G-LJYKXFDR9L')` + `gtag('config', 'AW-17007845333')` deployed on all 7 marketing pages in [site/](site/) (index, jazz, classical, transcribing, returning, privacy, terms) AND on the React app's [index.html](index.html).~~
- ~~3 conversion actions created in Google Ads, manually with code:~~
  - ~~`account_signup` — Sign-up category, Secondary, Count One, 30-day window. Label `kllgCLWf6qMcENW__K0_`. Fires on first Supabase sign-in via [src/lib/syncEngine.ts](src/lib/syncEngine.ts) + [src/lib/attribution.ts](src/lib/attribution.ts) `trackAccountSignup`.~~
  - ~~`purchase` — Subscribe category, Primary, Count Every, 90-day window, dynamic value via Event snippet. Label `_PtGCPWU6qMcENW__K0_`. Fires on RevCat success in [src/lib/billing.ts](src/lib/billing.ts) `trackPurchase` with $4.99/$39.99/$99 mapped from product ID.~~
  - ~~`engaged_anon` — Page view category, Secondary, Count One, 30-day window. Label `oLgZCMyB6qMcENW__K0_`. Fires on first session completion in [src/App.tsx](src/App.tsx) `endSession` once `totalQuestions > 0`.~~
- ~~Env-var contract in [src/lib/attribution.ts](src/lib/attribution.ts) reads `VITE_GOOGLE_ADS_ID` + 3 `VITE_GADS_LABEL_*` vars; missing vars silently no-op.~~
- ~~`gclid` + `utm_*` capture on landing in BOTH [site/app.js](site/app.js) (marketing) and [src/lib/attribution.ts](src/lib/attribution.ts) (app), 90-day TTL under localStorage key `fifths.attribution.v1`. Outbound `app.fifths.io` links on the marketing site auto-rewritten to forward those params.~~
- ~~Enhanced Conversions wired client-side: `gtag('set', 'user_data', { email })` called before signup + purchase events. "User provided data" hits confirmed in Tag Assistant.~~
- ~~AuthSheet flipped to Google-primary: [src/components/AuthSheet.tsx](src/components/AuthSheet.tsx) shows "continue with Google" as the prominent coral CTA; magic link collapsed behind a small "or sign in with email" link.~~
- ~~End-to-end Tag Assistant verification 2026-04-27: `account_signup` ✅ fires on Google sign-in, `engaged_anon` ✅ fires on first complete session. `purchase` ⏳ unverified pending RevCat Stripe reconnect (see "Stripe live mode" section above) — code path is identical to the two verified events, no reason to expect issues.~~

**Outstanding (do before launching ads):**
- [ ] **Toggle Enhanced Conversions ON in Google Ads UI.** Tools → Conversions → Settings → Enhanced conversions → ON, method **Google Tag**. Code is already passing hashed email; the toggle just tells Google to use it. (~30 sec.)
- [ ] **Confirm goal hierarchy.** Tools → Goals → confirm `Purchase` is account default + Primary; `Sign-up` and `Page view` are Secondary.
- [ ] **Verify `purchase` end-to-end** — gated on the RevCat Stripe reconnect documented at [TODO.md "Stripe live mode" section](#stripe-live-mode--final-step-before-launch-do-after-phase-3-ux-testing-passes). Once RC is reconnected, run a $4.99 sandbox purchase with `4242 4242 4242 4242` and confirm Tag Assistant logs the conversion.

**Account housekeeping (do now, before any campaign):**
- [ ] **Rename conversion actions** in Tools → Conversions: `purchase` → `fifths_purchase`, `Sign-up` → `fifths_signup`, `engaged_anon` → `fifths_engaged`. Pure UI rename — labels are immutable, no code change. Globally namespaced names keep reports clean once Speak Fluently campaigns ship.
- [ ] **Create Custom Goal "Fifths"** in Tools → Goals → + Create custom goal. Attach the 3 renamed actions. This becomes the goal every Fifths campaign explicitly attaches.
- [ ] **Set the 3 account-default goals (Purchase / Sign-up / Page view) to inactive** — uncheck "Apply to all campaigns by default" on each. Forces explicit goal selection per campaign. Prevents future Speak Fluently campaigns from accidentally optimizing toward Fifths' purchase events.

**Outstanding (campaign launch — see [docs/google-ads-strategy.md](docs/google-ads-strategy.md) for the full playbook):**
- [ ] **Brand Defense skipped for Fifths.** At pre-launch awareness, no branded search volume exists worth defending. Revisit in month 4-6 if organic mentions create competitor squatting risk.
- ~~**Keyword Planner pass** done 2026-04-27. 6 CSVs in [ads-research/](ads-research/) (fifths, seeds, earmaster, completeeartrainer, sonofield, tonegym). Curated launch list: 6 ad groups × 38 keywords (76 total in exact + phrase variants), full plan + bidding strategy + kill criteria in [docs/google-ads-keywords.md](docs/google-ads-keywords.md). Headline picks: `relative pitch` (5k vol, $0 floor, unclaimed), `ear training app` (5k, $0.50), `transcribe music` (5k, $0.50), `tonegym`/`musicca` for competitor-conquest.~~
- [ ] **Campaign 1: High-intent ear training.** Launch after (a) keyword planner pass, (b) RC Stripe reconnect, (c) `fifths_purchase` end-to-end verified via sandbox buy. $10-15/day, phrase+exact match, conversion goal = Custom Goal: Fifths. Maximize Clicks with bid cap until ≥10 conversions, then Maximize Conversions, then tCPA at ≥30.
- [ ] **Negative keyword list** applied at account level before any campaign launches: `free, youtube, pdf, tutorial, how to, reddit, kids, children, beginner, course, lesson plan, sheet music, guitar tabs, piano tutorial, jobs, apk, crack, mod, download, torrent, review of, vs, cheat, hack, worksheet, exercise sheet, school, classroom`. Apply via Tools → Shared library → Negative keyword lists.
- [ ] **Campaign 2: Competitor offensive** (week 4+, gated on Campaign 1 profitability). Two angles: (A) **Primary** — sign up for Semrush ($120 one-time, cancel after 1 month), pull PPC keyword reports for earmaster/sonofield/meludia/etc., add validated winners to Campaign 1's ad groups. (B) **Secondary** — separate "alternative" campaign at $5/day on `"earmaster alternative"`, `"sonofield alternative"`, etc. Never use competitor names in ad copy headlines (trademark risk).

**Expansion roadmap (week 6+, gated on Campaign 1 ROI — see [docs/google-ads-strategy.md](docs/google-ads-strategy.md) "Expansion roadmap" section for the full rationale):**
- [ ] **Phase 2A — `/singing/` landing + vocal ear training ad group.** Vocal-segment cluster (`vocal ear training`, `singing ear training`, `voice training app`) totals ~6,500 monthly searches at low CPCs. Direct competitors don't target this well. Fifths' product already supports it (sing mode + voice range calibration); just needs marketing positioning. ~4 hrs landing + 30 min ad group setup. Highest-priority expansion — cheapest test of the segmentation hypothesis. Estimated ~2× addressable audience.
- [ ] **Phase 2B — Aural skills ad group** (academic music education). 5 keywords (`aural skills`, `aural training`, `melodic dictation`, `harmonic dictation`, `aural skills practice`). Lands on existing /classical/. 30 min total. Higher-willingness-to-pay segment (music students with exam pressure).
- [ ] **Phase 2C — Instrument-themed landings.** `/piano-ear-training/`, `/guitar-ear-training/`, `/bass-ear-training/`. Same product, instrument-themed copy + screenshots. Lifts Quality Score on instrument-specific keyword variants AND opens organic SEO. 6-8 hrs for 3 landings. Skip if Phase 2A doesn't perform.
- [ ] **Phase 2D — YouTube + SEO content engine** (separate workstream from ads). Tutorial-intent keywords (`how to transcribe music`, `how to identify intervals`) have 50,000+/mo combined. Wrong intent for paid; ideal for content marketing. Editorial: 1 video + 1 blog post/week, 12 weeks. Compounds for years; outscales ads at marginal cost. Note: requires blog setup on `fifths.io/blog/` — not currently scoped.
- [ ] **Phase 2E — Geographic split campaigns.** Once Campaign 1 has 30 days of data, duplicate as US-only / UK-only / AU-only with locale-specific terminology (UK uses `aural`). 30 min, do not split earlier (dilutes signal).
- [ ] **Phase 2F — Universal App Campaigns (UAC)** for iOS + Android. Gated on Apple/Google dev account approval + native app shipping. Different campaign type from Search; optimizes for in-app installs and events. Captures the `play store` / `app store` / `[platform] app` keyword pool that we filtered out for web ads. 4-6 hrs config once mobile is stable in TestFlight/Play internal.

**What we explicitly will NOT chase** (per keyword data analysis):
- `perfect pitch` head term — wrong product fit (Fifths teaches relative, not perfect)
- `chord progressions` / `music theory` head terms — Fifths isn't a theory app
- `sight reading` — would require product expansion to be honest; revisit only as a future Pro-tier feature
- `free ear training app` searchers — won't convert to paid; capture organically via blog comparison posts instead

**Deferred ad-tracking infra (week 3+, only if scale justifies):**
- [ ] **OAuth host branding fix** ([TODO.md:343](TODO.md#L343)). Google sign-in OAuth picker still shows "azsedefwatnqjogotudi.supabase.co" instead of `app.fifths.io`. Switching to `signInWithIdToken` via Google Identity Services recovers ~25% of paid-traffic signup conversions. ~2-3h work.
- [ ] **Server-side purchase via OCI.** Add a handler to the RevCat → Loops webhook Worker that POSTs `INITIAL_PURCHASE` + `RENEWAL` events to Google Ads' Offline Conversion Import API. Maps `app_user_id` → original `gclid` (already persisted to localStorage; need to also persist to Supabase `profiles` row at signup time so the Worker can recover it). Recovers the ~30% of purchases lost to client-side blockers (Safari ITP, ad blockers).
- [ ] **30-day adjusted-value upload.** Once OCI is wired, fire conversion at $0 at purchase time, then upload retention-adjusted value 30 days later. More accurate ROAS than the current "guess first-year LTV upfront" approach.
- [ ] **Performance Max campaign.** Hold until ≥30 paid conversions in the account. PMax needs the signal volume to learn; before that it burns budget on garbage placements.
- [ ] **Google Identity Services / One Tap** for additional ~30-50% Chrome desktop signup lift.

**~~Already done (landing-page hygiene, 2026-04-26):~~**
- ~~Pricing block on `/`, `/jazz`, `/classical`, `/transcribing` (Free / Pro Monthly $4.99 / Pro Annual $39.99 / Lifetime $99) — Google Ads policy team flags ads that obscure subscription pricing.~~
- ~~Cancel-anytime + 14-day refund visible from every landing page hero CTA and pricing fineprint.~~
- ~~"No ads, ever" trust signal surfaced on every CTA.~~

### Cloudflare Email Routing — `hello@fifths.io` inbound (USER, ~2 min)
Free Cloudflare-native inbound email forwarding. No mail server needed; replies go to your existing Gmail.
- [ ] Cloudflare → **fifths.io zone → Email → Email Routing → Get Started** (auto-adds MX + SPF DNS records).
- [ ] **Destination addresses → Add `sahar@ketabian.com`** → click verification link in that inbox.
- [ ] **Routes → Custom address → `hello@fifths.io` → forward to `sahar@ketabian.com`**.
- [ ] Optional catch-all: `*@fifths.io → sahar@ketabian.com` so typos don't bounce.

### Supabase magic-link email customization
Default Supabase emails come from `noreply@mail.app.supabase.io`, which lands in spam and reveals the backend. Fix before launch — uses the same Loops account configured for the lifecycle program above (one DNS auth, one tool):
- [ ] In Supabase → **Auth → Settings → SMTP** → enter Loops SMTP credentials (host, port, user, password from Loops dashboard).
- [ ] Customize the Magic Link template (HTML body + subject + sender name) in **Supabase → Auth → Email Templates → Magic Link** to match brand voice.
- [ ] Update `from` address to `hello@fifths.io`.
- [ ] Confirm deliverability into Gmail / iCloud / Outlook inboxes (not spam).

### Lifecycle email program (retention + activation)
Right now the only emails users receive are: Supabase magic links (auth) and Stripe receipts. That's missing every retention and activation lever. Below is the proposed first sweep — confirm scope and ESP, then I'll wire it.

**Decisions made:**
- ✅ **ESP: Loops** (handles transactional + lifecycle drips + audience segmentation in one tool; free 1k contacts, generous for Phase 1; visual automation builder so no cron-jobs to maintain).
- ⚠️ **Loops free tier = single workspace per account.** Multi-app pattern (one Ketabian-LLC-wide tool with projects per app) is NOT supported on Loops free. For each future app, sign up a new free Loops account using a `+`-aliased email (see below).
- ✅ **Per-app SaaS signup convention:** use Gmail/Workspace plus-addressing on the Ketabian inbox. Pattern: `sahar+<tool>-<app>@ketabian.com` (e.g., `sahar+loops-fifths@ketabian.com`, `sahar+sentry-fifths@ketabian.com`). Each routes to `sahar@ketabian.com` but is unique for SaaS dedup. Filter by recipient in Gmail to organize notifications. Reuse for Hushledger and beyond: `sahar+loops-hushledger@ketabian.com` etc.
- [ ] **Domain authentication.** Add the SPF + DKIM + DMARC records Loops gives you to Cloudflare DNS for `fifths.io`.
- [ ] **Sender identity.** `hello@fifths.io` (general/marketing) vs `coach@fifths.io` (lifecycle nudges, more personal voice). Pick one or split.
- [ ] **Unsubscribe handling.** Required by CAN-SPAM/CASL/GDPR. Hosted by Loops, but verify the link works.

**Phase 0 emails (waitlist audience — ship before product launch):**
- [ ] **Waitlist confirmation** — fires immediately after `POST /waitlist`. "You're in. Here's what you signed up for." Currently no email is sent at all — waitlist signups are silent.
- [ ] **Survey nudge** (24h after signup, only if they didn't fill the survey) — "30 seconds to shape what we build first." Drives the `/waitlist` survey completion rate.
- [ ] **Launch announcement** — sent the day product opens to the waitlist. Includes the $99 lifetime offer for the first 100.

**Templates done — 10 brand-aligned MJML zips in [`loops-templates/_zips/`](./loops-templates/_zips/):**
- ✅ Transactional: `magic-link.zip` (uploaded), `confirm-signup.zip` (uploaded), `payment-failed.zip` (uploaded), `cancelled.zip` (uploaded)
- ⏳ Lifecycle (built, not yet uploaded as Loop → New): `welcome`, `day-1-reactivation`, `first-insight`, `streak-break`, `weekly-digest`, `win-back`

**Phase 1 launch — only 2 emails REQUIRED to ship:**
- [ ] **Welcome** — upload `welcome.zip` as Loop → trigger on `signup` event (already firing from Supabase webhook). Lights up automatically once published.
- [ ] **Day-1 reactivation** — upload `day-1-reactivation.zip` as Loop → time-based trigger (contact created + 24h). No event-firing infrastructure needed.

These 2 will fire automatically because their triggers don't depend on app/Worker code we haven't built. Everything else can wait.

**DEFERRED: lifecycle event firing infrastructure** (the 4 remaining loops can be uploaded + published now but will sit dormant until this ships):
- [ ] Cloudflare Worker `webhooks.fifths.io/loops-event` (auth-gated proxy that POSTs to Loops `/api/v1/events/send` so app/cron jobs can fire events without exposing the Loops API key in the client).
- [ ] App-side: in [`App.tsx`](src/App.tsx) `endSession`, when this is the user's first-ever session, fire `first_session_completed` via the Worker (powers `first-insight` Loop).
- [ ] CF Worker cron — daily at 9am: query Supabase for users whose last session was 23-25h ago AND streak ≥ 2 → fire `streak_at_risk` event per user (powers `streak-break` Loop).
- [ ] CF Worker cron — Sundays at 9am: query Supabase for users active in past week, compute `minutesPracticed`/`streakDays`/top+weakest intervals → fire `weekly_digest` event with those properties (powers `weekly-digest` Loop).
- [ ] CF Worker cron — daily at 9am: query Supabase for users at 14d / 30d / 60d marks since last session → fire `inactive_user` event (powers `win-back` Loop).
- [ ] Then revisit each Loop in Loops UI to confirm it's firing on the right events with the right properties.

**FUTURE (post Stripe live): RevenueCat → Loops bridge** (already documented in earlier section) — powers `payment-failed` and `cancelled` Transactional emails.

**FUTURE (Phase 0 emails — only useful for waitlist audience):**
- [ ] Waitlist confirmation — fires from `site/functions/waitlist.js` (event already wired, just needs a Loop in Loops dashboard listening for `waitlist_signup`).
- [ ] Survey nudge — 24h after signup, conditional on missing survey data.
- [ ] Launch announcement — broadcast to waitlist on launch day.

**Suggested execution order:**
1. Pick ESP + verify domain (1 hour, blocks everything below)
2. Waitlist confirmation + launch announcement (Phase 0, ships independently)
3. Welcome + first-insight + streak-break (highest retention impact for the lowest build cost)
4. Trial/billing series (only matters once Pro launches with trials enabled)
5. Sunday digest + win-back (nice-to-have; ship after launch validates demand)

### Android launcher icons
iOS icons (light/dark/tinted) match the brand kit. iOS splash is on-brand (#fff8ef paper, 2732×2732). **Android launcher icons still use old-brand PNGs** — regenerate from the new brand sources in [`public/brand/icons/`](./public/brand/icons/):

```bash
npm i -D @capacitor/assets
mkdir -p resources
cp public/brand/icons/icon-ios-1024.png resources/icon.png
cp public/brand/icons/icon-ios-dark-1024.png resources/icon-dark.png
cp public/brand/icons/icon-ios-1024.png resources/splash.png # ← regenerate on paper bg
npx capacitor-assets generate --iconBackgroundColor '#fff8ef' --splashBackgroundColor '#fff8ef'
```

Android adaptive-icon sources ready at [`public/brand/icons/icon-android-adaptive-{fg,bg}.png`](./public/brand/icons/) and [`icon-android-mono-fg.png`](./public/brand/icons/icon-android-mono-fg.png).

### Offline fallback for Tone.js piano samples — **deferred until iOS/Android launch**
Web users have internet by definition; if they don't, the app's other network deps (Supabase, RevCat) are also broken. This is only a real UX problem on installed mobile apps that can be opened in airplane mode. Skip for the web launch; revisit when packaging the iOS/Android binaries.

[`audioEngine.ts`](src/audioEngine.ts) loads Salamander Grand Piano samples from the Tone.js CDN at `https://tonejs.github.io/audio/salamander/`. Offline, the sampler never resolves and Practice hangs.

Two options when we revisit:
1. **Detect + fallback**: wrap the Sampler ready-promise with a timeout, fall back to the sine/sawtooth synth if it times out. Minimal code change.
2. **Bundle samples**: drop ~5 MB of MP3s into `public/samples/` and switch `baseUrl`. Works offline, slightly larger bundle.

Option 1 is faster; option 2 is better UX on flaky networks.

### ~~Brand asset transparency pass~~ ✅ done (2026-04-26)
~~Several brand PNGs in [`public/brand/`](./public/brand/) ship with baked-in backgrounds instead of true alpha (mascots, logo variants). Re-export with transparent backgrounds so they composite cleanly on any page/card surface and in dark mode.~~

All 4 mascot portraits + 24 expression files (4 × 6) re-exported with proper alpha and synced across `public/brand/` (source), `dist/`, iOS/Android Capacitor bundles, and both Cloudflare Pages projects (fifths.io, app.fifths.io).

### www → apex redirect (SEO hygiene, non-blocking)
`www.fifths.io` currently serves the same content as `fifths.io` (both attached to `fifths-marketing`). For canonical URL hygiene, add a Cloudflare bulk-redirect rule `www.fifths.io/* → https://fifths.io/$1 301`.

### Cloudflare Web Analytics toggle (optional)
Separate from Umami. Enable at **Workers & Pages → fifths-marketing → Metrics → Web Analytics → Enable**. Don't add a manual `<script>` tag — CF auto-injects at the edge (anti-pattern: double-counts).

### OAuth providers (Google now, Apple before iOS)
Magic link is the primary auth method and stays. Adding OAuth options reduces friction (no email round-trip), enables password-manager autofill, and is required by Apple's App Store guideline 4.8 once iOS ships.

**Google OAuth — ~30 min, no account blocker, do today:**
- [ ] Google Cloud Console → create OAuth 2.0 credentials (Web application). Authorized origins: `https://app.fifths.io`, `http://localhost:5173`. Authorized redirect: `https://azsedefwatnqjogotudi.supabase.co/auth/v1/callback`.
- [ ] Supabase → Auth → Providers → Google → paste client ID + secret.
- [ ] Add "Continue with Google" button to [`AuthSheet.tsx`](src/components/AuthSheet.tsx) calling `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <origin> } })`.
- [ ] Test sign-in flow + verify the new auth user lands in `auth.users` and triggers the same sync engine path.

**Sign in with Apple — ~1-2h, blocked on Apple Developer enrollment:**
- [ ] Apple Developer portal → App ID with "Sign in with Apple" capability enabled.
- [ ] Create a Services ID (the OAuth client, distinct from the App ID).
- [ ] Configure return URL: `https://azsedefwatnqjogotudi.supabase.co/auth/v1/callback`.
- [ ] Generate `.p8` private key (download once — Apple won't show it again).
- [ ] Supabase → Auth → Providers → Apple → paste Services ID + Team ID + Key ID + .p8 contents.
- [ ] Add "Continue with Apple" button to AuthSheet.
- [ ] Test (Safari + popup-blocker quirks may need workarounds).

**Skip email + password.** Adding it brings forgot-password flows, breach checks, brute-force protection, recovery emails — all overhead for an inferior UX vs magic link.

### Error monitoring (Sentry or PostHog)
No production error visibility today. When the app crashes, we don't know about it unless a user emails us. Pick one before launch:
- **Sentry** (recommended for errors): free tier 5k errors/mo + 50 session replays. Best-in-class stack traces with sourcemaps + Capacitor SDK for iOS/Android. ~30 min to wire React + ~15 min for Capacitor native.
- **PostHog** (alternative): if we adopt PostHog for analytics anyway (see Tier 2 below), it includes error tracking + replays. One less integration. Slightly less mature on errors.

Tasks (Sentry path):
- [ ] Create Sentry account, create project for "fifths-web".
- [ ] `npm i @sentry/react @sentry/vite-plugin`.
- [ ] Wire `Sentry.init` in [`main.tsx`](src/main.tsx) with DSN from `.env.local`.
- [ ] Add Vite plugin to upload sourcemaps on production builds.
- [ ] Wrap `<ErrorBoundary>` with `Sentry.ErrorBoundary` and verify a forced exception lands in the dashboard.
- [ ] Tag releases by git SHA so errors map to specific deploys.
- [ ] When native ships: add `@sentry/capacitor` for iOS + Android coverage.

### CI/CD via GitHub Actions
Currently every deploy is manual `wrangler pages deploy`. No PR previews, no test runs on push, no automated build verification. Risk: ship a broken bundle by forgetting to run `npm run build:web` before deploying.
- [ ] Workflow: on push to `main` → `npm ci` → `npm run build` (typecheck) → `npm test` → `npm run build:web` → `wrangler pages deploy dist --project-name=fifths-app`.
- [ ] Workflow: on PR → same as above but deploy to a Preview environment with a `*.fifths-app.pages.dev` URL.
- [ ] Cloudflare API token stored as repo secret.
- [ ] Same pattern for `fifths-marketing` (deploy `site/` on changes there).

---

## Tier 2 / 3 parked

> **Gate:** revisit these once we have at least one paid sale. Until then they're polish; below that bar, they don't move the needle on revenue.

### RevenueCat checkout + success page branding (Phase 4 polish)
RevCat's hosted checkout overlay ships in default styling. The "Branding" / "Terms URL" fields proved hard to find in the current dashboard UI (location varies by account). Not blocking — checkout works fine without it. Revisit when the dashboard surfaces a clearer config path or after first paid sale prompts a deeper polish pass.
- [ ] Re-locate the Branding section (try Project settings → Customer Center, or click into the Web Billing app row directly, or contact RevCat support if still hidden).
- [ ] Page bg `#fff8ef` · form bg `#ffffff` · product info `#fef1dd` · primary button `#ff8a6b` · accent `#ff8a6b` · error `#c64632` · shapes `pill` · font `Outfit` if available else system sans.
- [ ] Upload logo from [`public/brand/logos/logo-horizontal-light.png`](./public/brand/logos/logo-horizontal-light.png).
- [ ] Display name `Fifths` (not `Ketabian LLC` — that's only the legal entity).
- [ ] Support email `hello@fifths.io`.
- [ ] Privacy policy URL `https://fifths.io/privacy`.
- [ ] Terms of Service URL `https://fifths.io/terms`.

### Google Identity Services (One Tap) for web
Current `signInWithOAuth({ provider: 'google' })` works but Google's account picker shows the Supabase callback host (e.g., "Sign in to azsedefwatnqjogotudi.supabase.co") instead of `app.fifths.io`. Switching to **Google Identity Services** (token-based sign-in via `signInWithIdToken`) fixes the branding AND unlocks the **One Tap** auto-prompt card that lifts sign-in conversion ~30-50% for Chrome desktop users.

Why deferred:
- Web-only; doesn't help Safari iOS or any native app
- Adds a code path divergence (web uses GSI, native still uses redirect-based OAuth)
- Current flow works for everyone; this is a polish/conversion win

Tasks:
- [ ] Load `https://accounts.google.com/gsi/client` in [`index.html`](index.html).
- [ ] Replace `signInWithGoogle()` in [`syncEngine.ts`](src/lib/syncEngine.ts) with a GSI-based version that calls `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`.
- [ ] Enable `use_fedcm_for_prompt: true` per Google's FedCM migration.
- [ ] Verify One Tap prompt shows in Chrome desktop, falls back gracefully on Safari iOS / incognito / Brave shields.

### Native Google sign-in (iOS + Android Capacitor plugin)
The current `signInWithOAuth` opens the system browser on native (SafariViewController on iOS, Chrome Custom Tabs on Android). Functional but a full-screen browser switch — feels less native than a Google sheet that pops up in-app.

A Capacitor plugin like `@capacitor-community/google-sign-in` or `@codetrix-studio/capacitor-google-auth` wraps Google's native iOS/Android SDKs for the polished in-app sheet flow. Requires per-platform config:
- iOS: GoogleService-Info.plist + URL scheme + dedicated iOS OAuth client in Google Cloud Console
- Android: google-services.json + SHA-1 fingerprint + dedicated Android OAuth client
- Code: detect platform, branch between native plugin and existing redirect flow

Tasks:
- [ ] Add `@capacitor-community/google-sign-in` (or equivalent).
- [ ] Create iOS + Android OAuth clients in Google Cloud Console (gated on Apple Developer + Google Play enrollment).
- [ ] Wire platform detection in [`syncEngine.ts`](src/lib/syncEngine.ts): native → plugin, web → existing flow.
- [ ] Test the native sign-in flow on a real device through TestFlight / Play Internal.

### Smarter onboarding-based level placement
The chat-style onboarding now persists `{ ratings, voiceRange, experience, goal, startLevelId, completedAt }` to `localStorage` under `fifths.onboarding.v1`, but `calibrationToStartLevel()` in [`src/lib/calibration.ts`](src/lib/calibration.ts) still only uses the raw audio ratings. Once we have real user data, revisit:
- [ ] Look at saved onboarding rows for early users — do `experience` / `goal` correlate with where they actually plateau?
- [ ] Update `calibrationToStartLevel` to combine `ratings` + `experience` (e.g. `experience: 'lots'` floors the start level higher; `'none'` caps it lower regardless of audio rating).
- [ ] Optionally branch curriculum entry point by `goal` (improvise → start in intervals; transcribe → start in scale degrees).
- [ ] Add Supabase columns + sync so onboarding answers persist across devices (mirrors current `profiles` sync pattern).

### Curriculum expansion (Tier 2 — later session)
18 of 20 segments in [`src/curriculum.ts`](src/curriculum.ts) are empty stubs. Only Pitch and Intervals are populated. Plan is to add real levels for Triads, 7th chords, Modes, Rhythm, etc. The code is already isolated — [`curriculum.ts`](src/curriculum.ts) is pure data, consumed by the view layer via `CURRICULUM`, `CURRICULUM_SEGMENTS`, `getCurrentLevel`, `canUnlockNextLevel`, `getDisplayName`. The Path route ([`Path.tsx`](src/routes/Path.tsx)) auto-hides empty segments, so adding levels instantly appears in the river.

### Push notifications
Currently implemented as **local notifications** only (scheduled on the device). Remote push (server → device) would need FCM (Android) + APNs setup (iOS) which both require paid developer accounts, certs, and a backend to send them.

### PostHog product analytics — ✅ live (2026-05-03)
Wired on both `fifths.io` (marketing, in [site/app.js](site/app.js) + inline on [site/privacy/index.html](site/privacy/index.html) and [site/terms/index.html](site/terms/index.html)) and `app.fifths.io` (React app, in [src/lib/posthog.ts](src/lib/posthog.ts), used by [src/lib/attribution.ts](src/lib/attribution.ts), [src/App.tsx](src/App.tsx), [src/routes/Settings.tsx](src/routes/Settings.tsx), [src/routes/Paywall.tsx](src/routes/Paywall.tsx), [src/components/AuthSheet.tsx](src/components/AuthSheet.tsx)).

**Privacy posture matches `/privacy`:** `ip:false` + `$ip` blacklist, masked inputs, identified-only profiles, autocapture allowlist (`[data-ph-track]` only). Settings → privacy toggle exposes opt-out. Cross-subdomain cookie shares `distinct_id` between marketing and app.

**Custom events captured:**
- App: `session_started`, `session_completed`, `level_unlocked`, `paywall_viewed`, `paywall_plan_selected`, `auth_sheet_opened`, `auth_provider_clicked`
- App (dual-fire with Google Ads): `fifths_engaged`, `fifths_signup`, `fifths_purchase`
- Marketing: `waitlist_submit`, `survey_submit`, plus auto-captured `$pageview` / `$pageleave` / `$web_vitals`
- All events carry `gclid` + `utm_*` as super-properties (registered via `phRegister` from stored attribution)

**PostHog assets** (project id 408097, org "Ketabian LLC"):
- Dashboards: [Engagement & Retention](https://us.posthog.com/project/408097/dashboard/1539424) (10 insights), [Acquisition & Ads](https://us.posthog.com/project/408097/dashboard/1539431) (12 insights)
- Cohort: [Engaged users (≥3 completed sessions)](https://us.posthog.com/project/408097/cohorts/289626)
- Survey: [Marketing exit-intent](https://us.posthog.com/project/408097/surveys/019def29-d754-0000-94a5-cd5fb2a09951) — **draft, needs manual launch**
- Feature flag: [`lp-headline-test`](https://us.posthog.com/project/408097/feature_flags/663166) — placeholder, off until variant copy is decided
- PostHog MCP server is connected to Claude Code; ask Claude to add new insights/funnels and it will create them via the MCP

**Marketing referer→utm fallback:** `site/app.js` infers `utm_source`/`utm_medium` from `document.referrer` when explicit URL params are absent (Reddit, X, HN, YouTube, etc.) so organic-share traffic is properly attributed.

**Still deferred:**
- Replace Sentry with PostHog Error Tracking (would shed one integration). Not urgent — Sentry is wired and works.
- Session recording is NOT enabled (off by default; has cost implications). Toggle in PostHog → Settings → Recording when ready.
- Ad-spend ingestion for true CAC/ROAS (annotate manually for now, or build Data Warehouse CSV import once spend > $1k/mo).

### Native (iOS/Android) analytics — full fix once mobile actually ships
Quick fix already deployed (2026-05-03): every PostHog event carries `$source` (`web` / `ios` / `android`) + `$is_native` super-properties from [src/lib/posthog.ts](src/lib/posthog.ts), so web vs native traffic is sliceable in any insight via the breakdown menu. GA4/gtag is skipped on native (gated on `window.Capacitor.isNativePlatform()` in [index.html](index.html)) so iOS sessions don't pollute GA4 as "(direct)" pageviews.

**Still TODO once iOS/Android distribution exists** (do AFTER Apple Developer + Google Play enrollment + first TestFlight build):

- [ ] **Replace web SDK with PostHog React Native SDK** in the Capacitor wrappers. The current setup runs the JS web SDK inside WKWebView; this works but means: (a) `$host` is `localhost` not `app.fifths.io`, breaking host-based dashboard filters, (b) no access to native lifecycle hooks (app backgrounded, push opened, etc.), (c) no AdAttributionKit / SKAdNetwork integration. PostHog's native SDK fixes all three. Several days of work.
- [ ] **Apple Search Ads attribution.** Integrate Apple's `AdServices` framework to call `AAAttribution.attributionToken()` on first launch, decode the token via Apple's API, and forward `apple_campaign_id` / `apple_keyword_id` to PostHog as super-properties on the first session. Lets you measure Apple Search Ads conversion in the same PostHog funnels as Google Ads.
- [ ] **Universal Links → attribution forwarding.** When a user taps `fifths.io/...` on iOS and the app opens via Universal Link, parse `gclid`/`utm_*` from the URL and `phRegister` them on launch — same pattern as the web side. Recovers attribution for the "saw fifths.io ad on mobile web → installed iOS app same session" flow.
- [ ] **Identity stitching across web↔native.** Currently web and native installs of the same human get separate `distinct_id`s until they sign in. After sign-in, `phIdentify(userId)` stitches them via Supabase user id. Verify this works end-to-end with a real test (web visit → magic link → install iOS app → sign in there → confirm one Person row in PostHog).
- [ ] **Update existing PostHog dashboards to slice by `$source`.** Most current insights filter by `$host icontains app.fifths.io` which would silently exclude native users. Once the React Native SDK is in (and `$host` no longer applies), swap those filters to `$source = web` for explicit web-only views, and clone key insights to `$source = ios` / `$source = android` for per-surface analysis.
- [ ] **Apple App Store Connect Analytics + Google Play Console** — separately, log into both and configure the pre-built funnels (impressions → product page views → installs → opens). These are platform-attributed and can't be reproduced in PostHog. Cross-reference with PostHog `session_started` to detect install-but-never-opened drop-off.

### Backup restore drill
Supabase auto-snapshots daily; D1 has time-travel. We've never tested actually restoring either.
- [ ] Supabase: take a manual snapshot, verify it appears in dashboard, run a `pg_dump` export and store it externally (S3 or local).
- [ ] D1: run `wrangler d1 export fifths --remote --output backup.sql` and store externally.
- [ ] Document restore procedure in `docs/`.

---

## Store submission checklist

**Beta distribution platforms:**
- iOS → **TestFlight** (Apple's beta tool — gated on Apple Developer Program $99/yr)
- Android → **Play Console Internal Testing track** (gated on Google Play Developer $25)
- TestFlight is iOS-only; there is no single tool that distributes both. Two builds, two dashboards, two tester pools.
- Optional cross-platform alternatives: Firebase App Distribution, Microsoft App Center — they host both `.ipa`/`.apk` in one place but `.ipa` still requires Apple Developer enrollment to sign.

**Checklist:**
- [ ] Apple Developer Program enrolled ($99/yr) — unlocks TestFlight + Sign in with Apple + iOS IAP
- [ ] Google Play Developer account ($25 one-time)
- [ ] App Store Connect app created
- [ ] Play Console app created
- [ ] App icon + splash generated (Android still pending)
- [x] Privacy policy URL live → [fifths.io/privacy](https://fifths.io/privacy/)
- [ ] Screenshots (6.7", 6.5", 5.5" for iPhone; phone + tablet for Android)
- [ ] App description, keywords, category
- [ ] TestFlight build uploaded + internal testers invited
- [ ] Play Console internal testing track uploaded
