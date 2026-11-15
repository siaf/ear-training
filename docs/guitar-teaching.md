# How the Guitar path teaches the neck

The Guitar path teaches the neck as **one pattern with one bend**, not as a pile of positions to memorise. This file covers the idea, where it comes from, how the lessons use it, and what to build next. Read it before changing `src/curriculumGuitar.ts`.

## The idea

The strings are tuned in 4ths, so the neck is a grid with two directions:

- **Along a string,** each fret is a half step.
- **Across the strings,** each string is a 4th above the one below it: 5 half steps.

Every shape follows from those two moves.

| Move | Gives | Why |
|---|---|---|
| Same fret, one string up | a **4th** up | Neighbouring strings are a 4th apart. "Fret 5 is the next open string" is this rule at fret 5. |
| Same fret, one string down | the **5th**, an octave lower | A 4th down has the same note name as a 5th up, because 4th + 5th = octave. |
| One string up, two frets up | a **5th** up | a 4th plus a whole step |
| Two strings up, two frets up | the **octave** | Two 4ths make 10 half steps, two short of 12. |
| Walk across one fret | the **circle of 4ths** going up (G C F B♭…), the **circle of 5ths** going down | each string is a 4th apart |

**The even neck.** Picture a guitar tuned in 4ths all the way up: E A D G C F. Some players really do tune this way (all-fourths tuning). On that neck every shape works on every pair of strings, anywhere, and the neck is fully symmetrical.

**The bend.** Standard tuning is the even neck with the top two strings lowered a half step, to B and E. That makes open chords easier and puts the two E strings exactly two octaves apart. The cost is that G to B is a major 3rd, not a 4th. So:

- a shape that crosses from the G string up to the B string moves **one fret up**;
- a shape that crosses from the B string down to the G string moves **one fret back**.

That one rule explains why the G string's landmark is fret 4, why the octave from D or G spans three frets, and why chord and scale shapes change on the top strings.

So the method is: **think in the even pattern, then fix the bend.** Learners should be able to say why a shape is where it is, not only where it is.

## Sources

The user pointed to two YouTube series. YouTube only lets scripts read titles and descriptions, not transcripts, so the videos themselves weren't watched. What's below comes from their descriptions and from the Fret Science website. Watch them before building scale lessons.

- **Michael Pillitiere, "Building the Better Guitar Scale"** (BBGS).
  - Videos: [Pt. 1](https://www.youtube.com/watch?v=rQf6i8KIwJU), [Pt. 2](https://www.youtube.com/watch?v=4SBG81G8ZcY), [Pt. 3](https://www.youtube.com/watch?v=I8W_UrCZqRA), [Pt. 4](https://www.youtube.com/watch?v=t_bWLtz1Ktc).
  - What it teaches: every scale, mode and position as three notes per string.
  - Why it works, from his own description: slice a scale every three notes, and each slice spans a 4th, the same 4th the strings are tuned in. So on the even neck the shapes stack at the same fret. Only two things push a shape up a fret: the one tritone in every mode, and the G–B 3rd. The order of shapes repeats every 21 notes (3 × 7).
- **Keith Martin, Fret Science** (playlist: "Guitar scales made easy").
  - Videos: ["A new, faster way to unlock the fretboard"](https://www.youtube.com/watch?v=tpC115zjKiw), ["How to visualize chords & scales"](https://www.youtube.com/watch?v=Qd8pyJ9A5W8).
  - Website text: [standard tuning geometry](https://fretscience.com/2022/09/26/standard-tuning-geometry), [the rectangle and the stack](https://fretscience.com/2022/10/30/the-rectangle-and-the-stack).
  - "The warp": any part of a pattern that crosses the line between G and B moves one fret. Octaves go from a two-fret span to three.
  - Navigating with the circle of 4ths/5ths: there are four step sizes that visit all 12 notes (1, 5, 7 and 11 half steps).
  - The pentatonic as one pattern on an imaginary neck with infinitely many strings, all tuned in 4ths. The five usual boxes are six-string windows of that pattern, bent at G–B. Two shapes, the rectangle and the stack, replace the five boxes. His claim is about 85% less to memorise.

**Use our own words in the app:** "the even neck", "the bend". Don't use "the warp" or "rectangle and stack", which are another teacher's names.

## How the lessons use it

The order is pattern first, then the notes on each string.

1. **Find Your Way.**
   - The open strings, with the names taught on a labelled neck in the intro and hidden in the questions.
   - Frets 5, 7 and 12.
   - The G string's fret 4 gets its own intro page and its own question.
2. **The Neck's Pattern** (`fret_across` questions). A named root and a dot one string away; the learner names the dot.
   - `gt_pat_fourths`: one string up is the 4th.
   - `gt_pat_fifths`: one string down is the 5th, mixed with 4ths.
   - `gt_pat_shift`:
     - The intro covers the even neck, why standard tuning bends, and the circle of 4ths across one fret, with the bend shown.
     - The questions sit around G and B, so the bend is practised.
3. **Octave Shapes.** Taught as two 4ths and a step: two strings up and two frets up, or three frets when the shape crosses the bend.
4. **Notes on the Neck.** String by string, with the landmarks and octaves to count from.
5. **Interval Shapes.**
   - The intro builds the 5th from the 4th: a 4th plus a whole step, one string up and two frets up.
   - Then 3rds, the major-scale intervals, all 12, and a lesson for the bend.
6. **Chords from the Pattern** (`fret_shape_tone`, `fret_shape_find`). The barre chords, built from moves already known.
   - `gt_chord_root6`: from the low E root, the 5th is one string up and two frets up; the octave is two strings up and two frets up; the major 3rd is one string up from that octave and one fret back. Past the bend, the top two strings sit back at the root's fret.
   - `gt_chord_root5`: the same moves from the A string. The 3rd lands on the B string, so the bend puts it at the octave's fret.
   - `gt_chord_minor`: minor is the major shape with the 3rd a fret lower. Four shapes mixed; the 3rd tells them apart.
   - `gt_chord_finish`: the chord with one note missing; tap it.
7. **Scales from the Pattern.**
   - `gt_pent_minor`:
     - The intro starts from the open strings, E A D G B, which are already the E minor pentatonic: a chain of 4ths, like the tuning.
     - Then the box anywhere: at the root's fret the strings walk up in 4ths (R, 4, ♭7, ♭3), and two frets up is a whole step above each (5, R, 4).
   - `gt_pent_minor_a`: the same box one string up. The notes on the B string move a fret: the bend.
   - `gt_pent_find`: the box with one degree missing; tap it.
   - `gt_pent_major`: the same box heard from the minor's ♭3, which is the major root. Every minor box is also a major box.
   - `gt_major_3nps`, `gt_major_3nps_a`: the major scale three notes a string, the BBGS idea. Three notes span a 4th, so each string starts at the same fret as the one below, except a fret up after the 4-to-7 tritone and a fret up across the bend. So the strings pair up.
   - `gt_major_find`: the scale with one degree missing.
8. **Triad Shapes**, then **Read for Guitar**.

9. **Bass** (a section of its own, open from the start so bass players don't do guitar lessons first):
   - The bass is the even neck for real: four strings tuned in 4ths, E A D G, an octave below the guitar's lowest four. No bend, so every shape works on every pair of strings. The first intro says so outright.
   - In order: the strings and frets 5, 7 and 12; 4ths up and 5ths down; octaves (two strings up, two frets up); notes on E and A, and finding a root; root, 5th and octave; major and minor arpeggios; dominant 7th and minor 7th arpeggios (walking-bass material); a fill-the-arpeggio tap lesson; and reading bass clef onto the neck (bass parts sound an octave lower than written).
   - Positions on the bass are written `b0f3` (`n: 'bass'` on a `FretPos`). Bass shapes are in `src/notation/shapes.ts` with `neck: 'bass'`.

Shapes are data in `src/notation/shapes.ts`. Each one has a one-sentence `rule`, shown with every answer. Each answer also says how to reach that note from another note in the shape, using the simplest move: an octave, a 4th to the next string at the same fret, a step along the string, or a 3rd from a root on the next string. A move that crosses the bend says so.

Explanations after a wrong answer always name the move ("one string up, same fret: a 4th up") and, when the bend is involved, why it's there.

## Rules for new guitar lessons

- **Pattern before position.** Introduce a shape by how it's built from moves already taught (4th, whole step, octave). Don't present it as a new fact to memorise.
- **Teach on the even neck, then bend.** First practise a shape where it doesn't cross G–B, then practise it across the bend.
- **Teach the exception on its own.** Give the bend its own intro page and its own questions, not a note in brackets.
- **Show names when teaching, not when asking.** Intros can show a labelled neck (`figure` on an intro page). Questions hide whatever the learner is being asked to recall.
- **Name the connections.** For example: 4th + 5th = octave; 4th + whole step = 5th; walking across a fret is the circle of 4ths.

## Not built yet

These are roughly in order of value:

- **Modes from the same shapes.** The three-a-string major shapes, read from another degree: from the 6 it's natural minor, from the 2 it's Dorian. This is the same idea `gt_pent_major` uses for the pentatonic. Each would need a shape copy with its degrees remapped, plus a lesson.
- **The pentatonic as one pattern across the whole neck.** So far there are two boxes (roots on E and A). The next step is the boxes between them, and sliding from one to the next, so the neck reads as one pattern bent at G–B.
- **The even neck beside the real one.** The bend lesson now shows an all-4ths neck (`figure.stringNames`). A page with the same shape drawn on both necks would show the top two strings sliding a fret.
- **Circle-of-4ths walks:** "start on G at fret 3, walk up the strings", naming each note, with the bend on the way.
- **Chord shapes from the D string, and triad shapes rebuilt as pieces of the barre shapes**, so `gt_triad_*` connects to `gt_chord_*`.
- **Hearing it.** Every shape question plays the root, then the asked note, so the degree is heard as well as seen. A later step could play the note alone and ask for its degree, tying into the ear-training path.
