// Pure piano-keyboard logic for fifths.io/tools/piano-notes/. No DOM, no
// audio — imported by main.jsx and by the verification script.
import { pcOf, isBlack, pcName, pcAscii, sharpName, flatName, midiName, weightedPick } from '../../_instrument-games/core.js';

export const PIANO_LEVELS = [
  { label: 'C D E', sub: 'around the two black keys', pcs: [0, 2, 4], acc: false },
  { label: 'F G A B', sub: 'around the three black keys', pcs: [5, 7, 9, 11], acc: false },
  { label: 'All white keys', sub: 'C to B', pcs: [0, 2, 4, 5, 7, 9, 11], acc: false },
  { label: 'Black keys', sub: 'sharps and flats', pcs: [1, 3, 6, 8, 10], acc: true },
  { label: 'Everything', sub: 'all 12 notes', pcs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], acc: true },
];

// 2 octaves (C4–B5) on phones, 3 octaves (C3–B5) on wider screens.
export function keyRange(octaves) {
  const lo = octaves >= 3 ? 48 : 60;
  return { lo, hi: lo + 12 * octaves - 1 };
}

export function keysInRange(lo, hi) {
  const out = [];
  for (let m = lo; m <= hi; m++) out.push({ midi: m, pc: pcOf(m), black: isBlack(m) });
  return out;
}

// Landmark hints built on the two- and three-black-key groups.
const HINTS = {
  0: 'C is the white key just left of the group of two black keys.',
  2: 'D sits between the two black keys.',
  4: 'E is the white key just right of the two black keys.',
  5: 'F is the white key just left of the group of three black keys.',
  7: 'G sits between the first and second of the three black keys.',
  9: 'A sits between the second and third of the three black keys.',
  11: 'B is the white key just right of the three black keys.',
  1: 'C♯/D♭ is the left key of the two-black-key group, just above C.',
  3: 'D♯/E♭ is the right key of the two-black-key group, just below E.',
  6: 'F♯/G♭ is the first key of the three-black-key group, just above F.',
  8: 'G♯/A♭ is the middle key of the three-black-key group.',
  10: 'A♯/B♭ is the last key of the three-black-key group, just below B.',
};
export function pianoHint(pc) { return HINTS[pcOf(pc)]; }

export const statKeyFor = (pc) => 'pc' + pcOf(pc);

export function makePianoQuestion({ task, level, ctx, weightOf, prev, rng = Math.random }) {
  const lv = PIANO_LEVELS[level];
  const keys = keysInRange(ctx.lo, ctx.hi).filter((k) => lv.pcs.indexOf(k.pc) >= 0);
  if (task === 'name') {
    let cands = keys.filter((k) => !prev || prev.task !== 'name' || k.midi !== prev.midi);
    // Avoid asking the same note name twice in a row when there's a choice.
    const fresh = cands.filter((k) => !prev || k.pc !== prev.pc);
    if (fresh.length) cands = fresh;
    const k = weightedPick(cands, (c) => weightOf(statKeyFor(c.pc)), rng);
    return {
      task: 'name', pos: k.midi, midi: k.midi, pc: k.pc, statKey: statKeyFor(k.pc),
      note: pcAscii(k.pc), answerShort: pcName(k.pc), answerLong: pcName(k.pc).replace('/', ' / '),
      extra: { key: midiName(k.midi).replace('♯', '#') },
    };
  }
  let pcs = lv.pcs.slice();
  if (prev && pcs.length > 1) pcs = pcs.filter((p) => p !== prev.pc);
  const pc = weightedPick(pcs, (p) => weightOf(statKeyFor(p)), rng);
  const spell = isBlack(pc) ? (rng() < 0.5 ? sharpName(pc) : flatName(pc)) : sharpName(pc);
  return {
    task: 'find', pc, spell, statKey: statKeyFor(pc), needAll: false,
    targets: keys.filter((k) => k.pc === pc).map((k) => k.midi),
    prompt: `Find ${spell} — any octave counts`, note: pcAscii(pc),
    answerShort: pcName(pc), answerLong: pcName(pc).replace('/', ' / '),
    extra: { spelled: spell.replace('♯', '#').replace('♭', 'b') },
  };
}
