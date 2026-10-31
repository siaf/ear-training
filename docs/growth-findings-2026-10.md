# Growth and reliability findings — Oct 31, 2026

What we learned from a customer support email, PostHog (Sep 1 – Oct 31, 2026), Supabase, and the live sites, plus what was fixed and what to do next.

All numbers are one-off PostHog queries over the last 60 days, excluding the owner's email and localhost. A "visitor" is one browser. Visitors who opt out or block trackers aren't counted.

---

## 1. The numbers

### How much of this is bots? (checked Oct 31)

PostHog only sees browsers that run the page's JavaScript, and it drops self-declared bots by default, so classic crawlers (Googlebot, Bingbot) never appear here. To catch the rest, each of the 964 visitors in the window was scored:

| Verdict | Visitors | How identified |
|---|---|---|
| Bot, flagged by PostHog | 31 (3%) | `$virt_traffic_type`: NotebookLM, headless browsers faking Edge, WebPageTest, a Chinese search crawler (360 Spider), Google Ads checks |
| Likely bot | 126 (13%) | No interaction, plus a headless or data-center fingerprint: 800×600 or 1600×1200 screen, Linux desktop, data-center cities (The Dalles, San Jose, Eatonton…), or China |
| Likely human | 561 (58%) | Clicked or used something, or stayed 15 seconds or more |
| Unclear | 246 (26%) | A brief visit with no bot fingerprint: mostly the apps post (112) and the tool (75). Probably mostly real people bouncing, especially on phones, which often don't report leaving the page |

All 17 lesson starters are in "likely human", including one test session from Oct 31, so 16 real learners. The heaviest tool users (4 people with 1,000+ interactions each) are real people on normal phones and laptops, some returning over several days.

**Bots are about 16% of visitors, not most of them.** They don't change the conclusions. With bots removed, per content:

| Content | Likely-human visitors | Unclear | Bots |
|---|---|---|---|
| Circle of Fifths tool | 379 | 75 | 11 |
| "Best ear training apps" post | 120 | 112 | 19 |
| Other blog posts | 51 | 20 | 18 |

The tool's human visitors are real (heavy interaction) but still almost never start a lesson. The apps post is still the main source of learners. Roughly 3% of likely-human visitors start a lesson.

The visitor numbers in the tables below include bots, about 16% overall. Lesson and sign-in numbers don't, since bots never started a lesson.

### Funnel (60 days)

| Step | People |
|---|---|
| Visited fifths.io | 902 |
| Opened app.fifths.io | 62 (7%) |
| Started a lesson | 16 |
| Finished a lesson | 11 (41 lessons finished in total) |
| Practiced on more than one day | **1** |
| Opened the sign-in sheet / saw the paywall | 4 / 2 |
| Supabase accounts, ever | 3 (yours plus 2 others, all from April–May, none with synced sessions) |

Weekly numbers are flat: ~100–125 site visitors, 5–10 app visitors, 1–3 people starting a lesson.

### Where learners actually come from

Each visitor is counted once, under the first matching row: the apps post, then other blog posts, then the tool, then landing pages.

| Content | Visitors | Opened the app | Started a lesson |
|---|---|---|---|
| Circle of Fifths tool | 456 | 19 | **1** |
| Blog: "best ear training apps" | 251 | 16 | **8** |
| Landing pages only | 106 | 10 | 3 |
| Blog: the other 38 posts combined | 86 | 6 | 3 |
| Went straight to the app | 65 | 12 | 2 |

**The "best ear training apps" post brings in about half of all learners.** People reading a comparison of ear-training apps are looking for an app, which is the right intent. 166 of its 251 readers came from search and other sites.

**The Circle of Fifths tool is popular but doesn't convert.** 74% of visitors use it (21,390 interactions), the median visit is 85 seconds, and 36 people came back on several days. Only 1 of them started a lesson. People come to look something up, not to train their ear. The only app links on the page are in the menu and at the very bottom.

**The other 38 blog posts barely matter yet.** None got more than 17 visitors in 60 days.

### Traffic sources (page views)

| Source | Visitors | Reached the app |
|---|---|---|
| Direct | 301 | 18 |
| Google search | 259 | 0 |
| Bing | 163 | 0 |
| ChatGPT (utm) | 100 | 3 |
| DuckDuckGo | 89 | 0 |
| Google Ads (utm) | 11 | 6 |

Search engines send tool and blog readers. Ads send few people, but more than half of them try the app.

### What people use the app for

- Basic hearing exercises: "higher or lower" (11 people), "beating" (7), "same or different" (6), "consonance" (5). Accuracy is high, 85–98%.
- Singing: "Match the Pitch" (7), "Step Up" (4), "Find Home" (3), "Step Down" (2). This is a real use. "Match the Pitch" had the lowest completion rate (4 of 8 attempts), possibly partly from microphone problems like the support email below.
- Theory lessons (scale degrees, intervals): almost nobody gets that far.
- Devices of lesson starters: 9 desktop, 5 phone, 2 tablet.

---

## 2. What was broken, and is now fixed (all deployed and verified live)

| Problem | Effect | Fix |
|---|---|---|
| Mic errors in singing lessons were caught and shown on screen, never reported | An iPad user got stuck on "Match the Pitch", and we only found out by email | Device-specific help (iPad Safari, iOS app, Android, desktop), a "try again" button, silent-mic detection, reports to Sentry and PostHog (`6bfe1a9`) |
| Supabase project was paused (free plan, inactivity) | Sign-in and cloud sync were down. 3 people tried to sign in during this period and none succeeded | Resumed manually. Auto-pause prevention is still open (see section 4) |
| Sign-in, sync, and purchase errors were caught but never reported | Nobody noticed sign-in was broken | `reportError()` sends them to Sentry, `console.error` goes to Sentry, Google sign-in checks Supabase health first, failed sign-in redirects are reported (`53791cd`, `72107d9`) |
| The "Reserve a $99 lifetime seat" form never saved anything | The code was in `site/functions/` instead of `functions/`, so it was never deployed (POST returned 405), and the page still showed a success popup | Moved to `functions/`. The form waits for the save, shows an error if it fails, and reports it. No signups were lost: PostHog shows none were ever submitted |
| The waitlist code was publicly downloadable at `/functions/waitlist.js` | Code leak (no secrets) | Fixed by the move |
| Hardcoded "47 of 100 lifetime seats claimed" on all 5 landing pages | False claim; the real number is 0 | Removed |
| The marketing site had no error reporting | Site failures went unnoticed | Sentry loader added to the landing pages (same `fifths-web` project) |

Verification (Oct 31, on the live sites): each failure was faked in a test browser. Sentry accepted every report (HTTP 200), and PostHog recorded `auth_failed`, `mic_failed`, `waitlist_failed`, and `session_abandoned`. A real waitlist signup was saved to D1 and then deleted.

---

## 3. Tracking now in place

Willingness to pay vs. staying free:

- `paywall_viewed`, `paywall_plan_selected` (already existed)
- `purchase_started`, `purchase_cancelled`, `purchase_failed`
- `waitlist_submit` / `waitlist_failed` (the "reserve $99 lifetime" form, by `form_source`)

Sign-up and drop-off:

- `auth_sheet_opened` (with `reason`: `sync` or `first_lesson`), `auth_sheet_dismissed`, `auth_provider_clicked`, `auth_failed`
- `session_abandoned` (lesson, stage, questions answered)
- `mic_failed` (problem type, platform)

Other changes:

- PostHog builds profiles for signed-out visitors too (`person_profiles: 'always'`), so retention and cohort reports work.
- The "Try Fifths free" button at the end of each blog post is tracked (`data-ph-cta="article-bottom"`).
- After someone's first finished lesson, the app shows one optional "Keep your progress" sign-up prompt, so they can join the email list. The required sign-in after 7 lessons is unchanged.

---

## 4. Open items

- [ ] **Sentry email alerts:** confirm that `fifths-web` has a rule like "new issue → email". Optionally filter out info level, which is used for blocked mics.
- [ ] **Stop Supabase from pausing:** use a free scheduled request to keep it active, or upgrade the plan. Add an uptime alert.
- [ ] **Privacy page:** it says the marketing site uses Umami but doesn't mention PostHog.
- [ ] **Payments are in test mode** (`rcb_sb_` RevenueCat key). A real visitor who chooses Pro gets a Stripe test checkout. Switch to live Stripe before promoting Pro.
- [ ] **The "start free · 7 days" button** on the app's landing screen implies a trial that doesn't exist. It caused the confusion in the support email. Change it to "start free".
- [ ] **Delete the Sentry test issues** ("verification", "auth health 502/503") and the Loops contact `hello+waitlist-test@fifths.io`.

---

## 5. Growth plan

The biggest problem is that learners don't come back (1 of 16). The second is that the tool's visitors don't reach the app. More traffic matters less than fixing those two.

**A/B testing has to wait.** At about 16 learners every 60 days, a test can't reach a meaningful result. Make one change at a time and compare before and after in PostHog. Revisit A/B tests (PostHog feature flags) when traffic is about 10× higher.

### Now (cheap, highest leverage)

1. **Get learners to come back.** The new first-lesson prompt puts people on the Loops list. Check that the welcome and day-1 reactivation emails actually fire, then upload the remaining lifecycle emails (first insight, streak break, weekly digest, win-back). Measure sign-ups from `auth_sheet_opened{reason=first_lesson}` → `fifths_signup`.
2. **Do more with the apps post.** It's the one page that produces learners. Add an app link early in the article, not only at the end. Keep it current. Do the planned Reddit r/musictheory post. Consider a few more posts with the same "which app should I use" intent ("best interval training app", "EarMaster alternatives", "best app to learn to sing in tune").
3. **Link the Circle of Fifths tool to the app.** Put the call to action next to what the visitor is doing ("Can you hear this chord change? Train it →") and open a matching lesson. Offer something for an email: a printable PDF or a weekly drill. The 36 visitors who keep coming back are the audience.

### Next

4. **Build the Vocal Range Test tool.** About 22k searches a month, it reuses the fixed mic code, and it leads naturally into the Voice lessons, which are the second most-used part of the app. Build the app link and email offer in from day one. (Proposed as a separate session.)
5. **Interval ear trainer tool:** essentially a free app lesson, so the most direct route into the app.
6. **Google Ads:** more than half of the few ad visitors tried the app. A small budget test is worth it once payments are live.

### Later

7. Bulk reference pages (13 interval pages, 24 key pages), the glossary, and blog tag pages. These are long-term search traffic and don't help conversion until the items above work.
8. More long-form research blog posts: hold until there's evidence they bring in learners. The 38 existing ones brought in 3 in 60 days.

### Keeping bots out of the numbers

- **Project-wide filter (done Oct 31):** `$virt_is_bot is not true` was added to PostHog's "filter out internal and test users" setting (on by default for new insights). Check: 60-day unique visitors went from 978 to 945. It removes only bots PostHog itself flags. The ~126 "likely bots" found by fingerprint (800×600 screens, data centers) still count, because a fingerprint rule would also drop some real people.
- **Count engaged visitors:** for decisions, count visitors who interacted or stayed 15 seconds or more (a saved cohort or action), not raw page views.
- **Watch session replays** of "unclear" visitors now and then to recalibrate the rules.
- **Protect the forms:** if fake waitlist signups appear, add Cloudflare Turnstile to the waitlist form.
- **See the crawlers too:** Cloudflare's dashboard (Analytics and Security → Bots) shows the crawlers PostHog never sees.

### How to tell if it's working (check monthly in PostHog)

- Lesson starters per week (now 1–3)
- Learners active on 2 or more days (now 1 of 16)
- First-lesson prompt sign-up rate
- App-link clicks from the tool (now 12 in 60 days) and from the apps post (`article-bottom`)
- `purchase_started` and `waitlist_submit`: the willingness-to-pay signal

---

## 6. Customer support case (Oct 31)

An iPad user emailed hello@ because the mic didn't work in "Match the Pitch". The sender name and the sign-off name didn't match, which raised a scam worry. They have no Supabase account, which is expected because signing up is optional. The "7-day trial" they mentioned comes from the app's own "start free · 7 days" button. Not a scam; most likely a shared family iCloud account. The reply draft is kept locally in `support/` (not committed, since it contains customer details).
