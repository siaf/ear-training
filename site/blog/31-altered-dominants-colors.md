---
title: "Hearing altered dominants: ♭9, ♯9, ♯11, ♭13 each have a distinct color"
slug: altered-dominants-colors
date: 2026-05-04
author: Fifths
tags: [jazz, altered-dominants, harmony, ear-training, tensions]
description: "An altered dominant chord has four common alterations on the V7 — ♭9, ♯9, ♯11, ♭13. Each one has a distinctive emotional color that does not transfer between them. A trained jazz ear hears these as four different sounds, not one generic 'altered.' Here is how to develop that distinction."
---

# Hearing altered dominants: ♭9, ♯9, ♯11, ♭13 each have a distinct color

The dominant 7 chord in jazz is rarely played as a plain V7. In practice, the V chord almost always carries one or more of four characteristic *alterations* — additional pitches that color the chord with tension that the resolution to I will release. The four standard alterations are:

- **♭9** (flat ninth): adds the half-step above the root
- **♯9** (sharp ninth): adds the minor third above the root, played alongside the major 3rd
- **♯11** (sharp eleventh): adds the tritone above the root
- **♭13** (flat thirteenth): adds the minor sixth above the root

These four alterations are sometimes lumped together under the umbrella label *altered dominant* (the V7♭9♯9♭13 "fully altered" chord puts three of them on top of the same V7 simultaneously). But to a trained jazz ear, each of the four has its own emotional signature, its own pull, its own characteristic resolution context — and treating them as a single category sacrifices most of the information.

This post lays out what each alteration sounds like, why they feel distinct, and how to develop the ear that distinguishes them. It connects directly to your existing `jazz_altered_dominants` lesson at [`src/curriculum.ts`](../../src/curriculum.ts) (which currently bundles all four into a single 4-way classification).

## The ♭9: tension toward resolution

The ♭9 of V7 is a half-step above the root of V — and a half-step above the *root of V is the third of I*. So the ♭9 of G7 is A♭, which sits a half-step above G; meanwhile, the resolution chord (Cmaj7) has E as its 3rd, also a half-step relationship to F (the 7th of G7).

The ♭9's emotional color is **tension yearning toward resolution**. It is the most "leading" of the four alterations — it almost demands resolution to the I chord, and the resolution feels powerfully cadential when it arrives. This is why the ♭9 is the standard alteration in *minor-key* ii-V-i progressions (where the V7♭9 → i resolution is part of the Phrygian-dominant-scale sound that defines the minor cadence) [^1].

Listen for it: the dramatic V → i in any minor-mode bebop standard. *Stella By Starlight*, *Autumn Leaves*, *Beautiful Love*. The ♭9 is doing most of the cadential work.

## The ♯9: blues color

The ♯9 of V7 is enharmonically the same pitch as the ♭3 — so V7♯9 contains both a major 3rd (the chord tone) and a minor 3rd (the alteration), one half-step apart, sounding simultaneously. This is the same major/minor third clash that defines the *blues* sound [^2].

The ♯9's emotional color is **bluesy, gritty, soulful**. Jimi Hendrix's "Purple Haze" famously opens with an E7♯9 chord — the "Hendrix chord." Stevie Wonder uses V7♯9s constantly. The ♯9 belongs to rhythm and blues, soul, gospel, and the bluesier end of jazz; it is much rarer in bebop bop-line vocabulary, more common in ballads and fusion.

Listen for it: any rock or R&B song that uses an extended dominant chord as a coloration. The clash between major 3 and minor 3 is the giveaway.

## The ♯11: floating, suspended, unresolved

The ♯11 of V7 is the tritone above the root — and notably, it is *consonant* with the rest of the chord rather than dissonant. A G7♯11 contains G, B, D, F, C♯ — and the C♯ sits comfortably above the chord without the urgent need-to-resolve quality of the ♭9 [^3].

The ♯11's emotional color is **floating, suspended, modal**. It is the sound of Lydian-dominant — the fourth mode of melodic minor — and it feels less like a tension that demands resolution and more like a stable color that *could* resolve but does not have to. The ♯11 is everywhere in modal jazz (Miles Davis's *Kind of Blue* uses it pervasively) and in contemporary jazz harmony where the dominant chord functions as a *destination* rather than a *passing tension*.

Listen for it: any extended Lydian-dominant passage in modern jazz. Pat Metheny's writing is full of ♯11s; so is Wayne Shorter's. Compare the *grounded* feel of a V7 → I resolution with the *suspended* feel of a V7♯11 sustained for several bars.

## The ♭13: dark, minor-mode-flavored

The ♭13 of V7 is a half-step above the 5th — and is enharmonically the same pitch as the ♯5. The chord V7♭13 has a darker, more melancholy color than V7 alone, and it implies the *altered scale* (also called the super-Locrian or seventh mode of melodic minor) when used as a coloring tone in improvisation [^4].

The ♭13's emotional color is **dark, weighty, slightly bitter**. It is one of the characteristic alterations of *minor-key* harmony and shows up frequently in tunes that move between major and minor with V7 chords as the pivot. The combination of ♭9 and ♭13 over V (the "V7♭9♭13" chord, very common in minor-mode jazz) is one of the darkest dominant sounds in common-practice jazz harmony.

Listen for it: minor-mode bebop, Coltrane ballads, anything written by Wayne Shorter in his more melancholy mode.

## Why distinguishing them matters

A jazz ear that can identify altered dominants only at the level of "this is altered somehow" can navigate roughly 60% of jazz harmony — they know when something is colored without knowing how. A jazz ear that can distinguish ♭9, ♯9, ♯11, and ♭13 specifically can:

- **Predict resolution behavior.** A V7♭9 is going somewhere; a V7♯11 is not. Knowing which alteration is present tells you whether the next chord is the I (likely) or another V7 chord (possible) or a modal stay (likely if ♯11 is sustained).
- **Identify the source mode.** ♭9 and ♭13 together imply the altered scale (V7alt = melodic minor up a half-step). ♯11 alone implies Lydian-dominant. ♯9 alone implies the half-whole diminished scale. The alteration tells you what scale to play in a solo.
- **Hear chord substitutions.** A bV7 (tritone substitution) of V7 has ♭5 (≡ ♯11), ♭9 (≡ ♭9), and natural 13 (which is the original V's 5th). Recognizing these alterations is how the substitution is heard, not just analyzed.

## How to train the distinction

The standard pedagogical approach across the jazz literature:

1. **Sing each alteration over a sustained V7.** Pianist plays a G7 in the left hand; you sing A♭ (♭9), then A♯ (♯9), then C♯ (♯11), then E♭ (♭13). Get fluent at producing each one against the chord. This is the production side of the skill.
2. **Identify each alteration in isolation.** Pianist plays a single voicing — V7 + one alteration. Identify which one. Pure 4-way classification.
3. **Identify in context.** Pianist plays a ii-V-I where the V is altered. Identify the alteration. The cadential context is closer to real music.
4. **Identify multiple alterations.** A V7♭9♭13 (very common) has *two* alterations stacked. A V7alt has potentially three or four. Train identifying the "primary" coloration of these compound altered chords.
5. **Transcribe altered dominants from recordings.** Coltrane's *Giant Steps*, anything by Bill Evans, modern jazz comping by Mehldau or Glasper. Identify which alterations appear and how they resolve.

## What this implies for your curriculum

Your existing `jazz_altered_dominants` lesson at [`src/curriculum.ts`](../../src/curriculum.ts) treats the four alterations as a single 4-way classification. This is a reasonable starting point but would benefit from being **decomposed into a sequence of more focused lessons**:

- **Lesson 1: V7♭9 vs V7 (binary).** The single most cadentially important alteration; the entry-point distinction.
- **Lesson 2: V7♯9 vs V7 (binary).** The blues-color alteration; perceptually distinct.
- **Lesson 3: V7♯11 vs V7 (binary).** The Lydian-dominant alteration; the "floating" sound.
- **Lesson 4: V7♭13 vs V7 (binary).** The dark/minor-mode alteration.
- **Lesson 5: 4-way among the four alterations** (the current lesson).
- **Lesson 6: Compound alterations** (V7♭9♭13, V7alt) — identify the dominant coloration.

This decomposition mirrors the part-task-then-whole-task principle from motor learning: train each binary distinction in isolation until it is reliable, then combine. Students who go straight to the 4-way classification often plateau because they cannot reliably tell *which* alteration they heard, even when they can tell *that* an alteration was present.

The four alterations are four genuinely different sounds. Treating them as four different lessons matches what the trained ear actually does, and it gives the student a structured path through one of the most distinctive features of the jazz harmonic language.

---

## Related reading

- [Singing the changes: how Berklee's functional jazz ear training works](./18-singing-the-changes-berklee.md)
- [Guide tones: the two notes that define every chord](./29-guide-tones-deep-dive.md)
- [Enclosures: the bebop vocal pattern with no classical equivalent](./30-enclosures-bebop.md)
- [The four lineages of jazz ear training (and why they don't agree)](./17-four-lineages-jazz-ear-training.md)

---

## References

[^1]: Levine, M. (1995). *The Jazz Theory Book*. Sher Music Co. The role of V7♭9 in minor-key cadences and its derivation from the Phrygian-dominant scale (5th mode of harmonic minor) is laid out in chapters on minor-key harmony.

[^2]: Wikipedia, *Hendrix chord*. The major-3-minor-3 simultaneity of the V7♯9 chord is the structural feature that produces its distinctive sound; the same simultaneity is what defines the blues "neutral third" and is responsible for the chord's bluesy, gritty character.

[^3]: Berklee Online, *Harmonic Ear Training: Recognizing Chord Progressions*. <https://online.berklee.edu/courses/harmonic-ear-training-recognizing-chord-progressions>. The Lydian-dominant scale (4th mode of melodic minor) is the standard scale-source for V7♯11; the chord is treated as stable enough to function as a destination rather than a tension in modal contexts.

[^4]: Levine, *The Jazz Theory Book*, chapters on the altered scale (super-Locrian / 7th mode of melodic minor) and its application to V7alt chords. The combination ♭9♯9♯11♭13 over V is the "fully altered" dominant; subsets are common in voice-leading depending on context.
