// Questions for the Theory path: how music is built, seen on the staff and heard. A
// lesson's items say what's practised:
//   th_scale_step  'major:3'      the step from degree 3 to 4 of a major scale (W or H)
//   th_degree      'sd_5'         a scale degree, shown as a note in a key
//   th_numeral     'rn_6'         a chord in a key, named by its Roman numeral
//   th_minor_key   'mkey_E'       a minor key, shown as its key signature
//   th_seventh     'sev_m7'       a seventh chord's quality
//   th_cadence     'cad_plagal'   how a phrase ends
//   th_mode        'mode_dorian'  a mode, shown as a scale
// Keys and tonics are picked at random from the lesson's `keys` (major keys, 'Bb' style).

import type { CurriculumLevel } from '../types';
import type { AccGlyph, StaffNote } from '../notation/prompt';
import type { BuiltQuestion, Rng } from '../notation/questions';
import { LETTERS, MAJOR_KEYS, asciiToGlyph, keyAccidental, noteGlyph, parseNote, signatureLetters, staffPosition, toneName, transpose, type Note } from '../notation/theory';

const pick = <T,>(arr: readonly T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];
const ACC: Record<number, AccGlyph | undefined> = { [-2]: 'dflat', [-1]: 'flat', 0: undefined, 1: 'sharp', 2: 'dsharp' };
const glyph = (n: Note) => noteGlyph(n, false);

// ---------------------------------------------------------------------------
// Scales and modes.

export const MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] as const;
export type Mode = (typeof MODES)[number];
const MODE_SEMIS: Record<Mode, number[]> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};
const MODE_NAME: Record<Mode, string> = {
  ionian: 'Ionian (major)', dorian: 'Dorian', phrygian: 'Phrygian', lydian: 'Lydian', mixolydian: 'Mixolydian', aeolian: 'Aeolian (natural minor)', locrian: 'Locrian',
};
/** Each mode's white-note tonic: the mode you get playing C major from that note. */
const MODE_WHITE: Record<Mode, string> = { ionian: 'C', dorian: 'D', phrygian: 'E', lydian: 'F', mixolydian: 'G', aeolian: 'A', locrian: 'B' };
const MODE_SOUND: Record<Mode, string> = {
  ionian: 'the major scale itself',
  dorian: 'minor, with a bright raised 6th',
  phrygian: 'minor, with a dark ♭2 next to the tonic',
  lydian: 'major, with a floating ♯4',
  mixolydian: 'major, with a bluesy ♭7',
  aeolian: 'the natural minor scale',
  locrian: 'unstable: ♭2 and a diminished 5th',
};

/** Eight notes, tonic to tonic, correctly spelled. */
export function scaleOf(tonic: Note, mode: Mode | 'major' | 'minor'): Note[] {
  const m: Mode = mode === 'major' ? 'ionian' : mode === 'minor' ? 'aeolian' : mode;
  return [...MODE_SEMIS[m], 12].map((semis, k) => transpose(tonic, k + 1, semis));
}

const STEP_NAMES = (mode: 'major' | 'minor') => {
  const s = [...MODE_SEMIS[mode === 'major' ? 'ionian' : 'aeolian'], 12];
  return s.slice(1).map((v, k) => (v - s[k] === 1 ? 'H' : 'W'));
};

// ---------------------------------------------------------------------------
// Keys, degrees and chords.

const DEGREE_NAME = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading tone'];
const NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const RELATIVE_MAJOR: Record<string, string> = { A: 'C', E: 'G', B: 'D', 'F#': 'A', 'C#': 'E', D: 'F', G: 'Bb', C: 'Eb', F: 'Ab' };

const tonicOf = (key: string): Note => parseNote(`${key}4`);
const keyName = (key: string) => `${asciiToGlyph(key)} major`;

/** A staff note under a key signature: an accidental only where it differs from the key. */
function inKey(n: Note, sig: number, col: number, extra: Partial<StaffNote> = {}): StaffNote {
  const keyAcc = keyAccidental(n.letter, sig);
  const acc = n.acc === keyAcc ? undefined : n.acc === 0 ? 'natural' : ACC[n.acc];
  return { p: staffPosition(n, 'treble'), acc, col, ...extra };
}

/** A note with its own accidental (no key signature). */
const plain = (n: Note, col: number, extra: Partial<StaffNote> = {}): StaffNote => ({ p: staffPosition(n, 'treble'), acc: ACC[n.acc], col, ...extra });

/** The triad on a degree (1–7) of a major key, root position, spelled from the scale. */
function diatonicTriad(key: string, degree: number): Note[] {
  const sc = scaleOf(tonicOf(key), 'major');
  const at = (k: number) => {
    const n = sc[(k - 1) % 7];
    return { ...n, octave: n.octave + Math.floor((k - 1) / 7) };
  };
  return [at(degree), at(degree + 2), at(degree + 4)];
}

const qualityWord = (t: Note[]) => {
  const m = (n: Note) => 12 * n.octave + [0, 2, 4, 5, 7, 9, 11][n.letter] + n.acc;
  const third = m(t[1]) - m(t[0]);
  const fifth = m(t[2]) - m(t[0]);
  return fifth === 6 ? 'diminished' : third === 4 ? 'major' : 'minor';
};

// Seventh chords: [3rd, 5th, 7th] in half steps above the root.
export const SEVENTHS: Record<string, { semis: number[]; name: string; how: string }> = {
  maj7: { semis: [4, 7, 11], name: 'Major 7th (maj7)', how: 'a major triad with a major 7th, a half step under the octave' },
  '7': { semis: [4, 7, 10], name: 'Dominant 7th (7)', how: 'a major triad with a minor 7th, a whole step under the octave' },
  m7: { semis: [3, 7, 10], name: 'Minor 7th (m7)', how: 'a minor triad with a minor 7th' },
  m7b5: { semis: [3, 6, 10], name: 'Half-diminished (m7♭5)', how: 'a diminished triad with a minor 7th' },
  dim7: { semis: [3, 6, 9], name: 'Diminished 7th (dim7)', how: 'a diminished triad with a diminished 7th: minor 3rds all the way up' },
};

// Cadences: three chords, the last two make the ending.
export const CADENCES: Record<string, { degrees: number[]; name: string; why: string }> = {
  authentic: { degrees: [1, 5, 1], name: 'Authentic (V–I)', why: 'V to I: dominant to tonic, the strongest ending, like a full stop' },
  plagal: { degrees: [1, 4, 1], name: 'Plagal (IV–I)', why: 'IV to I: the soft "Amen" ending' },
  half: { degrees: [1, 4, 5], name: 'Half (ends on V)', why: 'it stops on V, the dominant: a comma, not a full stop' },
  deceptive: { degrees: [1, 5, 6], name: 'Deceptive (V–vi)', why: 'V sets up I, but vi arrives instead: a surprise' },
};

// ---------------------------------------------------------------------------
// Labels.

export function theoryLabel(key: string): string | null {
  let m: RegExpExecArray | null;
  if (key === 'step_W') return 'Whole step';
  if (key === 'step_H') return 'Half step';
  if ((m = /^(major|minor):([1-7])$/.exec(key))) return `${m[1] === 'major' ? 'Major' : 'Minor'} scale, ${m[2]} to ${+m[2] + 1}`;
  if ((m = /^sd_([1-7])$/.exec(key))) return `${m[1]}, ${DEGREE_NAME[+m[1] - 1]}`;
  if ((m = /^rn_([1-7])$/.exec(key))) return NUMERALS[+m[1] - 1];
  if ((m = /^mkey_(.+)$/.exec(key)) && m[1] in RELATIVE_MAJOR) return `${asciiToGlyph(m[1])} minor`;
  if ((m = /^sev_(.+)$/.exec(key)) && SEVENTHS[m[1]]) return SEVENTHS[m[1]].name;
  if ((m = /^cad_(.+)$/.exec(key)) && CADENCES[m[1]]) return CADENCES[m[1]].name;
  if ((m = /^mode_(.+)$/.exec(key)) && (MODES as readonly string[]).includes(m[1])) return MODE_NAME[m[1] as Mode].replace(/ \(.*\)$/, '');
  return null;
}

/** Answer chip for a scale-step item: whole or half. */
export const stepAnswer = (item: string) => {
  const [mode, k] = item.split(':');
  return `step_${STEP_NAMES(mode as 'major' | 'minor')[+k - 1]}`;
};

// ---------------------------------------------------------------------------
// Builders.

function q(prompt: string, staves: BuiltQuestion['visual']['staves'], explain: string, sound: string[], correctAnswer: string, extra: Partial<BuiltQuestion['visual']> = {}): BuiltQuestion {
  return { correctAnswer, rootNote: sound[0]?.replace(/-?\d+$/, '') ?? 'C', responseMode: 'select', visual: { prompt, staves, explain, sound, ...extra } };
}

function buildStep(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const [modeS, kS] = item.split(':');
  const mode = modeS as 'major' | 'minor';
  const k = +kS;
  const tonics = level.keys ?? (mode === 'major' ? ['C', 'G', 'D', 'F', 'Bb', 'A'] : ['A', 'E', 'D', 'G', 'C', 'B']);
  const sc = scaleOf(tonicOf(pick(tonics, rng)), mode);
  const steps = STEP_NAMES(mode);
  const half = steps[k - 1] === 'H';
  const where = mode === 'major' ? 'In every major scale the half steps are 3–4 and 7–8: W W H W W W H.' : 'In every natural minor scale the half steps are 2–3 and 5–6: W H W W H W W.';
  return q(
    'Whole step or half step?',
    [{ clef: 'treble', notes: sc.map((n, c) => plain(n, c, { mark: c === k - 1 || c === k })) }],
    `${glyph(sc[k - 1])} to ${glyph(sc[k])}, degrees ${k} to ${k + 1}: ${half ? 'a half step, with no key between them' : 'a whole step, two half steps'}. ${where}`,
    [toneName(sc[k - 1]), toneName(sc[k])],
    `step_${half ? 'H' : 'W'}`,
  );
}

function buildDegree(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const d = +item.replace('sd_', '');
  const key = pick(level.keys ?? ['C', 'G', 'F', 'D'], rng);
  const sig = MAJOR_KEYS[key];
  const sc = scaleOf(tonicOf(key), 'major');
  const n = sc[d - 1];
  return q(
    `In ${keyName(key)}, which scale degree is this?`,
    [{ clef: 'treble', keySig: sig, notes: [inKey(n, sig, 0)] }],
    `${keyName(key)}: ${sc.slice(0, 7).map(glyph).join(' ')}. ${glyph(n)} is note ${d}, the ${DEGREE_NAME[d - 1]}. Count up from the tonic, ${glyph(sc[0])}.`,
    [toneName(sc[0]), toneName(n)],
    item,
  );
}

function buildNumeral(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const d = +item.replace('rn_', '');
  const key = pick(level.keys ?? ['C'], rng);
  const sig = MAJOR_KEYS[key];
  const triad = diatonicTriad(key, d);
  const quality = qualityWord(triad);
  return q(
    `In ${keyName(key)}, which chord is this?`,
    [{ clef: 'treble', keySig: sig, notes: triad.map((n, i) => inKey(n, sig, 0, { root: i === 0 })) }],
    `Its root, ${glyph(triad[0])}, is note ${d} of ${keyName(key)}, and ${triad.map(glyph).join(' ')} is ${quality}: ${NUMERALS[d - 1]}. In every major key the chords run I ii iii IV V vi vii°: capitals for major, small letters for minor, ° for diminished.`,
    triad.map(toneName),
    item,
    { together: true },
  );
}

function buildMinorKey(item: string): BuiltQuestion {
  const minor = item.replace('mkey_', '');
  const major = RELATIVE_MAJOR[minor];
  const sig = MAJOR_KEYS[major];
  const letters = signatureLetters(sig).map((l) => LETTERS[l] + (sig > 0 ? '♯' : '♭'));
  const tonic = parseNote(`${minor}4`);
  const triad = [tonic, transpose(tonic, 3, 3), transpose(tonic, 5, 7)];
  return q(
    'Which minor key has this signature?',
    [{ clef: 'treble', keySig: sig, notes: [] }],
    `${sig === 0 ? 'No sharps or flats' : `${Math.abs(sig)} ${sig > 0 ? 'sharp' : 'flat'}${Math.abs(sig) > 1 ? 's' : ''} (${letters.join(' ')})`}: ${keyName(major)}, or its relative minor. The relative minor starts on the 6th note of the major scale, a minor 3rd below its tonic: ${asciiToGlyph(minor)} minor. Same notes, a different home.`,
    triad.map(toneName),
    item,
    { together: true },
  );
}

function buildSeventh(item: string, rng: Rng): BuiltQuestion {
  const id = item.replace('sev_', '');
  const def = SEVENTHS[id];
  let chord: Note[] = [];
  for (let attempt = 0; attempt < 200; attempt++) {
    const root: Note = { letter: Math.floor(rng() * 7), octave: 4, acc: attempt < 120 ? 0 : pick([-1, 0, 1], rng) };
    chord = [root, transpose(root, 3, def.semis[0]), transpose(root, 5, def.semis[1]), transpose(root, 7, def.semis[2])];
    if (chord.every((n) => Math.abs(n.acc) <= 1) && staffPosition(root, 'treble') <= 3) break;
  }
  const seventh = def.semis[2] === 11 ? 'major 7th' : def.semis[2] === 10 ? 'minor 7th' : 'diminished 7th';
  return q(
    'Which seventh chord is this?',
    [{ clef: 'treble', notes: chord.map((n, i) => plain(n, 0, { root: i === 0 })) }],
    `${chord.map(glyph).join(' ')}: ${def.how}. From the root, the top note is a ${seventh} (${def.semis[2]} half steps).`,
    chord.map(toneName),
    item,
    { together: true },
  );
}

function buildCadence(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const id = item.replace('cad_', '');
  const def = CADENCES[id];
  const key = pick(level.keys ?? ['C', 'G', 'F', 'D'], rng);
  const sig = MAJOR_KEYS[key];
  const chords = def.degrees.map((d) => diatonicTriad(key, d));
  return q(
    'How does this phrase end?',
    [{ clef: 'treble', keySig: sig, notes: chords.flatMap((t, c) => t.map((n) => inKey(n, sig, c))), labelsAfter: def.degrees.map((d) => NUMERALS[d - 1]) }],
    `In ${keyName(key)} these are ${def.degrees.map((d) => NUMERALS[d - 1]).join(' – ')}. The ending is what counts: ${def.why}.`,
    chords.flat().map(toneName),
    item,
    { chords: chords.map((t) => t.map(toneName)) },
  );
}

function buildMode(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const mode = item.replace('mode_', '') as Mode;
  const tonicName = level.allowAccidentals ? pick(['C', 'D', 'G', 'F', 'A', 'E'], rng) : MODE_WHITE[mode];
  const tonic = tonicOf(tonicName);
  const sc = scaleOf(tonic, mode);
  const major = scaleOf(tonic, 'major');
  const changed = sc.slice(0, 7).flatMap((n, k) => (n.acc !== major[k].acc ? [`${n.acc < major[k].acc ? '♭' : '♯'}${k + 1}`] : []));
  const explain = level.allowAccidentals
    ? `Compare it with ${glyph(tonic)} major (${major.slice(0, 7).map(glyph).join(' ')}): ${changed.length ? `this scale has ${changed.join(' and ')}` : 'nothing changes'}. That's ${MODE_NAME[mode]}: ${MODE_SOUND[mode]}.`
    : `The white notes from ${MODE_WHITE[mode]} to ${MODE_WHITE[mode]}: ${MODE_NAME[mode]}, ${MODE_SOUND[mode]}. Every mode is the major scale's notes with a different note as home.`;
  return q(
    'Which mode is this?',
    [{ clef: 'treble', notes: sc.map((n, c) => plain(n, c)) }],
    explain,
    sc.map(toneName),
    item,
  );
}

export function buildTheoryQuestion(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  switch (level.visualKind) {
    case 'th_scale_step': return buildStep(level, item, rng);
    case 'th_degree': return buildDegree(level, item, rng);
    case 'th_numeral': return buildNumeral(level, item, rng);
    case 'th_minor_key': return buildMinorKey(item);
    case 'th_seventh': return buildSeventh(item, rng);
    case 'th_cadence': return buildCadence(level, item, rng);
    case 'th_mode': return buildMode(level, item, rng);
    default: throw new Error(`${level.id} is not a theory lesson`);
  }
}
