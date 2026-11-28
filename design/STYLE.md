# Mascot style guide

How the four mascots (Fable, Noir, Major, Pulse) are drawn and rigged, so they read as one cast. Fable, Noir and Pulse set the style. When a mascot's original pictures disagree with this file, this file wins.

Each mascot is `src/mascots/<key>.svg` (the drawing) plus `src/mascots/<key>.json` (faces, actions, framing), and the shared animations are in `src/mascots/mascot.css`. The app draws them with `src/components/Mascot.tsx`. `python3 design/build.py` builds the audition page `design/mascots.html`, and `npm run build:mascots` renders the PNGs in `public/brand/mascots/` from the same files. The original pictures they were drawn from are in `design/reference/`.

## Shape and colour

- **Flat shapes.** Each colour area gets at most three tones: a base, one shadow and one light. Use no gradients, no outlines around the body, and no texture. Fable keeps its angled fox planes, but still within three tones per area.
- **Soft, simple build.** Use one rounded head, a compact body, rounded arms that hang at the sides, short legs and simple flat feet. The head is the biggest shape. Noir and Pulse are the model for the body; Fable's angular body stays because it's a fox.
- **Each mascot owns its colour**, and nobody wears another's. Fable is coral and orange (coral scarf), Noir is ink with mint (mint bow tie), Major is butter (green book, no neckwear), and Pulse is sky (coral bow tie, the one bridge to Fable).
- **One prop at most.** Major's is the book. Nobody else carries anything.

## Faces

Every mascot uses the same face vocabulary, set on the root `<svg>` with `data-eyes` and `data-mouth`. A face's name means the same thing on all four.

**Eyes (`data-eyes`)**

| value | drawing |
|---|---|
| `open` | A solid ink dot with radius about 6% of the head's width (cheek to cheek), and no highlight or reflection. Noir alone gets a thin cream ring (`#fbe9c9`, about 35% of the dot's radius) because ink eyes vanish on black fur. |
| `wide` | `open` at 1.15× size, for surprise only |
| `closed` | An upward arc ("^") about 1.7× the dot's radius wide. Stroke 6 (in a ~430 frame), round caps, in ink. |
| `wink-left` / `wink-right` | One eye `closed`, the other `open`. Left and right mean the viewer's left and right. |
| `sad` | A downward arc, plus short slanted brows in a darker tone of the fur |

**Mouths (`data-mouth`)**

| value | drawing |
|---|---|
| `smile` | A small curved line, stroke 3.5, round caps |
| `small` | A small open smile, or the "w" mouth for cat and rabbit |
| `open` | An open D-shaped mouth in ink with a little tongue showing |
| `tongue` | An open mouth with the tongue out over the lower lip |
| `o` | A small ink oval, for singing or surprise |
| `frown` | An upside-down `smile` |

**Colours:** eye ink `#241d2a`; mouth line `#3a2530` (except Noir, where the line has to show on black); tongue `#ef6b6b`; blush is ellipses about 5.5% × 2.2% of the head's width in `#f59a8a` at 0.55 opacity, under the eyes, toggled with `data-blush="on"`.

**The faces**, the same on every mascot:

| face | eyes | mouth | blush | fx |
|---|---|---|---|---|
| neutral | open | smile | | |
| happy | closed | tongue | on | |
| excited | open | open | on | sparkles |
| laugh | wink-left | tongue | on | |
| curious | open | small | | question |
| listening | closed | smile | | notes |
| content | wink-right | smile | | |
| sad | sad | frown | | |
| surprised | wide | o | | |
| sing | closed | o | on | notes |
| keeping-time | closed | small | | notes |

Pulse's neutral uses `closed` eyes. Pulse listens to the beat, and that's part of the character. All the other faces follow the table.

## Effects (`data-fx`)

`notes`, `sparkles`, `heart`, `question`, or `none`. Each is drawn the same way on every mascot, beside the head on the viewer's right, level with the ear tips. Paste these, then translate the group so its origin sits at that spot.

```svg
<g class="fx fx-notes" id="notes">
  <g class="note n1"><path d="M6,26 L6,0 L28,4 L28,16" fill="none" stroke="#ef6b6b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="0" cy="28" rx="7" ry="5.5" fill="#ef6b6b"/></g>
  <g class="note n2"><path d="M32,60 L32,36 L46,42" fill="none" stroke="#4a8fe0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="26" cy="62" rx="7" ry="5.5" fill="#4a8fe0"/></g>
</g>
<g class="fx fx-sparkles">
  <path d="M14,0 Q16,12 28,14 Q16,16 14,28 Q12,16 0,14 Q12,12 14,0 Z" fill="#f6c445"/>
  <path d="M40,30 Q41,37 48,38 Q41,39 40,46 Q39,39 32,38 Q39,37 40,30 Z" fill="#f6c445"/>
</g>
<g class="fx fx-heart"><path d="M14,26 C4,18 0,12 0,7 C0,2 4,0 7,0 C10,0 12,2 14,5 C16,2 18,0 21,0 C24,0 28,2 28,7 C28,12 24,18 14,26 Z" fill="#ef6b6b"/></g>
<g class="fx fx-question"><path d="M4,10 Q4,0 14,0 Q24,0 24,9 Q24,15 16,18 Q14,19 14,24" fill="none" stroke="#5bbf94" stroke-width="5" stroke-linecap="round"/><circle cx="14" cy="33" r="3.2" fill="#5bbf94"/></g>
```

Hide them all and show the one asked for: `.fx { display:none }` and `[data-fx="notes"] .fx-notes { display:inline }`, and so on.

## Bust view (`data-view="bust"`)

Head, shoulders and neckwear, cut off below the chest: no arms, no paws, no legs, no tail, no shadow. Major shows the top of the book held against the chest. Frame the bust square, with the head (cheek to cheek) about 70% of the frame's width, centred on the face, and the eye line about 48% down. If the ears don't fit (Pulse), shrink the head until there's at least a 3% margin above them.

## Rig

Part ids, with each part's `transform-origin` set in the SVG's own `<style>`:

`#shadow` `#figure` (everything that jumps) `#body` (squash and stretch from the feet) `#head` (neck pivot) `#ear-left` `#ear-right` (ear bases) `#eyes` (eye line, for blinks) `#mouth` (top centre of the mouth, so singing opens it downward) `#arm-left` `#arm-right` (shoulders) `#foot-left` `#foot-right` (heels, so the toes tap) `#tail` (base) `#neckwear` (the part that swings or wiggles: Fable's scarf end, Noir's and Pulse's bow ties; Major has none).

A missing part just stays still. Mascot-specific motion goes in the SVG's `<style>` as `.mascot.<key>.anim-<name> …`.

## Music animations

The tempo is 100 bpm, so one beat is 0.6 s and a bar of 4/4 is 2.4 s. These are shared, in `src/mascots/mascot.css`:

| anim | what it does |
|---|---|
| `beat` | Keep time: the head bobs on each beat, the body squashes, the right toes tap, the ears bounce slightly late, the tail and neckwear move on the beat, and notes rise. One bar. |
| `sing` | The mouth opens and closes on each half beat and the head lifts and tilts, with notes. One bar. |
| `conduct` | The right arm beats a 4/4 pattern (down, in, out, up) and the head nods on each beat. One bar, plus a lift to start. |
| `pitch-up` / `pitch-down` | The whole figure rises and stretches, with the head lifting and ears up, or sinks with the head and ears down. For "higher" and "lower" in interval and melody drills. |
| `metronome` | The figure sways from the feet like a pendulum, one tick per beat. One bar. |

Each mascot picks the music actions that suit its role and may add its own. Fable (the guide) conducts. Noir (the listener) nods calmly on the beat without tapping a foot, and turns an ear toward a sound. Major (the keeper) drums the beat on the book. Pulse (the time keeper) keeps time, metronomes and drums.
