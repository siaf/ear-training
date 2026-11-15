// Builds the questions for visual lessons (Read Music and Guitar paths).
//
// A lesson's `items` say what is being practised, and mastery and spaced review are kept
// per item, exactly as for the ear-training lessons. The item fixes the thing being tested
// (a note, an interval, a chord quality, a fret); everything else (which octave, where on
// the staff, which root) is picked at random so the learner reads it and doesn't memorise
// one picture.
//
// Item formats, by visual kind:
//   clef_sign          'alto'                     a clef id
//   staff_note / find  'treble:F#4'               clef:note
//   staff_compare      'treble>bass:C4'           shown clef > tap clef : note
//   shape_interval     'size_3'                   interval size, no clef
//   shape_triad        'root' | 'first' | 'second'
//   staff_interval     'major_3rd'                IntervalType
//   staff_triad        'minor'                    TriadType
//   chord_root         'D'                        root letter (chords from the key of C)
//   key_signature      'key_Bb'                   major key
//   note_in_key        'treble:F5@G'              clef:natural note @ major key
//   transpose          'bb_clarinet:D5'           instrument:written note
//   score_chord        'major'                    TriadType
//   fret_note          's0f3'                     string (0 = low E) and fret
//   fret_find          '1:C'                      string:pitch name
//   fret_across        's1f3:p4' | 's1f3:p5'      the root; p4 = the 4th, one string up;
//                                                  p5 = the 5th, one string down (an octave lower)
//   fret_octave        's0f3'                     the root
//   fret_interval(_find) 'major_3rd'              IntervalType
//   fret_triad         'major'                    TriadType
//   fret_shape_tone / _find 'pmin_e:b7'            shape id (src/notation/shapes.ts) : degree
//   staff_to_fret      'E3'                       sounding note, written in treble-8vb

import type { CurriculumLevel, IntervalType, ResponseMode, TriadType } from '../types';
import type { AccGlyph, FretMark, StaffNote, StaffSpec, VisualKind, VisualPrompt } from './prompt';
import { buildRhythmQuestion, rhythmLabel, valueAnswer } from '../rhythm/questions';
import { buildTheoryQuestion, stepAnswer, theoryLabel } from '../theory/questions';
import { buildHistoryQuestion, eraAnswer, eraOrder, historyLabel } from '../history/questions';
import { DEGREES, DEGREE_LABEL, DEGREE_WORDS, SHAPES, anchorFrets, lowestRoot, noteReason, placeNote, type Degree, type ShapeNote } from './shapes';
import {
  CLEFS,
  FRETS,
  INTERVAL_BY_ID,
  LETTERS,
  MAJOR_KEYS,
  OPEN_MIDI,
  SIZE_NAMES,
  STRING_NAMES,
  openMidi,
  stringCount,
  stringNames,
  type NeckId,
  TRANSPOSING,
  WHITE_KEY_TRIADS,
  asciiToGlyph,
  buildTriad,
  clefRefP,
  crossesGB,
  diatonic,
  fretMidi,
  fromDiatonic,
  invert,
  isLine,
  keyAccidental,
  midiOf,
  midiToTone,
  noteAscii,
  noteAtPosition,
  noteGlyph,
  parseNote,
  parsePos,
  pcKey,
  pcLabel,
  pcOfName,
  posKey,
  positionsOfMidi,
  signatureLetters,
  soundingPitch,
  staffPosition,
  stringGap,
  toneName,
  transpose,
  writtenPitch,
  type ClefId,
  type FretPos,
  type Note,
  type TransposingId,
} from './theory';

export type Rng = () => number;

export interface BuiltQuestion {
  correctAnswer: string;
  rootNote: string;
  visual: VisualPrompt;
  responseMode: ResponseMode;
}

const pick = <T,>(arr: readonly T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];
const randInt = (lo: number, hi: number, rng: Rng) => lo + Math.floor(rng() * (hi - lo + 1));
const mod = (n: number, m: number) => ((n % m) + m) % m;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ACC: Record<number, AccGlyph | undefined> = { [-2]: 'dflat', [-1]: 'flat', 0: undefined, 1: 'sharp', 2: 'dsharp' };
const staffNote = (n: Note, clef: ClefId, col = 0, extra: Partial<StaffNote> = {}): StaffNote => ({
  p: staffPosition(n, clef),
  acc: ACC[n.acc],
  col,
  ...extra,
});

function splitItem(item: string): [string, string] {
  const i = item.indexOf(':');
  return [item.slice(0, i), item.slice(i + 1)];
}

// ---------------------------------------------------------------------------
// Words for staff positions and reading hints.

const LINE_NAMES = ['bottom line', 'second line', 'middle line', 'fourth line', 'top line'];
const SPACE_NAMES = ['first space', 'second space', 'third space', 'top space'];
const COUNT = ['', 'one', 'two', 'three', 'four', 'five'];

export function positionPhrase(p: number): string {
  if (p >= 0 && p <= 8) return isLine(p) ? `the ${LINE_NAMES[p / 2]}` : `the ${SPACE_NAMES[(p - 1) / 2]}`;
  if (p < 0) {
    const ledgers = Math.floor(-p / 2);
    if (p === -1) return 'just below the staff';
    return isLine(p) ? `${COUNT[ledgers]} ledger line${ledgers > 1 ? 's' : ''} below` : `below ${COUNT[ledgers]} ledger line${ledgers > 1 ? 's' : ''}`;
  }
  const ledgers = Math.floor((p - 8) / 2);
  if (p === 9) return 'just above the staff';
  return isLine(p) ? `${COUNT[ledgers]} ledger line${ledgers > 1 ? 's' : ''} above` : `above ${COUNT[ledgers]} ledger line${ledgers > 1 ? 's' : ''}`;
}

const MNEMONIC: Partial<Record<ClefId, { lines: string; spaces: string }>> = {
  treble: { lines: 'Every Good Boy Does Fine', spaces: 'they spell FACE' },
  treble8vb: { lines: 'Every Good Boy Does Fine', spaces: 'they spell FACE' },
  bass: { lines: 'Good Boys Do Fine Always', spaces: 'All Cows Eat Grass' },
};

const lettersAt = (clef: ClefId, ps: number[]) => ps.map((p) => LETTERS[noteAtPosition(p, clef).letter]).join(' ');

function landmarkPhrase(clef: ClefId): string {
  const c = CLEFS[clef];
  if (c.sign === 'G') return `${noteGlyph(c.ref)}, the line the clef curls round`;
  if (c.sign === 'F') return `${noteGlyph(c.ref)}, the line between the clef's dots`;
  return 'middle C, the line the clef points at';
}

/** How to read the note at p: line/space letters for the clef, plus the nearest landmark. */
export function readingHint(clef: ClefId, p: number, acc = 0): string {
  const label = CLEFS[clef].label.replace(/ \(.*\)$/, '');
  const mn = MNEMONIC[clef];
  const parts: string[] = [];
  if (p >= 0 && p <= 8) {
    if (isLine(p)) parts.push(`Line note. ${label} clef lines, bottom to top: ${lettersAt(clef, [0, 2, 4, 6, 8])}${mn ? ` (${mn.lines})` : ''}.`);
    else parts.push(`Space note. ${label} clef spaces, bottom to top: ${lettersAt(clef, [1, 3, 5, 7])}${mn ? ` (${mn.spaces})` : ''}.`);
  } else {
    const edge = p < 0 ? 0 : 8;
    const step = p < 0 ? -1 : 1;
    const chain: string[] = [];
    for (let q = edge; q !== p + step; q += step) chain.push(LETTERS[noteAtPosition(q, clef).letter]);
    parts.push(`${p < 0 ? 'Below' : 'Above'} the staff: count ${p < 0 ? 'down' : 'up'} from the ${p < 0 ? 'bottom' : 'top'} line, one letter per line or space: ${chain.join(', ')}.`);
  }
  // Landmarks: the clef's own line and middle C.
  const marks = [{ p: clefRefP(clef), text: landmarkPhrase(clef) }];
  const midC = staffPosition(parseNote('C4'), clef);
  if (CLEFS[clef].sign !== 'C' && midC >= -6 && midC <= 14) marks.push({ p: midC, text: `middle C, ${positionPhrase(midC)}` });
  const near = marks.map((m) => ({ ...m, d: p - m.p })).sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
  if (near && near.d !== 0 && Math.abs(near.d) <= 3) {
    parts.push(`It's ${COUNT[Math.abs(near.d)]} step${Math.abs(near.d) > 1 ? 's' : ''} ${near.d > 0 ? 'above' : 'below'} ${near.text}.`);
  } else if (near && near.d === 0) {
    parts.push(`Landmark: ${near.text}.`);
  }
  if (acc) parts.push(`The ${acc > 0 ? 'sharp raises' : 'flat lowers'} it a half step.`);
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Answer keys and how they're shown. Lessons whose answer isn't the item itself (a note
// item answered with its letter, say) group their items under answer keys.

/** The answer chip a select-mode item is answered with. */
export function answerKey(kind: VisualKind, item: string): string {
  switch (kind) {
    case 'clef_sign':
      return CLEFS[item as ClefId].sign;
    case 'staff_note':
      return noteAscii(parseNote(splitItem(item)[1]), false);
    case 'note_in_key': {
      const [, rest] = splitItem(item);
      const [natural, key] = rest.split('@');
      const n = parseNote(natural);
      return noteAscii({ ...n, acc: keyAccidental(n.letter, MAJOR_KEYS[key]) }, false);
    }
    case 'transpose': {
      const [instr, written] = splitItem(item);
      return noteAscii(soundingPitch(parseNote(written), instr as TransposingId), false);
    }
    case 'fret_note':
      return pcKey(fretMidi(parsePos(item)));
    case 'fret_across': {
      const [root, rel] = item.split(':');
      return pcKey(fretMidi(parsePos(root)) + (rel === 'p4' ? 5 : -5));
    }
    case 'fret_shape_tone':
      return `deg_${item.split(':')[1]}`;
    case 'rhythm_value':
      return valueAnswer(item);
    case 'th_scale_step':
      return stepAnswer(item);
    case 'hx_era':
      return eraAnswer(item);
    default:
      return item;
  }
}

// Sort order for answer chips: notes in pitch order, then everything else as written.
function chipOrder(key: string): number {
  if (key.startsWith('deg_')) return 500 + DEGREES.indexOf(key.slice(4) as Degree);
  if (key.startsWith('beats_')) return 700 - Number(key.slice(6)) * 10; // longest first
  if (key.startsWith('era_')) return 900 + eraOrder(key);
  if (key === 'step_W') return 800;
  if (key === 'step_H') return 801;
  const m = /^(?:pc_)?([A-G])(bb|b|#|x)?$/.exec(key);
  if (!m) return 1000;
  const acc = { bb: -2, b: -1, '#': 1, x: 2 }[m[2] ?? ''] ?? 0;
  return LETTERS.indexOf(m[1] as (typeof LETTERS)[number]) * 10 + acc;
}

/** Groups items under the answer chip they're answered with, chips in a sensible order. */
export function groupByAnswer(kind: VisualKind, items: string[]): Record<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const key = answerKey(kind, item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Object.fromEntries([...groups.entries()].sort((a, b) => chipOrder(a[0]) - chipOrder(b[0])));
}

const CLEF_IDS = Object.keys(CLEFS);
const BASS_NAMES = stringNames('bass');

/** Display text for visual answers and items, or null if the string isn't one of ours. */
export function visualLabel(key: string): string | null {
  let m: RegExpExecArray | null;
  const rhythm = rhythmLabel(key) ?? theoryLabel(key) ?? historyLabel(key);
  if (rhythm) return rhythm;
  if (/^[A-G](bb|b|#|x)?$/.test(key)) return asciiToGlyph(key);
  if (/^[A-G](bb|b|#|x)?-?\d$/.test(key)) return noteGlyph(parseNote(key));
  if ((m = /^pc_(.+)$/.exec(key))) return pcLabel(pcOfName(m[1]));
  if ((m = /^key_(.+)$/.exec(key))) return `${asciiToGlyph(m[1])} major`;
  if ((m = /^size_(\d)$/.exec(key))) return cap(SIZE_NAMES[+m[1]]);
  if ((m = /^deg_(.+)$/.exec(key)) && m[1] in DEGREE_LABEL) return m[1] === 'R' ? 'Root' : DEGREE_LABEL[m[1] as Degree];
  if ((m = /^(\w+):(.+)$/.exec(key)) && SHAPES[m[1]] && m[2] in DEGREE_LABEL) {
    return `${m[2] === 'R' ? 'The root' : `The ${DEGREE_LABEL[m[2] as Degree]}`} in ${SHAPES[m[1]].name}`;
  }
  if (CLEF_IDS.includes(key)) return `${CLEFS[key as ClefId].label} clef`;
  if ((m = /^s(\d)f(\d+):p([45])$/.exec(key))) return `${m[3] === '4' ? '4th up' : '5th down'} from the ${STRING_NAMES[+m[1]]} string, ${+m[2] === 0 ? 'open' : `fret ${m[2]}`}`;
  if ((m = /^s(\d)f(\d+)$/.exec(key))) return `${cap(STRING_NAMES[+m[1]])} string, ${+m[2] === 0 ? 'open' : `fret ${m[2]}`}`;
  if ((m = /^(b?)(\d):([A-G](?:b|#)?)$/.exec(key))) return `${asciiToGlyph(m[3])} on the ${m[1] ? 'bass ' : ''}${stringNames(m[1] ? 'bass' : 'guitar')[+m[2]]} string`;
  if ((m = /^b(\d)f(\d+):p([45])$/.exec(key))) return `${m[3] === '4' ? '4th up' : '5th down'} from the bass ${BASS_NAMES[+m[1]]} string, ${+m[2] === 0 ? 'open' : `fret ${m[2]}`}`;
  if ((m = /^b(\d)f(\d+)$/.exec(key))) return `Bass ${BASS_NAMES[+m[1]]} string, ${+m[2] === 0 ? 'open' : `fret ${m[2]}`}`;
  if ((m = /^(\w+)>(\w+):(.+)$/.exec(key)) && CLEF_IDS.includes(m[1])) return `${noteGlyph(parseNote(m[3]))}, ${m[1]} → ${m[2]}`;
  if ((m = /^(\w+):([A-G](?:bb|b|#|x)?-?\d)@(.+)$/.exec(key))) return `${noteGlyph(parseNote(m[2]))} in ${asciiToGlyph(m[3])} major`;
  if ((m = /^(\w+):([A-G](?:bb|b|#|x)?-?\d)$/.exec(key))) {
    if (CLEF_IDS.includes(m[1])) return `${noteGlyph(parseNote(m[2]))} (${CLEFS[m[1] as ClefId].label.toLowerCase()})`;
    if (m[1] in TRANSPOSING) return `${TRANSPOSING[m[1] as TransposingId].short}, written ${noteGlyph(parseNote(m[2]))}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The builders.

const DEFAULT_PROMPT_CLEFS: ClefId[] = ['treble'];
const clefFor = (level: CurriculumLevel, rng: Rng): ClefId => pick(level.clefs ?? DEFAULT_PROMPT_CLEFS, rng);
const presentationFor = (level: CurriculumLevel, rng: Rng) =>
  level.intervalPresentation ?? (rng() < 0.5 ? 'harmonic' : 'melodic');

function staffQuestion(prompt: string, staves: StaffSpec[], explain: string, sound: string[], correctAnswer: string, extra: Partial<VisualPrompt> = {}): BuiltQuestion {
  return {
    correctAnswer,
    rootNote: sound[0]?.replace(/-?\d+$/, '') ?? 'C',
    visual: { prompt, staves, explain, sound, ...extra },
    responseMode: extra.tap ? (extra.tap.target === 'staff' ? 'tap_staff' : 'tap_fret') : 'select',
  };
}

function grandStaves(clef: ClefId, note: StaffNote[]): StaffSpec[] {
  return [
    { clef: 'treble', notes: clef === 'treble' ? note : [] },
    { clef: 'bass', notes: clef === 'bass' ? note : [] },
  ];
}

function buildClefSign(item: string): BuiltQuestion {
  const clef = item as ClefId;
  const c = CLEFS[clef];
  const refP = clefRefP(clef);
  const lineName = LINE_NAMES[refP / 2];
  const why =
    c.sign === 'G'
      ? `The G clef is a curly letter G. Its curl wraps the ${lineName}, and makes that line G${c.octaveBelow ? '. The 8 underneath drops everything an octave, so here it sounds G3' : ' (G4, the G above middle C)'}.`
      : c.sign === 'F'
      ? `The F clef is an old letter F. Its two dots sit either side of the ${lineName}, and make that line F (F3, the F below middle C).`
      : `The C clef points at middle C. Here it sits on the ${lineName}, so that line is middle C: this is the ${c.label.toLowerCase()} clef, used by ${c.usedBy}.`;
  return staffQuestion(
    'Which note does this clef mark?',
    [{ clef, notes: [] }],
    `${why} Every other line and space is counted from there.`,
    [toneName(c.ref)],
    c.sign,
    { reveal: { labelLine: { staff: 0, p: refP, text: noteGlyph(c.ref) }, staffNotes: [{ staff: 0, p: refP, col: 0 }] } },
  );
}

function buildStaffNote(level: CurriculumLevel, item: string): BuiltQuestion {
  const [clefS, noteS] = splitItem(item);
  const clef = clefS as ClefId;
  const n = parseNote(noteS);
  const note = staffNote(n, clef);
  const staves = level.grandStaff ? grandStaves(clef, [note]) : [{ clef, notes: [note] }];
  return staffQuestion('Name this note', staves, readingHint(clef, note.p, n.acc), [toneName(n)], noteAscii(n, false), { grand: level.grandStaff });
}

function tapRange(ps: number[]): [number, number] {
  return [Math.min(-4, ...ps.map((p) => p - 2)), Math.max(12, ...ps.map((p) => p + 2))];
}

function buildStaffFind(level: CurriculumLevel, item: string): BuiltQuestion {
  const [clefS, noteS] = splitItem(item);
  const clef = clefS as ClefId;
  const n = parseNote(noteS);
  const p = staffPosition(n, clef);
  const isMiddleC = noteS === 'C4';
  const staves = level.grandStaff ? grandStaves(clef, []) : [{ clef, notes: [] }];
  const staff = level.grandStaff && clef === 'bass' ? 1 : 0;
  const where = `${noteGlyph(n)}${isMiddleC ? ' (middle C)' : ''} goes ${positionPhrase(p)} in ${CLEFS[clef].label.toLowerCase()} clef.`;
  return staffQuestion(
    `Put ${noteGlyph(n)}${isMiddleC ? ' (middle C)' : ''} on the ${level.grandStaff ? `${clef} staff` : 'staff'}`,
    staves,
    `${where} ${readingHint(clef, p, n.acc)}`,
    [toneName(n)],
    noteAscii(n),
    {
      grand: level.grandStaff,
      tap: { target: 'staff', staff, accept: [p], range: tapRange([p]), acc: ACC[n.acc] },
      reveal: { staffNotes: [{ staff, p, acc: ACC[n.acc], col: 0 }] },
    },
  );
}

function buildStaffCompare(item: string): BuiltQuestion {
  const [clefs, noteS] = splitItem(item);
  const [from, to] = clefs.split('>') as [ClefId, ClefId];
  const n = parseNote(noteS);
  const pFrom = staffPosition(n, from);
  const pTo = staffPosition(n, to);
  return staffQuestion(
    `Write the same pitch in ${CLEFS[to].label.toLowerCase()} clef`,
    [
      { clef: from, notes: [staffNote(n, from)] },
      { clef: to, notes: [] },
    ],
    `It's ${noteGlyph(n)}: ${positionPhrase(pFrom)} in ${CLEFS[from].label.toLowerCase()} clef, ${positionPhrase(pTo)} in ${CLEFS[to].label.toLowerCase()} clef. Same sound, a different place, because each clef names different lines.`,
    [toneName(n)],
    noteAscii(n),
    { tap: { target: 'staff', staff: 1, accept: [pTo], range: tapRange([pTo]), acc: ACC[n.acc] }, reveal: { staffNotes: [{ staff: 1, p: pTo, acc: ACC[n.acc], col: 0 }] } },
  );
}

const SIZE_TIP: Record<number, string> = {
  2: 'A 2nd is next door: a line and the space touching it.',
  3: 'A 3rd is the next line up from a line, or the next space up from a space.',
  4: 'A 4th goes from a line to a space (or a space to a line) with a line and a space in between.',
  5: 'A 5th skips one line (or one space): line, line, line, or space, space, space.',
  6: 'A 6th goes line to space, or space to line, with two of each in between.',
  7: 'A 7th skips two lines (or two spaces): one short of the octave.',
  8: 'An octave goes line to space or space to line, and is the same letter again.',
};

function oddEvenRule(size: number, loP: number): string {
  const same = size % 2 === 1;
  const kind = (p: number) => (isLine(p) ? 'line' : 'space');
  return `${cap(kind(loP))} to ${kind(loP + size - 1)}: ${same ? 'same kind, so an odd interval (3rd, 5th, 7th)' : 'one of each, so an even interval (2nd, 4th, 6th, octave)'}.`;
}

function buildShapeInterval(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const size = +item.replace('size_', '');
  const lo = randInt(-1, 9 - (size - 1), rng);
  const hi = lo + size - 1;
  const harmonic = presentationFor(level, rng) === 'harmonic';
  const notes: StaffNote[] = [
    { p: lo, col: 0 },
    { p: hi, col: harmonic ? 0 : 1 },
  ];
  const a = noteAtPosition(lo, 'treble');
  const b = noteAtPosition(hi, 'treble');
  return staffQuestion(
    'How far apart are these notes?',
    [{ clef: null, notes }],
    `${oddEvenRule(size, lo)} ${SIZE_TIP[size]} Count every line and space from one note to the other, both included: ${size}. No clef needed, and it reads the same in any clef.`,
    [toneName(a), toneName(b)],
    item,
    { together: harmonic },
  );
}

const TRIAD_SHAPE_P: Record<string, number[]> = { root: [0, 2, 4], first: [0, 2, 5], second: [0, 3, 5] };
const TRIAD_SHAPE_TIP: Record<string, string> = {
  root: 'All three on lines, or all three on spaces: a stack of 3rds, like a snowman. That is root position, and the bottom note is the root.',
  first: 'A 3rd at the bottom and a gap (a 4th) at the top. The root is the note just above the gap, on top here, so the 3rd is in the bass: first inversion.',
  second: 'The gap (a 4th) is at the bottom. The root is the note just above the gap, in the middle, so the 5th is in the bass: second inversion.',
};

function buildShapeTriad(item: string, rng: Rng): BuiltQuestion {
  const lo = randInt(-1, 4, rng);
  const ps = TRIAD_SHAPE_P[item].map((d) => lo + d);
  return staffQuestion(
    'Root position, or which inversion?',
    [{ clef: null, notes: ps.map((p) => ({ p, col: 0 })) }],
    `${TRIAD_SHAPE_TIP[item]} Look for where the gap is: the shape gives it away in any clef.`,
    ps.map((p) => toneName(noteAtPosition(p, 'treble'))),
    item,
    { together: true },
  );
}

const QUALITY_TIP: Record<number, string> = {
  2: 'Natural 2nds are major, except E–F and B–C, the two half steps.',
  3: 'Natural 3rds: C–E, F–A and G–B are major (4 half steps); D–F, E–G, A–C and B–D are minor.',
  4: 'Natural 4ths are perfect, except F up to B: that one is the tritone.',
  5: 'Natural 5ths are perfect, except B up to F: that one is the tritone.',
  6: 'Natural 6ths: major from C, D, F and G; minor from E, A and B.',
  7: 'Natural 7ths: only C–B and F–E are major; the rest are minor.',
  8: 'Same letter, eight letters up.',
};

function letterChain(lo: Note, hi: Note): string {
  const out: string[] = [];
  for (let d = diatonic(lo); d <= diatonic(hi); d++) out.push(LETTERS[fromDiatonic(d).letter]);
  return out.join(' ');
}

/** A spelled pair for an interval, lower note on the staff. Naturals only unless allowed (or unavoidable). */
function intervalPair(id: IntervalType, clef: ClefId, allowAcc: boolean, rng: Rng): [Note, Note] {
  const def = INTERVAL_BY_ID[id];
  for (let attempt = 0; attempt < 200; attempt++) {
    const accOk = allowAcc || attempt > 120; // e.g. a natural tritone only exists as F–B
    const lowP = randInt(-2, 10 - (def.size - 1), rng);
    const lowAcc = accOk && rng() < 0.3 ? pick([-1, 1], rng) : 0;
    const lo = noteAtPosition(lowP, clef, lowAcc);
    const hi = transpose(lo, def.size, def.semis);
    if (Math.abs(hi.acc) > (accOk ? 1 : 0)) continue;
    return [lo, hi];
  }
  const lo = noteAtPosition(2, clef);
  return [lo, transpose(lo, def.size, def.semis)];
}

function buildStaffInterval(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const id = item as IntervalType;
  const def = INTERVAL_BY_ID[id];
  const clef = clefFor(level, rng);
  const [lo, hi] = intervalPair(id, clef, !!level.allowAccidentals, rng);
  const harmonic = presentationFor(level, rng) === 'harmonic';
  const name = id.replace('_', ' ');
  const tip = lo.acc || hi.acc ? 'Work it out on the naturals first, then adjust: each sharp or flat widens or narrows it by a half step.' : QUALITY_TIP[def.size];
  return staffQuestion(
    'Name this interval',
    [{ clef, notes: [staffNote(lo, clef, 0), staffNote(hi, clef, harmonic ? 0 : 1)] }],
    `${noteGlyph(lo, false)} up to ${noteGlyph(hi, false)}: count the letters (${letterChain(lo, hi)}) for the size, a ${SIZE_NAMES[def.size]}; ${def.semis} half steps makes it ${id === 'tritone' ? 'the tritone' : `a ${name}`}. ${tip}`,
    [toneName(lo), toneName(hi)],
    item,
    { together: harmonic },
  );
}

/** A spelled triad that fits around the staff, preferring natural roots. */
function spelledTriad(quality: TriadType, clef: ClefId, allowAcc: boolean, rng: Rng, rootLetter?: number): Note[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const accOk = allowAcc || quality === 'augmented' || attempt > 120;
    const letter = rootLetter ?? randInt(0, 6, rng);
    const rootAcc = accOk && rootLetter === undefined && rng() < 0.3 ? pick([-1, 1], rng) : 0;
    const rootP = randInt(-1, 4, rng);
    const near = noteAtPosition(rootP, clef);
    const root: Note = { letter, octave: near.octave + (letter < near.letter ? 1 : 0), acc: rootAcc };
    const triad = buildTriad(root, quality);
    if (triad.some((n) => Math.abs(n.acc) > (accOk ? 1 : 0))) continue;
    const p0 = staffPosition(root, clef);
    if (p0 < -2 || p0 > 5) continue;
    return triad;
  }
  return buildTriad(noteAtPosition(0, clef), quality);
}

const THIRD_NAME: Record<number, string> = { 3: 'minor 3rd', 4: 'major 3rd' };
const FIFTH_NAME: Record<number, string> = { 6: 'diminished 5th', 7: 'perfect 5th', 8: 'augmented 5th' };

function triadExplain(triad: Note[], quality: TriadType, inverted: boolean): string {
  const [r, t, f] = triad;
  const third = midiOf(t) - midiOf(r);
  const fifth = midiOf(f) - midiOf(r);
  const restack = inverted ? `Restack it in 3rds to find the root: ${triad.map((n) => noteGlyph(n, false)).join(' ')}. ` : '';
  return `${restack}${noteGlyph(r, false)} up to ${noteGlyph(t, false)} is a ${THIRD_NAME[third]}, and up to ${noteGlyph(f, false)} a ${FIFTH_NAME[fifth]}: ${quality}.`;
}

function buildStaffTriad(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const quality = item as TriadType;
  const clef = clefFor(level, rng);
  const triad = spelledTriad(quality, clef, !!level.allowAccidentals, rng);
  const inv = level.inversions ? randInt(0, 2, rng) : 0;
  const voiced = invert(triad, inv);
  return staffQuestion(
    'Name the chord quality',
    [{ clef, notes: voiced.map((n) => staffNote(n, clef, 0, { root: n.letter === triad[0].letter })) }],
    triadExplain(triad, quality, inv > 0),
    voiced.map(toneName),
    item,
    { together: true },
  );
}

function buildChordRoot(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const letter = LETTERS.indexOf(item as (typeof LETTERS)[number]);
  const quality = WHITE_KEY_TRIADS[item];
  const clef = clefFor(level, rng);
  const triad = spelledTriad(quality, clef, false, rng, letter);
  const inv = randInt(0, 2, rng);
  const voiced = invert(triad, inv);
  const where = inv === 0 ? 'It is already stacked in 3rds, so the bottom note is the root.' : `Restack it in 3rds (all lines or all spaces): ${triad.map((n) => noteGlyph(n, false)).join(' ')}. The bottom of the stack is the root.`;
  return staffQuestion(
    "What's the root of this chord?",
    [{ clef, notes: voiced.map((n) => staffNote(n, clef, 0, { root: n.letter === letter })) }],
    `${where} ${noteGlyph(triad[0], false)} ${quality}${inv ? `, in ${inv === 1 ? 'first' : 'second'} inversion` : ''}.`,
    voiced.map(toneName),
    item,
    { together: true },
  );
}

const glyphList = (letters: number[], sig: number) => letters.map((l) => LETTERS[l] + (sig > 0 ? '♯' : '♭')).join(' ');

function buildKeySignature(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const key = item.replace('key_', '');
  const sig = MAJOR_KEYS[key];
  const clef = clefFor(level, rng);
  const letters = signatureLetters(sig);
  const tonic = parseNote(`${key}4`);
  let explain: string;
  if (sig === 0) explain = 'No sharps or flats: C major.';
  else if (sig > 0) {
    const last = LETTERS[letters[letters.length - 1]];
    explain = `${sig} sharp${sig > 1 ? 's' : ''} (${glyphList(letters, sig)}). The last sharp, ${last}♯, is the 7th note of the key, so go up a half step: ${asciiToGlyph(key)} major.`;
  } else if (sig === -1) explain = 'One flat (B♭) is F major. That is the one to learn by heart.';
  else {
    const second = LETTERS[letters[letters.length - 2]];
    explain = `${-sig} flats (${glyphList(letters, sig)}). The second-to-last flat names the key: ${second}♭ major.`;
  }
  const tonicTriad = buildTriad(tonic, 'major');
  return staffQuestion('Which major key is this?', [{ clef, keySig: sig, notes: [] }], explain, tonicTriad.map(toneName), item, { together: true });
}

function buildNoteInKey(level: CurriculumLevel, item: string): BuiltQuestion {
  const [clefS, rest] = splitItem(item);
  const clef = clefS as ClefId;
  const [naturalS, key] = rest.split('@');
  const natural = parseNote(naturalS);
  const sig = MAJOR_KEYS[key];
  const actual: Note = { ...natural, acc: keyAccidental(natural.letter, sig) };
  const letters = signatureLetters(sig);
  const explain = actual.acc
    ? `The key signature (${asciiToGlyph(key)} major: ${glyphList(letters, sig)}) makes every ${LETTERS[natural.letter]} into ${noteGlyph(actual, false)}, in every octave, unless an accidental says otherwise.`
    : `${LETTERS[natural.letter]} isn't in the key signature (${glyphList(letters, sig)}), so it stays natural.`;
  return staffQuestion(
    'Name this note (mind the key)',
    [{ clef, keySig: sig, notes: [{ p: staffPosition(natural, clef), col: 0 }] }],
    `${explain} ${readingHint(clef, staffPosition(natural, clef))}`,
    [toneName(actual)],
    noteAscii(actual, false),
    { grand: level.grandStaff },
  );
}

const TRANSPOSE_TIP: Record<TransposingId, string> = {
  bb_clarinet: 'Read every note a whole step (a major 2nd) lower.',
  bb_trumpet: 'Read every note a whole step (a major 2nd) lower.',
  f_horn: 'Read every note a perfect 5th lower.',
  eb_alto_sax: 'Read every note a major 6th lower, or a minor 3rd higher and then down an octave.',
};

function buildTranspose(item: string): BuiltQuestion {
  const [instrS, writtenS] = splitItem(item);
  const instr = instrS as TransposingId;
  const t = TRANSPOSING[instr];
  const written = parseNote(writtenS);
  const sounding = soundingPitch(written, instr);
  return staffQuestion(
    `${t.label}: which note sounds?`,
    [{ clef: 'treble', label: t.short, notes: [staffNote(written, 'treble')] }],
    `${t.label} sounds lower than written. ${TRANSPOSE_TIP[instr]} Written ${noteGlyph(written, false)} sounds ${noteGlyph(sounding, false)}.`,
    [toneName(sounding)],
    noteAscii(sounding, false),
  );
}

// Score reading. Voices are listed bottom to top by pitch; `order` is their place on the page.
interface Voice {
  name: string; // as printed on the score
  long: string; // as said in an explanation
  clef: ClefId;
  lo: number; // sounding MIDI range
  hi: number;
  order: number;
  instr?: TransposingId;
}
const ENSEMBLES: Record<NonNullable<CurriculumLevel['ensemble']>, Voice[]> = {
  quartet: [
    { name: 'Vc.', long: 'cello', clef: 'bass', lo: 40, hi: 55, order: 3 },
    { name: 'Vla.', long: 'viola', clef: 'alto', lo: 53, hi: 69, order: 2 },
    { name: 'Vln. II', long: 'second violin', clef: 'treble', lo: 60, hi: 74, order: 1 },
    { name: 'Vln. I', long: 'first violin', clef: 'treble', lo: 64, hi: 79, order: 0 },
  ],
  orchestra: [
    { name: 'Vc.', long: 'cello', clef: 'bass', lo: 40, hi: 55, order: 5 },
    { name: 'Bsn.', long: 'bassoon', clef: 'bass', lo: 45, hi: 60, order: 2 },
    { name: 'Vla.', long: 'viola', clef: 'alto', lo: 53, hi: 69, order: 4 },
    { name: 'Vln.', long: 'violin', clef: 'treble', lo: 60, hi: 76, order: 3 },
    { name: 'Ob.', long: 'oboe', clef: 'treble', lo: 64, hi: 79, order: 1 },
    { name: 'Fl.', long: 'flute', clef: 'treble', lo: 67, hi: 84, order: 0 },
  ],
  orchestra_transposed: [
    { name: 'Vc.', long: 'cello', clef: 'bass', lo: 40, hi: 55, order: 5 },
    { name: 'Hn. in F', long: 'horn', clef: 'treble', lo: 53, hi: 67, order: 2, instr: 'f_horn' },
    { name: 'Vla.', long: 'viola', clef: 'alto', lo: 53, hi: 69, order: 4 },
    { name: 'Cl. in B♭', long: 'clarinet', clef: 'treble', lo: 58, hi: 74, order: 1, instr: 'bb_clarinet' },
    { name: 'Vln.', long: 'violin', clef: 'treble', lo: 62, hi: 77, order: 3 },
    { name: 'Fl.', long: 'flute', clef: 'treble', lo: 67, hi: 84, order: 0 },
  ],
};

/** Every spelled chord tone (any octave) whose pitch is within [lo, hi]. */
function toneOptions(triad: Note[], lo: number, hi: number): Note[] {
  const out: Note[] = [];
  for (const t of triad) for (let o = 1; o <= 7; o++) {
    const n = { ...t, octave: o };
    const m = midiOf(n);
    if (m >= lo && m <= hi) out.push(n);
  }
  return out.sort((a, b) => midiOf(a) - midiOf(b));
}

function voiceChord(triad: Note[], voices: Voice[], rng: Rng): Note[] | null {
  const out: Note[] = [];
  const bassOpts = toneOptions([triad[0]], voices[0].lo, voices[0].hi);
  if (!bassOpts.length) return null;
  out.push(pick(bassOpts, rng));
  for (let i = 1; i < voices.length; i++) {
    const prev = midiOf(out[i - 1]);
    const opts = toneOptions(triad, voices[i].lo, voices[i].hi).filter((n) => midiOf(n) >= prev && midiOf(n) <= prev + 12);
    if (!opts.length) return null;
    // Prefer a tone not used yet, so all three chord tones appear.
    const used = new Set(out.map((n) => n.letter));
    const fresh = opts.filter((n) => !used.has(n.letter));
    out.push(pick((fresh.length ? fresh : opts).slice(0, 3), rng));
  }
  return new Set(out.map((n) => n.letter)).size === 3 ? out : null;
}

function buildScoreChord(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const quality = item as TriadType;
  const voices = ENSEMBLES[level.ensemble ?? 'quartet'];
  let triad: Note[] = [];
  let voiced: Note[] | null = null;
  for (let attempt = 0; attempt < 300 && !voiced; attempt++) {
    triad = spelledTriad(quality, 'treble', attempt > 150, rng);
    voiced = voiceChord(triad, voices, rng);
  }
  if (!voiced) throw new Error(`Could not voice a ${quality} chord for ${level.id}`);
  const staves: Array<StaffSpec & { order: number }> = voices.map((v, i) => {
    const written = v.instr ? writtenPitch(voiced![i], v.instr) : voiced![i];
    return { order: v.order, clef: v.clef, label: v.name, notes: [staffNote(written, v.clef)] };
  });
  staves.sort((a, b) => a.order - b.order);
  const transposed = voices.filter((v) => v.instr);
  const transNote = transposed.length
    ? ` Transposing parts first: ${transposed
        .map((v) => {
          const i = voices.indexOf(v);
          return `the ${v.long} writes ${noteGlyph(writtenPitch(voiced![i], v.instr!), false)} and sounds ${noteGlyph(voiced![i], false)}`;
        })
        .join('; ')}.`
    : '';
  const bass = voices[0].long;
  return staffQuestion(
    'Name the chord quality',
    staves.map(({ order: _o, ...s }) => s),
    `Read each part, then gather the letters.${transNote} The ${bass} has the root, ${noteGlyph(triad[0], false)}. ${triadExplain(triad, quality, false)}`,
    voiced.map(toneName),
    item,
    { together: true, score: true },
  );
}

// ---------------------------------------------------------------------------
// Guitar.

const landmarkFor = (s: number, neck: NeckId = 'guitar'): Array<{ f: number; why: string }> => {
  const names = stringNames(neck);
  const lm = [
    { f: 0, why: `the open ${names[s]} string` },
    { f: 12, why: 'fret 12, the open string an octave up' },
  ];
  if (neck === 'guitar' && s === 3) lm.push({ f: 4, why: 'fret 4, the same note as the open B string' });
  else if (s < stringCount(neck) - 1) lm.push({ f: 5, why: `fret 5, the same note as the open ${names[s + 1]} string` });
  lm.push({ f: 7, why: 'fret 7, the open string a 5th up' });
  return lm;
};

const SHARP_LABEL = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function fretHint(pos: FretPos): string {
  const { s, f } = pos;
  const neck = pos.n ?? 'guitar';
  const OPEN_MIDI = openMidi(neck);
  if (f === 0) return neck === 'bass' ? 'Bass strings, low to high: E A D G, the same as the guitar\'s lowest four, an octave lower.' : `Open strings, low to high: E A D G B E (Eddie Ate Dynamite, Good Bye Eddie).`;
  const lm = landmarkFor(s, neck).sort((a, b) => Math.abs(a.f - f) - Math.abs(b.f - f))[0];
  const d = f - lm.f;
  const chain: string[] = [];
  for (let x = lm.f; ; x += Math.sign(d) || 1) {
    chain.push(SHARP_LABEL[mod(OPEN_MIDI[s] + x, 12)]);
    if (x === f) break;
  }
  const count = d === 0 ? '' : ` Count ${Math.abs(d)} fret${Math.abs(d) > 1 ? 's' : ''} ${d > 0 ? 'up' : 'down'}: ${chain.join(' → ')}. No fret between E–F or B–C.`;
  // The G string breaks the fret-5 rule; say so wherever it'd catch someone out.
  const gb = neck === 'guitar' && s === 3 && (f === 4 || f === 5) ? ' On the G string, fret 4 (not 5) matches the next open string, because the B string is tuned a fret lower than the pattern.' : '';
  return `Landmark: ${lm.why}, ${SHARP_LABEL[mod(OPEN_MIDI[s] + lm.f, 12)]}.${count}${gb}`;
}

function guitarQuestion(prompt: string, marks: FretMark[], explain: string, sound: string[], correctAnswer: string, extra: Partial<VisualPrompt> = {}, focusFret?: number): BuiltQuestion {
  return {
    correctAnswer,
    rootNote: sound[0]?.replace(/-?\d+$/, '') ?? 'C',
    visual: { prompt, fretboard: { marks, focusFret, strings: extra.tap?.target === 'fret' ? extra.tap.strings : undefined }, explain, sound, ...extra },
    responseMode: extra.tap ? 'tap_fret' : 'select',
  };
}

function buildFretNote(item: string): BuiltQuestion {
  const pos = parsePos(item);
  const midi = fretMidi(pos);
  return guitarQuestion('Name this note', [{ ...pos, kind: 'target' }], fretHint(pos), [midiToTone(midi)], pcKey(midi), {}, pos.f);
}

function buildFretFind(item: string): BuiltQuestion {
  const [sS, name] = item.split(':');
  const neck: NeckId = sS.startsWith('b') ? 'bass' : 'guitar';
  const s = +sS.replace('b', '');
  const pc = pcOfName(name);
  const accept: FretPos[] = [];
  for (let f = 0; f <= FRETS; f++) if (mod(openMidi(neck)[s] + f, 12) === pc) accept.push(neck === 'bass' ? { s, f, n: 'bass' } : { s, f });
  const OPEN_MIDI = openMidi(neck);
  return guitarQuestion(
    `Find ${asciiToGlyph(name)} on the ${stringNames(neck)[s]} string`,
    [],
    fretHint(accept[0]),
    [midiToTone(OPEN_MIDI[s] + accept[0].f)],
    pcKey(pc),
    {
      tap: { target: 'fret', accept: accept.map(posKey), strings: [s] },
      reveal: { fretMarks: accept.map((p) => ({ ...p, kind: 'target' as const, label: asciiToGlyph(name) })) },
    },
  );
}

/**
 * The neck's first pattern. The strings are tuned in 4ths, so the same fret one string up
 * is a 4th up, and one string down is a 4th down: the 5th, an octave lower. Between G and
 * B the strings are a 3rd apart, so there the dot sits one fret further along.
 */
export function acrossTarget(root: FretPos, rel: 'p4' | 'p5'): FretPos {
  const s = rel === 'p4' ? root.s + 1 : root.s - 1;
  const bend = crossesGB(root.s, s, root.n);
  const shift = rel === 'p4' ? (bend ? 1 : 0) : bend ? -1 : 0;
  return root.n === 'bass' ? { s, f: root.f, n: 'bass' } : { s, f: root.f + shift };
}

function buildFretAcross(item: string): BuiltQuestion {
  const [rootKey, relKey] = item.split(':');
  const rel = relKey as 'p4' | 'p5';
  const root = parsePos(rootKey);
  const target = acrossTarget(root, rel);
  const rootMidi = fretMidi(root);
  const midi = fretMidi(target);
  const rootName = SHARP_LABEL[mod(rootMidi, 12)];
  const name = SHARP_LABEL[mod(midi, 12)];
  const shifted = target.f !== root.f;
  const explain =
    rel === 'p4'
      ? `One string up, same fret: a 4th up. ${rootName} → ${name}.` +
        (shifted ? ' From the G string to the B string, the 4th is one fret up: those two strings are a 3rd apart, not a 4th.' : root.n === 'bass' ? ' On the bass every pair of strings works this way: no bend.' : ' Every pair of neighbouring strings works this way, except G to B.')
      : `One string down, same fret: a 4th down, which is the 5th of ${rootName}, an octave lower. ${rootName} → ${name}.` +
        (shifted ? ' From the B string down to the G string, step one fret back: those two strings are a 3rd apart, not a 4th.' : ' Up a 4th or down a 5th, it\'s the same move reversed.');
  return guitarQuestion(
    'Name the other note',
    [
      { ...root, kind: 'root', label: rootName },
      { ...target, kind: 'target' },
    ],
    explain,
    [midiToTone(rootMidi), midiToTone(midi)],
    answerKey('fret_across', item),
    {},
    root.f,
  );
}

function octaveShapeTip(s: number, neck: NeckId = 'guitar'): string {
  if (neck === 'bass') {
    return s <= 1
      ? 'Two strings up, two frets up, from either low string: on the bass there is no bend.'
      : 'There is no string two up from here, so go one string up and seven frets up (a 4th plus a 5th), or 12 frets up the same string.';
  }
  if (s <= 1) return 'From the low E or A string: two strings up, two frets up.';
  if (s <= 3) return 'From the D or G string: two strings up, three frets up. The shape stretches a fret because the B string is tuned a half step lower than the pattern.';
  return 'From the B string, the next octave is on the same string, 12 frets up.';
}

function buildFretOctave(item: string): BuiltQuestion {
  const root = parsePos(item);
  const midi = fretMidi(root);
  const accept = positionsOfMidi(midi + 12, root.n);
  const label = SHARP_LABEL[mod(midi, 12)];
  return guitarQuestion(
    'Tap the same note an octave higher',
    [{ ...root, kind: 'root', label }],
    `${octaveShapeTip(root.s, root.n)} ${accept.length > 1 ? `The same ${label} is also at ${accept.length - 1} other spot${accept.length > 2 ? 's' : ''}; any of them counts.` : ''}`.trim(),
    [midiToTone(midi), midiToTone(midi + 12)],
    'octave',
    { tap: { target: 'fret', accept: accept.map(posKey) }, reveal: { fretMarks: accept.map((p) => ({ ...p, kind: 'target' as const, label })) } },
    root.f,
  );
}

/** Where an interval sits within one hand position of the root: on its string or up to three strings higher. */
export function shapeTargets(root: FretPos, semis: number): FretPos[] {
  const out: FretPos[] = [];
  for (let s = root.s; s <= Math.min(5, root.s + 3); s++) {
    const f = root.f + semis - stringGap(root.s, s);
    if (f >= 0 && f <= FRETS && f >= root.f - 3 && f <= root.f + 4 && !(s === root.s && f === root.f)) out.push({ s, f });
  }
  return out;
}

const STRINGS_UP = ['on the same string', 'one string up', 'two strings up', 'three strings up'];
function describeShape(root: FretPos, t: FretPos): string {
  const ds = t.s - root.s;
  const df = t.f - root.f;
  const along = df === 0 ? 'the same fret' : `${Math.abs(df)} fret${Math.abs(df) > 1 ? 's' : ''} ${df > 0 ? 'up' : 'back'}`;
  return `${STRINGS_UP[ds] ?? `${ds} strings up`}, ${along}`;
}
const GB_TIP = 'Each string up adds 5 half steps, except G to B, which adds only 4, so a shape that crosses those two strings moves up one fret.';

function intervalRoot(level: CurriculumLevel, semis: number, rng: Rng): FretPos {
  const strings = level.fretRootStrings ?? [0, 1];
  for (let i = 0; i < 60; i++) {
    const root = { s: pick(strings, rng), f: randInt(0, 10, rng) };
    if (shapeTargets(root, semis).length) return root;
  }
  return { s: strings[0], f: 3 };
}

function buildFretInterval(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const def = INTERVAL_BY_ID[item as IntervalType];
  const root = intervalRoot(level, def.semis, rng);
  const target = pick(shapeTargets(root, def.semis), rng);
  const name = def.id === 'tritone' ? 'the tritone' : `a ${def.id.replace('_', ' ')}`;
  return guitarQuestion(
    'Name the interval from the root',
    [
      { ...root, kind: 'root', label: 'R' },
      { ...target, kind: 'dot' },
    ],
    `The dot is ${describeShape(root, target)} from the root: ${def.semis} half steps, ${name}.${crossesGB(root.s, target.s) ? ` ${GB_TIP}` : ''} The shape works from any root.`,
    [midiToTone(fretMidi(root)), midiToTone(fretMidi(root) + def.semis)],
    item,
    {},
    Math.round((root.f + target.f) / 2),
  );
}

function buildFretIntervalFind(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const def = INTERVAL_BY_ID[item as IntervalType];
  const root = intervalRoot(level, def.semis, rng);
  const midi = fretMidi(root) + def.semis;
  const accept = positionsOfMidi(midi);
  const shapes = shapeTargets(root, def.semis);
  const name = def.id === 'tritone' ? 'tritone' : def.id.replace('_', ' ');
  return guitarQuestion(
    `Tap the ${name} above the root`,
    [{ ...root, kind: 'root', label: 'R' }],
    `${cap(name)} = ${def.semis} half steps. Near the root: ${shapes.map((t) => describeShape(root, t)).join(', or ')}.${shapes.some((t) => crossesGB(root.s, t.s)) ? ` ${GB_TIP}` : ''} Any spot with the right pitch counts.`,
    [midiToTone(fretMidi(root)), midiToTone(midi)],
    item,
    { tap: { target: 'fret', accept: accept.map(posKey) }, reveal: { fretMarks: accept.map((p) => ({ ...p, kind: 'target' as const, label: def.short })) } },
    root.f,
  );
}

const TRIAD_SEMIS: Record<TriadType, number[]> = { major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8] };

function buildFretTriad(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const quality = item as TriadType;
  const semis = TRIAD_SEMIS[quality];
  const lowStrings = level.fretRootStrings ?? [1, 2, 3];
  for (let attempt = 0; attempt < 400; attempt++) {
    const s0 = pick(lowStrings.filter((s) => s <= 3), rng);
    const inv = level.inversions ? randInt(0, 2, rng) : 0;
    const rootMidi = OPEN_MIDI[s0] + randInt(0, 11, rng);
    const order = [0, 1, 2].map((i) => (i + inv) % 3); // chord tones bass → top
    const midis: number[] = [];
    let prev = -Infinity;
    for (let k = 0; k < 3; k++) {
      const tone = rootMidi + semis[order[k]];
      let m = tone;
      if (k === 0) while (m - 12 >= OPEN_MIDI[s0]) m -= 12;
      else m = prev + (mod(tone - prev, 12) || 12); // the next chord tone above the string below
      midis.push(m);
      prev = m;
    }
    const pos = midis.map((m, k) => ({ s: s0 + k, f: m - OPEN_MIDI[s0 + k] }));
    if (pos.some((p) => p.f < 0 || p.f > FRETS)) continue;
    const fs = pos.map((p) => p.f);
    if (Math.max(...fs) - Math.min(...fs) > 4) continue;
    const rootIdx = order.indexOf(0);
    const marks: FretMark[] = pos.map((p, k) => ({ ...p, kind: k === rootIdx ? 'root' : 'dot', label: k === rootIdx ? 'R' : undefined }));
    const rootM = midis[rootIdx];
    const third = midis[order.indexOf(1)];
    const fifth = midis[order.indexOf(2)];
    const up = (m: number) => mod(m - rootM, 12);
    return guitarQuestion(
      'Name the chord quality',
      marks,
      `From the root, one note is ${up(third)} half steps up (a ${THIRD_NAME[up(third)]}) and one is ${up(fifth)} up (a ${FIFTH_NAME[up(fifth)]}): ${quality}.${inv ? ` The root isn't the lowest note: this is the ${inv === 1 ? 'first' : 'second'} inversion shape.` : ''}`,
      midis.map(midiToTone),
      item,
      { together: true },
      Math.round((Math.min(...fs) + Math.max(...fs)) / 2),
    );
  }
  throw new Error(`Could not place a ${quality} triad for ${level.id}`);
}

// Chord and scale shapes (src/notation/shapes.ts). The lowest root is marked R; the rest of
// the shape is drawn quietly, and every dot shows its degree once answered.

function shapeSetup(item: string, rng: Rng) {
  const [id, degS] = splitItem(item);
  const shape = SHAPES[id];
  const deg = degS as Degree;
  const anchor = pick(anchorFrets(shape), rng);
  const root = lowestRoot(shape);
  const fs = shape.notes.map((x) => anchor + x.df);
  const focus = Math.round((Math.min(...fs) + Math.max(...fs)) / 2);
  const tone = (x: ShapeNote) => midiToTone(fretMidi(placeNote(x, anchor, shape.neck)));
  return { shape, deg, anchor, root, focus, tone };
}

function buildShapeTone(item: string, rng: Rng): BuiltQuestion {
  const { shape, deg, anchor, root, focus, tone } = shapeSetup(item, rng);
  const options = shape.notes.filter((x) => x.deg === deg && x !== root);
  const target = pick(options.length ? options : [root], rng);
  const marks: FretMark[] = shape.notes.map((x) => ({
    ...placeNote(x, anchor, shape.neck),
    kind: x === target ? 'target' : x === root ? 'root' : 'ghost',
    label: x === root && x !== target ? 'R' : undefined,
    after: DEGREE_LABEL[x.deg],
  }));
  return guitarQuestion(
    shape.kind === 'chord' ? 'Which chord tone is the marked dot?' : 'Which scale note is the marked dot?',
    marks,
    `${noteReason(shape, target, anchor)} ${shape.rule}`,
    [tone(root), tone(target)],
    `deg_${deg}`,
    {},
    focus,
  );
}

function buildShapeFind(item: string, rng: Rng): BuiltQuestion {
  const { shape, deg, anchor, root, focus, tone } = shapeSetup(item, rng);
  const hidden = shape.notes.filter((x) => x.deg === deg);
  const shown = shape.notes.filter((x) => x.deg !== deg);
  const marks: FretMark[] = shown.map((x) => ({ ...placeNote(x, anchor, shape.neck), kind: x === root ? 'root' : 'ghost', label: DEGREE_LABEL[x.deg] }));
  // Any spot with the right note, in or right beside the shape, counts.
  const pc = mod(fretMidi(placeNote(hidden[0], anchor, shape.neck)), 12);
  const fs = shape.notes.map((x) => anchor + x.df);
  const accept: FretPos[] = [];
  for (let s = 0; s < stringCount(shape.neck); s++) for (let f = Math.max(0, Math.min(...fs) - 1); f <= Math.min(FRETS, Math.max(...fs) + 1); f++) {
    const pos: FretPos = shape.neck === 'bass' ? { s, f, n: 'bass' } : { s, f };
    if (mod(fretMidi(pos), 12) === pc) accept.push(pos);
  }
  const first = hidden[hidden.length - 1]; // the highest: it has notes below it to measure from
  const words = deg === 'R' ? 'root' : DEGREE_WORDS[deg];
  const more = hidden.length > 1 ? ` The shape has ${hidden.length} of them; any one counts.` : '';
  return guitarQuestion(
    shape.kind === 'chord' ? `Finish the chord: tap the ${words}` : `Fill the gap: tap the ${words}`,
    marks,
    `${noteReason(shape, first, anchor, deg)}${more} ${shape.rule}`,
    [tone(root), tone(first)],
    item,
    { tap: { target: 'fret', accept: accept.map(posKey) }, reveal: { fretMarks: hidden.map((x) => ({ ...placeNote(x, anchor, shape.neck), kind: 'target' as const, label: DEGREE_LABEL[deg] })) } },
    focus,
  );
}

function buildStaffToFret(level: CurriculumLevel, item: string): BuiltQuestion {
  const n = parseNote(item); // the sounding note
  const midi = midiOf(n);
  const bass = level.neck === 'bass';
  // Guitar parts are written in treble clef with an 8 under it; bass parts in plain bass
  // clef. Both sound an octave below what's written.
  const clef: ClefId = bass ? 'bass' : 'treble8vb';
  const written = bass ? { ...n, octave: n.octave + 1 } : n;
  const accept = positionsOfMidi(midi, bass ? 'bass' : 'guitar');
  const p = staffPosition(written, clef);
  const names = stringNames(bass ? 'bass' : 'guitar');
  const where = accept.map((q) => `${q.f === 0 ? 'open' : `fret ${q.f}`} on the ${names[q.s]} string`).join(', or ');
  return {
    correctAnswer: noteAscii(n),
    rootNote: LETTERS[n.letter],
    responseMode: 'tap_fret',
    visual: {
      prompt: 'Find this note on the neck',
      staves: [{ clef, notes: [staffNote(written, clef)] }],
      fretboard: { marks: [], neck: bass ? 'bass' : undefined },
      tap: { target: 'fret', accept: accept.map(posKey) },
      reveal: { fretMarks: accept.map((q) => ({ ...q, kind: 'target' as const, label: noteGlyph(n, false) })) },
      explain: bass
        ? `${readingHint('bass', p, n.acc)} Bass parts sound an octave lower than written, so written ${noteGlyph(written, false)} is ${noteGlyph(n)}: ${where}.`
        : `${readingHint('treble8vb', p, n.acc)} Guitar music sounds an octave lower than written (the 8 under the clef), so this is ${noteGlyph(n)}: ${where}.`,
      sound: [toneName(n)],
    },
  };
}

// ---------------------------------------------------------------------------

export function buildVisualQuestion(level: CurriculumLevel, item: string, rng: Rng = Math.random): BuiltQuestion {
  const q = buildFor(level, item, rng);
  if (level.neck === 'bass' && q.visual.fretboard) q.visual.fretboard.neck = 'bass';
  return q;
}

function buildFor(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  switch (level.visualKind) {
    case 'clef_sign': return buildClefSign(item);
    case 'staff_note': return buildStaffNote(level, item);
    case 'staff_find': return buildStaffFind(level, item);
    case 'staff_compare': return buildStaffCompare(item);
    case 'shape_interval': return buildShapeInterval(level, item, rng);
    case 'shape_triad': return buildShapeTriad(item, rng);
    case 'staff_interval': return buildStaffInterval(level, item, rng);
    case 'staff_triad': return buildStaffTriad(level, item, rng);
    case 'chord_root': return buildChordRoot(level, item, rng);
    case 'key_signature': return buildKeySignature(level, item, rng);
    case 'note_in_key': return buildNoteInKey(level, item);
    case 'transpose': return buildTranspose(item);
    case 'score_chord': return buildScoreChord(level, item, rng);
    case 'fret_note': return buildFretNote(item);
    case 'fret_find': return buildFretFind(item);
    case 'fret_across': return buildFretAcross(item);
    case 'fret_octave': return buildFretOctave(item);
    case 'fret_interval': return buildFretInterval(level, item, rng);
    case 'fret_interval_find': return buildFretIntervalFind(level, item, rng);
    case 'fret_triad': return buildFretTriad(level, item, rng);
    case 'fret_shape_tone': return buildShapeTone(item, rng);
    case 'fret_shape_find': return buildShapeFind(item, rng);
    case 'staff_to_fret': return buildStaffToFret(level, item);
    case 'rhythm_value':
    case 'rhythm_count':
    case 'rhythm_hear':
    case 'rhythm_tap':
      return buildRhythmQuestion(level, item, rng);
    case 'th_scale_step':
    case 'th_degree':
    case 'th_numeral':
    case 'th_minor_key':
    case 'th_seventh':
    case 'th_cadence':
    case 'th_mode':
      return buildTheoryQuestion(level, item, rng);
    case 'hx_era':
    case 'hx_quiz':
    case 'hx_hear':
      return buildHistoryQuestion(level, item, rng);
    default:
      throw new Error(`Lesson ${level.id} has no visual kind`);
  }
}
