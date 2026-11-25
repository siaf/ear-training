# User status checks

One entry per check, newest last. Aggregates only: no names, emails or account ids. The next check starts its window from the last entry.

## 2026-11-19 ~23:00 UTC (window 17–19 Nov)

- Sign-ups: 9 in 3 days (2, 4, 3), 8 confirmed. Every confirmed new account finished at least 2 lessons, most 3–5.
- Traffic: ~60 a day on fifths.io, 13–16 a day in the app.
- Plans and purchases: 3 people saw the plans page, nobody picked a plan. No customer purchases (all purchases were the owner's tests).
- Sign-in wall shown to 3 people.
- Worst quits: Same or Different Rhythm (6 quits, 4 people), Higher or Lower (3/3), Melodic 4ths & 5ths ascending (3/2), Tap Back (2/1).
- Sentry: one new iPhone "Failed to start the audio device" (FIFTHS-WEB-1W); old-version errors (1P, 1T, 1V).
- Deployed after this check: `deploy/app/2026-11-19-6a5320a` (rhythm lesson made easier and split, Tap Back fixed and moved later, old app copies reload). Watch whether rhythm quits drop.

## 2026-11-20 ~21:00 UTC (window 19–20 Nov)

- Sign-ups: 3 on the 19th, 2 on the 20th, all confirmed. 40 accounts in total.
- One new learner did 13 lessons in 17 minutes (9 completed), including the new Same or Different Rhythm at 5/10 (guessing level). Another passed all 3 lessons they tried.
- Returning learners: none. Nobody who signed up 16–19 Nov came back after their first day.
- Traffic: 45 on fifths.io that day so far; 8 app visitors in PostHog.
- PostHog missed both new learners (Opera and Firefox, trackers blocked). Supabase is the reliable count of signed-in learners.
- 4 visitors went into a lesson from fifths.io (2 from the singing blog post into Match the Pitch, 1 from the Interval Ear Trainer after ChatGPT sent them there, 1 from a lesson page via Google); all left within about 2 minutes.
- Purchases: none.
- Sentry: old-version errors stopped after the deploy; one new "removeChild" on the guitar fretboard tool page (FIFTHS-WEB-N, browser extension or translation).

## 2026-11-25 ~19:45 UTC (window 18–25 Nov, with weekly trend)

- Sign-ups (Supabase, rolling 7 days): 18, all confirmed, up from 15 and 11 in the two weeks before. 50 accounts in total (48 confirmed).
- Active signed-in learners: 20 in the week (14, 9 before). Lessons: 233 (265 the week before, inflated by one learner's 127-lesson day on the 16th).
- Returning learners: 7 came back on a later day (3 and 1 the weeks before). 5 of the 17 who signed up 18–23 Nov came back on another day (~30%), against none at the last check. One 8 Nov learner is still active (6 days in all).
- Traffic (PostHog, Mon-start weeks): fifths.io 87 → 256 → 299 → 373, then 177 in the first 3 days of this week (~60 a day). App visitors 10 → 29 → 49 → 71, then 37 in 3 days. Sources: Google ~150, ChatGPT 92, Bing 19, DuckDuckGo 11.
- Plans and purchases: 7 people saw the plans, 2 started checkout (both iPhone, both just-signed-up heavy learners, both cancelled; one tried twice and came back to the plans 5 more times). No purchases.
- Worst quits: Harmonic 4ths & 5ths (16 quits, 7 people), Match the Pitch (16/9), Consonance (8/2), Higher or Lower (7/6), Major or Minor Key (6/3). Stable or Unstable averages 48% (guessing on two choices); Same or Different Rhythm still 55% after the 19 Nov change.
- Sentry: quiet. New FIFTHS-WEB-1X (Supabase sync "Load failed" on /paywall, 2 events) lines up with both would-be buyers returning to the plans page on iPhone. FIFTHS-WEB-1W (iPhone audio device) once on the 19th.
- Deployed after this check (2026-11-25 ~21:15 UTC, tags deploy/app|site/2026-11-25-b9ccbc0): PostHog through `/ingest` on our own domains, plus a server-side `account_confirmed` event. Once live, PostHog's visitor and event counts will rise because blocked browsers start counting: that's measurement, not growth. Compare like with like (Supabase for sign-ups and lessons). Also built: Stable or Unstable split in two and played over the home chord, Harmonic 4ths & 5ths split (new Fifths and Octaves first), wrong answers now play the difference, try-it buttons at the top of the singing and interval comparison posts, and outbound link clicks (`outbound_link_clicked`). Check those lessons' quit rates and accuracy next week.
- Also deployed 2026-11-25 ~21:58 UTC (deploy/app|site/2026-11-25-c03d771): Pro is $9.99/month with no discount (was $4.99 via the LAUNCH code, now inactive in RevenueCat), the paywall shows the renewal and terms line, RevenueCat's terms checkbox is off, and Apple Pay and Google Pay show in checkout (verified on the owner's iPhone). Checkout is branded (cream panel, coral button, Pro description). Next checks: did anyone pay $9.99, and how many checkout opens. Review the price test around 2026-12-23. PostHog has annotations at both deploys.
