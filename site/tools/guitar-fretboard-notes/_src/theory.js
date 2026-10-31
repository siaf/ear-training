// Pure fretboard logic for fifths.io/tools/guitar-fretboard-notes/. No DOM,
// no audio — imported by main.jsx and by the verification script.
import { pcOf, isBlack, pcName, pcAscii, sharpName, flatName, weightedPick } from '../../_instrument-games/core.js';

// Standard tuning, low to high, as sounding MIDI pitches: E2 A2 D3 G3 B3 E4.
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
export const STRING_LETTERS = ['E', 'A', 'D', 'G', 'B', 'E'];
export const STRING_NAMES = ['low E', 'A', 'D', 'G', 'B', 'high E'];
export const FRETS = 12; // frets 0 (open) to 12
export const INLAYS = [3, 5, 7, 9, 12];

export const FRET_LEVELS = [
  { label: 'Low E string', sub: 'naturals, frets 0–12', strings: [0], acc: false },
  { label: 'A string', sub: 'naturals, frets 0–12', strings: [1], acc: false },
  { label: 'E + A strings', sub: 'the barre-chord root strings', strings: [0, 1], acc: false },
  { label: 'D, G, B strings', sub: 'the middle strings', strings: [2, 3, 4], acc: false },
  { label: 'Whole neck', sub: 'all six strings, naturals', strings: [0, 1, 2, 3, 4, 5], acc: false },
  { label: '+ Sharps & flats', sub: 'every fret, every string', strings: [0, 1, 2, 3, 4, 5], acc: true },
];

export const fretMidi = (s, f) => OPEN_MIDI[s] + f;
export const fretPc = (s, f) => pcOf(OPEN_MIDI[s] + f);
export const posKey = (s, f) => 's' + s + 'f' + f;

export function parsePosKey(k) {
  const m = /^s(\d)f(\d+)$/.exec(k);
  return m ? { s: +m[1], f: +m[2] } : null;
}

export function stringsPhrase(strings) {
  const names = strings.slice().sort((a, b) => a - b).map((s) => STRING_NAMES[s]);
  if (names.length === 1) return `the ${names[0]} string`;
  if (names.length === 2) return `the ${names[0]} and ${names[1]} strings`;
  return `the ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} strings`;
}

export function positionLabel(s, f) {
  return `${pcName(fretPc(s, f)).replace('/', ' / ')} on the ${STRING_NAMES[s]} string (${f === 0 ? 'open' : 'fret ' + f})`;
}

// Same note, one octave up/down, using the standard octave shapes:
// two strings over and two frets along (three when the jump crosses the
// G–B pair, which is tuned a major third apart instead of a fourth).
export function octavePartner(s, f) {
  if (s <= 3) {
    const df = s <= 1 ? 2 : 3;
    if (f + df <= FRETS) return { s: s + 2, f: f + df, dir: 'up' };
  }
  if (s >= 2) {
    const df = s <= 3 ? 2 : 3;
    if (f - df >= 0) return { s: s - 2, f: f - df, dir: 'down' };
  }
  return null;
}

function chain(s, from, to) {
  const out = [];
  const step = to >= from ? 1 : -1;
  for (let f = from; ; f += step) { out.push(sharpName(fretPc(s, f))); if (f === to) break; }
  return out.join(' → ');
}

// Landmarks: open string = fret 12; fret 5 = the next string's open note
// (on the G string that's fret 4, which matches the open B string).
export function landmarksFor(s) {
  const lm = [{ f: 0, why: 'the open string' }, { f: 12, why: 'fret 12, the open string an octave up' }];
  if (s === 3) lm.push({ f: 4, why: 'fret 4, which matches the open B string' });
  else if (s < 5) lm.push({ f: 5, why: `fret 5, which matches the open ${STRING_NAMES[s + 1]} string` });
  else lm.push({ f: 5, why: 'fret 5' });
  return lm;
}

export function guitarHint(s, f) {
  const parts = [];
  const name = STRING_NAMES[s];
  if (f === 0) parts.push(`Open strings, low to high: E A D G B E. This is the ${name} string open.`);
  else if (f === 12) parts.push(`Fret 12 is the open string an octave up, so it's ${STRING_LETTERS[s]} again.`);
  else {
    const lm = landmarksFor(s).sort((a, b) => Math.abs(a.f - f) - Math.abs(b.f - f))[0];
    const d = f - lm.f;
    parts.push(`Landmark: ${lm.why} — ${sharpName(fretPc(s, lm.f))} on the ${name} string. ` +
      (d === 0 ? '' : `Count ${Math.abs(d)} fret${Math.abs(d) > 1 ? 's' : ''} ${d > 0 ? 'up' : 'down'}: ${chain(s, lm.f, f)}. No fret between E–F or B–C.`));
  }
  const o = octavePartner(s, f);
  if (o) {
    parts.push(`Octave shape: the same note is on the ${STRING_NAMES[o.s]} string, fret ${o.f}.`);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

const naturalOk = (s, f, acc) => acc || !isBlack(fretPc(s, f));

export function levelPositions(level) {
  const lv = FRET_LEVELS[level];
  const out = [];
  lv.strings.forEach((s) => { for (let f = 0; f <= FRETS; f++) if (naturalOk(s, f, lv.acc)) out.push({ s, f }); });
  return out;
}

function pickStrings(level, rng) {
  const lv = FRET_LEVELS[level];
  if (lv.strings.length <= 2) return lv.strings.slice();
  if (lv.strings.length === 3) {
    const r = rng();
    if (r < 0.35) return [lv.strings[Math.floor(rng() * 3)]];
    return r < 0.7 ? [2, 3] : [3, 4];
  }
  const a = Math.floor(rng() * 5); // adjacent pair on the whole neck
  return [a, a + 1];
}

export function makeFretQuestion({ task, level, weightOf, prev, rng = Math.random }) {
  const lv = FRET_LEVELS[level];
  if (task === 'name') {
    let cands = levelPositions(level);
    if (prev && prev.task === 'name') {
      const c2 = cands.filter((p) => !(p.s === prev.pos.s && p.f === prev.pos.f) && fretPc(p.s, p.f) !== prev.pc);
      if (c2.length) cands = c2;
    }
    const p = weightedPick(cands, (c) => weightOf(posKey(c.s, c.f)), rng);
    const pc = fretPc(p.s, p.f);
    return {
      task: 'name', pos: p, midi: fretMidi(p.s, p.f), pc, statKey: posKey(p.s, p.f),
      note: pcAscii(pc), answerShort: pcName(pc), answerLong: pcName(pc).replace('/', ' / '),
      extra: { string: STRING_NAMES[p.s], fret: p.f },
    };
  }
  const strings = pickStrings(level, rng);
  const positions = [];
  strings.forEach((s) => { for (let f = 0; f <= FRETS; f++) positions.push({ s, f }); });
  let pcs = [];
  for (let pc = 0; pc < 12; pc++) if (lv.acc || !isBlack(pc)) pcs.push(pc);
  if (prev && prev.task === 'find') pcs = pcs.filter((p) => p !== prev.pc);
  const pc = weightedPick(pcs, (p) => Math.max.apply(null,
    positions.filter((q) => fretPc(q.s, q.f) === p).map((q) => weightOf(posKey(q.s, q.f))).concat([1])), rng);
  const spell = isBlack(pc) ? (rng() < 0.5 ? sharpName(pc) : flatName(pc)) : sharpName(pc);
  const targets = positions.filter((q) => fretPc(q.s, q.f) === pc);
  return {
    task: 'find', pc, spell, strings, targets, needAll: true,
    prompt: `Find every ${spell} on ${stringsPhrase(strings)}`,
    note: pcAscii(pc), answerShort: pcName(pc), answerLong: pcName(pc).replace('/', ' / '),
    extra: { strings: strings.map((s) => STRING_NAMES[s]).join('+'), spelled: spell.replace('♯', '#').replace('♭', 'b') },
  };
}
