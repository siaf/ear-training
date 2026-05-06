# Curriculum & practice-engine improvements

A prioritized punch list for the dev team, derived from a pass over the current curriculum (post the recent expansion: Voice segment, Cadences, Inversions, Progressions, Jazz Harmony) against the ear-training research literature. Companion blog posts in [`site/blog/`](../site/blog/) cover the science behind each item.

The first three items are the highest-leverage bundle — they turn the content-rich curriculum into a curriculum that adapts to the learner.

---

## Recently shipped (acknowledge, don't redo)

These were on the prior science-review list and are now done:

- **Voice segment** ([curriculum.ts:78-388](../src/curriculum.ts)) — full vocal-production track from match-pitch through pentachord and scale, major and minor.
- **Cadences as a first-class lesson** ([ton_cadence_basic:457](../src/curriculum.ts), [cad_full:1076](../src/curriculum.ts)) — authentic / plagal / half / deceptive identification.
- **Tonal Progressions populated** — pop progressions, ii-V-I, secondary dominants, modulation detection.
- **Triad and 7th-chord inversions** — new lesson type with first/second/third inversion identification.
- **Augmented triad** added to All Diatonic Triads.
- **Jazz Harmony populated** — extensions, altered dominants, modal interchange, voicings.
- **`getDisplayName` cleanup** with proper labels for cadences, progressions, voicings.
- **Rhythm segment populated** ([curriculum.ts:1252+](../src/curriculum.ts)) — same/different, tap-back, subdivisions, meter, dictation. Item #11c from this list is **done**.
- ✅ **Batch 4.5 shipped 2026-05-04** — items #1 (per-item error tracking + weighted re-asking), #2 (Daily Review tile), #3 (adjacent-question dedupe), #4 (session length tuned to item-set), #10 (stable/unstable reorder) all live. See [TODO.md](../TODO.md) "Batch 4.5" section for the implementation map.

---

## Open items (in execution order)

### 1. Per-item error tracking + weighted re-asking ✅ shipped 2026-05-04 (Batch 4.5)

**Problem.** Question generation in [App.tsx:331](../src/App.tsx) picks items uniform-randomly from `level.items`, with no awareness of which ones the user has missed. Items the user struggles with appear at the same rate as items they nail.

**What to apply.**
- Extend [sessionStore.ts](../src/lib/sessionStore.ts) and the Supabase `sessions` schema to persist a per-item record per lesson: `{ levelId, item, lastSeen, recentResults: [bool x 8-12] }`. Older history is noise.
- In `generateQuestion`, replace `level.items[Math.floor(Math.random() * level.items.length)]` with a weighted draw: `weight = 1 + 2 * recent_error_rate`. Items missed recently appear ~3× as often. Items not seen this session get a small recency bonus to ensure full coverage.
- Three-strike escalation: if an item is missed 3 sessions in a row in a "completed" lesson, it gets re-flagged and feeds the daily review tile (#2 below).

**Why first.** No new UI surface. Immediate measurable retention impact. Sets up #2 and #3.

**Companion reading.** [03-spaced-repetition-for-musicians.md](../site/blog/03-spaced-repetition-for-musicians.md)

---

### 2. Daily Review tile on the Path screen ✅ shipped 2026-05-04 (Batch 4.5)

**Problem.** Once a lesson's `unlockRequirement` is met, items never come back. The forgetting curve is unaddressed.

**What to apply.**
- New entry on [Path.tsx](../src/routes/Path.tsx) — a single tile above the segments: "Today's Review (5 questions)."
- Uses the per-item tracking from #1. Pulls items from completed lessons whose last-correct timestamp is past their forgetting-curve due date. Simple Leitner schedule: boxes at 1 / 3 / 7 / 14 / 30 days, demote on miss.
- 5–10 questions, mixed types, no gating.
- Counts toward the streak.

**Why second.** Depends on #1. Most user-visible delivery of the spacing-effect benefit. None of Tonedear / Teoria / Functional Ear Trainer ship real spacing — this is a defensible moat.

---

### 3. Adjacent-question deduplication ("don't ask the same thing twice in a row") ✅ shipped 2026-05-04 (Batch 4.5)

**Problem.** Reported by users: in lessons with only 2 items (e.g. major-3rd vs minor-3rd, authentic vs plagal cadence), uniform random sampling produces runs of 3–4 identical items in a row. Even with more items, the *exact same prompt* — same item, same root, same direction — sometimes repeats back-to-back. Feels broken even when it isn't.

**What to apply.**
- In [App.tsx:331 `generateQuestion`](../src/App.tsx), keep a short ring buffer of the last 2–3 generated `(itemType, rootNote, direction)` tuples on the session.
- Reject a candidate question and re-roll if it matches the immediately previous tuple (1-back). For 2-item lessons, also forbid 3-back identical (i.e. no `A B A B A`-style alternation longer than 2).
- For interval lessons, also vary the *root note* across consecutive questions even when the same interval comes up — same interval on a different root reads as a different question, which is the desired feel.
- This composes cleanly with #1: weighted sampling first, then dedupe filter, then re-roll with a fall-through after N attempts to avoid infinite loops.

**Why third.** Cheap, isolated change. Fixes the most common "this app feels random/broken" complaint. Should ship before mixed practice (#4) so that mode inherits the same dedupe.

---

### 4. Per-lesson session length tuned to item-set size ✅ shipped 2026-05-04 (Batch 4.5)

**Problem.** Reported by users: cadence lessons with 2 items (V→I vs IV→I) feel long and repetitive at `maxQuestions: 10–12`. The session length was set globally without regard to how many distinct items a lesson contains.

**What to apply.**
- Change the default in [App.tsx:64-76 `getLessonConfig`](../src/App.tsx) from "fixed default 8 / 15" to a function of item count: `defaultMaxQuestions = clamp(itemCount * 4, 6, 14)`. So 2-item lessons default to 8, 3-item to 12, 6+ stays at 14.
- Audit existing explicit `maxQuestions: 10–12` overrides ([curriculum.ts](../src/curriculum.ts) lines 22, 45, 57, 69, 412, 441, 454, 466, 553, 573, 1086, 1105, 1124, 1136, 1155, 1179, 1199, 1211, 1231) and bring 2-item and small-item-set lessons down. Specific recommendations:
  - [`ton_cadence_basic`](../src/curriculum.ts) (2 items: authentic, plagal) → `maxQuestions: 8`.
  - [`found_beating`, `found_consonance`, `found_higher_lower`, `found_same_diff`](../src/curriculum.ts) (2 items each) → `maxQuestions: 8`.
  - [`prog_modulation_pivot`](../src/curriculum.ts) (3 items) → `maxQuestions: 9`.
  - [`prog_jazz_cadence`](../src/curriculum.ts) (2 items: ii-V-I major vs minor) → `maxQuestions: 8`.
- Also reconsider `questionsPerKey: 4` for 2-item tonal lessons — a single key block of 4 in a 2-item lesson is two pairs, which compounds the repetition feel. Drop to 3 when item count ≤ 2.

**Why fourth.** Same root cause as #3 (random selection without awareness of context). Together they fix "feels long and repetitive" without touching the actual pedagogy. Ship in the same PR as #3 if practical.

---

### 5. Mixed Practice / interleaving mode ✅ shipped 2026-05-06 (Engine v2)

**Problem.** Sessions are 100% one lesson type. The contextual-interference literature (Carter & Grahn 2016, music-specific) shows interleaving across categories produces better long-term retention and transfer than blocked practice.

**What to apply.**
- New "lesson type" pseudo-level: a `meta_review` lesson configured at runtime that randomly samples one item per question from any *completed* lesson the user has access to.
- Critical UX detail per the research: the user should *first* identify the question category ("interval / triad / scale-degree / progression?") before answering. The category-identification step is where the long-term-retention benefit comes from. Implement as a two-tap answer or unified picker.
- Inherits the dedupe filter from #3 — never two consecutive questions of the same `(category, item)` tuple.
- Pro feature is reasonable; the science is solid enough to be a defensible upsell.

**Companion reading.** [04-interleaved-practice.md](../site/blog/04-interleaved-practice.md)

---

### 6. Cadence as primer for scale-degree questions ✅ shipped 2026-05-06 (Engine v2)

**Problem.** Infrastructure exists, not wired. [App.tsx:631](../src/App.tsx) calls `audioEngine.playMajorScaleReference` to establish tonality. [audioEngine.ts:874](../src/audioEngine.ts) already implements proper cadences (built for the cadence lesson). The two haven't been connected. Per Krumhansl's tonal-hierarchy work, a cadence establishes a key more strongly and faster than a scale alone.

**What to apply.**
- Add a `primerKind` field to `CurriculumLevel` in [types.ts](../src/types.ts): `'scale' | 'cadence' | 'cadence_then_scale' | 'drone' | 'none'`. Default to `'scale'` for existing lessons (no behavior change).
- In [App.tsx:627](../src/App.tsx) and [App.tsx:665](../src/App.tsx), branch on `primerKind` to call either `playMajorScaleReference` (today's behavior), `playCadence(root, 'authentic', mode)` (already exists), or both in sequence.
- Switch scale-degree lessons in major to `'cadence_then_scale'`. Switch advanced lessons (modes, all-diatonic-triads-by-degree) to `'cadence'` only.
- Drone-mode lessons → `'drone'`. The audioEngine has a drone synth at [audioEngine.ts:159](../src/audioEngine.ts) currently exposed as a user toggle, not a lesson setting.

**Companion reading.** [07-cadence-first-scale-second.md](../site/blog/07-cadence-first-scale-second.md)

---

### 7. Fading the primer at higher mastery ✅ shipped 2026-05-06 (Engine v2)

**Problem.** Primers play before every key change regardless of skill level. Once a learner has the key internalized, the cadence/scale becomes redundant scaffolding.

**What to apply.**
- Track per-lesson best-accuracy (already implicit in completion state; expose it cleanly).
- When a learner has hit ≥90% in a lesson, downgrade the primer on subsequent attempts: `'cadence_then_scale'` → `'cadence'` → `'drone'` → `'none'`.
- Optional: expose a manual "support level" toggle in [Settings.tsx](../src/routes/Settings.tsx).

**Why.** Desirable-difficulty principle (Bjork). Scaffolding fade produces transfer better than scaffolding removal.

---

### 8. Brief delayed-feedback option for review sessions ✅ shipped 2026-05-06 (Engine v2)

**Problem.** All feedback is immediate ([Practice.tsx](../src/routes/Practice.tsx)). The delayed-feedback / desirable-difficulty literature (Metcalfe, Kornell & Finn 2009; Opitz et al. 2011) shows a short pause between answer and reveal produces better retention.

**What to apply.**
- Add a `feedbackTiming: 'immediate' | 'delayed_short' | 'batched'` per-session setting.
- `'delayed_short'`: 2–3 second pause between answer tap and reveal. Show a "thinking..." state.
- `'batched'`: feedback shown only at end of a 5-question block.
- Defaults: acquisition lessons → `'immediate'` (current behavior). Daily Review tile (#2) → `'delayed_short'`. `'batched'` available as a manual toggle for self-test mode.

**Companion reading.** [11-immediate-vs-delayed-feedback.md](../site/blog/11-immediate-vs-delayed-feedback.md)

---

### 9. Timbre rotation ✅ shipped 2026-05-06 (Engine v2)

**Problem.** Practice is piano-only at the surface. The McAdams / Hou timbre-generalization studies show that perceptual learning is specific to the training timbre unless training explicitly varies it.

**What to apply.**
- The audioEngine supports multiple synth choices via [Settings.tsx](../src/routes/Settings.tsx) but it's a global preference, not a per-lesson rotation.
- Once a lesson is past acquisition (≥75% session accuracy on a not-yet-completed lesson), rotate timbres question-to-question within the session.
- Add a vocal/voice timbre sample — biggest transfer leak today is piano-only.
- Pro feature is fine.

**Companion reading.** [12-timbre-generalization.md](../site/blog/12-timbre-generalization.md)

---

### 10. Reorder Tonality: stable/unstable before is-tonic ✅ shipped 2026-05-04 (Batch 4.5)

**Problem.** [ton_is_tonic:399](../src/curriculum.ts) precedes [ton_stable_unstable:428](../src/curriculum.ts). Krumhansl's tonal hierarchy suggests "is this note resolved?" (stable/unstable) is a more primitive perceptual judgment than "is this *the* tonic?" (1 vs not-1).

**What to apply.**
- Swap the order: `ton_stable_unstable.prerequisites: ['found_higher_lower']`, `ton_is_tonic.prerequisites: ['ton_stable_unstable']`.
- Update prereq chains in dependent lessons (search [curriculum.ts](../src/curriculum.ts) for `'ton_is_tonic'`).
- Worth a quick A/B (or just ship). Micro change, low risk.

---

### 11. Empty-stub buildout (in priority order)

The four still-empty segments. Build in this order:

#### 11a. Melodic Dictation ([curriculum.ts:1253-1261](../src/curriculum.ts))

Stage as the working-memory blog post describes:
- **Stage 0** — contour-only (1–3 notes): up/down/same arrows, no pitch.
- **Stage 1** — 4-note phrases in a single key, stepwise motion only.
- **Stage 2** — 5–8 notes; introduce recurring idioms (scale fragments, arpeggios, tonic-and-dominant outlines). Name them.
- **Stage 3** — 8–12 note compound phrases combining 2–3 idioms.
- **Stage 4** — 12–16+ note real-melody phrases.

Each stage limits the working-memory load to within Cowan's ~4-chunk bound by raising chunk granularity rather than raw note count.

**Companion reading.** [08-melodic-dictation-working-memory.md](../site/blog/08-melodic-dictation-working-memory.md)

#### 11b. Sight Singing ([curriculum.ts:1263-1271](../src/curriculum.ts))

Sing-from-degrees first (audio prompt: "sing 1-3-5"; pitch-detect grades), then sing-from-notation later. Natural Pro tier, ties Voice segment to Scale Degrees segment.

#### 11c. Rhythm ([curriculum.ts:1243-1251](../src/curriculum.ts))

Tap-back, subdivision ID, meter recognition. Independent of pitch — can interleave at any segment in #5 (Mixed Practice).

#### 11d. Modal & Modern ([curriculum.ts:1273-1281](../src/curriculum.ts))

Polychords, bitonal, post-tonal. Niche; lowest priority.

---

## Quick reference: the recommended PR sequence

| # | Title | Surface | Effort | Depends on | Status |
|---|-------|---------|--------|------------|--------|
| 1 | Per-item error tracking + weighted re-asking | engine | M | — | ✅ Batch 4.5 |
| 2 | Daily Review tile | engine + UI | M | #1 | ✅ Batch 4.5 |
| 3 | Adjacent-question deduplication | engine | S | — | ✅ Batch 4.5 |
| 4 | Session length tuned to item-set size | curriculum + engine | S | — | ✅ Batch 4.5 |
| 5 | Mixed Practice / interleaving mode | engine + UI | L | #1, #3 | ✅ Engine v2 |
| 6 | Cadence-as-primer wiring | engine | S | — | ✅ Engine v2 |
| 7 | Primer fading | engine | S | #6 | ✅ Engine v2 |
| 8 | Delayed-feedback option | engine + UI | M | — | ✅ Engine v2 |
| 9 | Timbre rotation | engine | M | — | ✅ Engine v2 |
| 10 | Stable/unstable reorder | curriculum | XS | — | ✅ Batch 4.5 |
| 11a | Melodic Dictation segment | curriculum + new lesson type | L | — | next (Batch 5) |
| 11b | Sight Singing segment | curriculum | M | — | Batch 6 |
| 11c | Rhythm segment | curriculum + new lesson type | L | — | ✅ Batch 4 |
| 11d | Modal & Modern segment | curriculum | M | — | Batch 8 |

**Update 2026-05-04:** items #1, #2, #3, #4, #10 all shipped as **Batch 4.5** in a single bundle (engine intelligence layer). Items #5–#9 are deferred to a future "engine v2" batch (Batch 9) — they're worth doing but bigger and more architectural, not blocking the remaining content batches.

**Update 2026-05-06:** **Engine v2** shipped — items #5, #6, #7, #8, #9 all in. New modules:

- [`src/lib/primer.ts`](../src/lib/primer.ts) + `playPrimer` helper in App.tsx — `primerKind: 'scale' | 'cadence' | 'cadence_then_scale' | 'drone' | 'none'` on `CurriculumLevel` (#6). Faded one rung when recent best ≥90% on this lesson (#7). Major scale-degree lessons in pitch segment switched to `cadence_then_scale`; harmonic-degree advanced lessons to `cadence`.
- [`src/lib/timbreRotation.ts`](../src/lib/timbreRotation.ts) — engages mid-session once accuracy ≥75% on a not-yet-completed lesson, round-robin across `piano / sine / triangle / guitar / violin / cello`. Restores user's chosen synth at session end (#9).
- [`src/lib/interleaving.ts`](../src/lib/interleaving.ts) — 10-question session sampled across all completed lessons, with category-pick gate per question (contextual-interference benefit) (#5). Closely-related types (triad / inversion / voicing) collapse to a single "chord" category in the picker. Surfaced as a "Mix it up" action row inside [`TodayPanel`](../src/components/TodayPanel.tsx) (see UI consolidation note below).
- `feedbackTiming` setting in [`Settings.tsx`](../src/routes/Settings.tsx) + `feedbackPending` UI in [`Practice.tsx`](../src/routes/Practice.tsx) — `immediate` / `delayed_short` (~2.5s pause before reveal) / `batched` (currently aliased to delayed_short — per-block summary UI is a follow-up). Daily Review forces `delayed_short` regardless of user setting (#8).
- [`src/lib/recommendations.ts`](../src/lib/recommendations.ts) — surfaces a cross-segment lesson nudge when the gap between the user's strongest and weakest segments exceeds 20pp on ≥8 attempts each. Suggests an unstarted lesson in the weak segment. Renders as a "Try {lesson}" action row inside `TodayPanel`.
- **Verification:** 125/125 tests passing (was 95; +8 primer +7 timbreRotation +8 interleaving +7 recommendations). Typecheck clean. Vite production build clean.

**Engine v2 deferred / follow-ups:**
- Batched-feedback mode currently aliases to delayed_short. The block-summary UI (5-question card with per-question correctness) is a separate component that's worth its own session.
- Vocal/voice timbre sample for the timbre-rotation pool (per the doc — "biggest transfer leak today is piano-only"). Holding off until we have a hosted vocal sample set or build our own.

---

### Curated mid-section checkpoints (Engine v2 follow-up, shipped 2026-05-06)

Mixed Practice (#5) launched as one global tile that samples across *all* completed lessons. This is great for end-of-day practice but coarse for the "I just finished fourths/fifths/thirds — mix them up" case the contextual-interference literature is strongest on (the items are still in working memory).

**What shipped:** [`src/lib/checkpoints.ts`](../src/lib/checkpoints.ts) defines a hand-curated `CHECKPOINTS` array of cluster mixes, rendered as **inline path nodes** between lesson clusters (Flag icon, butter palette, "MIX" badge) — not as tiles above the path. The node anchors after the LAST constituent lesson in segment order, so the user walks the path and naturally encounters "Fourths & Fifths Mix" right after clearing those three lessons. Supersession (`supersedes: ['int_4ths_5ths_mix', 'int_3rds_mix', 'int_6ths_mix']` on `int_consonant_mix`) is computed in `getAvailableCheckpoints()` for tile-based callers, but path render shows every checkpoint at its natural anchor (locked or unlocked) so the user gets a visual roadmap of upcoming review milestones.

The data is curated rather than auto-grouped (e.g. "all completed lessons in a segment") because:
- Intervals has 18 lessons across 6 size classes × 3 presentations — segment-completion is far too coarse, the user wants a 4ths-5ths mix the moment those 3 lessons are done.
- Pedagogical clusters don't always map to contiguous prereq chains (e.g. "consonant intervals" pulls from 4ths/5ths, 3rds, and 6ths — three independent sub-clusters).

**Curated groups (~16):**
- Foundations: `foundations_all` (all 4 ear primitives once cleared)
- Tonality: `tonality_basics_mix` (stable/unstable + tonic + major/minor + cadences)
- Pitch: `pitch_major_mix` (1-3-5 + 1-5 + full)
- Intervals: `int_4ths_5ths_mix`, `int_3rds_mix`, `int_6ths_mix` (per-class, 3 lessons each); `int_consonant_mix` (the 9 consonant lessons, supersedes the three above); `int_dissonant_mix` (the 9 dissonant lessons); `int_all_mix` (3 capstone all-intervals levels, supersedes consonant + dissonant)
- Chords: `chord_thirds_mix`, `chord_triads_mix`, `chord_inversions_mix`, `chord_diatonic_mix`
- Progressions: `progressions_mix` (5 lessons)
- Jazz: `jazz_mix` (4 lessons)
- Rhythm: `rhythm_mix` (5 lessons)

Voice is intentionally omitted — sing-mode lessons don't render answer chips and the category gate has nothing to gate.

**Engine reuse:** `startCheckpointSession(cp)` in [App.tsx](../src/App.tsx) just calls `buildInterleaveQueue(cp.levelIds, 10)` — identical engine path as the global Mixed Practice tile. The category-pick gate auto-skips for single-category checkpoints (e.g. `int_4ths_5ths_mix` is 100% interval, no disambiguation needed). Intro page uses the checkpoint's name + a cluster-specific copy via `getCheckpointIntro()`.

**Verification:** 133/133 tests passing (+8 checkpoints).

---

### UI consolidation (Engine v2 follow-up, shipped 2026-05-06)

After landing the Engine v2 features, three separate action tiles (Daily Review, Mixed Practice, Cross-segment Recommendation) sat stacked above the path on Path screen — eating ~240px of mobile scroll real estate. The path itself also exposed checkpoint mixes as a fourth tile family, plus the right rail held the "Today" stats card and the upsell. Five competing surfaces.

**What shipped:**
- [`src/components/TodayPanel.tsx`](../src/components/TodayPanel.tsx) — single unified hub combining today's stats (minutes / streak) with the three action rows (Today's Review / Try X / Mix it up). Renders in the desktop right rail AND above-the-path on mobile. Replaces the three standalone tiles, which were deleted (`DailyReviewTile`, `MixedPracticeTile`, `RecommendationTile` are gone from the codebase).
- [`src/components/UpsellCard.tsx`](../src/components/UpsellCard.tsx) — extracted from inline JSX in `Path.tsx` so the same "Save your progress" / "Go Pro" card renders on both desktop (right rail, below TodayPanel) AND mobile (below TodayPanel, above the path). Mobile gets slightly tighter padding/mascot sizing.
- **Checkpoint nodes inline on the path** — moved from a tile-above-the-path to actual `RiverNode`-style circles rendered between lesson clusters. Anchored at the last constituent lesson in segment order. `Flag` icon (lucide), butter palette, "MIX" badge. Locked when prereqs not met. The `CheckpointTile` component was deleted.
- **Lucide icon system** ([`src/lib/lessonIcons.tsx`](../src/lib/lessonIcons.tsx)) — replaces the prior 5-glyph SVG `LevelIcon` and the emoji `segment.icon` field with a unified resolver:
  - Section banner icon = lucide component (Headphones / Mic / Anchor / Hash / Ruler / Piano / Music3 / Sparkles / Drum / PenLine / Mic2 / Compass).
  - Lessons inherit their section's icon by default — so a Voice lesson now visually belongs to the Voice section instead of rendering generic headphones.
  - Specific overrides where useful: Foundations primitives get distinct ear/wave icons; Voice basics use Mic / Anchor; intervals use 2-char text labels (`3rd`, `4·5`, `TT`, etc.); chord/inversion/voicing lessons use Layers; rhythm meter uses `4/4`; sing-sequence uses Mic2.
  - `Trophy` for last-in-segment, `Lock` for locked.
  - All emojis purged from user-facing UI: 🔥 → `Flame`, ✓ → `Check`, ✦/↗/⇆ → `RotateCcw` / `ArrowUpRight` / `Shuffle`.

**Bug fixes during the consolidation:**
- `formatDegree('stable', …)` was crashing on `parseInt('stable')` → NaN → `ROMAN_BASE[NaN].toLowerCase()`. Fixed by routing `itemGroups` lessons through `answerLabel` (so they render "Stable" not via the Roman-numeral path) and defensively returning the raw string from `formatDegree` when input isn't numeric. The crash surfaced during Mixed Practice when `ton_stable_unstable` was sampled.
- Auto-advance on correct answers in queue-driven sessions (review / interleave) wasn't bumping the queue cursor or resetting the interleave category gate, causing the same item to re-ask indefinitely. Both `revealFeedback`'s autoAdvance and `handleNext` now cleanly advance cursors + reset gate state.
- Mixed Practice was showing the underlying lesson's per-concept intro (e.g. "In Tune or Beating"). Now queue-driven sessions get a single session-level intro frame: `getMixedPracticeIntro()` for global mix, `getDailyReviewIntro()` for review, `getCheckpointIntro(name, hasGate)` for cluster checkpoints. Mascot is `major` (capstone warmth).

**Deployed:** 2026-05-06 to `https://app.fifths.io/` via `wrangler pages deploy dist --project-name=fifths-app --branch=main`.
