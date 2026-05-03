---
title: "Designing a Voice section: the ear training curriculum gap most apps miss"
slug: designing-a-voice-section
date: 2026-05-03
author: Fifths
tags: [singing, vocalises, curriculum, voice, sing-back, design]
description: Most ear training apps treat singing as a single feature ("sing the note back") instead of a curriculum. Here is what a full Voice section looks like — twelve lessons in the order voice teachers actually teach them.
---

# Designing a Voice section: the ear training curriculum gap most apps miss

Open most ear-training apps and you will find singing represented, if at all, as a single button or a single drill: *listen to the note, sing it back*. One feature. One difficulty level. No progression.

This is a strange omission. Voice teachers have been building graduated singing curricula for two centuries — Vaccai's *Practical Method* (1832), Concone's *50 Lessons* (1837), Sieber's *Vocal Method* (~1860), Marchesi, Lütgen, and onward through every conservatory pedagogy book of the 20th and 21st centuries [^1]. The structure they all share is **a long arc of progressively harder vocal patterns**, not a single "sing back" feature. Building a Voice section into an ear-training app means adopting that arc, not just exposing one drill.

This post lays out what a Voice section looks like when you take the pedagogy seriously. The ordering and lesson design here are what we built into Fifths.

## The principle: the voice has its own learning sequence

Three observations from voice and ear-training research drive the design.

**First, vocal pitch production and pitch perception share neural infrastructure.** Pfordresher's lab has shown repeatedly that singing accuracy and pitch perception co-train — improving one improves the other [^2]. A Voice section is therefore not an "extra" sitting beside the main ear-training curriculum; it is part of the main curriculum.

**Second, real-time visual feedback is the single most effective intervention for poor-pitch singers.** A 2021 study compared visual and auditory feedback on pitch-matching accuracy and found that only the visual-feedback group learned and *retained* the auditory-to-motor mapping [^3]. This means a Voice section's most important UI affordance is a live pitch trace during sustained holds — not after the fact, but during.

**Third, voice patterns must be taught in order of muscular and cognitive difficulty, not in order of musical sophistication.** Singing the same pitch twice is harder than it looks; singing a step up and back is harder still; singing a step up, back, then a step down and back is what every classical vocalise tradition treats as the *first nontrivial pattern*. Apps that jump from "match the pitch" directly to "sing a melody" skip the middle of the curriculum [^4].

## The Voice section, lesson by lesson

Each lesson is short — a 5-minute session — and built around one pattern shape. The shapes are sung in a calibrated chromatic climb through the user's range, randomized in starting offset across sessions (see [How vocalises are actually transposed](./15-how-vocalises-are-transposed.md)).

### 1. Match the Pitch

A single sustained note, played, then sung back. The atom of vocal pitch matching. This is what most apps stop at.

### 2. Find Home

After the scale establishes the key, sing the tonic. Gordon's foundational tonal skill: producing the resting tone in a known key. This is the single most important *contextual* sing-back: the entire concept of singing in tune in a key collapses without it.

### 3. Step Up, Step Back

Sing *do-re-do*. The smallest melodic motion: a step up, a step back. Trains the singer to leave a reference pitch and return to it.

### 4. Step Down, Step Back

Sing *do-ti-do*. The mirror skill — descending step then return. Different muscular adjustment, different cognitive task; a separate lesson because the two directions are not interchangeable.

### 5. Skip a Third

Sing *do-mi-do*. First lesson with a *skip* (a leap of a third). Trains the singer to bypass the second scale degree and land on the third — the first move toward triadic hearing.

### 6. Skip a Fifth

Sing *do-sol-do*. The signature interval of tonic-to-dominant. This is the move that defines the tonal system; singing it accurately and consistently is the gateway to chord-quality hearing later.

### 7. Sing the Pivot (Double-Neighbor on Tonic)

Sing *do-re-do-ti-do*. The classic five-note vocalise — formally a double-neighbor figure around the tonic. Combines step-up-and-back with step-down-and-back into a single coherent gesture. Vaccai-style. (See [The double-neighbor figure](./14-pivot-tones-double-neighbor-figure.md) for the long version of why this pattern is so foundational.)

### 8. Inverted Double-Neighbor

Sing *do-ti-do-re-do*. The same five notes, arrived at in the opposite order — lower neighbor first. Because the brain processes ascending and descending motion asymmetrically, this is a separate skill, not a redundant one [^5].

### 9. Sing the Triad

Sing *do-mi-sol-mi-do* (the 1-3-5-3-1 vocalise). The classical bel canto arpeggio pattern. First lesson that ascends through a stable harmonic structure — the major triad spelled out vertically by the voice. This is the pattern that bridges from "singing pitches" to "singing chord tones."

### 10. Pentachord

Sing *do-re-mi-fa-sol-fa-mi-re-do* (1-2-3-4-5-4-3-2-1). The other classic Italian vocalise — the lower half of the scale traversed and returned. Covers stepwise motion across a perfect fifth without leaps.

### 11. Minor Pentachord

Same shape as #10, in natural minor. First exposure to minor mode in the voice. Trains the ear–voice loop on the lowered third — the single most important interval distinction for minor-mode hearing — and prepares for the *Major or Minor Key* identification work in the Tonality section.

### 12. Sing the Scale (Up and Down)

A full diatonic scale, ascending and descending, in major and minor. The capstone of the section. Once this is reliable, the Voice section's specific work is done — what comes next is using the voice as a tool for the rest of the curriculum (sight-singing, dictation, chord-quality identification with sing-back confirmation, etc.).

## Cross-segment effects

Once a Voice section exists, it does not sit isolated. It changes the optimal prerequisites for several other parts of the curriculum:

- **Tonality lessons** ("Is It the Tonic?", "Stable or Unstable") gain *Find Home* as a soft prerequisite — hearing a tonic is much easier once you can sing it.
- **Scale-Degree lessons** for 1-3-5 gain *Sing the Triad* as a soft prerequisite — singing the triad makes recognizing degrees inside it concrete and embodied.
- **Interval lessons** are conceptually the second half of *Skip a Third* and *Skip a Fifth* — a melodic interval is just a two-note vocal cell, recast as a recognition task instead of a production task.
- **Chord-quality identification** can offer optional sing-back confirmation rounds: *you said this was minor; sing the minor third and prove it to yourself*.

This is the core argument for treating Voice as a section rather than a feature: it has its own internal arc, and its outputs change the prerequisite structure of everything downstream.

## What we deliberately did not include (yet)

A few patterns that voice teachers do teach were left out of the Voice section's first version because they require engine support that does not yet exist or because they belong elsewhere in the curriculum:

- **Anchored pivots on dominant or third** (sing *sol-la-sol-fa-sol* or *mi-fa-mi-re-mi*) — pedagogically valuable, but currently the sing-sequence engine anchors patterns on the moving start degree rather than on a fixed scale degree. Worth adding once the engine supports it.
- **Glide-to-pitch (siren)** as a distinct lesson — semi-occluded vocal-tract entries are valuable warm-up tools and have measurable effects on pitch range and stability [^6], but they are physically distinct from sustained pitch matching and arguably belong in an "Optional warm-up" pre-session affordance rather than as a graded lesson.
- **Self-modeling rounds** — the research showing that poor-pitch singers match recordings of *themselves* better than recordings of others is striking [^7], but using it requires recording, storing, and replaying user audio, which is a larger architectural decision.

These are slated for later iterations. The first 12 lessons cover the established core.

## The pedagogical claim, in one line

Singing is not a feature of ear training. It is a curriculum, parallel to and entangled with the listening curriculum, with its own arc that has been refined for two hundred years. An app that treats it as a single button is leaving most of the documented pedagogy on the table.

---

## Related reading

- [The double-neighbor figure: the tiny five-note pattern at the root of vocal warm-ups](./14-pivot-tones-double-neighbor-figure.md)
- [How vocalises are actually transposed — and why it isn't the cycle of fifths](./15-how-vocalises-are-transposed.md)
- [Sing what you hear: the sensorimotor case for vocalizing while you ear-train](./06-singing-while-you-train.md)
- [Cadence first, scale second: how to set up your ear before every drill](./07-cadence-first-scale-second.md)

---

## References

[^1]: Vaccai, N. (1832/2000). *Practical Method of Italian Singing*, ed. John Glenn Paton. G. Schirmer. Concone, G. (1837/n.d.). *Fifty Lessons for the Medium Voice, Op. 9*. For an overview, see Library of Congress, NLS Music Notes (2022): <https://blogs.loc.gov/nls-music-notes/2022/05/classic-italian-vocal-exercises-oldies-but-most-definitely-goodies/>.

[^2]: Pfordresher, P. Q., & Brown, S. (2014). Singing ability is rooted in vocal-motor control of pitch. *Attention, Perception, & Psychophysics*, 79. <https://pubmed.ncbi.nlm.nih.gov/21816572/>. See also: Pfordresher, P. Q., & Greenspon, E. B. (2025). Effects of pitch range on singing accuracy training. *Musicae Scientiae*. <https://journals.sagepub.com/doi/10.1177/10298649241289542>

[^3]: Hoppe, D., et al. (2021). Effects of Visual and Auditory Feedback in Violin and Singing Voice Pitch Matching Tasks. *Frontiers in Psychology*, 12. <https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.684693/full>. PMC mirror: <https://pmc.ncbi.nlm.nih.gov/articles/PMC8297736/>

[^4]: Gordon, E. E. (2012). *Learning Sequences in Music: A Contemporary Music Learning Theory*. GIA Publications. The MLT pattern sequence — short tonic-function patterns first, then dominant, then mixtures — is laid out in chapters on the Skill Learning Sequence.

[^5]: Karpinski, G. S. (2017). *Manual for Ear Training and Sight Singing* (2nd ed.). W. W. Norton. <https://wwnorton.com/books/9780393614251>. Karpinski organizes pitch material strictly by tonal function and treats ascending and descending motion as separately graded skills.

[^6]: Cordeiro, G. F., et al. (2024). Lip Trill Effects on Vocal Function, Vocal Pitch, and Harmonics-to-Noise Ratio. *PMC*. <https://pmc.ncbi.nlm.nih.gov/articles/PMC11635114/>. See also: McCoy, S. (2020). Exercise Science Principles and the Vocal Warm-up: Implications for Singing Voice Pedagogy. *Journal of Voice*. <https://www.sciencedirect.com/science/article/abs/pii/S0892199717300140>

[^7]: Pfordresher, P. Q., et al. Pitch-matching in poor singers: human model advantage. <https://pubmed.ncbi.nlm.nih.gov/21816572/>. Demorest, S. M., Nichols, B., & Pfordresher, P. Q. (2018). The effect of focused instruction on young children's and adults' singing accuracy. *Psychology of Music*. <https://www.acsu.buffalo.edu/~pqp/pdfs/DemorestNicholsPfordresher_2018_PsyMus.pdf>
