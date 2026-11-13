# Working on Fifths

How to build, test and deploy this repo. For coding agents and people. `CLAUDE.md` points here, so keep this the one copy. If you change a command, change it here too.

## What's here

| Part | Where | Live at | Cloudflare Pages project |
|---|---|---|---|
| React app (ear-training lessons) | `src/` | app.fifths.io | `fifths-app` |
| Marketing site, blog, free tools | `site/`, `content/blog/`, `functions/` | fifths.io | `fifths-marketing` |
| iOS and Android (Capacitor wrappers of the app) | `ios/`, `android/` | App Store, Google Play | n/a |

The two sites deploy separately. A change in `src/` needs an app deploy, and a change in `site/` or `content/` needs a site deploy.

## Setup

```bash
npm install
npx playwright install chromium webkit   # once, for the browser tests
```

Secrets and service keys live in `.env.local`, which is not committed. `.env.example` lists the names. Browser tests need `python3` too.

## Run it locally

```bash
npm run dev                                  # app, served under /ear-training/
WEB_APP_BUILD=1 npm run dev                  # app at /, the same as production
python3 -m http.server 5181 --directory site # marketing site and tools
```

`npm run dev` uses the keys in `.env.local`, so it talks to the real Supabase, PostHog and Sentry.

## Build

| Command | Builds |
|---|---|
| `npm run build:web` | The app for app.fifths.io, into `dist/`. Use this one for deploys. |
| `npm run build` | The app under `/ear-training/`, for the old GitHub Pages copy. Not for app.fifths.io. |
| `npm run build:mobile` | The app for Capacitor. `npm run cap:sync` then copies it into the native projects. |
| `npm run build:tools` | Every free tool's bundle, from `_src/` into a `.js` file next to its page. The bundles are committed. |
| `npm run build:blog` | Blog pages and `site/sitemap.xml`, from `content/blog/`. |
| `npm run predeploy:site` | Brand files, blog and all tools. Run before every site deploy. |

Edit a tool's `_src/` or shared code, never its built `.js`, and run `npm run build:tools` afterwards. The browser tests run the built bundles.

Adding a tool or page: add its `build:tool:*` script to `build:tools`, add it to `STATIC_PAGES` in `scripts/build-blog.mjs`, and add it to `TOOLS` in `e2e/tools.spec.ts`.

## Test

```bash
npm test             # unit tests (Vitest), about 2 seconds
npm run test:e2e     # browser tests (Playwright), about 90 seconds
npx tsc --noEmit     # type check of src/
```

Run all three before deploying. Nothing runs them for you: there's no CI for tests and deploys are manual.

**Unit tests** sit next to the code as `src/**/*.test.ts` and cover lesson logic such as grading, mastery, streaks and scheduling.

**Browser tests** are in `e2e/` and run on Chromium, WebKit (Safari's engine) and an emulated iPhone:

| File | Covers |
|---|---|
| `audio.spec.ts` | The real audio engine: sound while samples download, failed downloads, samples taking over, replaying rhythms |
| `lesson.spec.ts` | Onboarding, deep links, a full 12-question lesson with no samples available, Replay during a rhythm |
| `screens.spec.ts` | Path, stats, settings, paywall, Pro lessons staying locked |
| `billing.spec.ts` | RevenueCat recovering after a failed load, using the signed-in account |
| `accounts.spec.ts` | Sign-in prompts, on a third app server with a fake Supabase address; a faked signed-in learner hitting closed checkout |
| `tools.spec.ts` | Every free tool loads, and sample files arrive |
| `pro.spec.ts` | Pro features as a subscriber (`asPro` in `fixtures.ts`): custom practice, melodic dictation, all-time stats; and custom practice leading free learners to the plans |
| `singing.spec.ts` | The voice check before the first singing lesson, and "Find Home" never playing its answer. `fakeMic` in `fixtures.ts` stands in for the microphone; headless WebKit refuses a made-up mic stream, so the hum test runs in Chromium only |
| `blog.spec.ts` | The best-apps post's updated date and lesson buttons, and the three-question ear test (`site/ear-quiz.js`) |

Useful forms: `npx playwright test e2e/audio.spec.ts --project=webkit`, `npx playwright test -g "paywall"`, `npx playwright show-trace test-results/<folder>/trace.zip`.

Rules for browser tests:

- **They must never reach production.** `playwright.config.ts` blanks the PostHog and Sentry keys, blanks Supabase or points it at a fake address, and `e2e/fixtures.ts` blocks all outside traffic except the React and Tone scripts from unpkg. It also fakes sample files and RevenueCat. Keep both in place, and never point a test at a live URL.
- Every test fails if the page throws or logs an error. Don't filter out a new error to get a test passing; find out what it is first.
- Import `test` from `./fixtures`, not from `@playwright/test`.
- Headless browsers play audio silently, so tests count sounds started rather than listen for them. `sounds(page)` returns how many came from synths and how many from samples. Audio needs a real click to start; see `openEngine` in `audio.spec.ts`.
- When you add a test for a bug, put the old code back and check that the test fails. One test here passed on broken code until it was rewritten.
- Run new tests a few times with `--repeat-each=3`. Timing mistakes often pass on the first run.
- Only one Playwright run at a time per checkout: runs share ports and `test-results/`.
- Passing tests don't replace a check on a real iPhone for audio changes. Most production audio errors have come from Apple devices.

## Changing the curriculum

Saved progress is stored by lesson id: the completed list (in the browser and in Supabase `profiles.completed_levels`), per-item mastery and review dates (`lessonId::item`), and session history. A curriculum change never edits that data, so:

- **Never rename or reuse a lesson id.** Change its name, items or position freely. A removed id just stops counting.
- **Completed lessons stay completed** even if you add prerequisites. Adding a prerequisite can only lock a lesson someone hasn't finished yet.
- **Removing an answer from a lesson is safe:** `isStillAskable` in `src/lib/spacedReview.ts` drops saved items the lesson no longer asks, so reviews can't get stuck on them.
- **Teaching order lives in `TEACHING_ORDER`** in `src/curriculum.ts`. It decides what "continue" and "next lesson" offer, across sections. Every new lesson goes into it after its prerequisites; `src/curriculum.test.ts` fails otherwise.

## Free and Pro copy

Whenever something moves between free and Pro, or the price changes, check every place that describes the plans in the same change. Customers see all of these, and a plan that lists features nobody gets (or hides ones they do) is a false promise.

- What's actually Pro: `tier: 'pro'` on lessons in `src/curriculum.ts`, the Pro-only screens (`src/routes/CustomPractice.tsx`), and the `isPro` checks in `src/routes/Stats.tsx`.
- In the app: the plan cards and headlines in `src/routes/Paywall.tsx`, the free-plan card in `src/routes/Settings.tsx`, the Pro card in `src/components/UpsellCard.tsx`, the banner in `src/routes/Stats.tsx`, and the price in `PRODUCT_VALUE_USD` in `src/lib/billing.ts`.
- On fifths.io: the pricing blocks, FAQs and meta descriptions in `site/index.html`, `site/jazz/`, `site/classical/`, `site/transcribing/` and `site/returning/`, the pricing clause in `site/terms/index.html`, and the "Pricing:" lines and comparison tables in `content/blog/*.md`.

`grep -rn '4.99' src site content` finds most of them. Pro is one monthly plan: list price $9.99, shown crossed out beside the $4.99 launch discount. Don't say the price will go up later: early subscribers keep $4.99. For the crossed-out price to be real, Pro should be set up at $9.99 in RevenueCat with $4.99 as the discount.

## Deploy

Both deploys go live immediately. Run them from the repo root, not from inside `site/`, because `functions/` and `wrangler.toml` are read from there.

**App:**

```bash
VITE_RELEASE_SHA=$(git rev-parse --short HEAD) npm run build:web
npx wrangler pages deploy dist --project-name=fifths-app --branch=main --commit-dirty=true
```

Setting `VITE_RELEASE_SHA` tags Sentry errors with the release.

**Site:**

```bash
npm run predeploy:site
npx wrangler pages deploy site --project-name=fifths-marketing --branch=main --commit-dirty=true
```

`predeploy:site` updates the dates in `site/sitemap.xml`, so there's a small change to commit after a site deploy.

The Pages Functions in `functions/` go live with the site deploy, at fifths.io. When an app change calls a new function, deploy the site first.

**After either one**, load the live site and check for errors:

```bash
curl -s https://app.fifths.io/ | grep -oE 'assets/index-[^"]+\.js'   # the new bundle is being served
curl -sI https://fifths.io/tools/ | head -1
```

Then watch Sentry for new issues. To roll back, promote an earlier deployment in the Cloudflare dashboard; `npx wrangler pages deployment list --project-name=fifths-app` shows the history.

`.github/workflows/deploy.yml` is left over from before Cloudflare. It publishes the old GitHub Pages copy on every push to `main`, and it doesn't deploy either live site or run tests. `README.md` and parts of `docs/deploy-checklist.md` are also out of date on hosting; this file is right.

## Services

| Service | Used for | Notes |
|---|---|---|
| Sentry | Errors | Org `ketabian-llc`, project `fifths-web`. Resolve fixed bugs so they reopen if they return. Archive only expected noise, like people refusing the mic. |
| PostHog | Analytics | The same project covers the site and the app. |
| Supabase | Accounts and sync | Project ref `azsedefwatnqjogotudi`. |
| RevenueCat | Payments | The web SDK is a lazy import in `src/lib/billing.ts`. |
| Loops | Email | The key exists only as a Cloudflare secret, on `fifths-marketing`. So server code that writes to Loops lives in `functions/` and is served from fifths.io, like `functions/api/wants-pro.js`, which the app calls cross-origin. Tests for files in `functions/` go under `src/`, because Cloudflare turns every file in `functions/` into a route. |
| Cloudflare D1 | Waitlist | Database `fifths`, used by `functions/waitlist.js`. |

## Further reading

- `docs/audio-samples.md`: instrument sample sources, licences, and a to-do list for the app
- `docs/seo-plan.md`, `docs/google-ads-strategy.md`: growth plans
- `docs/growth-findings-2026-10.md`: what the data showed in October 2026
- `docs/product-plan.md`, `docs/curriculum-roadmap.md`: product direction
