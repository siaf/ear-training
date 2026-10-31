// Pure interval logic for the interval ear trainer. No DOM, no audio —
// imported by main.jsx and by the verification script.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

// st = semitones; generic = letter steps (2nd = 1 … octave = 7).
// The tritone is listed with generic 3 (augmented 4th) but spellQuestion also
// tries 4 (diminished 5th) and keeps whichever needs fewer accidentals.
export const INTERVALS = [
  { st: 1,  short: 'm2', name: 'Minor 2nd',   generic: 1 },
  { st: 2,  short: 'M2', name: 'Major 2nd',   generic: 1 },
  { st: 3,  short: 'm3', name: 'Minor 3rd',   generic: 2 },
  { st: 4,  short: 'M3', name: 'Major 3rd',   generic: 2 },
  { st: 5,  short: 'P4', name: 'Perfect 4th', generic: 3 },
  { st: 6,  short: 'TT', name: 'Tritone',     generic: 3 },
  { st: 7,  short: 'P5', name: 'Perfect 5th', generic: 4 },
  { st: 8,  short: 'm6', name: 'Minor 6th',   generic: 5 },
  { st: 9,  short: 'M6', name: 'Major 6th',   generic: 5 },
  { st: 10, short: 'm7', name: 'Minor 7th',   generic: 6 },
  { st: 11, short: 'M7', name: 'Major 7th',   generic: 6 },
  { st: 12, short: 'P8', name: 'Octave',      generic: 7 },
];

export function intervalBySemitones(st) {
  return INTERVALS.find((i) => i.st === st) || null;
}

export const PRESETS = {
  fourths_fifths: { label: '4ths & 5ths', semis: [5, 7] },
  thirds:         { label: '3rds',        semis: [3, 4] },
  all:            { label: 'All within an octave', semis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  custom:         { label: 'Custom',      semis: null },
};

export const DIRECTIONS = {
  asc:  { label: 'Ascending' },
  desc: { label: 'Descending' },
  harm: { label: 'Harmonic' },
};

// Preset + direction → app lesson id (src/curriculum.ts). Anything not listed
// falls back to the app's first interval lesson.
const LESSON_MAP = {
  'fourths_fifths:harm': 'int_harmonic_4ths_5ths',
  'fourths_fifths:asc':  'int_melodic_4ths_5ths_asc',
  'fourths_fifths:desc': 'int_melodic_4ths_5ths_desc',
  'thirds:harm':         'int_harmonic_3rds',
  'thirds:asc':          'int_melodic_3rds_asc',
  'thirds:desc':         'int_melodic_3rds_desc',
  'all:harm':            'int_all_harmonic',
  'all:asc':             'int_all_melodic_asc',
  'all:desc':            'int_all_melodic_desc',
};
export const DEFAULT_LESSON = 'int_harmonic_4ths_5ths';

export function lessonIdFor(preset, direction) {
  return LESSON_MAP[preset + ':' + direction] || DEFAULT_LESSON;
}

export function appUrl(lessonId, content) {
  const q = 'start=' + encodeURIComponent(lessonId) +
    '&utm_source=fifths.io&utm_medium=tool&utm_campaign=interval-ear-trainer' +
    (content ? '&utm_content=' + encodeURIComponent(content) : '');
  return 'https://app.fifths.io/?' + q;
}

// ---- Notes -------------------------------------------------------------
// A spelled note: { letter: 0-6 (C..B), acc: -2..2, octave } (scientific
// pitch notation, C4 = middle C = MIDI 60).

export function noteMidi(n) {
  return 12 * (n.octave + 1) + NATURAL_PC[n.letter] + n.acc;
}

const ACC_GLYPH = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
export function noteLabel(n, withOctave = true) {
  return LETTERS[n.letter] + ACC_GLYPH[String(n.acc)] + (withOctave ? n.octave : '');
}

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// Candidate spellings for each pitch class (no double accidentals, no E♯/B♯/F♭/C♭ roots).
const PC_SPELLINGS = {
  0: [[0, 0]], 1: [[1, -1], [0, 1]], 2: [[1, 0]], 3: [[2, -1], [1, 1]],
  4: [[2, 0]], 5: [[3, 0]], 6: [[3, 1], [4, -1]], 7: [[4, 0]],
  8: [[5, -1], [4, 1]], 9: [[5, 0]], 10: [[6, -1], [5, 1]], 11: [[6, 0]],
};

function spellMidi(midi, letter, acc) {
  // Octave of the letter is chosen so that natural+acc hits the target midi.
  const octave = Math.floor((midi - NATURAL_PC[letter] - acc) / 12) - 1;
  return { letter, acc, octave };
}

// Move `generic` letter steps from `from` (up if dir=+1, down if -1) and
// pick the accidental that lands on `targetMidi`.
function stepTo(from, generic, dir, targetMidi) {
  const d = from.octave * 7 + from.letter + dir * generic;
  const letter = ((d % 7) + 7) % 7;
  const octave = Math.floor(d / 7);
  const natural = 12 * (octave + 1) + NATURAL_PC[letter];
  return { letter, acc: targetMidi - natural, octave };
}

/**
 * Spell an interval starting from rootMidi.
 * direction 'asc' | 'harm' → second note is above root; 'desc' → below.
 * Returns { first, second } spelled notes with no double accidentals,
 * choosing the root spelling (and tritone spelling) with fewest accidentals.
 */
export function spellInterval(rootMidi, semis, direction) {
  const dir = direction === 'desc' ? -1 : 1;
  const iv = intervalBySemitones(semis);
  const generics = semis === 6 ? [3, 4] : [iv.generic];
  const targetMidi = rootMidi + dir * semis;
  let best = null;
  for (const [letter, acc] of PC_SPELLINGS[((rootMidi % 12) + 12) % 12]) {
    const first = spellMidi(rootMidi, letter, acc);
    for (const g of generics) {
      const second = stepTo(first, g, dir, targetMidi);
      if (Math.abs(second.acc) > 1) continue;
      const cost = Math.abs(first.acc) + Math.abs(second.acc);
      if (!best || cost < best.cost) best = { first, second, cost };
    }
  }
  return best ? { first: best.first, second: best.second } : null;
}

/**
 * Build a random question.
 * randomRoot=false → root is always C4 (asc / harm) or C5 (desc), so the
 * interval always starts on C and both notes stay in a comfortable range.
 */
export function makeQuestion(semisPool, direction, randomRoot, rng = Math.random, avoidSemis = null) {
  let pool = semisPool;
  if (avoidSemis != null && pool.length > 2) pool = pool.filter((s) => s !== avoidSemis);
  const semis = pool[Math.floor(rng() * pool.length)];
  let rootMidi;
  if (!randomRoot) {
    rootMidi = direction === 'desc' ? 72 : 60;
  } else if (direction === 'desc') {
    rootMidi = 60 + Math.floor(rng() * 13); // C4..C5, falls to as low as C3
  } else {
    rootMidi = 48 + Math.floor(rng() * 13); // C3..C4, rises to as high as C5
  }
  const spelled = spellInterval(rootMidi, semis, direction);
  return { semis, direction, rootMidi, first: spelled.first, second: spelled.second };
}
