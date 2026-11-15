// Pure notation logic for the Read Music and Guitar paths. No DOM, no audio.
//
// A note is a letter, an octave and an accidental, so it keeps its spelling: F♯ and G♭
// are different notes on the staff even though they sound the same. Staff positions
// count steps (lines and spaces) up from a staff's bottom line: 0 = bottom line,
// 1 = first space, ... 8 = top line. Negative = below the staff, above 8 = above it.

import type { IntervalType, TriadType } from '../types';

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

export interface Note {
  letter: number; // 0 = C … 6 = B
  octave: number; // scientific pitch: middle C = C4
  acc: number; // -2 = 𝄫, -1 = ♭, 0, 1 = ♯, 2 = 𝄪
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Steps from C0, counting letters only: one per line or space on a staff. */
export const diatonic = (n: Note) => n.octave * 7 + n.letter;
export const fromDiatonic = (d: number, acc = 0): Note => ({ letter: mod(d, 7), octave: Math.floor(d / 7), acc });
export const midiOf = (n: Note) => 12 * (n.octave + 1) + NATURAL_PC[n.letter] + n.acc;

const ACC_ASCII: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: 'x' };
const ACC_GLYPH: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };

/** 'F#4', 'Bb3', 'C4'. Throws on anything else: items are written by hand in the curriculum. */
export function parseNote(s: string): Note {
  const m = /^([A-G])(bb|b|#|x)?(-?\d)$/.exec(s);
  if (!m) throw new Error(`Not a note: ${s}`);
  const acc = { bb: -2, b: -1, '#': 1, x: 2 }[m[2] ?? ''] ?? 0;
  return { letter: LETTERS.indexOf(m[1] as (typeof LETTERS)[number]), octave: parseInt(m[3], 10), acc };
}

/** ASCII spelling, as stored in items: 'F#4', or 'F#' without the octave. */
export const noteAscii = (n: Note, octave = true) => LETTERS[n.letter] + ACC_ASCII[n.acc] + (octave ? n.octave : '');
/** Display spelling: 'F♯4', or 'F♯'. */
export const noteGlyph = (n: Note, octave = true) => LETTERS[n.letter] + ACC_GLYPH[n.acc] + (octave ? n.octave : '');

/** A pitch name Tone.js can always play ('C#4' style), whatever the spelling. */
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const midiToTone = (midi: number) => SHARP_NAMES[mod(midi, 12)] + (Math.floor(midi / 12) - 1);
export const toneName = (n: Note) => midiToTone(midiOf(n));

/** 'C#' → 'C♯', 'Bb' → 'B♭'. Leaves anything else alone. */
export function asciiToGlyph(s: string): string {
  return s.replace(/^([A-G])(bb|b|#|x)?/, (_, l: string, a: string | undefined) => l + (a ? ACC_GLYPH[{ bb: -2, b: -1, '#': 1, x: 2 }[a]!] : ''));
}

// ---------------------------------------------------------------------------
// Clefs. Every clef is a letter drawn on a line: the G clef curls round the line it
// makes G4, the F clef's dots straddle the line it makes F3, and the C clef points at the
// line it makes middle C. Move the sign to another line and the staff renames itself;
// that is the whole idea of a clef. The 8 under the treble clef drops it an octave (guitar
// and tenor voice parts), so its G line sounds G3.

export type ClefSign = 'G' | 'F' | 'C';
export type ClefId = 'treble' | 'treble8vb' | 'bass' | 'alto' | 'tenor' | 'soprano' | 'mezzo' | 'baritone';

export interface ClefDef {
  id: ClefId;
  label: string;
  sign: ClefSign;
  line: number; // 1 = bottom line … 5 = top line
  ref: Note; // the note on the sign's line
  octaveBelow?: boolean;
  usedBy: string;
}

export const CLEFS: Record<ClefId, ClefDef> = {
  treble: { id: 'treble', label: 'Treble', sign: 'G', line: 2, ref: parseNote('G4'), usedBy: 'violin, flute, right hand of the piano' },
  treble8vb: { id: 'treble8vb', label: 'Treble (octave down)', sign: 'G', line: 2, ref: parseNote('G3'), octaveBelow: true, usedBy: 'guitar and tenor voice' },
  bass: { id: 'bass', label: 'Bass', sign: 'F', line: 4, ref: parseNote('F3'), usedBy: 'cello, bassoon, left hand of the piano' },
  alto: { id: 'alto', label: 'Alto', sign: 'C', line: 3, ref: parseNote('C4'), usedBy: 'viola' },
  tenor: { id: 'tenor', label: 'Tenor', sign: 'C', line: 4, ref: parseNote('C4'), usedBy: 'high cello, bassoon and trombone parts' },
  soprano: { id: 'soprano', label: 'Soprano', sign: 'C', line: 1, ref: parseNote('C4'), usedBy: 'old choral scores' },
  mezzo: { id: 'mezzo', label: 'Mezzo-soprano', sign: 'C', line: 2, ref: parseNote('C4'), usedBy: 'old choral scores' },
  baritone: { id: 'baritone', label: 'Baritone', sign: 'C', line: 5, ref: parseNote('C4'), usedBy: 'old choral and early scores' },
};

/** Staff position of the clef's own line (bottom line = 0, top line = 8). */
export const clefRefP = (clef: ClefId) => (CLEFS[clef].line - 1) * 2;
const bottomDiatonic = (clef: ClefId) => diatonic(CLEFS[clef].ref) - clefRefP(clef);

export const staffPosition = (n: Note, clef: ClefId) => diatonic(n) - bottomDiatonic(clef);
export const noteAtPosition = (p: number, clef: ClefId, acc = 0): Note => fromDiatonic(bottomDiatonic(clef) + p, acc);

/** Ledger lines a note at position p needs (even positions outside 0..8). */
export function ledgerLines(p: number): number[] {
  const out: number[] = [];
  for (let q = -2; q >= p; q -= 2) out.push(q);
  for (let q = 10; q <= p; q += 2) out.push(q);
  return out;
}

export const isLine = (p: number) => mod(p, 2) === 0;

// ---------------------------------------------------------------------------
// Intervals. The size (2nd, 3rd …) is counted in letters, so it can be read straight off
// the staff in any clef; the quality (major, minor …) needs the actual notes.

export interface IntervalDef {
  id: IntervalType;
  size: number; // 2 = second … 8 = octave
  semis: number;
  short: string;
}

export const INTERVAL_DEFS: IntervalDef[] = [
  { id: 'minor_2nd', size: 2, semis: 1, short: 'm2' },
  { id: 'major_2nd', size: 2, semis: 2, short: 'M2' },
  { id: 'minor_3rd', size: 3, semis: 3, short: 'm3' },
  { id: 'major_3rd', size: 3, semis: 4, short: 'M3' },
  { id: 'perfect_4th', size: 4, semis: 5, short: 'P4' },
  { id: 'tritone', size: 4, semis: 6, short: 'TT' }, // spelled as an augmented 4th
  { id: 'perfect_5th', size: 5, semis: 7, short: 'P5' },
  { id: 'minor_6th', size: 6, semis: 8, short: 'm6' },
  { id: 'major_6th', size: 6, semis: 9, short: 'M6' },
  { id: 'minor_7th', size: 7, semis: 10, short: 'm7' },
  { id: 'major_7th', size: 7, semis: 11, short: 'M7' },
  { id: 'octave', size: 8, semis: 12, short: 'P8' },
];
export const INTERVAL_BY_ID = Object.fromEntries(INTERVAL_DEFS.map((d) => [d.id, d])) as Record<IntervalType, IntervalDef>;

export const SIZE_NAMES: Record<number, string> = { 1: 'unison', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: 'octave' };

/** The note `size` letters and `semis` half steps above (dir 1) or below (dir -1) `n`, correctly spelled. */
export function transpose(n: Note, size: number, semis: number, dir: 1 | -1 = 1): Note {
  const target = fromDiatonic(diatonic(n) + (size - 1) * dir);
  const natural = midiOf({ ...target, acc: 0 });
  return { ...target, acc: midiOf(n) + semis * dir - natural };
}

/** Name the interval from the lower to the upper note, or null if it isn't one we teach (e.g. a diminished 4th). */
export function intervalBetween(a: Note, b: Note): IntervalType | null {
  const [lo, hi] = diatonic(a) <= diatonic(b) ? [a, b] : [b, a];
  const size = diatonic(hi) - diatonic(lo) + 1;
  const semis = midiOf(hi) - midiOf(lo);
  if (size === 5 && semis === 6) return 'tritone'; // diminished 5th, same sound
  return INTERVAL_DEFS.find((d) => d.size === size && d.semis === semis)?.id ?? null;
}

// ---------------------------------------------------------------------------
// Triads: a root with a 3rd and a 5th stacked above it.

export const TRIAD_SHAPE: Record<TriadType, { third: number; fifth: number }> = {
  major: { third: 4, fifth: 7 },
  minor: { third: 3, fifth: 7 },
  diminished: { third: 3, fifth: 6 },
  augmented: { third: 4, fifth: 8 },
};

/** Root position triad, spelled: [root, third, fifth]. */
export function buildTriad(root: Note, quality: TriadType): Note[] {
  const s = TRIAD_SHAPE[quality];
  return [root, transpose(root, 3, s.third), transpose(root, 5, s.fifth)];
}

/** Move the lowest `inversion` notes up an octave: 1 = 3rd in the bass, 2 = 5th in the bass. */
export function invert(notes: Note[], inversion: number): Note[] {
  const out = [...notes];
  for (let i = 0; i < inversion; i++) {
    const low = out.shift()!;
    out.push({ ...low, octave: low.octave + 1 });
  }
  return out;
}

/** The triad quality of a root-position spelled stack, if it is one. */
export function triadQuality(notes: Note[]): TriadType | null {
  const [r, t, f] = notes;
  const third = midiOf(t) - midiOf(r);
  const fifth = midiOf(f) - midiOf(r);
  for (const [q, s] of Object.entries(TRIAD_SHAPE)) if (s.third === third && s.fifth === fifth) return q as TriadType;
  return null;
}

// The seven triads of C major, for reading drills that should need no accidentals.
export const WHITE_KEY_TRIADS: Record<string, TriadType> = {
  C: 'major', D: 'minor', E: 'minor', F: 'major', G: 'major', A: 'minor', B: 'diminished',
};

// ---------------------------------------------------------------------------
// Key signatures. Positive = sharps, negative = flats.

export const MAJOR_KEYS: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]; // B E A D G C F

/** The accidental a key signature gives a letter. */
export function keyAccidental(letter: number, sig: number): number {
  if (sig > 0 && SHARP_ORDER.slice(0, sig).includes(letter)) return 1;
  if (sig < 0 && FLAT_ORDER.slice(0, -sig).includes(letter)) return -1;
  return 0;
}

/** The letters a signature alters, in the order they're written. */
export const signatureLetters = (sig: number) => (sig > 0 ? SHARP_ORDER.slice(0, sig) : FLAT_ORDER.slice(0, -sig));

// Where each sharp / flat sits on the treble staff, in order. Bass is two steps lower,
// alto one. These are the standard engraving positions.
const TREBLE_SHARP_P = [8, 5, 9, 6, 3, 7, 4];
const TREBLE_FLAT_P = [4, 7, 3, 6, 2, 5, 1];
const SIG_OFFSET: Partial<Record<ClefId, number>> = { treble: 0, treble8vb: 0, bass: -2, alto: -1 };

export function signaturePositions(sig: number, clef: ClefId): number[] {
  const off = SIG_OFFSET[clef];
  if (off === undefined || sig === 0) return [];
  const ps = sig > 0 ? TREBLE_SHARP_P.slice(0, sig) : TREBLE_FLAT_P.slice(0, -sig);
  return ps.map((p) => p + off);
}

// ---------------------------------------------------------------------------
// Transposing instruments: the part is written higher than it sounds, so the player
// keeps the same fingerings across the instrument family.

export type TransposingId = 'bb_clarinet' | 'bb_trumpet' | 'f_horn' | 'eb_alto_sax';
export const TRANSPOSING: Record<TransposingId, { label: string; short: string; size: number; semis: number }> = {
  bb_clarinet: { label: 'Clarinet in B♭', short: 'Cl. in B♭', size: 2, semis: 2 }, // sounds a major 2nd lower
  bb_trumpet: { label: 'Trumpet in B♭', short: 'Tpt. in B♭', size: 2, semis: 2 },
  f_horn: { label: 'Horn in F', short: 'Hn. in F', size: 5, semis: 7 }, // a perfect 5th lower
  eb_alto_sax: { label: 'Alto sax in E♭', short: 'A. Sax in E♭', size: 6, semis: 9 }, // a major 6th lower
};

export const soundingPitch = (written: Note, instr: TransposingId) =>
  transpose(written, TRANSPOSING[instr].size, TRANSPOSING[instr].semis, -1);
export const writtenPitch = (sounding: Note, instr: TransposingId) =>
  transpose(sounding, TRANSPOSING[instr].size, TRANSPOSING[instr].semis, 1);

// ---------------------------------------------------------------------------
// Guitar, standard tuning. Strings are numbered from the low E (0) to the high E (5).
// Bass (4 strings, E A D G, an octave below the guitar's lowest four) uses the same
// numbering. A position on the bass carries n: 'bass', and its key starts with 'b'
// ('b0f3') rather than 's', so items, answers and taps say which neck they're on.

export type NeckId = 'guitar' | 'bass';
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
export const BASS_OPEN_MIDI = [28, 33, 38, 43]; // E1 A1 D2 G2
export const STRING_NAMES = ['low E', 'A', 'D', 'G', 'B', 'high E'];
export const STRING_SHORT = ['E', 'A', 'D', 'G', 'B', 'e'];
export const BASS_STRING_NAMES = ['E', 'A', 'D', 'G'];
export const FRETS = 12;
export const INLAYS = [3, 5, 7, 9, 12];

export const openMidi = (neck: NeckId = 'guitar') => (neck === 'bass' ? BASS_OPEN_MIDI : OPEN_MIDI);
export const stringNames = (neck: NeckId = 'guitar') => (neck === 'bass' ? BASS_STRING_NAMES : STRING_NAMES);
export const stringCount = (neck: NeckId = 'guitar') => openMidi(neck).length;

export interface FretPos {
  s: number;
  f: number;
  n?: NeckId; // omitted = guitar
}
export const fretMidi = (p: FretPos) => openMidi(p.n)[p.s] + p.f;
export const posKey = (p: FretPos) => `${p.n === 'bass' ? 'b' : 's'}${p.s}f${p.f}`;
export function parsePos(k: string): FretPos {
  const m = /^([sb])(\d)f(\d+)$/.exec(k);
  if (!m) throw new Error(`Not a fret position: ${k}`);
  return m[1] === 'b' ? { s: +m[2], f: +m[3], n: 'bass' } : { s: +m[2], f: +m[3] };
}

/** Every position on frets 0–12 with this exact pitch. */
export function positionsOfMidi(midi: number, neck: NeckId = 'guitar'): FretPos[] {
  const out: FretPos[] = [];
  const open = openMidi(neck);
  for (let s = 0; s < open.length; s++) {
    const f = midi - open[s];
    if (f >= 0 && f <= FRETS) out.push(neck === 'bass' ? { s, f, n: 'bass' } : { s, f });
  }
  return out;
}

/** Half steps gained moving from string a up to string b: 5 per string, but 4 from G to B. */
export const stringGap = (a: number, b: number, neck: NeckId = 'guitar') => openMidi(neck)[b] - openMidi(neck)[a];
/** Whether a move between strings a and b crosses the guitar's G–B 3rd. The bass has no such gap. */
export const crossesGB = (a: number, b: number, neck: NeckId = 'guitar') => neck === 'guitar' && Math.min(a, b) <= 3 && Math.max(a, b) >= 4;

const PC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const isBlackPc = (pc: number) => [1, 3, 6, 8, 10].includes(mod(pc, 12));
/** Answer key for a pitch class on the fretboard: 'C' for naturals, 'pc_C#' for the black keys. */
export const pcKey = (pc: number) => (isBlackPc(pc) ? `pc_${PC_SHARP[mod(pc, 12)]}` : PC_SHARP[mod(pc, 12)]);
/** 'C', or 'C♯/D♭' for the black keys. */
export const pcLabel = (pc: number) =>
  isBlackPc(pc) ? `${asciiToGlyph(PC_SHARP[mod(pc, 12)])}/${asciiToGlyph(PC_FLAT[mod(pc, 12)])}` : PC_SHARP[mod(pc, 12)];
export const pcOfName = (name: string) => {
  const i = PC_SHARP.indexOf(name);
  return i >= 0 ? i : PC_FLAT.indexOf(name);
};
