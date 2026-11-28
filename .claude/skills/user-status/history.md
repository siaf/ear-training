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

## 2026-11-27 ~05:20 UTC (window last 24 h, 26–27 Nov)

- Sign-ups (Supabase): 6 accounts, 5 confirmed (one never clicked its link). 57 accounts in total.
- Signed-in learners: 4 synced 36 lessons (avg accuracy 76%); 3 of them did 9–14 lessons each on their first day. The 5th confirmed account (Mac Safari) synced none.
- Returning learners: none in Supabase or PostHog (nobody who signed up before the window came back in it).
- Traffic (PostHog): 74 people on fifths.io (Google 20, DuckDuckGo 7, Bing 3, direct 37), 18 in the app. 12 started a lesson, 8 finished one; 43 lessons completed.
- Plans and purchases: 3 people saw the plans, nobody opened checkout, no purchases.
- Worst quits: Higher or Lower (7 quits, 4 people, 5 of 11 finished), Find Home / resting tone (4/3), Stable or Unstable (2/2), Harmonic 4ths & 5ths (2/2, the old lesson). Consonance 12 of 13 finished, Match the Pitch 7 of 9 with no quits.
- Sentry: two new auth issues, both one Mac learner at 04:19–04:23 UTC on release c03d771: FIFTHS-WEB-1Y "Email link is invalid or has expired" (9 events) and FIFTHS-WEB-1Z "email rate limit exceeded". Supabase logs: sign-in worked twice in Safari (sync ran, empty profile pushed), but the tab where they'd done 2 lessons stayed signed out; they reopened the used links ~10 times from Safari and Chrome on an iPad, and a link-preview bot fetched them too. Most likely a Safari private window (each private tab has its own storage, so the signed-in tab and the lesson tab never share). supabase-js 2.104 keeps a session on a reused link, so it isn't the app signing people out. Disposable-looking inbox.

## 2026-11-28 ~15:15 UTC (window since 2026-11-27 05:20 UTC, ~34 h)

- Sign-ups (Supabase): 6 accounts, 5 confirmed. 63 accounts in total. One person made two (an unconfirmed one, then one with another address a minute later).
- Signed-in learners: 5 synced 36 lessons (avg accuracy 75%); the newest did 22 lessons within its first ~20 minutes.
- Returning learners: none again (third check in a row).
- Traffic (PostHog): 105 people on fifths.io (Google 49, direct 39, DuckDuckGo 8, Bing 4, Brave 2, Meta AI 1, Gemini 1), 32 in the app, 17 arrived straight into a lesson. 25 started a lesson, 15 finished one; 50 lessons completed.
- Plans and purchases: nobody saw the plans, no checkouts, no purchases.
- Worst quits: Higher or Lower (4 quits, 3 people, 7 of 11 finished), old Harmonic 4ths & 5ths (0 of 6 finished, 2 quits). Consonance 22 of 23 finished; Match the Pitch 10 of 19 finished with 1 quit.
- Sentry: FIFTHS-WEB-22 new: Google sign-in fails at once on iOS 15 Safari ("auth health unreachable", 8 tries by one learner in Indonesia). `assertAuthReachable` uses `AbortSignal.timeout`, which Safari before 16 lacks, so the check always throws there. That learner then used email, signed in in another browser context (likely the mail app's in-app browser), stayed signed out in Safari, and reopened the used link 3 times (FIFTHS-WEB-1Y, now 12 events, 2 people): the same pattern as 27 Nov, which the held sign-in-code change addresses. FIFTHS-WEB-20/21: React insertBefore NotFoundError on /practice in the Google app on iOS 16 with a Ukrainian locale, most likely page translation. Noise.
- App deploys still on hold (sign-in emails not yet carrying a code).
