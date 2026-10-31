// Pure staff / note logic for the note identification tool. No DOM, no audio —
// imported by main.jsx and by the verification script.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

// Bottom line of each staff, as a diatonic index (octave * 7 + letter).
// Treble: bottom line = E4. Bass: bottom line = G2.
export const CLEFS = {
  treble: { label: 'Treble', bottom: { letter: 2, octave: 4 } },
  bass:   { label: 'Bass',   bottom: { letter: 4, octave: 2 } },
};

// Staff positions in half-steps-of-the-staff from the bottom line:
// 0 = bottom line, 1 = first space, … 8 = top line. Even = line, odd = space.
export const RANGES = {
  staff:  { label: 'On the staff', min: -1, max: 9 },   // incl. the space just below/above, no ledger lines
  ledger: { label: 'Include ledger lines', min: -4, max: 12 }, // up to 2 ledger lines each side
};

export function diatonic(n) {
  return n.octave * 7 + n.letter;
}

export function staffPosition(n, clef) {
  return diatonic(n) - diatonic(CLEFS[clef].bottom);
}

export function noteAtPosition(p, clef) {
  const d = diatonic(CLEFS[clef].bottom) + p;
  return { letter: ((d % 7) + 7) % 7, octave: Math.floor(d / 7), acc: 0 };
}

// Even positions outside 0..8 that need a ledger line for a note at p.
export function ledgerLines(p) {
  const out = [];
  for (let q = -2; q >= p; q -= 2) out.push(q);
  for (let q = 10; q <= p; q += 2) out.push(q);
  return out;
}

export function noteMidi(n) {
  return 12 * (n.octave + 1) + NATURAL_PC[n.letter] + n.acc;
}

export function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const ACC_GLYPH = { '-1': '♭', '0': '', '1': '♯' };
export function noteLabel(n, withOctave = true) {
  return LETTERS[n.letter] + ACC_GLYPH[String(n.acc)] + (withOctave ? n.octave : '');
}

// E♯, B♯, F♭ and C♭ are real spellings but we skip them — they are rare in
// beginner reading material and make the drill feel like a trick question.
function allowedAccidentals(letter) {
  const accs = [0];
  if (letter !== 2 && letter !== 6) accs.push(1);  // no E♯, B♯
  if (letter !== 3 && letter !== 0) accs.push(-1); // no F♭, C♭
  return accs;
}

export function buildPool(clefSetting, range, accidentals) {
  const clefs = clefSetting === 'both' ? ['treble', 'bass'] : [clefSetting];
  const { min, max } = RANGES[range];
  const pool = [];
  for (const clef of clefs) {
    for (let p = min; p <= max; p++) {
      const base = noteAtPosition(p, clef);
      const accs = accidentals ? allowedAccidentals(base.letter) : [0];
      for (const acc of accs) pool.push({ clef, p, note: { ...base, acc } });
    }
  }
  return pool;
}

export function questionKey(q) {
  return q.clef + ':' + noteLabel(q.note);
}

export function pickQuestion(pool, rng = Math.random, prev = null) {
  // Avoid repeating the exact same staff position twice in a row.
  const candidates = prev ? pool.filter((q) => !(q.clef === prev.clef && q.p === prev.p)) : pool;
  const src = candidates.length ? candidates : pool;
  return src[Math.floor(rng() * src.length)];
}

export function appUrl(content) {
  return 'https://app.fifths.io/?start=found_higher_lower&utm_source=fifths.io&utm_medium=tool&utm_campaign=note-identification' +
    (content ? '&utm_content=' + encodeURIComponent(content) : '');
}
