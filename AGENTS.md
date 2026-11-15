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
| `npm run build:lessons` | A public page per ear-training lesson (`site/lessons/<slug>/`, with its preview picture), the `/lessons/` index and `site/llms.txt`, from the curriculum. Needs Playwright's Chromium for the pictures. |
| `npm run build:blog` | Blog pages and `site/sitemap.xml` (including the lesson pages), from `content/blog/`. |
| `npm run predeploy:site` | Brand files, lesson pages, blog and all tools. Run before every site deploy. |

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
| `billing.spec.ts` | RevenueCat hearing only about signed-in accounts that Supabase's server confirms (nothing for visitors, no anonymous IDs), and recovering after a failed load |
| `accounts.spec.ts` | Sign-in prompts, on a third app server with a fake Supabase address; a faked signed-in learner hitting closed checkout |
| `tools.spec.ts` | Every free tool loads, and sample files arrive |
| `pro.spec.ts` | Pro features as a signed-in subscriber (`asPro` in `fixtures.ts`, on the accounts server): saved drills, melodic dictation, all-time stats; and drills leading free learners to the plans |
| `repeat.spec.ts` | "Repeat lesson" after a lesson, "drill what you missed" (free and Pro), and replaying a finished lesson from the path |
| `singing.spec.ts` | The voice check before the first singing lesson, and "Find Home" never playing its answer. `fakeMic` in `fixtures.ts` stands in for the microphone; headless WebKit refuses a made-up mic stream, so the hum test runs in Chromium only |
| `blog.spec.ts` | The best-apps post's updated date and lesson buttons, and the three-question ear test (`site/ear-quiz.js`) with its score sharing |
| `lessons.spec.ts` | The public lesson pages: index, a free page that starts its lesson, a Pro page, preview pictures, the sitemap and `llms.txt` |
| `share.spec.ts` | Sharing a medal, "your week" on the stats screen and the 7-day streak prompt: the picture, X, Reddit as a text post, and Escape |
| `paths.spec.ts` | The course switcher, and Read Music and Guitar lessons finished by reading the staff or neck the learner sees, including chord and scale shapes |
| `courses.spec.ts` | All six courses in the switcher; Rhythm counting and tapping (in time, steadily late, and out of time); a Theory and a History lesson finished by reading; Bass on a four-string neck; the path screen's side cards following the chosen course; unreleased courses locked as "coming soon" for learners but open to the owner's account |

Useful forms: `npx playwright test e2e/audio.spec.ts --project=webkit`, `npx playwright test -g "paywall"`, `npx playwright show-trace test-results/<folder>/trace.zip`.

Rules for browser tests:

- **They must never reach production.** `playwright.config.ts` blanks the PostHog and Sentry keys, blanks Supabase or points it at a fake address, and `e2e/fixtures.ts` blocks all outside traffic except the React and Tone scripts from unpkg. It also fakes sample files and RevenueCat. Keep both in place, and never point a test at a live URL.
- Every test fails if the page throws or logs an error. Don't filter out a new error to get a test passing; find out what it is first.
- Import `test` from `./fixtures`, not from `@playwright/test`.
- Tests are silent: `e2e/fixtures.ts` sends all audio through a gain of zero just before the speakers (headless browsers on a Mac otherwise play out loud). So tests count sounds started rather than listen for them. `sounds(page)` returns how many came from synths and how many from samples. Audio needs a real click to start; see `openEngine` in `audio.spec.ts`.
- When you add a test for a bug, put the old code back and check that the test fails. One test here passed on broken code until it was rewritten.
- Run new tests a few times with `--repeat-each=3`. Timing mistakes often pass on the first run.
- Only one Playwright run at a time per checkout: runs share ports and `test-results/`.
- Passing tests don't replace a check on a real iPhone for audio changes. Most production audio errors have come from Apple devices.

## Changing the curriculum

Saved progress is stored by lesson id: the completed list (in the browser and in Supabase `profiles.completed_levels`), per-item mastery and review dates (`lessonId::item`), and session history. A curriculum change never edits that data, so:

- **Never rename or reuse a lesson id.** Change its name, items or position freely. A removed id just stops counting.
- **A lesson's public page address comes from its name** (`fifths.io/lessons/<slug>/`, see `src/lib/lessonPages.ts`), and shared medals link there. Renaming a lesson moves its page, so add the old slug to `OLD_SLUGS` there and the old address forwards to the new one.
- **Completed lessons stay completed** even if you add prerequisites. Adding a prerequisite can only lock a lesson someone hasn't finished yet.
- **Removing an answer from a lesson is safe:** `isStillAskable` in `src/lib/spacedReview.ts` drops saved items the lesson no longer asks, so reviews can't get stuck on them.
- **Teaching order lives in `TEACHING_ORDER`** in `src/curriculum.ts`. It decides what "continue" and "next lesson" offer, across sections. Every new lesson goes into it after its prerequisites; `src/curriculum.test.ts` fails otherwise.
- **There are six paths (courses):** ear training (`src/curriculum.ts`), Read Music (`src/curriculumRead.ts`), Guitar & Bass (`src/curriculumGuitar.ts`; Bass is a section in it), Rhythm (`src/curriculumRhythm.ts`), Theory (`src/curriculumTheory.ts`) and History (`src/curriculumHistory.ts`). Each has its own sections and teaching order (`READ_TEACHING_ORDER` and so on, collected in `PATH_TEACHING_ORDER`), and a lesson's prerequisites must be in its own path. Lesson ids are unique across all of them. A new path needs its `PathId` in `src/types.ts`, an entry in `PATHS` and `PATH_TEACHING_ORDER`, and an icon in `PATH_ICONS` (`src/routes/Path.tsx`). **Only released courses are open:** `RELEASED_PATHS` in `src/lib/courseAccess.ts` (today just ear training). The others show locked in the switcher as "coming soon", and their lessons can't be started, not even by a `?start=` link, except by the owner's signed-in account (`src/lib/owner.ts`) and in local dev. To release a course, add it to `RELEASED_PATHS`, and check its copy and lessons on a phone first. The browser tests' accounts server turns the preview off (`VITE_COURSE_PREVIEW=off`) to test what learners see. Public lesson pages cover ear training only (`lessonsInPath('ear')` in `scripts/lesson-data.ts`); some names repeat across courses ("All Four Triads"), so give each other course its own folder (`/lessons/guitar/<slug>/`, `/lessons/read-music/<slug>/`) and keep ear training's pages where they are, since those addresses are live and in the sitemap.
- **Guitar chord and scale shapes** are data in `src/notation/shapes.ts`: each note's string, fret offset and degree. A test checks every degree against its pitch, so add a shape there and its lessons get questions, answers and explanations for free.
- **Lessons outside ear training are visual** (types `reading` and `fretboard`): something to look at (or hear), then an answer. `buildVisualQuestion` in `src/notation/questions.ts` builds them all and hands Rhythm, Theory and History kinds to `src/rhythm/questions.ts`, `src/theory/questions.ts` and `src/history/questions.ts`. The staff, neck and question area are in `src/components/notation/`; rhythm notation and the tap pad in `src/components/rhythm/`. A lesson's items say what's tested (`treble:F#4`, `s0f3`, `b0f3` on the bass, `pmin_e:b7`, `rh_q-e-e-h`, `rn_5`, `fact_opera_birth`); each module lists its formats at the top. `src/notation/questions.test.ts` builds every item of every visual lesson, and each module has its own tests that read the drawing back and check it matches the answer.
- **Rhythm tap questions never play the rhythm first** (that would give the answer away), and `gradeTapsSteady` in `src/lib/rhythmGrader.ts` forgives one steady delay (touch screens, Bluetooth) but not uneven timing. Every rhythm in a lesson's `rhythmPool` must fill its bar exactly; `src/rhythm/model.test.ts` checks.
- **History facts** are in `src/history/content.ts`, right answer first. Keep to well-established facts, and soften anything sources disagree on. The listening passages (`src/history/styles.ts`) are generated to show one hallmark each and play on the learner's instrument; the lessons say so.

## Free and Pro copy

Whenever something moves between free and Pro, or the price changes, check every place that describes the plans in the same change. Customers see all of these, and a plan that lists features nobody gets (or hides ones they do) is a false promise.

- What's actually Pro: `tier: 'pro'` on lessons in `src/curriculum.ts`, the Pro-only screens (`src/routes/CustomPractice.tsx`), and the `isPro` checks in `src/routes/Stats.tsx`.
- In the app: the plan cards and headlines in `src/routes/Paywall.tsx`, the free-plan card in `src/routes/Settings.tsx`, the Pro card in `src/components/UpsellCard.tsx`, the banner in `src/routes/Stats.tsx`, and the price in `PRODUCT_VALUE_USD` in `src/lib/billing.ts`.
- In `llms.txt`: the plans paragraph in `scripts/build-lessons.mjs`.
- On fifths.io: the pricing blocks, FAQs and meta descriptions in `site/index.html`, `site/jazz/`, `site/classical/`, `site/transcribing/` and `site/returning/`, the pricing clause in `site/terms/index.html`, and the "Pricing:" lines and comparison tables in `content/blog/*.md`.

`grep -rn '4.99' src site content` finds most of them. Pro is one monthly plan: list price $9.99, shown crossed out beside the $4.99 launch discount. Don't say the price will go up later: early subscribers keep $4.99. For the crossed-out price to be real, Pro should be set up at $9.99 in RevenueCat with $4.99 as the discount.

## Sharing

Learners can share a medal (the "mastered" screen), their week (the stats screen, and a prompt at 7, 14, 30… day streaks) and their ear-test score (blog). The pictures are drawn by `src/lib/shareCards.ts`, which also draws each lesson page's preview picture at build time. Shared links open the app on that lesson (`appShareUrl` in `src/lib/share.ts`; Pro lessons open the path), tagged `utm_source=share`, and that first lesson's intro says "Shared with you… try it yourself".

- Nothing personal goes in a shared link or picture: no name, email or account id.
- Reddit gets a text post with the picture saved for the learner to add, never a bare link, and they pick the community. Reddit flags domains that many accounts drop links to, and removes posts that read like ads.
- Never reward sharing (Pro days, streak freezes): it breaks Reddit's spam rules and makes the posts look bought.
- PostHog: `share_opened`, `share_clicked` and `share_completed` with `kind` (medal, week, streak) and `target`; `blog_quiz_shared` on the site.

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

**Tag every production deploy**, so `git` knows what's live and what shipped when. Deploy from a clean, committed tree, then tag the commit you deployed: `deploy/app/<date>-<commit>` or `deploy/site/<date>-<commit>`, with the time, the Cloudflare deployment URL (the "Take a peek" link wrangler prints) and, for the app, the bundle name in the message:

```bash
git tag -a deploy/app/$(date -u +%F)-$(git rev-parse --short HEAD) \
  -m "app.fifths.io production deploy" -m "Deployed: $(date -u '+%F %H:%M') UTC" \
  -m "Cloudflare deployment: https://<id>.fifths-app.pages.dev" -m "Bundle: assets/index-<hash>.js"
git tag -l 'deploy/*'                      # every deploy, by site and date
git tag -l 'deploy/app/*' | tail -1        # what app.fifths.io is running
git log deploy/app/2026-11-15-e7555cc..deploy/app/2026-11-15-96da5d2 --oneline   # what a deploy shipped
```

Tags before 2026-11-15 19:00 UTC were added afterwards from Cloudflare's list, which gives only the day.

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
| RevenueCat | Payments | The web SDK is a lazy import in `src/lib/billing.ts`. On the web and Android it starts only for a signed-in account that Supabase's server has confirmed (`syncEngine.ts`), configured with that account's id: visitors send RevenueCat nothing. The iOS app is the exception, because Apple doesn't allow requiring an account to buy: it bills an anonymous ID from launch, moves it to the account with `logIn` once confirmed, and its paywall has "restore purchases". |
| Loops | Email | The key exists only as a Cloudflare secret, on `fifths-marketing`. So server code that writes to Loops lives in `functions/` and is served from fifths.io, like `functions/api/wants-pro.js`, which the app calls cross-origin. Tests for files in `functions/` go under `src/`, because Cloudflare turns every file in `functions/` into a route. |
| Cloudflare D1 | Waitlist | Database `fifths`, used by `functions/waitlist.js`. |

## Further reading

- `docs/audio-samples.md`: instrument sample sources, licences, and a to-do list for the app
- `docs/seo-plan.md`, `docs/google-ads-strategy.md`: growth plans
- `docs/growth-findings-2026-10.md`: what the data showed in October 2026
- `docs/product-plan.md`, `docs/curriculum-roadmap.md`: product direction
- `docs/guitar-teaching.md`: how the Guitar path teaches the neck (one pattern of 4ths, one bend at G–B), the Bass section, its sources, and rules for new guitar lessons
- `docs/courses.md`: how the Rhythm, Theory and History courses work, and what to build next in each (Composition is in `docs/curriculum-roadmap.md`)
