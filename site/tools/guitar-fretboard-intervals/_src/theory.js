// Pure interval logic for fifths.io/tools/guitar-fretboard-intervals/. No DOM,
// no audio. Reuses the fretboard geometry from guitar-fretboard-notes.
import { weightedPick } from '../../_instrument-games/core.js';
import { OPEN_MIDI, STRING_NAMES, FRETS, fretMidi, posKey } from '../../guitar-fretboard-notes/_src/theory.js';

export const INTERVALS = [
  { key: 'm2', semis: 1, name: 'minor 2nd' },
  { key: 'M2', semis: 2, name: 'major 2nd' },
  { key: 'm3', semis: 3, name: 'minor 3rd' },
  { key: 'M3', semis: 4, name: 'major 3rd' },
  { key: 'P4', semis: 5, name: 'perfect 4th' },
  { key: 'TT', semis: 6, name: 'tritone' },
  { key: 'P5', semis: 7, name: 'perfect 5th' },
  { key: 'm6', semis: 8, name: 'minor 6th' },
  { key: 'M6', semis: 9, name: 'major 6th' },
  { key: 'm7', semis: 10, name: 'minor 7th' },
  { key: 'M7', semis: 11, name: 'major 7th' },
  { key: 'P8', semis: 12, name: 'octave' },
];
export const IV = {};
INTERVALS.forEach((iv) => { IV[iv.key] = iv; });

const ALL = INTERVALS.map((iv) => iv.key);
export const IV_LEVELS = [
  { label: '4th, 5th, octave', sub: 'power-chord shapes', ivs: ['P4', 'P5', 'P8'], roots: [0, 1] },
  { label: 'Major & minor 3rds', sub: 'the shapes inside every chord', ivs: ['m3', 'M3', 'P5', 'P8'], roots: [0, 1] },
  { label: 'Major scale', sub: 'M2, M3, P4, P5, M6, M7, P8', ivs: ['M2', 'M3', 'P4', 'P5', 'M6', 'M7', 'P8'], roots: [0, 1] },
  { label: 'All 12', sub: 'root on the low E or A string', ivs: ALL, roots: [0, 1] },
  { label: 'Root anywhere', sub: 'all 12, roots on any string', ivs: ALL, roots: [0, 1, 2, 3, 4] },
];

export const ivLabel = (k) => (IV[k] ? `${IV[k].name} (${k})` : k);

// Half steps gained by moving from string a up to string b (a <= b):
// 5 per string, but 4 across the G–B pair.
export const stringGap = (a, b) => OPEN_MIDI[b] - OPEN_MIDI[a];

// Where an interval sits within one hand position of a root: on the root's
// string or up to three strings higher, three frets back to four frets up.
// These are the shapes a guitarist actually plays.
export function shapeTargets(root, semis) {
  const out = [];
  for (let s = root.s; s <= Math.min(5, root.s + 3); s++) {
    const f = root.f + semis - stringGap(root.s, s);
    if (f >= 0 && f <= FRETS && f >= root.f - 3 && f <= root.f + 4 && !(s === root.s && f === root.f)) out.push({ s, f });
  }
  return out;
}

// Every spot on frets 0–12 with exactly the right pitch (any string).
export function pitchTargets(root, semis) {
  const want = fretMidi(root.s, root.f) + semis;
  const out = [];
  for (let s = 0; s < 6; s++) {
    const f = want - OPEN_MIDI[s];
    if (f >= 0 && f <= FRETS) out.push({ s, f });
  }
  return out;
}

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const STRINGS_UP = ['on the same string', 'one string up', 'two strings up', 'three strings up'];

export function describeShape(root, t) {
  const ds = t.s - root.s;
  const df = t.f - root.f;
  const where = ds >= 0 && ds <= 3 ? STRINGS_UP[ds] : `on the ${STRING_NAMES[t.s]} string`;
  const along = df === 0 ? 'the same fret' : `${plural(Math.abs(df), 'fret')} ${df > 0 ? 'up' : 'back'}`;
  return `${where}, ${along}`;
}

const crossesGB = (a, b) => a <= 3 && b >= 4;
const GB_NOTE = 'Each fret is a half step; each string up adds 5 half steps, but only 4 from the G string to the B string, so shapes shift up a fret when they cross that pair.';

export function intervalHint(q) {
  const iv = IV[q.statKey];
  if (q.task === 'name') {
    const ds = q.pos.s - q.root.s;
    const df = q.pos.f - q.root.f;
    const strings = ds === 0 ? '' : `${plural(ds, 'string')} up (${stringGap(q.root.s, q.pos.s)} half steps${crossesGB(q.root.s, q.pos.s) ? ', crossing G–B' : ''}) `;
    const frets = df === 0 ? '' : `${strings ? 'and ' : ''}${plural(Math.abs(df), 'fret')} ${df > 0 ? 'up' : 'back'} (${df > 0 ? '+' : '−'}${Math.abs(df)})`;
    return `The dot is ${strings}${frets} from the root: ${iv.semis} half steps in all. ${GB_NOTE}`;
  }
  return `The ${iv.name} is ${plural(iv.semis, 'half step')} above the root. ${GB_NOTE}`;
}

function pickRoot(lv, semis, rng) {
  for (let tries = 0; tries < 40; tries++) {
    const s = lv.roots[Math.floor(rng() * lv.roots.length)];
    const f = Math.floor(rng() * 11); // root on frets 0–10
    if (shapeTargets({ s, f }, semis).length) return { s, f };
  }
  return { s: 0, f: 3 };
}

export function makeIntervalQuestion({ task, level, weightOf, prev, rng = Math.random }) {
  const lv = IV_LEVELS[level];
  let keys = lv.ivs;
  if (prev && keys.length > 2) keys = keys.filter((k) => k !== prev.statKey);
  const key = weightedPick(keys, (k) => weightOf(k), rng);
  const iv = IV[key];
  const root = pickRoot(lv, iv.semis, rng);
  const rootMidi = fretMidi(root.s, root.f);
  const base = {
    root, rootMidi, statKey: key, answerKey: key, note: key,
    answerShort: key, answerLong: ivLabel(key),
    extra: { root_string: STRING_NAMES[root.s], root_fret: root.f },
  };
  if (task === 'name') {
    const opts = shapeTargets(root, iv.semis);
    const pos = opts[Math.floor(rng() * opts.length)];
    return Object.assign(base, {
      task: 'name', pos, midi: rootMidi + iv.semis, focusF: Math.round((root.f + pos.f) / 2),
      extra: Object.assign(base.extra, { shape: `${pos.s - root.s}:${pos.f - root.f}` }),
    });
  }
  return Object.assign(base, {
    task: 'find', midi: rootMidi + iv.semis, targets: pitchTargets(root, iv.semis), needAll: false,
    focusF: root.f, prompt: `Find the ${iv.name} above the root`,
  });
}

export { posKey };
