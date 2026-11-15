// The Guitar path: from the open strings to reading standard notation on the neck.
//
// Pattern first. The strings are tuned in 4ths, so the neck is a grid: same fret, one
// string up is a 4th; one string down is the 5th. Octaves are built from that (two 4ths
// and a step), and so is every other shape. The one bend is between G and B, a 3rd apart,
// where shapes move a fret. Then the notes (landmarks, the E and A strings that hold
// barre-chord roots, then the rest), interval shapes, chords and scales built from the
// pattern (barre chords, the pentatonic, the major scale three notes a string), triad
// shapes, and reading treble clef onto the neck. Bass is a section of its own: the same
// ideas on a four-string neck with no bend. docs/guitar-teaching.md has the reasoning.
//
// Lesson ids are permanent (progress is stored by id). See AGENTS.md.

import type { CurriculumLevel, CurriculumSegment, IntervalType } from './types';
import type { VisualKind } from './notation/prompt';
import { acrossTarget, groupByAnswer } from './notation/questions';
import { FRETS, isBlackPc, openMidi, posKey, type NeckId } from './notation/theory';
import { SHAPES, type Degree } from './notation/shapes';

type Lesson = Omit<CurriculumLevel, 'segmentId' | 'type' | 'unlockRequirement'> & { unlockRequirement?: number };

function lesson(segmentId: string, kind: VisualKind, l: Lesson): CurriculumLevel {
  return {
    unlockRequirement: 80,
    ...l,
    type: 'fretboard',
    visualKind: kind,
    segmentId,
    ...(kind === 'fret_note' || kind === 'fret_across' || kind === 'fret_shape_tone' ? { itemGroups: groupByAnswer(kind, l.items) } : {}),
  };
}

/** Fret positions on these strings, frets in [lo, hi], naturals only unless `black` is set. */
function positions(strings: number[], lo = 0, hi = FRETS, which: 'natural' | 'black' | 'all' = 'natural', neck: NeckId = 'guitar'): string[] {
  const out: string[] = [];
  for (const s of strings) for (let f = lo; f <= hi; f++) {
    const black = isBlackPc(openMidi(neck)[s] + f);
    if (which === 'all' || (which === 'black') === black) out.push(posKey(neck === 'bass' ? { s, f, n: 'bass' } : { s, f }));
  }
  return out;
}

/**
 * fret_across items: natural roots on these strings, frets [lo, hi], whose 4th up (p4) or
 * 5th down (p5) is natural too, so the answers stay on the seven note buttons.
 */
function across(strings: number[], rel: 'p4' | 'p5', lo: number, hi: number, neck: NeckId = 'guitar'): string[] {
  const out: string[] = [];
  const open = openMidi(neck);
  for (const s of strings) for (let f = lo; f <= hi; f++) {
    const root = neck === 'bass' ? { s, f, n: 'bass' as const } : { s, f };
    const t = acrossTarget(root, rel);
    if (t.s < 0 || t.s >= open.length || t.f < 0 || t.f > FRETS) continue;
    if (isBlackPc(open[s] + f) || isBlackPc(open[t.s] + t.f)) continue;
    out.push(`${posKey(root)}:${rel}`);
  }
  return out;
}

/** fret_shape_* items: these degrees, in each shape that has them. */
const shapeItems = (shapes: string[], degs: Degree[]) =>
  shapes.flatMap((id) => degs.filter((d) => SHAPES[id].notes.some((x) => x.deg === d)).map((d) => `${id}:${d}`));

const NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const findOn = (strings: number[], neck: NeckId = 'guitar') => strings.flatMap((s) => NATURALS.map((n) => `${neck === 'bass' ? 'b' : ''}${s}:${n}`));

const ALL_INTERVALS: IntervalType[] = [
  'minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd', 'perfect_4th', 'tritone',
  'perfect_5th', 'minor_6th', 'major_6th', 'minor_7th', 'major_7th', 'octave',
];

// ---------------------------------------------------------------------------

const start: CurriculumSegment = {
  id: 'gtr_start',
  pathId: 'guitar',
  name: 'Find Your Way',
  description: 'Open strings and the frets to navigate by',
  icon: '🎸',
  color: 'orange',
  levels: [
    lesson('gtr_start', 'fret_note', {
      id: 'gt_open_strings',
      name: 'The Open Strings',
      description: 'E A D G B E, low to high',
      items: positions([0, 1, 2, 3, 4, 5], 0, 0),
      maxQuestions: 10,
      intro: [
        {
          idea: 'Every note on the neck is counted from an open string, so start there: E A D G B E, low to high.',
          purpose: 'Eddie Ate Dynamite, Good Bye Eddie. The two Es are two octaves apart.',
          expectation: "The low E string is at the bottom of the neck, the way you see it while playing and the way tab is written. In the questions the names are hidden: name the open string.",
          mascot: 'pulse',
          figure: { neck: ['E', 'A', 'D', 'G', 'B', 'E'].map((label, s) => ({ s, f: 0, label })), focusFret: 0 },
        },
      ],
    }),
    lesson('gtr_start', 'fret_note', {
      id: 'gt_landmark_frets',
      name: 'Frets 5, 7 and 12',
      description: 'The dotted frets, and the G string\'s fret 4',
      // Fret 4 on the G string is in here too: it's that string's landmark, not fret 5.
      items: positions([0, 1, 2, 3, 4, 5], 5, 5).concat(positions([0, 1, 2, 3, 4, 5], 7, 7), positions([0, 1, 2, 3, 4, 5], 12, 12), [posKey({ s: 3, f: 4 })]),
      prerequisites: ['gt_open_strings'],
      intro: [
        {
          idea: 'Fret 12 is the open string an octave up. Fret 7 is a 5th above it.',
          purpose: 'On the low E string: fret 7 is B and fret 12 is E. The same holds on every string, and the dots on the neck mark both frets.',
          expectation: 'Three frets do most of the navigating. This is two of them.',
          mascot: 'pulse',
          figure: { neck: [{ s: 0, f: 7, label: 'B' }, { s: 0, f: 12, label: 'E' }, { s: 4, f: 7, label: 'F♯' }, { s: 4, f: 12, label: 'B' }], focusFret: 9 },
        },
        {
          idea: "Fret 5 is the next string's open note.",
          purpose: "Fret 5 on the low E string is A, the open A string. Fret 5 on A is D, and on D it's G. It's how guitarists tune.",
          expectation: 'From a landmark, the note you want is a fret or two away.',
          mascot: 'pulse',
          figure: { neck: [{ s: 0, f: 5, label: 'A' }, { s: 1, f: 0, label: 'A' }, { s: 1, f: 5, label: 'D' }, { s: 2, f: 0, label: 'D' }, { s: 2, f: 5, label: 'G' }, { s: 3, f: 0, label: 'G' }] },
        },
        {
          idea: 'Except on the G string: there it\'s fret 4. Fret 5 is C, not B.',
          purpose: 'The B string is tuned one fret lower than the pattern. So from the G string to the B string, everything shifts by a fret. Then the B string goes back to fret 5: fret 5 on B is E.',
          expectation: "Every shape that crosses from G to B shifts the same way, so get used to it now. Name the note at the dot.",
          mascot: 'pulse',
          figure: { neck: [{ s: 3, f: 4, label: 'B' }, { s: 3, f: 5, label: 'C' }, { s: 4, f: 0, label: 'B' }, { s: 4, f: 5, label: 'E' }, { s: 5, f: 0, label: 'E' }] },
        },
      ],
    }),
  ],
};

const notes: CurriculumSegment = {
  id: 'gtr_notes',
  pathId: 'guitar',
  name: 'Notes on the Neck',
  description: 'Every natural note, string by string',
  icon: '🎸',
  color: 'amber',
  levels: [
    lesson('gtr_notes', 'fret_note', {
      id: 'gt_low_e',
      name: 'Low E String',
      description: 'Naturals from open to fret 12',
      items: positions([0]),
      prerequisites: ['gt_landmark_frets'],
      intro: {
        idea: 'Naturals go up two frets at a time, except E to F and B to C, which are next door.',
        purpose: 'The low E string holds the root of every E-shape barre chord. Know it and you can play any major or minor chord on the neck.',
        expectation: 'Name the note at the dot.',
      },
    }),
    lesson('gtr_notes', 'fret_note', {
      id: 'gt_a_string',
      name: 'A String',
      description: 'Naturals from open to fret 12',
      items: positions([1]),
      prerequisites: ['gt_low_e'],
      intro: {
        idea: 'The A string is the root string for A-shape barre chords.',
        purpose: 'With the low E and A strings known, you can find any chord root on the neck.',
        expectation: 'Name the note at the dot.',
      },
    }),
    lesson('gtr_notes', 'fret_find', {
      id: 'gt_find_e_a',
      name: 'Find It: E and A Strings',
      description: 'A note name: tap it on the string',
      items: findOn([0, 1]),
      maxQuestions: 12,
      prerequisites: ['gt_a_string'],
      intro: {
        idea: 'Now the other way: a note name, and you find it.',
        purpose: "This is what playing actually asks for: 'play a G' means finding G fast, not naming a fret someone points at.",
        expectation: 'Tap the note on the string shown. Fret 0 and fret 12 both count for the open note.',
      },
    }),
    lesson('gtr_notes', 'fret_note', {
      id: 'gt_d_g',
      name: 'D and G Strings',
      description: 'The middle strings',
      items: positions([2, 3]),
      prerequisites: ['gt_find_e_a'],
    }),
    lesson('gtr_notes', 'fret_note', {
      id: 'gt_b_e',
      name: 'B and High E Strings',
      description: 'The top strings',
      items: positions([4, 5]),
      prerequisites: ['gt_d_g'],
      intro: {
        idea: 'The high E string has the same notes, at the same frets, as the low E string.',
        purpose: 'So you already know one of these two. The B string is the odd one: every other string is 5 half steps above the one below it, but B is only 4 above G.',
        expectation: 'Name the note at the dot.',
      },
    }),
    lesson('gtr_notes', 'fret_note', {
      id: 'gt_whole_neck',
      name: 'The Whole Neck',
      description: 'Every natural, every string, frets 0–12',
      items: positions([0, 1, 2, 3, 4, 5]),
      unlockRequirement: 75,
      prerequisites: ['gt_b_e'],
    }),
    lesson('gtr_notes', 'fret_find', {
      id: 'gt_find_any',
      name: 'Find It: Any String',
      description: 'A note and a string: tap it',
      items: findOn([0, 1, 2, 3, 4, 5]),
      maxQuestions: 12,
      prerequisites: ['gt_whole_neck'],
    }),
    lesson('gtr_notes', 'fret_note', {
      id: 'gt_sharps_flats',
      name: 'Sharps and Flats',
      description: 'The frets between the naturals',
      items: [...positions([0, 1, 2, 3, 4, 5], 0, 12, 'black'), ...positions([0, 1], 0, 12, 'natural')],
      unlockRequirement: 75,
      prerequisites: ['gt_whole_neck'],
      intro: {
        idea: 'The fret between two naturals has two names: a fret above G is G♯, a fret below A is A♭. Same fret.',
        purpose: 'Which name you use depends on the key. On the neck, it is one spot.',
        expectation: 'Name the note at the dot. Sharps and flats are one button each.',
      },
    }),
  ],
};

const pattern: CurriculumSegment = {
  id: 'gtr_pattern',
  pathId: 'guitar',
  name: "The Neck's Pattern",
  description: '4ths across, 5ths back, and the one bend',
  icon: '🧭',
  color: 'indigo',
  levels: [
    lesson('gtr_pattern', 'fret_across', {
      id: 'gt_pat_fourths',
      name: 'One String Up: the 4th',
      description: 'Same fret, next string up',
      items: across([0, 1, 2], 'p4', 0, 7),
      maxQuestions: 10,
      prerequisites: ['gt_landmark_frets'],
      intro: {
        idea: 'Same fret, one string up: a 4th up.',
        purpose: "You met it as 'fret 5 is the next open string'. It works at every fret, because neighbouring strings are a 4th apart. Here, at fret 3: G, then C, then F.",
        expectation: 'The root is named. Name the other note.',
        mascot: 'pulse',
        figure: { neck: [{ s: 0, f: 3, label: 'G' }, { s: 1, f: 3, label: 'C' }, { s: 2, f: 3, label: 'F' }] },
      },
    }),
    lesson('gtr_pattern', 'fret_across', {
      id: 'gt_pat_fifths',
      name: 'One String Down: the 5th',
      description: '4th up, 5th down: the same move reversed',
      items: [...across([0, 1, 2], 'p4', 0, 7), ...across([1, 2, 3], 'p5', 0, 7)],
      maxQuestions: 12,
      prerequisites: ['gt_pat_fourths'],
      intro: {
        idea: 'Same fret, one string down: the 5th, an octave lower.',
        purpose: "A 4th and a 5th add up to an octave, so going down a 4th lands on the same note name as going up a 5th. C on the A string has its 5th, G, right below it, and G has D below it.",
        expectation: 'Now both ways. The root is named; name the other note.',
        mascot: 'pulse',
        figure: { neck: [{ s: 1, f: 3, label: 'C' }, { s: 0, f: 3, label: 'G' }, { s: 2, f: 5, label: 'G' }, { s: 1, f: 5, label: 'D' }] },
      },
    }),
    lesson('gtr_pattern', 'fret_across', {
      id: 'gt_pat_shift',
      name: 'The Even Neck, and the Bend',
      description: 'Across G and B, the pattern moves a fret',
      items: [...across([2, 3, 4], 'p4', 0, 8), ...across([3, 4, 5], 'p5', 0, 8)],
      maxQuestions: 14,
      prerequisites: ['gt_pat_fifths'],
      intro: [
        {
          idea: 'Picture a guitar tuned in 4ths all the way up: E A D G C F.',
          purpose: 'On that even neck, every shape works on every pair of strings, anywhere. Some players tune exactly like that. Standard tuning lowers the top two strings a half step, to B and E, which makes open chords easier and puts the two E strings two octaves apart.',
          expectation: 'So think in the even pattern, and fix the one place it bends. Here is the even neck: across one fret, a 4th from each string to the next.',
          mascot: 'pulse',
          figure: {
            stringNames: ['E', 'A', 'D', 'G', 'C', 'F'],
            neck: [
              { s: 0, f: 3, label: 'G' }, { s: 1, f: 3, label: 'C' }, { s: 2, f: 3, label: 'F' },
              { s: 3, f: 3, label: 'B♭' }, { s: 4, f: 3, label: 'E♭' }, { s: 5, f: 3, label: 'A♭' },
            ],
          },
        },
        {
          idea: 'Walk across one fret and you go round the circle of 4ths. Past the G string, the walk moves up a fret.',
          purpose: 'G, C, F, B♭ at fret 3, then E♭ and A♭ at fret 4. Going the other way, from the B string down to G, step one fret back.',
          expectation: 'Roots around the G and B strings now. Name the other note.',
          mascot: 'pulse',
          figure: {
            neck: [
              { s: 0, f: 3, label: 'G' }, { s: 1, f: 3, label: 'C' }, { s: 2, f: 3, label: 'F' },
              { s: 3, f: 3, label: 'B♭' }, { s: 4, f: 4, label: 'E♭' }, { s: 5, f: 4, label: 'A♭' },
            ],
          },
        },
      ],
    }),
  ],
};

const octaves: CurriculumSegment = {
  id: 'gtr_octaves',
  pathId: 'guitar',
  name: 'Octave Shapes',
  description: 'Two 4ths and a step: the same note again',
  icon: '🎯',
  color: 'teal',
  levels: [
    lesson('gtr_octaves', 'fret_octave', {
      id: 'gt_octave_low',
      name: 'Octaves from E and A',
      description: 'Two strings up, two frets up',
      items: [0, 1].flatMap((s) => [0, 1, 3, 5, 7, 8, 10].map((f) => posKey({ s, f }))),
      maxQuestions: 10,
      prerequisites: ['gt_pat_shift'],
      intro: {
        idea: 'An octave is two 4ths and a whole step: two strings up, two frets up.',
        purpose: 'Two strings up is two 4ths, 10 half steps, two short of the octave. So add two frets. Octave shapes copy a note you know onto other strings, so the whole neck fills in from the notes you know.',
        expectation: 'Tap the same note an octave higher.',
        mascot: 'noir',
        figure: { neck: [{ s: 1, f: 0, label: 'A' }, { s: 3, f: 2, label: 'A' }, { s: 0, f: 5, label: 'A' }, { s: 2, f: 7, label: 'A' }] },
      },
    }),
    lesson('gtr_octaves', 'fret_octave', {
      id: 'gt_octave_mid',
      name: 'Octaves Across to B',
      description: 'From D and G: two strings up, three frets up',
      items: [2, 3].flatMap((s) => [0, 2, 3, 5, 7, 9].map((f) => posKey({ s, f }))),
      maxQuestions: 10,
      prerequisites: ['gt_octave_low'],
      intro: {
        idea: 'From the D or G string, the octave crosses the bend: two strings up, three frets up.',
        purpose: "It's the same rule as the G string's fret 4: whatever lands past the G string moves up a fret.",
        expectation: 'Tap the octave.',
        mascot: 'noir',
        figure: { neck: [{ s: 2, f: 0, label: 'D' }, { s: 4, f: 3, label: 'D' }, { s: 3, f: 4, label: 'B' }, { s: 5, f: 7, label: 'B' }] },
      },
    }),
  ],
};

const intervals: CurriculumSegment = {
  id: 'gtr_intervals',
  pathId: 'guitar',
  name: 'Interval Shapes',
  description: 'One shape per interval, from any root',
  icon: '📐',
  color: 'blue',
  levels: [
    lesson('gtr_intervals', 'fret_interval', {
      id: 'gt_int_power',
      name: '4th, 5th and Octave',
      description: 'The power-chord shapes',
      items: ['perfect_4th', 'perfect_5th', 'octave'],
      fretRootStrings: [0, 1],
      prerequisites: ['gt_octave_low'],
      intro: [
        {
          idea: 'You know the 4th: one string up, same fret. Two frets further is the 5th: one string up, two frets up.',
          purpose: "A 4th plus a whole step is a 5th, and a 5th plus a 4th is the octave. On guitar every interval is a shape like these, and it works from any root, in every key.",
          expectation: 'R marks the root. Name the interval to the other dot.',
          mascot: 'pulse',
        },
      ],
    }),
    lesson('gtr_intervals', 'fret_interval', {
      id: 'gt_int_thirds',
      name: 'Major and Minor 3rds',
      description: 'The shapes inside every chord',
      items: ['minor_3rd', 'major_3rd', 'perfect_5th', 'octave'],
      fretRootStrings: [0, 1],
      prerequisites: ['gt_int_power'],
      intro: {
        idea: 'A major 3rd is one string up and one fret back. A minor 3rd is one string up, two frets back.',
        purpose: 'Every chord is built on a 3rd. Seeing major and minor 3rds as shapes is how guitarists find chord tones while soloing.',
        expectation: 'Name the interval from the root.',
      },
    }),
    lesson('gtr_intervals', 'fret_interval_find', {
      id: 'gt_int_find_thirds',
      name: 'Find the 3rd',
      description: 'Tap the major or minor 3rd above a root',
      items: ['minor_3rd', 'major_3rd'],
      fretRootStrings: [0, 1],
      maxQuestions: 10,
      prerequisites: ['gt_int_thirds'],
    }),
    lesson('gtr_intervals', 'fret_interval', {
      id: 'gt_int_scale',
      name: 'The Major Scale Intervals',
      description: 'M2, M3, P4, P5, M6, M7, P8',
      items: ['major_2nd', 'major_3rd', 'perfect_4th', 'perfect_5th', 'major_6th', 'major_7th', 'octave'],
      fretRootStrings: [0, 1],
      prerequisites: ['gt_int_thirds'],
    }),
    lesson('gtr_intervals', 'fret_interval', {
      id: 'gt_int_all',
      name: 'All Twelve',
      description: 'Every interval, root on the E or A string',
      items: ALL_INTERVALS,
      fretRootStrings: [0, 1],
      unlockRequirement: 75,
      prerequisites: ['gt_int_scale'],
    }),
    lesson('gtr_intervals', 'fret_interval', {
      id: 'gt_int_gb',
      name: 'Across the G and B Strings',
      description: 'The same intervals, one fret further',
      items: ['minor_3rd', 'major_3rd', 'perfect_4th', 'perfect_5th', 'major_6th', 'octave'],
      fretRootStrings: [2, 3],
      prerequisites: ['gt_int_scale', 'gt_octave_mid'],
      intro: {
        idea: 'Shapes that cross from the G string to the B string move up one fret.',
        purpose: 'Every other pair of strings is a 4th apart; G to B is a major 3rd. So a major 3rd from the G string is on the B string at the same fret, not one fret back.',
        expectation: 'Roots on the D and G strings. Name the interval.',
      },
    }),
    lesson('gtr_intervals', 'fret_interval_find', {
      id: 'gt_int_find_all',
      name: 'Find Any Interval',
      description: 'Any root, any interval: tap it',
      items: ALL_INTERVALS,
      fretRootStrings: [0, 1, 2, 3],
      maxQuestions: 12,
      unlockRequirement: 75,
      prerequisites: ['gt_int_all', 'gt_int_gb'],
    }),
  ],
};

// Chords and scales, each built from moves the learner already has. Shapes are in
// src/notation/shapes.ts.
const R = (s: number, f: number) => ({ s, f, label: 'R', root: true });

const chords: CurriculumSegment = {
  id: 'gtr_chords',
  pathId: 'guitar',
  name: 'Chords from the Pattern',
  description: 'Barre chords as 5ths, octaves and 3rds',
  icon: '🧱',
  color: 'yellow',
  levels: [
    lesson('gtr_chords', 'fret_shape_tone', {
      id: 'gt_chord_root6',
      name: 'The Major Chord from Low E',
      description: 'Root, 5th, octave, 3rd: moves you know',
      items: shapeItems(['maj_e'], ['R', '3', '5']),
      maxQuestions: 10,
      prerequisites: ['gt_int_thirds'],
      intro: [
        {
          idea: 'A major chord is three moves you already know, made from one root.',
          purpose: "The 5th: one string up, two frets up. The octave: two strings up, two frets up. The major 3rd: one string up from that octave, one fret back. Past the bend, the top two strings sit back at the root's fret: the 5th and the root again.",
          expectation: 'R marks the lowest root. Name the marked dot: root, 3rd or 5th.',
          mascot: 'major',
          figure: { neck: [R(0, 3), { s: 1, f: 5, label: '5' }, R(2, 5), { s: 3, f: 4, label: '3' }, { s: 4, f: 3, label: '5' }, R(5, 3)] },
        },
      ],
    }),
    lesson('gtr_chords', 'fret_shape_tone', {
      id: 'gt_chord_root5',
      name: 'The Major Chord from A',
      description: 'The same moves, one string up',
      items: shapeItems(['maj_a'], ['R', '3', '5']),
      maxQuestions: 10,
      prerequisites: ['gt_chord_root6'],
      intro: {
        idea: 'Move the root to the A string and the same moves build the chord.',
        purpose: "The 5th and the octave are where they were. The 3rd now crosses onto the B string, so the bend pushes it up a fret: same fret as the octave, not one back. On top, a minor 3rd above it, is the 5th.",
        expectation: 'Name the marked dot.',
        mascot: 'major',
        figure: { neck: [R(1, 3), { s: 2, f: 5, label: '5' }, R(3, 5), { s: 4, f: 5, label: '3' }, { s: 5, f: 3, label: '5' }] },
      },
    }),
    lesson('gtr_chords', 'fret_shape_tone', {
      id: 'gt_chord_minor',
      name: 'Minor: Lower the 3rd',
      description: 'Four shapes; the 3rd tells them apart',
      items: shapeItems(['maj_e', 'min_e', 'maj_a', 'min_a'], ['R', 'b3', '3', '5']),
      maxQuestions: 12,
      prerequisites: ['gt_chord_root5'],
      intro: {
        idea: 'A minor chord is the major chord with its 3rd one fret lower.',
        purpose: 'From the octave: one string up and two frets back is a minor 3rd, one fret back is a major 3rd. Root and 5ths stay put. On the A-string shape the 3rd is on the B string, a fret further along, as before.',
        expectation: 'Major and minor shapes now. Measure the 3rd from the root or octave next to it.',
        mascot: 'major',
        figure: { neck: [R(0, 5), { s: 1, f: 7, label: '5' }, R(2, 7), { s: 3, f: 5, label: '♭3' }, { s: 4, f: 5, label: '5' }, R(5, 5)] },
      },
    }),
    lesson('gtr_chords', 'fret_shape_find', {
      id: 'gt_chord_finish',
      name: 'Finish the Chord',
      description: 'One note is missing: tap it',
      items: ['maj_e:3', 'min_e:b3', 'maj_a:3', 'min_a:b3', 'maj_e:5', 'min_a:5', 'maj_a:R', 'min_e:R'],
      maxQuestions: 10,
      prerequisites: ['gt_chord_minor'],
      intro: {
        idea: 'Now build it: the chord is drawn with one note missing.',
        purpose: 'Find it from a note that is there, with a move you know: one string up and one fret back from the octave for a major 3rd, two strings up and two frets up for the octave.',
        expectation: 'Tap the missing note. Any spot in the shape with that note counts.',
        mascot: 'major',
      },
    }),
  ],
};

const scales: CurriculumSegment = {
  id: 'gtr_scales',
  pathId: 'guitar',
  name: 'Scales from the Pattern',
  description: 'The pentatonic and the major scale, built from 4ths',
  icon: '🪜',
  color: 'sky',
  levels: [
    lesson('gtr_scales', 'fret_shape_tone', {
      id: 'gt_pent_minor',
      name: 'The Minor Pentatonic',
      description: 'A column of 4ths, and a step above each',
      items: shapeItems(['pmin_e'], ['R', 'b3', '4', '5', 'b7']),
      maxQuestions: 12,
      prerequisites: ['gt_chord_minor'],
      intro: [
        {
          idea: 'The open strings are already a scale: E A D G B, the E minor pentatonic.',
          purpose: "Its five notes are a chain of 4ths (B E A D G), and the strings are tuned in 4ths. That's why the pentatonic sits so easily on the guitar.",
          expectation: 'So a pentatonic box is the neck\'s own pattern, moved to any root.',
          mascot: 'pulse',
          figure: { neck: [R(0, 0), { s: 1, f: 0, label: '4' }, { s: 2, f: 0, label: '♭7' }, { s: 3, f: 0, label: '♭3' }, { s: 4, f: 0, label: '5' }, R(5, 0)], focusFret: 0 },
        },
        {
          idea: "At the root's fret, walk up the strings in 4ths: R, 4, ♭7, ♭3.",
          purpose: 'Two frets up from those is a whole step above each: 5, R, 4. Both E strings add the ♭3, three frets above the root, and the B string, past the bend, holds the 5 and ♭7. That is the whole box.',
          expectation: 'R marks the lowest root. Name the marked dot.',
          mascot: 'pulse',
          figure: {
            neck: [
              R(0, 5), { s: 0, f: 8, label: '♭3' }, { s: 1, f: 5, label: '4' }, { s: 1, f: 7, label: '5' },
              { s: 2, f: 5, label: '♭7' }, R(2, 7), { s: 3, f: 5, label: '♭3' }, { s: 3, f: 7, label: '4' },
              { s: 4, f: 5, label: '5' }, { s: 4, f: 8, label: '♭7' }, R(5, 5), { s: 5, f: 8, label: '♭3' },
            ],
          },
        },
      ],
    }),
    lesson('gtr_scales', 'fret_shape_tone', {
      id: 'gt_pent_minor_a',
      name: 'The Pentatonic from A',
      description: 'The same box, one string up',
      items: shapeItems(['pmin_a'], ['R', 'b3', '4', '5', 'b7']),
      maxQuestions: 12,
      prerequisites: ['gt_pent_minor'],
      intro: {
        idea: 'Move the box one string up and the root lands on the A string.',
        purpose: 'R and ♭3, then 4 and 5, then ♭7 and R, string by string, as before. The notes that land on the B string move up a fret: the bend again. The low E string holds the 5 and ♭7 below the root.',
        expectation: 'Name the marked dot.',
        mascot: 'pulse',
        figure: {
          neck: [
            { s: 0, f: 5, label: '5' }, { s: 0, f: 8, label: '♭7' }, R(1, 5), { s: 1, f: 8, label: '♭3' },
            { s: 2, f: 5, label: '4' }, { s: 2, f: 7, label: '5' }, { s: 3, f: 5, label: '♭7' }, R(3, 7),
            { s: 4, f: 6, label: '♭3' }, { s: 4, f: 8, label: '4' }, { s: 5, f: 5, label: '5' }, { s: 5, f: 8, label: '♭7' },
          ],
        },
      },
    }),
    lesson('gtr_scales', 'fret_shape_find', {
      id: 'gt_pent_find',
      name: 'Fill the Box',
      description: 'One scale note is missing: tap it',
      items: shapeItems(['pmin_e', 'pmin_a'], ['R', 'b3', '4', '5', 'b7']),
      maxQuestions: 12,
      prerequisites: ['gt_pent_minor_a'],
      intro: {
        idea: 'The box with one note taken out. Put it back.',
        purpose: 'Reach it from a note that is there: same fret one string down is a 4th below it, two frets back on its own string is a whole step below.',
        expectation: 'Tap the missing note. Any spot in the box with that note counts.',
        mascot: 'pulse',
      },
    }),
    lesson('gtr_scales', 'fret_shape_tone', {
      id: 'gt_pent_major',
      name: 'Same Box, Major Pentatonic',
      description: "The minor's ♭3 is the major's root",
      items: shapeItems(['pmaj_e'], ['R', '2', '3', '5', '6']),
      maxQuestions: 12,
      prerequisites: ['gt_pent_minor'],
      intro: {
        idea: "A minor pentatonic and C major pentatonic are the same five notes.",
        purpose: "Hear C as home instead of A and the box reads R 2 3 5 6. The minor's ♭3 is the major's root, so every minor box is also a major box, three frets up from its minor root.",
        expectation: 'R marks the major root now. Name the marked dot.',
        mascot: 'pulse',
        figure: {
          neck: [
            { s: 0, f: 5, label: '6' }, R(0, 8), { s: 1, f: 5, label: '2' }, { s: 1, f: 7, label: '3' },
            { s: 2, f: 5, label: '5' }, { s: 2, f: 7, label: '6' }, R(3, 5), { s: 3, f: 7, label: '2' },
            { s: 4, f: 5, label: '3' }, { s: 4, f: 8, label: '5' }, { s: 5, f: 5, label: '6' }, R(5, 8),
          ],
        },
      },
    }),
    lesson('gtr_scales', 'fret_shape_tone', {
      id: 'gt_major_3nps',
      name: 'The Major Scale, Three a String',
      description: 'Same fret on each new string, with two shifts',
      items: shapeItems(['maj3_e'], ['R', '2', '3', '4', '5', '6', '7']),
      maxQuestions: 14,
      prerequisites: ['gt_pent_major', 'gt_int_scale'],
      intro: [
        {
          idea: 'Play the major scale three notes to a string.',
          purpose: 'Three notes of the scale span a 4th, the same gap as the next string. So the next string starts at the same fret: R 2 3 on the low E string, 4 5 6 on the A string, at the same three frets.',
          expectation: 'One shape, repeated, if the neck were even.',
          mascot: 'pulse',
          figure: { neck: [R(0, 3), { s: 0, f: 5, label: '2' }, { s: 0, f: 7, label: '3' }, { s: 1, f: 3, label: '4' }, { s: 1, f: 5, label: '5' }, { s: 1, f: 7, label: '6' }] },
        },
        {
          idea: 'Two things push the next string up a fret: the tritone and the bend.',
          purpose: 'From the 4 up to the 7 is a tritone, a half step wider than a 4th, so the D string starts a fret up. The B string starts another fret up: the bend. So the strings pair up: low E and A share a shape, D and G share one, B and high E share one.',
          expectation: 'R marks the lowest root. Name the marked dot.',
          mascot: 'pulse',
          figure: {
            neck: [
              R(0, 3), { s: 0, f: 5, label: '2' }, { s: 0, f: 7, label: '3' },
              { s: 1, f: 3, label: '4' }, { s: 1, f: 5, label: '5' }, { s: 1, f: 7, label: '6' },
              { s: 2, f: 4, label: '7' }, R(2, 5), { s: 2, f: 7, label: '2' },
              { s: 3, f: 4, label: '3' }, { s: 3, f: 5, label: '4' }, { s: 3, f: 7, label: '5' },
              { s: 4, f: 5, label: '6' }, { s: 4, f: 7, label: '7' }, R(4, 8),
              { s: 5, f: 5, label: '2' }, { s: 5, f: 7, label: '3' }, { s: 5, f: 8, label: '4' },
            ],
          },
        },
      ],
    }),
    lesson('gtr_scales', 'fret_shape_tone', {
      id: 'gt_major_3nps_a',
      name: 'The Major Scale from A',
      description: 'The same rule, one string up',
      items: shapeItems(['maj3_a'], ['R', '2', '3', '4', '5', '6', '7']),
      maxQuestions: 14,
      prerequisites: ['gt_major_3nps'],
      intro: {
        idea: 'Start the scale on the A string and the rule holds.',
        purpose: 'The D string starts at the same fret. The G string starts a fret up, after the tritone. The B string starts another fret up, across the bend. The high E string starts where the B string did.',
        expectation: 'Name the marked dot.',
        mascot: 'pulse',
      },
    }),
    lesson('gtr_scales', 'fret_shape_find', {
      id: 'gt_major_find',
      name: 'Fill the Scale',
      description: 'One scale note is missing: tap it',
      items: shapeItems(['maj3_e', 'maj3_a'], ['R', '2', '3', '4', '5', '6', '7']),
      maxQuestions: 12,
      unlockRequirement: 75,
      prerequisites: ['gt_major_3nps_a'],
      intro: {
        idea: 'The three-a-string scale with one note taken out. Put it back.',
        purpose: 'Every note is a step from its neighbour on the string, and a 4th from the note at the same fret one string down, a fret along where the shape shifts.',
        expectation: 'Tap the missing note. Any spot in the shape with that note counts.',
        mascot: 'pulse',
      },
    }),
  ],
};

// Bass: the same neck, tuned in 4ths all the way (E A D G), an octave below the guitar's
// lowest four strings. Its first lesson needs nothing before it, so a bass player can start
// here. Positions on the bass are 'b0f3' (src/notation/theory.ts).
const B = (s: number, f: number, label: string, root = false) => ({ s, f, label, root });

const bassSeg: CurriculumSegment = {
  id: 'gtr_bass',
  pathId: 'guitar',
  name: 'Bass',
  description: 'The even neck: four strings, all 4ths, no bend',
  icon: '🎚️',
  color: 'teal',
  levels: [
    lesson('gtr_bass', 'fret_note', {
      id: 'gt_bass_strings',
      name: 'The Bass Neck',
      description: 'E A D G, and frets 5, 7 and 12',
      items: [...positions([0, 1, 2, 3], 0, 0, 'all', 'bass'), ...positions([0, 1, 2], 5, 5, 'all', 'bass'), ...positions([0, 1, 2, 3], 7, 7, 'natural', 'bass'), ...positions([0, 1, 2, 3], 12, 12, 'all', 'bass')],
      neck: 'bass',
      maxQuestions: 12,
      intro: [
        {
          idea: "The bass has four strings, E A D G: the guitar's lowest four, an octave lower.",
          purpose: 'Every string is a 4th above the one below it, all the way up. That is the "even neck" guitarists only imagine: no bend, so every shape works on every pair of strings.',
          expectation: "Fret 5 is the next string's open note, on every string. Fret 12 is the octave, fret 7 the 5th. In the questions the string names are hidden.",
          mascot: 'pulse',
          figure: { bass: true, neck: [B(0, 0, 'E'), B(1, 0, 'A'), B(2, 0, 'D'), B(3, 0, 'G'), B(0, 5, 'A'), B(1, 5, 'D'), B(2, 5, 'G')] },
        },
      ],
    }),
    lesson('gtr_bass', 'fret_across', {
      id: 'gt_bass_pattern',
      name: '4ths Up, 5ths Down',
      description: 'Same fret, next string: no exceptions',
      items: [...across([0, 1, 2], 'p4', 0, 9, 'bass'), ...across([1, 2, 3], 'p5', 0, 9, 'bass')],
      neck: 'bass',
      maxQuestions: 12,
      prerequisites: ['gt_bass_strings'],
      intro: {
        idea: 'Same fret, one string up: a 4th up. One string down: the 5th, an octave lower.',
        purpose: 'Bass lines live on this move: root to 5th, root to 4th. On the bass it never bends, so learn it once.',
        expectation: 'The root is named. Name the other note.',
        mascot: 'pulse',
        figure: { bass: true, neck: [B(1, 3, 'C'), B(2, 3, 'F'), B(0, 3, 'G')] },
      },
    }),
    lesson('gtr_bass', 'fret_octave', {
      id: 'gt_bass_octaves',
      name: 'Bass Octaves',
      description: 'Two strings up, two frets up',
      items: [0, 1].flatMap((s) => [0, 1, 3, 5, 7, 8, 10].map((f) => posKey({ s, f, n: 'bass' }))),
      neck: 'bass',
      maxQuestions: 10,
      prerequisites: ['gt_bass_pattern'],
      intro: {
        idea: 'Two strings up and two frets up is the octave, from either low string.',
        purpose: "Two 4ths is two half steps short of an octave, so add two frets. After the root, the octave is the bass player's most used note.",
        expectation: 'Tap the same note an octave higher.',
        mascot: 'noir',
        figure: { bass: true, neck: [B(0, 3, 'G', true), B(2, 5, 'G', true), B(1, 3, 'C'), B(3, 5, 'C')] },
      },
    }),
    lesson('gtr_bass', 'fret_note', {
      id: 'gt_bass_notes_low',
      name: 'Notes on E and A',
      description: 'Where bass roots live',
      items: positions([0, 1], 0, 12, 'natural', 'bass'),
      neck: 'bass',
      prerequisites: ['gt_bass_octaves'],
      intro: {
        idea: 'Most roots are played on the E and A strings.',
        purpose: 'Naturals are two frets apart, except E–F and B–C. Count from the open string, fret 5 or fret 12.',
        expectation: 'Name the note at the dot.',
      },
    }),
    lesson('gtr_bass', 'fret_find', {
      id: 'gt_bass_find',
      name: 'Find the Root',
      description: 'A note name: tap it on the E or A string',
      items: findOn([0, 1], 'bass'),
      neck: 'bass',
      maxQuestions: 12,
      prerequisites: ['gt_bass_notes_low'],
      intro: {
        idea: 'A chord chart says G: find G, fast.',
        purpose: 'Finding the root on the low strings is most of reading a chord chart on bass.',
        expectation: 'Tap the note on the string shown. Fret 0 and fret 12 both count for the open note.',
      },
    }),
    lesson('gtr_bass', 'fret_shape_tone', {
      id: 'gt_bass_r5o',
      name: 'Root, 5th, Octave',
      description: 'The shape under most bass lines',
      items: shapeItems(['b_r5o_e', 'b_r5o_a'], ['R', '5']),
      neck: 'bass',
      maxQuestions: 10,
      prerequisites: ['gt_bass_octaves'],
      intro: {
        idea: 'Root, the 5th one string up and two frets up, the octave two strings up and two frets up.',
        purpose: 'From the A string, the 5th is also one string down at the same fret: below the root. Those notes carry most bass lines in rock, pop and country.',
        expectation: 'R marks the lowest root. Name the marked dot.',
        mascot: 'noir',
        figure: { bass: true, neck: [B(1, 3, 'R', true), B(0, 3, '5'), B(2, 5, '5'), B(3, 5, 'R', true)] },
      },
    }),
    lesson('gtr_bass', 'fret_shape_tone', {
      id: 'gt_bass_triads',
      name: 'Major and Minor Arpeggios',
      description: 'Add the 3rd to root, 5th, octave',
      items: shapeItems(['b_maj_e', 'b_min_e', 'b_maj_a', 'b_min_a'], ['R', 'b3', '3', '5']),
      neck: 'bass',
      maxQuestions: 12,
      prerequisites: ['gt_bass_r5o'],
      intro: {
        idea: 'A major 3rd is one string up and one fret back. A minor 3rd is three frets up the same string.',
        purpose: 'Add either to root, 5th and octave and you have the arpeggio: the chord played one note at a time, which is what a bass line outlines.',
        expectation: 'Major and minor shapes. Name the marked dot.',
        mascot: 'noir',
        figure: { bass: true, neck: [B(0, 3, 'R', true), B(1, 2, '3'), B(1, 5, '5'), B(2, 5, 'R', true)] },
      },
    }),
    lesson('gtr_bass', 'fret_shape_tone', {
      id: 'gt_bass_sevenths',
      name: '7th-Chord Arpeggios',
      description: 'The ♭7: a whole step under the octave',
      items: shapeItems(['b_dom7_e', 'b_min7_e', 'b_dom7_a', 'b_min7_a'], ['R', 'b3', '3', '5', 'b7']),
      neck: 'bass',
      maxQuestions: 12,
      prerequisites: ['gt_bass_triads'],
      intro: {
        idea: "The ♭7 sits two strings up at the root's fret, a whole step under the octave.",
        purpose: 'Dominant 7th (G7) and minor 7th (Am7) chords are everywhere in blues, funk and jazz, and walking bass lines are built from these arpeggios.',
        expectation: 'Name the marked dot.',
        mascot: 'noir',
        figure: { bass: true, neck: [B(0, 3, 'R', true), B(1, 2, '3'), B(1, 5, '5'), B(2, 3, '♭7'), B(2, 5, 'R', true)] },
      },
    }),
    lesson('gtr_bass', 'fret_shape_find', {
      id: 'gt_bass_fill',
      name: 'Fill the Arpeggio',
      description: 'One chord tone is missing: tap it',
      items: shapeItems(['b_maj_e', 'b_min_a', 'b_dom7_e', 'b_min7_a', 'b_dom7_a'], ['3', 'b3', '5', 'b7']),
      neck: 'bass',
      maxQuestions: 10,
      prerequisites: ['gt_bass_sevenths'],
      intro: {
        idea: 'The arpeggio with one note taken out. Put it back.',
        purpose: 'Reach it from a note that is there: the 3rd from the root, the ♭7 from the octave.',
        expectation: 'Tap the missing note. Any spot near the shape with that note counts.',
      },
    }),
    lesson('gtr_bass', 'staff_to_fret', {
      id: 'gt_bass_read',
      name: 'Reading Bass Clef on the Bass',
      description: 'Written notes onto the four strings',
      items: ['E1', 'F1', 'G1', 'A1', 'B1', 'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'C3'],
      neck: 'bass',
      maxQuestions: 10,
      prerequisites: ['gt_bass_notes_low'],
      intro: {
        idea: 'Bass parts are written in bass clef, an octave higher than they sound.',
        purpose: 'It keeps the notes on the staff. The open E string is written on the ledger line below the bass staff.',
        expectation: 'Read the note, then tap it on the neck. Any spot with the right pitch counts.',
        mascot: 'noir',
      },
    }),
  ],
};

const triads: CurriculumSegment = {
  id: 'gtr_triads',
  pathId: 'guitar',
  name: 'Triad Shapes',
  description: 'Three-string chords, read by their shape',
  icon: '🧩',
  color: 'green',
  levels: [
    lesson('gtr_triads', 'fret_triad', {
      id: 'gt_triad_maj_min',
      name: 'Major or Minor Triad',
      description: 'Root position, on three neighbouring strings',
      items: ['major', 'minor'],
      fretRootStrings: [1, 2, 3],
      maxQuestions: 10,
      prerequisites: ['gt_int_thirds'],
      intro: {
        idea: 'A triad on three neighbouring strings: root, 3rd and 5th.',
        purpose: 'Spot the 3rd: four half steps above the root is major, three is minor. These small shapes are the building blocks of every chord voicing.',
        expectation: 'R marks the root. Major or minor?',
        mascot: 'major',
      },
    }),
    lesson('gtr_triads', 'fret_triad', {
      id: 'gt_triad_all',
      name: 'All Four Triads',
      description: 'Diminished and augmented too',
      items: ['major', 'minor', 'diminished', 'augmented'],
      fretRootStrings: [1, 2, 3],
      prerequisites: ['gt_triad_maj_min'],
    }),
    lesson('gtr_triads', 'fret_triad', {
      id: 'gt_triad_inversions',
      name: 'Inversion Shapes',
      description: 'The root moves; the quality stays',
      items: ['major', 'minor', 'diminished'],
      fretRootStrings: [1, 2, 3],
      inversions: true,
      prerequisites: ['gt_triad_all', 'gt_int_gb'],
      intro: {
        idea: 'Move the root to the top or the middle and the same chord makes a new shape.',
        purpose: "Three inversions on each string set is how guitarists play one chord all the way up the neck. Find the R, then measure the other two from it.",
        expectation: 'The root may be on any of the three strings. Name the quality.',
      },
    }),
  ],
};

const read: CurriculumSegment = {
  id: 'gtr_read',
  pathId: 'guitar',
  name: 'Read for Guitar',
  description: 'From the staff to the neck',
  icon: '📖',
  color: 'purple',
  levels: [
    lesson('gtr_read', 'staff_to_fret', {
      id: 'gt_read_low',
      name: 'Reading the Low Strings',
      description: 'E2 to F3: written notes on the E, A and D strings',
      items: ['E2', 'F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3'],
      maxQuestions: 10,
      prerequisites: ['gt_whole_neck'],
      intro: [
        {
          idea: 'Guitar music is written in treble clef, an octave higher than it sounds. The little 8 under the clef says so.',
          purpose: 'It keeps the guitar on one staff instead of a forest of ledger lines. The open low E is written below three ledger lines under the treble staff.',
          expectation: 'Read the note, then tap it on the neck. Any spot with the right pitch counts.',
          mascot: 'noir',
        },
      ],
    }),
    lesson('gtr_read', 'staff_to_fret', {
      id: 'gt_read_high',
      name: 'Reading the High Strings',
      description: 'G3 to G4: the G, B and high E strings',
      items: ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
      maxQuestions: 10,
      prerequisites: ['gt_read_low'],
    }),
    lesson('gtr_read', 'staff_to_fret', {
      id: 'gt_read_up_neck',
      name: 'Reading Up the Neck',
      description: 'A4 to E5: past fret 5 on the high E string',
      items: ['A4', 'B4', 'C5', 'D5', 'E5', 'G4', 'E4'],
      maxQuestions: 10,
      prerequisites: ['gt_read_high'],
    }),
  ],
};

export const GUITAR_SEGMENTS: CurriculumSegment[] = [start, pattern, octaves, notes, intervals, chords, scales, triads, read, bassSeg];

/** What "continue" walks through on the Guitar path. */
export const GUITAR_TEACHING_ORDER: string[] = [
  'gt_open_strings', 'gt_landmark_frets',
  'gt_pat_fourths', 'gt_pat_fifths', 'gt_pat_shift', 'gt_octave_low', 'gt_octave_mid', 'gt_int_power',
  'gt_low_e', 'gt_a_string', 'gt_find_e_a',
  'gt_d_g', 'gt_int_thirds', 'gt_b_e', 'gt_int_find_thirds',
  'gt_chord_root6', 'gt_chord_root5', 'gt_chord_minor', 'gt_chord_finish',
  'gt_whole_neck', 'gt_triad_maj_min',
  'gt_find_any', 'gt_pent_minor', 'gt_pent_minor_a', 'gt_pent_find', 'gt_pent_major',
  'gt_int_scale', 'gt_int_gb', 'gt_major_3nps', 'gt_major_3nps_a', 'gt_major_find', 'gt_triad_all',
  'gt_sharps_flats', 'gt_int_all', 'gt_int_find_all', 'gt_triad_inversions',
  'gt_read_low', 'gt_read_high', 'gt_read_up_neck',
  'gt_bass_strings', 'gt_bass_pattern', 'gt_bass_octaves', 'gt_bass_notes_low', 'gt_bass_find', 'gt_bass_r5o',
  'gt_bass_triads', 'gt_bass_sevenths', 'gt_bass_fill', 'gt_bass_read',
];
