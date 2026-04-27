# Fifths — Launch Post Copy

> Drafts for the 14-day launch. Each post includes subreddit, flair, posting time, tracking URL (from `site/_redirects`), title, body, reasoning, and reply templates.
>
> **Do NOT paste UTM URLs directly into post bodies.** Use the short paths (`/r/sideproject`, etc.). The `_redirects` file 302s them to the UTM-tagged landing.
>
> **Edit opening sentences** before posting to different subs — Reddit's anti-shingling algorithm flags near-duplicate titles/bodies across subs.

---

## Week 1

### Post 1 — r/SideProject · Mon 9am local

- **Flair:** no flair requirement
- **Tracking URL:** `https://fifths.io/r/sideproject`
- **Landing:** `/` (default)

**Title:** Built an ear training app that tells you exactly what you keep missing — would love feedback on the landing

**Body:**

So for the last year I've been building [Fifths](https://fifths.io/r/sideproject) — an ear training app. I've used EarMaster for years and always hit the same wall: I'd finish drills, pass tests, and still couldn't figure out songs by ear.

The core idea: every ear training app already generates the data you need to improve (which intervals you confuse, which scale degrees you miss) — but none of them show it to you. Fifths does. After every session, you see a confusion matrix of exactly what's slipping, and the app generates drills targeting those specific weaknesses.

I'm collecting waitlist signups while I finish the Pro features. It's $4.99/mo with a free tier forever, and the first 100 people get lifetime for $99.

Honest feedback on the page + positioning would help me a lot. Especially — does the "we show you what you're missing" angle land, or is it too abstract?

**Why this angle:** r/SideProject is safe and maker-supportive. Builder-narrative framing + asking for feedback (not a hard sell) fits the sub's culture.

**Reply templates:**
- *"How is this different from EarMaster?"* → EarMaster has 2,500+ lessons (we have ~30). What EarMaster doesn't have is matrix-level analytics after each session. We tell you which specific intervals and scale degrees you're confusing — the real bottleneck isn't lesson count, it's not knowing what to practice.
- *"Is this another AI / ML thing?"* → No ML, no generative content. Just classical pitch detection, a curriculum, and SQL on your practice history. The "smart" part is statistical, not AI.
- *"Price seems low for what you're offering."* → Appreciate that. Goal is to undercut EarMaster while keeping it sustainable. If feedback says higher would feel more serious, I'll reconsider.

---

### Post 2 — r/EarTraining · Tue 10am local

- **Flair:** use whatever the sub allows for project/resource posts
- **Tracking URL:** `https://fifths.io/r/eartraining`
- **Landing:** `/transcribing`

**Title:** If you've done the apps and still can't transcribe, the problem probably isn't you

**Body:**

I spent three years hitting the same wall: I'd finish interval drills on three different apps and still couldn't figure out pop melodies by ear. Turns out the problem was the drills, not me.

Nearly every ear training app plays intervals in a vacuum — two notes, no key, no context. But real music has a key. When you're trying to hear the melody of a song, you're not naming intervals, you're asking "is this the 3? the 5? the flat 7?" It's a scale-degree question, not an interval-identification question.

So I built [a tool](https://fifths.io/r/eartraining) where every drill lives inside a real key, with a drone playing the tonic. It's the Functional Ear Trainer method plus a matrix that shows which specific scale degrees keep fooling you after each session.

Curious if anyone else hit this wall and what got them past it.

**Why this angle:** r/EarTraining is the bullseye audience. The "your drills were the problem, not you" frame is a legitimate reframe that earns the read. No hard sell; asks a question.

**Reply templates:**
- *"Have you heard of Functional Ear Trainer / Bruce Arnold / etc.?"* → Yes, and huge respect for FET — it's literally the method. Fifths extends it with a full curriculum, matrix analytics, and a web UI. Think of it as FET + measurement.
- *"Doesn't drone training work against intervals in non-tonal music?"* → It's trained first in tonal context because that's where 95% of listeners' brains already live. Atonal / serial drills are on the roadmap for advanced tiers.
- *"Is there a free tier?"* → Yes, forever. Full baseline curriculum. No ads.

---

### Post 3 — r/pianolearning · Wed 4pm local

- **Flair:** `Discussion`
- **Tracking URL:** `https://fifths.io/r/pianolearning`
- **Landing:** `/transcribing`

**Title:** Learning to hear scale degrees changed how I play — here's what helped

**Body:**

About a year ago I realized I could play scales cold in every key but couldn't hear my way through a simple melody. That gap is weird — like knowing the alphabet but not being able to read.

What unlocked it for me was shifting from interval-naming to scale-degree-naming. Instead of "this is a minor 3rd," I started asking "this is the 3 going to the 5." Everything I tried to figure out by ear got easier within a couple weeks.

I built [a small web tool](https://fifths.io/r/pianolearning) to practice exactly this — scale-degree drills with a drone, plus analytics that show which degrees you keep missing. It's free to sign up for the waitlist; launches in a few months.

But the method works without it — what worked for me even before I built the tool: 1) pick a key, 2) drone the tonic on a piano while you do interval drills, 3) name scale degrees, not intervals.

Curious if this resonates with anyone else learning piano.

**Why this angle:** r/pianolearning is big and the audience is earnest. Leading with a *method* the reader can use WITHOUT the product (steps 1-2-3) builds trust. Soft link in the middle.

**Reply templates:**
- *"What's a drone?"* → A sustained note at the key's tonic playing underneath the drill. Keeps the tonal center in your ear so every scale degree sounds distinct relative to it. Same method cellists and Indian classical musicians use.
- *"Does this work if I can't sing?"* → Yep, it's all identification. No mic required unless you want the sing-back feature, which is optional.

---

### Post 4 — X / Twitter thread · Thu 8am local

- **Channel:** @fifths_io (or personal handle)
- **Tracking URL:** `https://fifths.io/x`
- **Landing:** `/`

**Format:** 6-tweet thread.

**1/** Every ear training app has the same failure mode: you finish drills, pass tests, still can't apply it to real music. I got tired of it. Here's what I built →

**2/** The core idea: apps already generate the data that would fix this. Which intervals you confuse. Which scale degrees trip you. Which keys break you. **Nobody surfaces it.** Fifths does.

**3/** After every session you see a confusion matrix. 12×12, honest. Plus per-scale-degree accuracy. Plus one-sentence insights like "your descending minor 7ths are 41%." Then auto-drills target exactly those gaps.

**4/** [attached mockup / screenshot of dashboard]

**5/** $4.99/mo, free tier forever. First 100 get lifetime for $99. Launching summer 2026.

**6/** On the waitlist: https://fifths.io/x

**Why:** Thread format, concrete mechanic, visible product, clear ask. The screenshot is the whole hook.

**Reply templates:**
- *"Is this just another EarMaster?"* → EarMaster has 2,500+ lessons, we have ~30. Different bet — they're comprehensive, we're measuring.
- *"Works on iPhone?"* → Web-first. iOS + Android apps deferred to late 2026.

---

### Post 5 — r/guitarlessons · Fri 6pm local

- **Flair:** `Question`
- **Tracking URL:** `https://fifths.io/r/guitarlessons`
- **Landing:** `/transcribing`

**Title:** Hearing songs by ear — the skill that never actually gets taught

**Body:**

Took guitar lessons for 8 years growing up. Learned chords, learned scales, learned theory. Never once learned to actually figure out a song by ear — which, in retrospect, is the whole point of musicianship.

Been working on closing that gap as an adult. The thing that helped most: practicing intervals with a drone underneath, so I'm always hearing notes relative to a key, not in isolation. Interval-in-a-vacuum drills don't transfer to real songs because real songs have a key.

I built [a web tool](https://fifths.io/r/guitarlessons) that drills scale degrees with a drone and shows you a matrix of which specific degrees you keep missing. Free tier covers most of it. Launches this summer — just collecting waitlist signups for now.

Curious — for anyone else who took lessons: did your teachers ever actually work on ear training, or did they skip it like mine did?

**Why:** Shared-pain framing. Question-at-the-end invites legit engagement. The "my teachers skipped it" bit is almost universally true and relatable for guitar students.

**Reply templates:**
- *"My teacher made me sing intervals, that helped."* → That's valid and underrated. The sing-back feature (Pro) lets you practice solo the same way.
- *"What key should I start with?"* → C major is traditional but actually start in whatever key you naturally play the most songs in — that's the key your ear already half-knows.

---

### Post 6 — r/musictheory · Sun 11am local

- **Flair:** `Resource` or `Analysis`
- **Tracking URL:** `https://fifths.io/r/musictheory`
- **Landing:** `/`

**Title:** Built an ear training tool that surfaces the specific confusions your practice generates — looking for theory-minded feedback

**Body:**

Hey — been lurking here for a while. I've been building [Fifths](https://fifths.io/r/musictheory), a web-based ear training app, and I'd value feedback from this sub specifically because the pitch hinges on something theoretical.

Claim: existing ear training apps throw away the most useful data they generate. You answer questions, get a score, move on. But the per-question detail — which specific intervals you confused, which scale degrees you missed, which directions (ascending / descending) and presentations (harmonic / melodic) trip you — is never surfaced. That data IS the learning signal.

Fifths shows it. After every session you see a confusion matrix, per-scale-degree accuracy, interval-by-direction breakdown. The weak-items practice mode auto-generates drills from your actual mistakes.

It's still pre-launch (waitlist), but I wanted to run the framing by this crowd. Two honest questions:

1. Does the "measurement, not more content" pitch actually make sense, or does it sound like marketing BS to someone who actually knows theory?

2. What's missing from the feature set that you'd expect at the $4.99-$12/mo price point?

**Why:** r/musictheory is educated. Can't bullshit. Admit the tool is pre-launch, frame as pitch check, ask for a specific critique. The "marketing BS" question invites honest readers to bite.

**Reply templates:**
- *"You haven't addressed atonal / post-tonal stuff."* → You're right. Roadmap includes post-tonal / set-theory drills for the Pro tier — targeting the serious-musician audience. Not in v1.
- *"Your prompt mentions Sonofield — how are you different?"* → Sonofield teaches the same method (drone + scale degrees). We add the analytics layer and are roughly a quarter the price.
- *"Why web and not native?"* → Because Tone.js + Web Audio API covers 95% of what we need, and web means one codebase + one deploy + no app store friction. Native is on the roadmap if PWA friction shows up in conversion data.

---

## Week 2

### Post 7 — r/jazztheory · Mon 10am local

- **Flair:** `Discussion`
- **Tracking URL:** `https://fifths.io/r/jazztheory`
- **Landing:** `/jazz`

**Title:** Altered dominants and modal interchange — but with a confusion matrix after every session

**Body:**

Working jazz player, ~10 years. The gap I've always had: I can *analyze* a ♭9 over V all day, but hearing it reliably under performance pressure is a different skill and I don't know how to practice it efficiently.

Every ear training app I've tried is either too beginner-focused (intervals in C) or too opaque (Sonofield has good content but no data surfacing).

I built [Fifths](https://fifths.io/r/jazztheory), a web app that drills altered dominants, modal interchange, quartal voicings, and upper-structure triads in every key — and after each session shows a matrix of which specific tensions fooled you and in which keys. Auto-generates drills from your worst patterns.

Currently waitlist-only; $4.99/mo when it launches, free baseline tier forever.

Curious whether this crowd thinks the measurement angle matters, or whether jazz players are already doing this kind of data-driven practice some other way I don't know about.

**Why:** Direct audience. Admits the gap. Asks a real question rather than selling.

**Reply templates:**
- *"How are the altered dominants drilled — with or without the parent V chord?"* → Both, as separate drill modes. V7♭9 → I as a cadence, and ♭9 isolated-over-V as an interval-in-context.
- *"Do you drill upper-structure triads over a ii-V-I?"* → That's planned for month 2 after launch. First wave is V7alt + modal interchange.

---

### Post 8 — r/classicalmusic · Tue 9am local

- **Flair:** `Discussion` (NOT `Announcement` — that's for concerts)
- **Tracking URL:** `https://fifths.io/r/classicalmusic`
- **Landing:** `/classical`

**Title:** Ear training with actual functional analysis — looking for classically-trained ears to tell me what's missing

**Body:**

Most ear training software treats chords as discrete objects: "that's a G minor." Real musicianship treats them as functions: "that's iii in E♭ major." Most apps don't really drill the latter.

I built [Fifths](https://fifths.io/r/classicalmusic), a web app where chords are labeled with Roman numerals in context (I, ii°, V7, bII), and a matrix shows you which specific functions you keep misidentifying. Supports movable-do and fixed-do solfege. Sight-singing with mic-based cents scoring is included.

Currently pre-launch. Looking for classically-trained listeners to tell me what's missing — specifically whether the functional framing rings true or feels shoehorned.

**Why:** r/classicalmusic skews toward educated listeners. Honest framing wins. The "tell me what's missing" CTA invites the specific feedback that improves the product.

**Reply templates:**
- *"Does it handle Neapolitan, augmented sixths, Picardy thirds?"* → Neapolitan and augmented 6ths yes (higher levels); Picardy third as a cadence option, yes. Not all at launch — these land in months 2-3.
- *"What's the solfege default?"* → Movable-do. Fixed-do is a toggle in settings.
- *"Choral sight-reading?"* → Single-voice at launch. Multi-voice (SATB) is post-launch roadmap.

---

### Post 9 — r/piano · Wed 4pm local

- **Flair:** `Discussion`
- **Tracking URL:** `https://fifths.io/r/piano`
- **Landing:** `/transcribing`

**Title:** The single ear-training change that finally got me past the "I know theory but can't hear it" wall

**Body:**

Piano for 15 years, theory degree, can harmonize anything on paper — but until about a year ago I still struggled to figure out a simple pop melody by ear. That's a ridiculous gap to have.

What fixed it: stopping interval-in-a-vacuum drills and starting scale-degree-in-key drills. Every drill has a drone playing the tonic. Every answer is "that's the 3 going to the 5," not "that's a minor 3rd." Once the tonal center is locked in your ear, scale degrees sound distinct in a way intervals-in-isolation never do.

I built [a web tool](https://fifths.io/r/piano) to practice this methodically, with a matrix showing exactly which scale degrees keep tripping me up. Free tier covers most of it; waitlist is open.

But the method works without any tool — drone a C on one hand, do interval ID with the other. The insight is the reframe, not the software.

**Why:** r/piano is vast and mixed-level. Leading with a method rather than a product keeps the post defensible if someone challenges the self-promo angle.

**Reply templates:**
- *"I've been doing this with Functional Ear Trainer app for years."* → Good. We extend it with a curriculum + matrix + advanced content. Same method family.
- *"Does the drone get annoying?"* → Toggleable, and it fades in rather than blaring. Many users keep it on for 1-2 sessions then turn it off once the tonal center is internalized.

---

### Post 10 — r/WeAreTheMusicMakers · Thu 10am local

- **Flair:** check the sub's rules; this sub has strict self-promo limits
- **Tracking URL:** `https://fifths.io/r/wearethemusicmakers`
- **Landing:** `/`

**Title:** Built an ear training app because I was tired of subscription ones that don't get better

**Body:**

Working on [a web-based ear training app](https://fifths.io/r/wearethemusicmakers) that surfaces which specific intervals and scale degrees you keep missing — and auto-generates drills targeting those weaknesses.

The bet: existing apps (EarMaster, Perfect Ear, etc.) are optimized for finishing drills, not for improving musicianship. They never show you the data they're sitting on.

$4.99/mo, free tier forever, first 100 lifetime for $99. Pre-launch waitlist.

Writing this at the risk of self-promo scrutiny because I genuinely want feedback from people making music, not just people learning theory. What's missing from this pitch for someone who already plays for a living?

**Why:** r/WeAreTheMusicMakers has strict self-promo rules. Lead with the product in one sentence, acknowledge the self-promo risk openly, ask for feedback. Mods often tolerate this if the post invites discussion.

**Reply templates:**
- *"Does it work for non-Western tunings / microtonal?"* → Not at launch. 12-TET only. Microtonal is on the far roadmap (year 2).
- *"Plugin version for DAWs?"* → Not planned. Standalone web app only.

---

### Post 11 — Ask HN · Fri 8am PT (prime HN traffic)

- **Channel:** news.ycombinator.com (Ask HN post — NOT Show HN)
- **Tracking URL:** `https://fifths.io/hn`
- **Landing:** `/`

**Title:** Ask HN: Would you pay for ear training that shows you exactly what you're missing?

**Body:**

I've been building an ear training app called Fifths (https://fifths.io/hn) and I want to gut-check the premise before I finish it.

The hypothesis: every ear training app on the market makes you finish drills but never surfaces which specific intervals or scale degrees keep fooling you. The data is generated every session and thrown away. If you showed it, practice would be targeted rather than vague.

My version:
- After every session, a confusion matrix shows which intervals you confused with which, which scale degrees you miss most, which keys break you
- An auto-generated "practice your weak items" mode pulls from your worst patterns
- Web-based, no install, scale-degree-with-drone method (the Functional Ear Trainer approach)
- $4.99/mo, free tier forever, $99 lifetime (100 seats only)

Questions for HN:
1. If you've done any ear training app, did the lack of per-question analytics ever bother you?
2. Is "measurement without more content" a compelling enough differentiator, or would you rather have 10× the lessons?
3. Any comparable products I should look at that I've missed?

No waitlist-only CTA — I'd rather have the argument than the email.

**Why:** Ask HN (NOT Show HN — that's for working products, not landing pages). Explicitly asks a question. Ends with "I'd rather have the argument than the email" — invites criticism, which on HN is social proof of seriousness.

**Reply templates:**
- *"You're reinventing [specific app]."* → Likely. Prior art research found X, Y, Z. Here's what differs: [one sentence]. Open to the idea I'm wrong.
- *"Show me the matrix screenshot."* → [screenshot link]. It's simpler than you'd think — 12 cells per axis, confusion count per cell.
- *"Is there an API?"* → Not at launch. Data export is CSV for Pro users; an API ships if there's demand.

---

### Post 12 — r/composer · Sat 11am local

- **Flair:** `Discussion`
- **Tracking URL:** `https://fifths.io/r/composer`
- **Landing:** `/classical`

**Title:** Inner hearing — the skill that composers talk about but nobody actually trains

**Body:**

Every composition book tells you to develop "inner hearing" and then leaves it at that. I've been frustrated by this for years — there's no systematic way to measure whether your inner ear is actually getting better or just getting more confident.

I built [Fifths](https://fifths.io/r/composer) to address this: every drill is identification of chord function in real harmonic context, with a matrix showing which functions your ear reliably nails vs. which you rationalize after the fact.

Pre-launch, waitlist only. Curious whether this reframe lands for composers or if I'm missing something obvious about how experienced composers actually train inner hearing.

**Why:** r/composer is small but high-signal. "The skill nobody trains" is a real grievance.

**Reply templates:**
- *"Inner hearing is trained by writing, not apps."* → Agree that writing is the primary driver. Treating apps as calibration rather than replacement — check whether your inner ear matches what's actually on the page.

---

### Post 13 — r/musiced · Sun 10am local

- **Flair:** check sub for required flair
- **Tracking URL:** `https://fifths.io/r/musiced`
- **Landing:** `/returning`

**Title:** For the adult learners we all see — a tool without the streak-shame

**Body:**

Running into more adult learners returning to music than ever. The one thing they all share: existing practice apps feel condescending. Streak guilt, cartoon owls, "you're on fire!" popups. None of it is for people who've been around the block.

I built [Fifths](https://fifths.io/r/musiced) as an ear training app without the gamified garbage. Streaks are off by default. No leaderboards, no public profiles. Methodical practice logs that respect the adult learner.

There's a $99 lifetime tier capped at 100 seats — explicitly targeted at subscription-weary returners. After 100 it closes for good.

For music educators here: is there a version of this that works for your adult students, and what's missing from my pitch for that audience?

**Why:** r/musiced audience is educators, many of whom teach adults. Framing the product as "respect the adult learner" is the wedge. Ends with a targeted educator question.

**Reply templates:**
- *"Can I use this with my students?"* → Individual Pro accounts at launch. Teacher mode (classroom dashboards, bulk seats) is on the roadmap if there's inbound demand — feedback like yours moves that forward.
- *"What about kids?"* → Not the target audience for v1. Our defaults are grown-up (no cartoon avatars, no streak shame) which is kind of the opposite of what most kids' apps need.

---

## Channels NOT covered here (do NOT cold-post into)

- **Show HN** — posting a landing page violates Show HN guidelines. Save for when the product is real enough to try.
- **r/personalfinance**, **r/entrepreneur** — strict self-promo bans. Skip.
- **Product Hunt (full launch)** — wait until the product actually exists. Use the "Upcoming" listing pre-launch instead.
- **Paid Reddit ads** — don't mix with organic. If running ads, separate UTM campaign (`utm_medium=paid`), separate tracking path (e.g. `/r/ads-eartraining`).
