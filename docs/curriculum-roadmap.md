# Curriculum roadmap — extracted from blog drafts

Internal product/curriculum specs that were drafted inline in the science-blog posts. Moved here so the public posts focus on pedagogy; this doc is the working backlog for `src/curriculum.ts` decomposition and Voice/Jazz section expansion.

Each entry lists the source post, what to ship, and the rationale (already argued in the published article).

---

## Jazz harmony — guide tones (from post 29)

A jazz-harmony curriculum should treat guide-tone hearing as the foundational skill and build outward from it.

- **`jazz_third_quality`** — given a played four-note chord with the root in the bass, identify whether the 3rd is natural or flat. Binary classification, easy to drill, foundational.
- **`jazz_seventh_quality`** — same for the 7th. Pairs naturally with the 3rd-quality lesson.
- **`jazz_guide_tones`** — given two pitches sustained over a held bass note, identify the implied chord quality (maj7, m7, or 7). Synthesis lesson; closest approximation to what the Berklee functional tradition drills.
- **`jazz_guide_tone_line`** — given a 4-chord progression, sing only the guide tones (3rd or 7th) of each chord, in time. Pitch-detection-graded with appropriate tolerance.

Why: each is a binary or low-arity classification with a clear pass/fail criterion. Together they close one of the most visible gaps in current ear-training-app coverage of jazz harmony.

---

## Jazz harmony — bebop enclosures (from post 30)

Bebop vocabulary is currently absent from most ear-training apps. Three lessons would already make a meaningful difference:

- **Enclosure-recognition lesson** — given an excerpt with a clear enclosure resolving to a chord tone, identify the target. Binary or 3-way (target was the 3rd, 5th, or 7th of the next chord).
- **Enclosure-singing lesson** — sing a four-note enclosure resolving to a target tone, with pitch detection. Same engine as `voice_pivot_tonic` (which is structurally a double-neighbor — the close cousin of the enclosure) but with chromatic approach intervals.
- **Enclosure-pattern dictation lesson** — listen to a 1-bar phrase containing one or more enclosures, then notate which target tones were enclosed. Bebop equivalent of the rhythmic dictation arc.

Why: the enclosure is to bebop what the perfect cadence is to classical harmony — the foundational gesture that defines the style.

---

## Jazz harmony — altered dominants (from post 31)

The current `jazz_altered_dominants` lesson treats the four alterations (♭9, ♯9, ♯11, ♭13) as a single 4-way classification. Decompose into a sequence of more focused lessons:

1. **V7♭9 vs V7 (binary)** — the single most cadentially important alteration; the entry-point distinction.
2. **V7♯9 vs V7 (binary)** — the blues-color alteration; perceptually distinct.
3. **V7♯11 vs V7 (binary)** — the Lydian-dominant alteration; the "floating" sound.
4. **V7♭13 vs V7 (binary)** — the dark/minor-mode alteration.
5. **4-way among the four alterations** — current lesson stays as-is.
6. **Compound alterations** (V7♭9♭13, V7alt) — identify the dominant coloration.

Why: part-task-then-whole-task principle from motor learning. Train each binary distinction in isolation, then combine. Students who go straight to 4-way classification often plateau because they cannot reliably tell *which* alteration they heard.

---

## Jazz harmony — bass recognition (from post 35)

- **`jazz_bassline`** — given a 4-chord progression, identify the bass note of each chord.

Also: **cross-segment lesson recommendations from per-skill accuracy.**
- 95% chord-quality + 60% melodic dictation → recommend melody-down work.
- 95% intervals + 60% chord-quality → recommend bass-up work.
- Data is already collected; surfacing the recommendation is a UX layer on top.

Why: bassline-recognition is currently underrepresented in most ear-training apps; the dominant convention is to drill chord *quality* with the bass implied. A dedicated bassline lesson closes a visible gap in jazz coverage.

---

## Voice section — jazz syllables (from post 33)

For an app that includes sing-back lessons, the syllable convention matters.

- **Pure-pitch lessons** (`voice_match_pitch`, `voice_resting_tone`) — pure-vowel singing is fine; simpler production task is better for new learners.
- **Rhythmic-melodic lessons** (`voice_pivot_tonic`, `voice_arpeggio_triad`, `voice_pentachord_*`, `voice_scale_*`) — add an *optional* "jazz syllables" mode that displays takadimi or scat syllables alongside the notes. User can sing on pure vowels (classical default) or with consonants (jazz default); pitch-detection grading is unaffected.
- **Future jazz-specific Voice sub-section** (scat patterns, guide-tone-line singing, ii-V vocalises) — syllables should be present and considered part of the exercise.

Why: classical theory (voice as pitched instrument) produces sustained tone; jazz theory (voice as rhythmic instrument) produces swinging articulated lines. For a singer in the jazz tradition, syllables are the technique, not decoration.

---

## Voice section — rhythm-coupled warm-ups (from post 34)

- **Metronome-locked timing for Voice lessons** (optional). A `voice_pivot_tonic` lesson at a fixed tempo (sing each note on the beat) trains rhythmic articulation simultaneously with pitch production.
- **Takadimi syllable display for Voice lessons** (optional). A user practicing `voice_pentachord_major` could see takadimi syllables under pitch labels and sing on those syllables instead of pure vowels. Grading unaffected; rhythmic-articulation training added for free.
- **Pre-session warm-up affordance.** Before any Voice or Rhythm session, the app could prompt a 60-second optional warm-up — lip trills on the metronome, then a siren up-and-down, then a scat-syllable arpeggio.
- **Konnakol/takadimi speak-through Voice lesson.** Pure rhythmic-articulation lesson, no pitch involved; user speaks a gati pattern at increasing tempos against a metronome.

Why: simultaneous training in coupled motor systems (vocal-pitch + rhythmic-articulation) is more efficient than sequential training in either alone. Most musicians spend warm-up time on one skill at a time; integration is the opportunity.

---

## Cross-cutting

- All of these can be staged behind the existing curriculum gating; none requires audio-engine changes that don't already exist (chord audio, pitch detection, metronome).
- Most are binary or low-arity classifications — cheapest possible lesson type to author and grade.
- The Voice/syllable additions are pure UI + content; no engine work.
- Decomposing `jazz_altered_dominants` is the highest-leverage single change for jazz wedge users.
