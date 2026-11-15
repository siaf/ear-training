# The Rhythm, Theory and History courses

How the three newest courses work and what to build next in each. Read this before changing `src/curriculumRhythm.ts`, `src/curriculumTheory.ts` or `src/curriculumHistory.ts`. Guitar and Bass have their own doc, `docs/guitar-teaching.md`.

All three use the visual-lesson system Read Music uses (lesson type `reading`). A question is something to look at or hear, then an answer, so mastery, spaced review, results and answer buttons work as they do everywhere else. The builders live next to their content: `src/rhythm/`, `src/theory/` and `src/history/`.

## Rhythm

Reading rhythm and hearing it, both ways round. Each idea comes in up to four kinds of lesson:

| Kind | The learner | Notes |
|---|---|---|
| `rhythm_value` | says how many beats a note or rest lasts | |
| `rhythm_count` | names the count a marked note falls on ("2 &", "3 e", "1 trip") | Counts appear under every note once answered. |
| `rhythm_tap` | reads a bar, presses start, and taps it after a count-in | The rhythm is never played before the tap, and the Hear button is hidden until then. |
| `rhythm_hear` | hears a bar and picks which of three written rhythms it was | Wrong answers always sound different from the right one and from each other. |

The order is: the beat (quarters, halves, wholes), eighths and off-beats, dots and ties, syncopation, sixteenths, then triplets and 6/8. Rhythms are short strings, `'q e e q. e'`, explained at the top of `src/rhythm/model.ts`.

**Grading taps.** `gradeTapsSteady` lines the taps up with the rhythm by the one steady shift (−80 to +160 ms) that fits best, then grades them. A learner who is 70 ms late on every note passes, and is told so. Uneven taps still fail.
- The window for each note is under half the gap to the next note, at most 110 ms.
- Passing means every note hit, with at most one extra tap.
- The test `tapping out of time…` in `e2e/courses.spec.ts` checks that a failed attempt is marked wrong note by note.

**Drawing.** `RhythmStaff` draws a one-line staff: heads, stems, beams by beat, flags, rests, dots, ties, triplet 3s and time signatures.
- Spacing is weighted by note length but not proportional to it, as in printed music, so sixteenths stay readable on a phone. Faint ticks still mark the beats.
- Stems always point up, and only one-line rhythms are drawn.

**Next:**
- Two-bar rhythms, and ties across the bar line.
- Rhythm dictation into notation: build the rhythm you heard from note-value buttons, instead of picking one of three.
- Tempo steps: the same rhythm, faster, once it's solid.
- Sight-reading pitch and rhythm together on a five-line staff. This needs stems in `Staff.tsx`, which today draws whole notes only.
- Compound meters beyond 6/8 (9/8, 12/8), and 5/4 and 7/8.
- Swing eighths: hear them, and read them as straight eighths marked "swing".

## Theory

How music is built, seen on the staff and heard. Read Music teaches reading the page; Theory teaches what it means.

| Kind | Asks |
|---|---|
| `th_scale_step` | two marked neighbours in a major or minor scale: whole or half step? |
| `th_degree` | a note in a named key: which degree (tonic, dominant…)? |
| `key_signature` (from Read Music) | which major key? |
| `th_minor_key` | which minor key has this signature? |
| `th_numeral` | a chord in a named key: which Roman numeral? |
| `th_seventh` | maj7, 7, m7, m7♭5 or dim7? |
| `th_cadence` | three chords in a key: authentic, plagal, half or deceptive? Numerals appear under the chords once answered, and the chords play one after another. |
| `th_mode` | which mode? From white-note tonics first, then from any tonic, compared with the major scale on the same note. |

`src/theory/questions.test.ts` reads each staff back, key signature included, and checks its pitches: the step size, the chord's degree and quality, the seventh's intervals, the cadence's roots, and each mode's step pattern.

**Next:**
- Minor keys' chords, with the raised 7th (harmonic minor) and the major V in minor.
- Secondary dominants (V/V) and borrowed chords.
- Inversions and figured bass (6, 6/4), building on Read Music's inversion lessons.
- Common progressions as a whole (I–V–vi–IV, ii–V–I): name the progression, or the chord that's marked inside it.
- Voice leading: spot the parallel 5ths.
- Hearing these: every theory question already has sound. An ear-first version (hear the cadence, then name it) would tie this course to ear training.

## History

The story of Western music, plus jazz and popular music, in the app's short-question format.

| Kind | Asks |
|---|---|
| `hx_quiz` | a fact, with four answers (`FACTS` in `src/history/content.ts`, right answer first) |
| `hx_era` | which era a composer is from (`COMPOSERS`) |
| `hx_hear` | a short passage: which style? |

**Listening passages** (`src/history/styles.ts`) are generated fresh in a random key. Each shows one textbook hallmark:
- organum's parallel 5ths;
- a Baroque running bass and sequence;
- Classical Alberti bass;
- a Romantic diminished 7th and wide arpeggios;
- Impressionist whole-tone and parallel chords;
- blues boogie and swing;
- minimalist repetition.

They play on the learner's instrument, not period instruments, and the intro says so: listen for texture and harmony, not the sound.

**Facts** stick to the well established. Where sources differ, the copy is softened: for example, "one of the first symphonies to bring in a choir", and "several hundred" surviving Stradivari instruments. Era dates are the usual approximate ones. Beethoven is filed as Classical, with a note that he leads into the Romantic era.

**Next:**
- Real recordings (public domain, e.g. Musopen) for listening. Licences go in `docs/audio-samples.md`.
- A timeline view: drag events into order.
- Non-Western traditions: Indian classical (raga, tala), West African drumming, gamelan, maqam. They need careful sourcing.
- Women composers beyond Hildegard and Clara Schumann: Fanny Mendelssohn, Lili Boulanger, Florence Price.
- Film and game music.
