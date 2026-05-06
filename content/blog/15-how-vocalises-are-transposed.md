---
title: "How vocalises are actually transposed — and why it isn't the cycle of fifths"
slug: how-vocalises-are-transposed
date: 2026-05-03
author: Fifths
tags: [singing, vocalises, voice, transposition, pedagogy, range]
description: Voice teachers don't drill C → G → D → A. They climb chromatically through the singer's comfortable range and then descend. Here's why every documented vocal pedagogy converges on the same convention.
---

# How vocalises are actually transposed — and why it isn't the cycle of fifths

Pianists practicing scales typically cycle through keys in the order C → G → D → A → E → B → F♯ — the cycle of fifths, adding one sharp at a time. It is so ingrained in instrumental practice that it shows up as the default key-rotation in many ear-training apps.

Voice teachers do not work this way. Vocalises are not transposed by fifth; they are transposed **by semitone, chromatically, through the singer's comfortable range**. This convention is consistent across the bel canto tradition (Vaccai, Concone, Sieber, Lütgen, Marchesi), through 20th-century methods (Vaccai is still in print), and into modern pedagogy textbooks. It is not a stylistic choice. It is the only convention that makes physiological sense.

## The convention, stated simply

A voice teacher running a warm-up will:

1. **Pick a starting note** that sits comfortably in the lower-middle of the student's range.
2. **Sing the pattern** — a five-note pentachord, a triad arpeggio, a neighbor figure, etc.
3. **Move up by a semitone.** Sing the pattern again on the new starting note.
4. **Repeat**, climbing by semitone each iteration.
5. **Stop when the top note of the pattern would exceed the student's comfortable upper range.**
6. **Reverse direction.** Descend chromatically back through the start, continuing past it down to the comfortable lower bound.

This is essentially how every voice teacher's warm-up looks at the piano. The student is not "in C major" — they are in whatever key the teacher just played, which is changing every five seconds. The point is the *pattern*, transposed across the *range*.

## Why semitone, and why not the cycle of fifths

Three reasons.

**The instrument has no fingerings.** The cycle-of-fifths convention is about technique, not ear: each new key adds one sharp or flat, which means one new piano fingering or one new flat key signature to read. For a wind player, brass player, or pianist, working through the cycle systematically covers the technical surface of the instrument [^1].

The voice has no such surface. There are no "harder" keys for a singer in the way that B major is harder than C major on a piano keyboard. What matters is *where in the range* the note sits — chest voice, mid-voice, head voice, passaggio. The semitone climb covers exactly this physiological dimension; the cycle of fifths jumps around it haphazardly.

**Range coverage requires every semitone.** A pentachord pattern (1-2-3-4-5-4-3-2-1) starting on middle C exercises only five semitones of the singer's voice. To exercise the full range — typically two octaves for an amateur singer, more for a trained one — the same pattern must start on every semitone in turn. Skipping fifths would leave large parts of the range unworked.

**The transition through the passaggio.** Every singer has one or two transition zones (the passaggi) where the voice shifts register. These zones are typically a few semitones wide. Working *through* them by semitone is exactly how a teacher trains the student to negotiate the transition smoothly. Cycle-of-fifths transposition jumps over the passaggi, which is the opposite of what is wanted.

## What "comfortable range" means in practice

The starting and ending notes of the chromatic climb are not universal — they depend on the singer. A trained baritone might warm up a pentachord pattern starting on G2 and climbing to E4 or so. A coloratura soprano might start on E♭4 and climb to A5. An untrained adult of unknown voice type might cover something like a tenth, with the boundaries discovered empirically [^2].

The standard pedagogical move is a one-time **range calibration**: at the start of voice study, the teacher and student establish the lowest comfortable note (often by descending chromatically until the voice loses tone) and the highest comfortable note (often by ascending until breath or tension breaks down). These two pitches define the working range; vocalises stay safely inside it [^3].

This is exactly the move an ear-training app that includes voice lessons should make. A single calibration on the first voice session — "sing your lowest comfortable note; now your highest" — replaces a generic fixed-key climb with one tailored to the user's voice.

## What about teaching multiple keys for ear-training reasons?

There is a separate, valid pedagogical reason to randomize keys: building **relative pitch** so that scale-degree perception is not anchored to one absolute key. This is the convention in modern ear-training apps for non-vocal exercises — every interval question, every scale-degree drill, every chord-quality identification round picks a fresh random key [^4].

That convention applies to vocalises too, but with a twist. **Random key per round** is right for *ear* training. **Chromatic climb through the singer's range** is right for *voice* training. The two are different constraints:

- Random key per round prevents the ear from fixating on one tonal center.
- Chromatic climb prevents the voice from working only in one register.

For a sing-back exercise that does both, the right design is: chromatic climb (so the voice gets exercised through its range), but with a randomized starting offset each session (so the ear cannot calibrate to the climb's start). The pattern shape stays the same. The relationship being trained — anchor, step up, step down, return — is the constant. Everything else moves.

## What this means if you're building ear-training software

A few practical implications, drawn from voice pedagogy and corroborated by perceptual-learning research:

- **For sing-back drills, climb chromatically through a calibrated range, not through the cycle of fifths.** This matches every documented voice pedagogy and avoids leaving large parts of the singer's range unworked.
- **Randomize the starting offset across sessions.** Same pattern, different start each session. Prevents the singer from memorizing absolute pitches and forces the relationship to be the trained skill.
- **Add a one-time vocal range calibration on first voice-lesson use.** Lowest comfortable note → highest comfortable note. Bound the climb to inside that range. This is the single highest-leverage feature you can add to a voice-training module — every human voice teacher does it in the first 30 seconds of a lesson, and it transforms a generic vocalise into a personalized one.
- **Don't use cycle-of-fifths key rotation for sing-back.** It is right for piano practice and is a defensible default for non-vocal ear-training drills, but it is the wrong axis for the voice.

The principle, distilled: **for the voice, the right axis is the singer's range; for the ear, the right axis is randomization. The cycle of fifths belongs to the keyboard, not to the throat.**

---

## Related reading

- [The double-neighbor figure: the tiny five-note pattern at the root of vocal warm-ups](./14-pivot-tones-double-neighbor-figure.md)
- [Designing a Voice section: the ear training curriculum gap most apps miss](./16-designing-a-voice-section.md)
- [Sing what you hear: the sensorimotor case for vocalizing while you ear-train](./06-singing-while-you-train.md)

---

## References

[^1]: This convention dates back to Hanon's *Le Pianiste Virtuose* (1873) and is reinforced in nearly every standard piano method (Czerny, Burgmüller, modern Bastien/Alfred). The cycle-of-fifths key sequence aligns with progressive key signature complexity and serves a *reading and fingering* curriculum, not a *physiological* one.

[^2]: Miller, R. (1996). *On the Art of Singing*. Oxford University Press. See also Miller, R. (2004). *Solutions for Singers: Tools for Performers and Teachers*. Oxford University Press.

[^3]: Sundberg, J. (1987). *The Science of the Singing Voice*. Northern Illinois University Press, especially chapters on vocal range and registration. For a contemporary practitioner overview of range calibration, see Doscher, B. M. (1994). *The Functional Unity of the Singing Voice* (2nd ed.). Scarecrow Press.

[^4]: Krumhansl, C. L., & Kessler, E. J. (1982). Tracing the dynamic changes in perceived tonal organization in a spatial representation of musical keys. *Psychological Review*, 89(4), 334–368. <https://doi.org/10.1037/0033-295X.89.4.334>. The case for random-key training in modern ear-training tools is laid out in Tonedear's pedagogy notes: <https://tonedear.com/ear-training/functional-solfege-scale-degrees>
