// Chord and scale shapes on the neck, for the Guitar path's "Chords from the Pattern" and
// "Scales from the Pattern" sections. Each shape is a list of notes, placed by string and
// by fret relative to an anchor fret, each with its scale degree. Questions pick an anchor
// fret, draw the shape, and ask about one note (fret_shape_tone) or ask the learner to tap
// a missing one (fret_shape_find).
//
// Every shape here is built from the neck's pattern (docs/guitar-teaching.md): same fret
// one string up is a 4th, two strings up and two frets up is the octave, and anything that
// crosses from the G string to the B string sits a fret further along.
// src/notation/questions.test.ts checks every note's degree against its pitch.

import { crossesGB, fretMidi, type FretPos, type NeckId } from './theory';

export type Degree = 'R' | '2' | 'b3' | '3' | '4' | '5' | '6' | 'b7' | '7';

export const DEGREES: Degree[] = ['R', '2', 'b3', '3', '4', '5', '6', 'b7', '7'];
export const DEGREE_SEMIS: Record<Degree, number> = { R: 0, '2': 2, b3: 3, '3': 4, '4': 5, '5': 7, '6': 9, b7: 10, '7': 11 };
/** How a degree is written on a dot or a button. */
export const DEGREE_LABEL: Record<Degree, string> = { R: 'R', '2': '2', b3: '♭3', '3': '3', '4': '4', '5': '5', '6': '6', b7: '♭7', '7': '7' };
/** How a degree is said in a sentence. */
export const DEGREE_WORDS: Record<Degree, string> = {
  R: 'root', '2': '2nd', b3: 'minor 3rd', '3': 'major 3rd', '4': '4th', '5': '5th', '6': '6th', b7: '♭7', '7': 'major 7th',
};

export interface ShapeNote {
  s: number;
  df: number; // frets from the anchor
  deg: Degree;
}

export interface Shape {
  id: string;
  /** For item labels: "the major chord from the low E string". */
  name: string;
  kind: 'chord' | 'scale';
  neck?: NeckId; // omitted = guitar
  /** One sentence: how the shape is built from the pattern. Shown with every answer. */
  rule: string;
  notes: ShapeNote[];
}

const n = (s: number, df: number, deg: Degree): ShapeNote => ({ s, df, deg });

const MAJ_E: ShapeNote[] = [n(0, 0, 'R'), n(1, 2, '5'), n(2, 2, 'R'), n(3, 1, '3'), n(4, 0, '5'), n(5, 0, 'R')];
const MAJ_A: ShapeNote[] = [n(1, 0, 'R'), n(2, 2, '5'), n(3, 2, 'R'), n(4, 2, '3'), n(5, 0, '5')];

// The minor pentatonic, two notes a string. From the low E string: at the root's fret the
// strings walk up in 4ths (R, 4, ♭7, ♭3), and two frets up gives a whole step above each.
const PMIN_E: ShapeNote[] = [
  n(0, 0, 'R'), n(0, 3, 'b3'),
  n(1, 0, '4'), n(1, 2, '5'),
  n(2, 0, 'b7'), n(2, 2, 'R'),
  n(3, 0, 'b3'), n(3, 2, '4'),
  n(4, 0, '5'), n(4, 3, 'b7'),
  n(5, 0, 'R'), n(5, 3, 'b3'),
];
const PMIN_A: ShapeNote[] = [
  n(0, 0, '5'), n(0, 3, 'b7'),
  n(1, 0, 'R'), n(1, 3, 'b3'),
  n(2, 0, '4'), n(2, 2, '5'),
  n(3, 0, 'b7'), n(3, 2, 'R'),
  n(4, 1, 'b3'), n(4, 3, '4'),
  n(5, 0, '5'), n(5, 3, 'b7'),
];
// The same five notes, read from the minor's ♭3: the relative major pentatonic.
const AS_MAJOR: Record<Degree, Degree> = { R: '6', b3: 'R', '4': '2', '5': '3', b7: '5', '2': '2', '3': '3', '6': '6', '7': '7' };

// The major scale, three notes a string. Three notes cover a 4th, the gap to the next
// string, so the next string starts at the same fret, except one fret up after the
// tritone (4 to 7) and across the bend.
const MAJ3_E: ShapeNote[] = [
  n(0, 0, 'R'), n(0, 2, '2'), n(0, 4, '3'),
  n(1, 0, '4'), n(1, 2, '5'), n(1, 4, '6'),
  n(2, 1, '7'), n(2, 2, 'R'), n(2, 4, '2'),
  n(3, 1, '3'), n(3, 2, '4'), n(3, 4, '5'),
  n(4, 2, '6'), n(4, 4, '7'), n(4, 5, 'R'),
  n(5, 2, '2'), n(5, 4, '3'), n(5, 5, '4'),
];
const MAJ3_A: ShapeNote[] = [
  n(1, 0, 'R'), n(1, 2, '2'), n(1, 4, '3'),
  n(2, 0, '4'), n(2, 2, '5'), n(2, 4, '6'),
  n(3, 1, '7'), n(3, 2, 'R'), n(3, 4, '2'),
  n(4, 2, '3'), n(4, 3, '4'), n(4, 5, '5'),
  n(5, 2, '6'), n(5, 4, '7'), n(5, 5, 'R'),
];

const third = (notes: ShapeNote[], df: number) => notes.map((x) => (x.deg === '3' ? { ...x, deg: 'b3' as Degree, df: x.df + df } : x));

// Bass. The bass is tuned in 4ths all the way (E A D G), so every shape is the same on
// every pair of strings: no bend. The A-string versions are the E-string ones moved up a string.
const up = (notes: ShapeNote[]) => notes.map((x) => ({ ...x, s: x.s + 1 }));
const B_R5O: ShapeNote[] = [n(0, 0, 'R'), n(1, 2, '5'), n(2, 2, 'R')];
const B_MAJ: ShapeNote[] = [n(0, 0, 'R'), n(1, -1, '3'), n(1, 2, '5'), n(2, 2, 'R')];
const B_MIN: ShapeNote[] = [n(0, 0, 'R'), n(0, 3, 'b3'), n(1, 2, '5'), n(2, 2, 'R')];
const B_DOM7: ShapeNote[] = [n(0, 0, 'R'), n(1, -1, '3'), n(1, 2, '5'), n(2, 0, 'b7'), n(2, 2, 'R')];
const B_MIN7: ShapeNote[] = [n(0, 0, 'R'), n(0, 3, 'b3'), n(1, 2, '5'), n(2, 0, 'b7'), n(2, 2, 'R')];

const bass = (id: string, name: string, rule: string, notes: ShapeNote[]): Shape => ({ id, name, kind: 'chord', neck: 'bass', rule, notes });
const BASS_SHAPES: Shape[] = [
  bass('b_r5o_e', 'root, 5th and octave from the bass E string', 'The 5th is one string up and two frets up; the octave two strings up and two frets up. On the bass it works from any string.', B_R5O),
  bass('b_r5o_a', 'root, 5th and octave from the bass A string', 'The same shape one string up, and the 5th below the root sits one string down at the same fret.', [n(0, 0, '5'), ...up(B_R5O)]),
  bass('b_maj_e', 'the major arpeggio from the bass E string', 'Root, then the major 3rd one string up and one fret back, the 5th one string up and two frets up, the octave two strings up and two frets up.', B_MAJ),
  bass('b_min_e', 'the minor arpeggio from the bass E string', 'Root, the minor 3rd three frets up the same string, the 5th one string up and two frets up, the octave two strings up and two frets up.', B_MIN),
  bass('b_maj_a', 'the major arpeggio from the bass A string', 'The E-string shape moved one string up. No bend on the bass, so nothing changes.', up(B_MAJ)),
  bass('b_min_a', 'the minor arpeggio from the bass A string', 'The E-string shape moved one string up. No bend on the bass, so nothing changes.', up(B_MIN)),
  bass('b_dom7_e', 'the dominant 7th arpeggio from the bass E string', 'The major arpeggio plus the ♭7: two strings up at the root\'s fret, a whole step below the octave.', B_DOM7),
  bass('b_min7_e', 'the minor 7th arpeggio from the bass E string', 'The minor arpeggio plus the ♭7: two strings up at the root\'s fret, a whole step below the octave.', B_MIN7),
  bass('b_dom7_a', 'the dominant 7th arpeggio from the bass A string', 'The E-string shape moved one string up.', up(B_DOM7)),
  bass('b_min7_a', 'the minor 7th arpeggio from the bass A string', 'The E-string shape moved one string up.', up(B_MIN7)),
];

export const SHAPES: Record<string, Shape> = {
  maj_e: {
    id: 'maj_e',
    name: 'the major chord from the low E string',
    kind: 'chord',
    rule: 'Root on the low E string; the 5th one string up and two frets up; the octave two strings up and two frets up; the major 3rd one string up from that octave and one fret back; the top two strings back at the root\'s fret.',
    notes: MAJ_E,
  },
  min_e: {
    id: 'min_e',
    name: 'the minor chord from the low E string',
    kind: 'chord',
    rule: 'The major shape with its 3rd one fret lower: one string up from the octave and two frets back, a minor 3rd.',
    notes: third(MAJ_E, -1),
  },
  maj_a: {
    id: 'maj_a',
    name: 'the major chord from the A string',
    kind: 'chord',
    rule: 'The same moves one string up: the 5th one string up and two frets up, the octave two strings up and two frets up. The 3rd lands on the B string, so the bend puts it at the octave\'s fret, not one back.',
    notes: MAJ_A,
  },
  min_a: {
    id: 'min_a',
    name: 'the minor chord from the A string',
    kind: 'chord',
    rule: 'The major shape with its 3rd one fret lower: on the B string, one fret back from the octave.',
    notes: third(MAJ_A, -1),
  },
  pmin_e: {
    id: 'pmin_e',
    name: 'the minor pentatonic from the low E string',
    kind: 'scale',
    rule: "At the root's fret the strings walk up in 4ths: R, 4, ♭7, ♭3. Two frets up from those is a whole step above each: 5, R, 4. The outer strings hold R and ♭3, and the B string, past the bend, holds 5 and ♭7.",
    notes: PMIN_E,
  },
  pmin_a: {
    id: 'pmin_a',
    name: 'the minor pentatonic from the A string',
    kind: 'scale',
    rule: 'The low-E box moved one string up. The notes that cross onto the B string move up a fret: the bend.',
    notes: PMIN_A,
  },
  pmaj_e: {
    id: 'pmaj_e',
    name: 'the major pentatonic, in the low-E minor box',
    kind: 'scale',
    rule: "The same box and the same five notes, heard from the minor's ♭3: that note is the major root. Minor R ♭3 4 5 ♭7 is major 6 R 2 3 5.",
    notes: PMIN_E.map((x) => ({ ...x, deg: AS_MAJOR[x.deg] })),
  },
  maj3_e: {
    id: 'maj3_e',
    name: 'the major scale from the low E string',
    kind: 'scale',
    rule: 'Three notes a string, and three notes span a 4th, the gap to the next string, so the next string starts at the same fret. It starts a fret up after the 4th-to-7th tritone, and again across the bend.',
    notes: MAJ3_E,
  },
  maj3_a: {
    id: 'maj3_a',
    name: 'the major scale from the A string',
    kind: 'scale',
    rule: 'Three notes a string, starting at the same fret on each new string, except a fret up after the 4th-to-7th tritone and a fret up across the bend.',
    notes: MAJ3_A,
  },
};

for (const b of BASS_SHAPES) SHAPES[b.id] = b;

/** The anchor frets at which the whole shape fits on frets 0–12. */
export function anchorFrets(shape: Shape, frets = 12): number[] {
  const max = Math.max(...shape.notes.map((x) => x.df));
  const min = Math.min(...shape.notes.map((x) => x.df));
  const out: number[] = [];
  for (let f = -min; f + max <= frets; f++) out.push(f);
  return out;
}

export const placeNote = (x: ShapeNote, anchor: number, neck: NeckId = 'guitar'): FretPos =>
  neck === 'bass' ? { s: x.s, f: anchor + x.df, n: 'bass' } : { s: x.s, f: anchor + x.df };

/** The lowest root of a shape. */
export function lowestRoot(shape: Shape): ShapeNote {
  return shape.notes.filter((x) => x.deg === 'R').sort((a, b) => a.s - b.s || a.df - b.df)[0];
}

const STRING_COUNT = ['', 'one string', 'two strings', 'three strings'];
const SEMI_NAME: Record<number, string> = {
  1: 'a half step', 2: 'a whole step', 3: 'a minor 3rd', 4: 'a major 3rd', 5: 'a 4th', 6: 'a tritone', 7: 'a 5th',
  8: 'a minor 6th', 9: 'a major 6th', 10: 'a minor 7th', 11: 'a major 7th', 12: 'an octave', 24: 'two octaves',
};

function move(from: FretPos, to: FretPos): string {
  const ds = to.s - from.s;
  const df = to.f - from.f;
  const along = df === 0 ? 'the same fret' : `${Math.abs(df)} fret${Math.abs(df) > 1 ? 's' : ''} ${df > 0 ? 'up' : 'back'}`;
  if (ds === 0) return `${along} on the same string`;
  return `${STRING_COUNT[Math.abs(ds)] ?? `${Math.abs(ds)} strings`} ${ds > 0 ? 'up' : 'down'}, ${along}`;
}

/**
 * One sentence on how to reach this note from another note in the shape, using the
 * pattern's moves. The simplest move wins: the octave of a root, a 4th to the next string
 * at the same fret, a step along the string, a 3rd from a root on the next string. Moves
 * across the G–B bend come last. `hidden` notes (a find question's answer) can't be used.
 */
export function noteReason(shape: Shape, target: ShapeNote, anchor: number, hidden: Degree | null = null): string {
  const at = placeNote(target, anchor, shape.neck);
  const midi = fretMidi(at);
  const known = shape.notes.filter((x) => x !== target && x.deg !== hidden).map((x) => ({ x, p: placeNote(x, anchor, shape.neck) }));
  const score = (k: { x: ShapeNote; p: FretPos }) => {
    const gap = midi - fretMidi(k.p);
    const ds = Math.abs(at.s - k.p.s);
    const bend = ds > 0 && crossesGB(k.p.s, at.s, shape.neck);
    const isRoot = k.x.deg === 'R';
    let base = 9;
    if (target.deg === 'R' && isRoot && ds === 2 && Math.abs(gap) === 12) base = bend ? 0.8 : 0;
    else if (ds === 1 && Math.abs(gap) === 5) base = bend ? 4 : isRoot ? 0.5 : 1;
    else if (ds === 0 && Math.abs(gap) <= 4) base = isRoot ? 0.5 : 2;
    else if (ds === 1 && isRoot && Math.abs(gap) < 12) base = bend ? 5 : 3;
    return base + Math.abs(gap) / 100 + (gap < 0 ? 0.001 : 0);
  };
  const ref = [...known].sort((a, b) => score(a) - score(b))[0];
  if (!ref) return `It's the ${DEGREE_WORDS[target.deg]}.`;

  const g = midi - fretMidi(ref.p);
  const size = SEMI_NAME[Math.abs(g)] ?? `${Math.abs(g)} half steps`;
  const crossing = ref.p.s !== at.s && crossesGB(ref.p.s, at.s, shape.neck);
  const bend = !crossing ? '' : at.s > ref.p.s ? ' (past the bend, a fret further up than elsewhere)' : ' (back across the bend, a fret further back than elsewhere)';
  const refName = ref.x.deg === 'R' ? 'the root' : `the ${DEGREE_LABEL[ref.x.deg]}`;
  return `${cap(move(ref.p, at))} from ${refName}${bend}: ${size} ${g >= 0 ? 'above' : 'below'}, so it's the ${DEGREE_WORDS[target.deg]}.`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
