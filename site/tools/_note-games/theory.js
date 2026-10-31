// Pure staff / note logic shared by every note-reading game page.
// No DOM, no audio: imported by game.jsx, staff.js and the verification scripts.
// Extended from site/tools/note-identification/_src/theory.js.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

// Staff positions count staff steps from the bottom line:
// 0 = bottom line, 1 = first space, ... 8 = top line. Even = line, odd = space.
// Negative = below the staff, > 8 = above it.
//
// Each clef is defined by the note on its bottom line, as a diatonic index
// (octave * 7 + letter, C = 0).
//   Treble: bottom line E4, the G clef curls round G4 (p 2).
//   Bass:   bottom line G2, the F clef's dots straddle F3 (p 6).
//   Alto:   bottom line F3, the C clef points at middle C on the middle line (p 4).
//   Tenor:  bottom line D3, the C clef points at middle C on the 4th line (p 6).
export const CLEFS = {
  treble: { label: 'Treble', bottom: { letter: 2, octave: 4 }, refP: 2 },
  bass:   { label: 'Bass',   bottom: { letter: 4, octave: 2 }, refP: 6 },
  alto:   { label: 'Alto',   bottom: { letter: 3, octave: 3 }, refP: 4 },
  tenor:  { label: 'Tenor',  bottom: { letter: 1, octave: 3 }, refP: 6 },
};

export function diatonic(n) {
  return n.octave * 7 + n.letter;
}

export function staffPosition(n, clef) {
  return diatonic(n) - diatonic(CLEFS[clef].bottom);
}

export function noteAtPosition(p, clef, acc = 0) {
  const d = diatonic(CLEFS[clef].bottom) + p;
  return { letter: ((d % 7) + 7) % 7, octave: Math.floor(d / 7), acc };
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

export const ACC_GLYPH = { '-1': '♭', '0': '', '1': '♯' };
export function noteLabel(n, withOctave = true) {
  return LETTERS[n.letter] + ACC_GLYPH[String(n.acc)] + (withOctave ? n.octave : '');
}

// ---- Per-clef reading aids ------------------------------------------------
// Lines / spaces bottom to top, a memory aid for each, and landmark notes.
export const CLEF_INFO = {
  treble: {
    lines: 'E G B D F', linesMn: 'Every Good Boy Does Fine',
    spaces: 'F A C E', spacesMn: 'they spell FACE',
    landmarks: [
      { p: 2, name: 'treble G', where: 'the line the clef curls around' },
      { p: -2, name: 'middle C', where: 'one ledger line below the staff' },
      { p: 5, name: 'treble C (C5)', where: 'the third space' },
      { p: 0, name: 'bottom-line E', where: 'the bottom line' },
      { p: 8, name: 'top-line F', where: 'the top line' },
      { p: 12, name: 'high C (C6)', where: 'two ledger lines above' },
    ],
  },
  bass: {
    lines: 'G B D F A', linesMn: 'Good Boys Do Fine Always',
    spaces: 'A C E G', spacesMn: 'All Cows Eat Grass',
    landmarks: [
      { p: 6, name: 'bass F', where: "the line between the clef's two dots" },
      { p: 10, name: 'middle C', where: 'one ledger line above the staff' },
      { p: 3, name: 'bass C (C3)', where: 'the second space' },
      { p: 0, name: 'bottom-line G', where: 'the bottom line' },
      { p: 8, name: 'top-line A', where: 'the top line' },
      { p: -4, name: 'low C (C2)', where: 'two ledger lines below' },
    ],
  },
  alto: {
    lines: 'F A C E G', linesMn: 'FACE, then G',
    spaces: 'G B D F', spacesMn: 'Good Boys Do Fine',
    landmarks: [
      { p: 4, name: 'middle C', where: 'the middle line, where the clef points' },
      { p: 0, name: 'bottom-line F', where: 'the bottom line' },
      { p: 8, name: 'top-line G', where: 'the top line' },
      { p: -3, name: 'C3', where: "just below the first ledger line, the viola's open C string" },
      { p: 11, name: 'C5', where: 'just above the first ledger line above the staff' },
    ],
  },
  tenor: {
    lines: 'D F A C E', linesMn: 'D, then FACE',
    spaces: 'E G B D', spacesMn: 'Every Good Boy Does',
    landmarks: [
      { p: 6, name: 'middle C', where: 'the fourth line, where the clef points' },
      { p: 0, name: 'bottom-line D', where: 'the bottom line' },
      { p: 4, name: 'middle-line A', where: 'the middle line' },
      { p: 8, name: 'top-line E', where: 'the top line' },
      { p: -1, name: 'C3', where: 'the space just below the staff' },
      { p: 13, name: 'C5', where: 'just above the second ledger line' },
    ],
  },
};

const STEP_WORDS = ['', 'one step', 'two steps', 'three steps', 'four steps', 'five steps'];

// A short reading hint for an item. Returns { main, landmark, spoils }; text may be ''.
export function hintFor(item) {
  const { clef, p } = item;
  const info = CLEF_INFO[clef];
  const name = CLEFS[clef].label;
  let main = '';
  if (p >= 0 && p <= 8 && p % 2 === 0) main = `Line note. ${name} clef lines, bottom to top: ${info.lines} (${info.linesMn}).`;
  else if (p >= 1 && p <= 7) main = `Space note. ${name} clef spaces, bottom to top: ${info.spaces} (${info.spacesMn}).`;
  else if (p < 0) main = `Below the ${name.toLowerCase()} staff: count down line, space, line from the bottom line (${noteLabel(noteAtPosition(0, clef), false)}).`;
  else main = `Above the ${name.toLowerCase()} staff: count up line, space, line from the top line (${noteLabel(noteAtPosition(8, clef), false)}).`;

  let best = null;
  for (const lm of info.landmarks) {
    const d = Math.abs(p - lm.p);
    if (!best || d < best.d) best = { lm, d };
  }
  let landmark = '';
  if (best && best.d === 0) landmark = `Landmark note: ${best.lm.name}, ${best.lm.where}.`;
  else if (best && best.d <= 3) {
    landmark = `${STEP_WORDS[best.d][0].toUpperCase() + STEP_WORDS[best.d].slice(1)} ${p > best.lm.p ? 'above' : 'below'} ${best.lm.name} (${best.lm.where}).`;
  }
  if (item.acc) {
    const g = item.acc === 1 ? 'sharp raises' : 'flat lowers';
    main = `The letter comes from the line or space; the ${g} it a semitone. ` + main;
  }
  // `spoils` = the landmark line names the note itself (hide it in pre-answer hints).
  return { main, landmark, spoils: !!best && best.d === 0 };
}

// ---- Pools, levels, games -------------------------------------------------
// E♯, B♯, F♭ and C♭ are real spellings but we skip them: rare in reading
// material and they make the drill feel like a trick question.
export function allowedAccidentals(letter) {
  const accs = [0];
  if (letter !== 2 && letter !== 6) accs.push(1);  // no E♯, B♯
  if (letter !== 3 && letter !== 0) accs.push(-1); // no F♭, C♭
  return accs;
}

function at(clef, ps, acc = false) {
  const out = [];
  for (const p of ps) {
    const accs = acc ? allowedAccidentals(noteAtPosition(p, clef).letter) : [0];
    for (const a of accs) out.push({ clef, p, acc: a });
  }
  return out;
}
function span(a, b) { const o = []; for (let p = a; p <= b; p++) o.push(p); return o; }
const LINES = [0, 2, 4, 6, 8];
const SPACES = [1, 3, 5, 7];
const lbl = (clef, p) => noteLabel(noteAtPosition(p, clef));
const rangeDesc = (clef, a, b) => `${lbl(clef, a)} to ${lbl(clef, b)}`;

function singleClefLevels(clef, extra) {
  const lv = [];
  if (extra) lv.push(extra);
  lv.push(
    { name: 'Line notes', desc: CLEF_INFO[clef].lines, pool: at(clef, LINES) },
    { name: 'Space notes', desc: CLEF_INFO[clef].spaces, pool: at(clef, SPACES) },
    { name: 'Whole staff', desc: rangeDesc(clef, -1, 9), pool: at(clef, span(-1, 9)) },
    { name: '+ Ledger lines', desc: rangeDesc(clef, -4, 12), pool: at(clef, span(-4, 12)) },
    { name: '+ Sharps & flats', desc: '♯ and ♭, ' + rangeDesc(clef, -2, 10), pool: at(clef, span(-2, 10), true), acc: true },
  );
  return lv;
}

export const GAMES = {
  treble: {
    slug: 'treble-clef-notes', title: 'Treble clef', noun: 'treble clef notes',
    clefs: ['treble'], levels: singleClefLevels('treble'),
  },
  bass: {
    slug: 'bass-clef-notes', title: 'Bass clef', noun: 'bass clef notes',
    clefs: ['bass'], levels: singleClefLevels('bass'),
  },
  alto: {
    slug: 'alto-clef-notes', title: 'Alto clef', noun: 'alto clef notes',
    clefs: ['alto'],
    levels: singleClefLevels('alto', { name: 'Middle C zone', desc: 'A3 to E4 round middle C', pool: at('alto', span(2, 6)) }),
  },
  tenor: {
    slug: 'tenor-clef-notes', title: 'Tenor clef', noun: 'tenor clef notes',
    clefs: ['tenor'],
    levels: singleClefLevels('tenor', { name: 'Middle C zone', desc: 'A3 to E4 round middle C', pool: at('tenor', span(4, 8)) }),
  },
  grand: {
    slug: 'grand-staff-notes', title: 'Grand staff', noun: 'grand staff notes',
    clefs: ['treble', 'bass'], grand: true,
    levels: [
      { name: 'Landmark notes', desc: 'Middle C, treble G, bass F, C3 and C5', pool: [...at('treble', [-2, 2, 5]), ...at('bass', [10, 6, 3])] },
      { name: 'Both staves', desc: 'F2 to B3 and D4 to G5', pool: [...at('treble', span(-1, 9)), ...at('bass', span(-1, 9))] },
      { name: '+ Ledger lines', desc: '+ A3 to E4 between the staves', pool: [...at('treble', span(-4, 9)), ...at('bass', span(-1, 12))] },
      { name: '+ Sharps & flats', desc: '♯ and ♭ on both staves', pool: [...at('treble', span(-2, 9), true), ...at('bass', span(-1, 10), true)], acc: true },
    ],
  },
  mixed: {
    slug: 'note-identification', title: 'Mixed clefs', noun: 'notes in mixed clefs',
    clefs: ['treble', 'bass', 'alto', 'tenor'],
    levels: [
      { name: 'Treble + bass', desc: 'On the staff, clefs mixed', pool: [...at('treble', span(-1, 9)), ...at('bass', span(-1, 9))] },
      { name: '+ Alto & tenor', desc: 'All four clefs, on the staff', pool: ['treble', 'bass', 'alto', 'tenor'].flatMap((c) => at(c, span(-1, 9))) },
      { name: '+ Ledger lines', desc: 'All four clefs, two ledger lines', pool: ['treble', 'bass', 'alto', 'tenor'].flatMap((c) => at(c, span(-3, 11))) },
      { name: '+ Sharps & flats', desc: 'All four clefs with ♯ and ♭', pool: ['treble', 'bass', 'alto', 'tenor'].flatMap((c) => at(c, span(-1, 9), true)), acc: true },
    ],
  },
};

// Positions shown in the per-note stats chart, per clef (union of all levels).
export function statPositions(game, clef) {
  const ps = new Set();
  for (const lv of GAMES[game].levels) for (const it of lv.pool) if (it.clef === clef) ps.add(it.p);
  return [...ps].sort((a, b) => a - b);
}

export function itemKey(it) {
  return it.clef + ':' + it.p + ':' + it.acc;
}
export function itemNote(it) {
  return noteAtPosition(it.p, it.clef, it.acc);
}
export function itemLabel(it) {
  return noteLabel(itemNote(it));
}

// Weighted pick: notes you miss (all-time stats) and notes missed in the last
// few answers come back more often. Never the same staff position twice running.
export function itemWeight(it, stats, recentMisses) {
  const s = (stats && stats[itemKey(it)]) || { n: 0, ok: 0 };
  const err = (s.n - s.ok + 1) / (s.n + 2); // 0.5 when unseen
  let w = 0.4 + 3 * err;
  if (recentMisses && recentMisses.indexOf(itemKey(it)) >= 0) w *= 3;
  return w;
}

export function pickItem(pool, stats, recentMisses, prev, rng = Math.random) {
  let src = prev ? pool.filter((q) => !(q.clef === prev.clef && q.p === prev.p)) : pool;
  if (!src.length) src = pool;
  const ws = src.map((it) => itemWeight(it, stats, recentMisses));
  const total = ws.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < src.length; i++) { r -= ws[i]; if (r <= 0) return src[i]; }
  return src[src.length - 1];
}

// Sprint scoring: 10 points per note x combo multiplier. The multiplier steps
// up every 5 correct answers in a row (x1, x2, x3, x4 max) and resets on a miss.
export function multiplierFor(streakBefore) {
  return Math.min(4, 1 + Math.floor(streakBefore / 5));
}

export const UNLOCK_WINDOW = 15;
export const UNLOCK_ACCURACY = 0.85;
export function shouldUnlock(recent) {
  if (recent.length < UNLOCK_WINDOW) return false;
  const last = recent.slice(-UNLOCK_WINDOW);
  return last.filter(Boolean).length / UNLOCK_WINDOW >= UNLOCK_ACCURACY;
}

export function appUrl(slug, content) {
  return 'https://app.fifths.io/?utm_source=fifths.io&utm_medium=tool&utm_campaign=' + slug +
    (content ? '&utm_content=' + encodeURIComponent(content) : '');
}
