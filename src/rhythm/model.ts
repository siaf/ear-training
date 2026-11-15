// Rhythms for the Rhythm path: how they're written down, when each note sounds, and how
// each note is counted. Plain data, so questions can be built and tested without drawing
// anything. src/components/rhythm/RhythmStaff.tsx draws them.
//
// A rhythm is written as a short string of tokens, one per note or rest:
//   w h q e s     whole, half, quarter, eighth, sixteenth
//   .             after a value: dotted (half again as long)   'q.'
//   r             after a value: a rest                         'qr'  'er'
//   ~             after a value: tied to the next note          'q~e' or 'q~ e'
//   t             a triplet eighth (three in the time of two eighths): 't t t'
// So 'q e e q. e' is quarter, two eighths, dotted quarter, eighth.
//
// Durations are in ticks, 12 to a quarter note, so triplets (4 ticks) and sixteenths (3)
// are whole numbers.

export const Q = 12;

export interface RNote {
  t: number; // duration in ticks
  rest?: boolean;
  tie?: boolean; // tied to the next note, so the next one doesn't sound again
  trip?: boolean; // a triplet eighth
}

export interface TimeSig {
  beats: number; // top number
  unit: 4 | 8; // bottom number
}

export const T44: TimeSig = { beats: 4, unit: 4 };
export const T34: TimeSig = { beats: 3, unit: 4 };
export const T24: TimeSig = { beats: 2, unit: 4 };
export const T68: TimeSig = { beats: 6, unit: 8 };

export const parseTime = (s: string): TimeSig => {
  const [b, u] = s.split('/').map(Number);
  return { beats: b, unit: u as 4 | 8 };
};
export const timeKey = (ts: TimeSig) => `${ts.beats}/${ts.unit}`;

/** Ticks in one bar. */
export const barTicks = (ts: TimeSig) => ts.beats * (ts.unit === 4 ? Q : Q / 2);
/** Ticks in one felt beat: a quarter in x/4, a dotted quarter in 6/8. */
export const beatTicks = (ts: TimeSig) => (ts.unit === 8 && ts.beats % 3 === 0 ? (Q * 3) / 2 : ts.unit === 4 ? Q : Q / 2);
/** Felt beats in a bar: 4 in 4/4, 2 in 6/8. */
export const beatsPerBar = (ts: TimeSig) => barTicks(ts) / beatTicks(ts);

const BASE: Record<string, number> = { w: 4 * Q, h: 2 * Q, q: Q, e: Q / 2, s: Q / 4 };

export function parseRhythm(src: string): RNote[] {
  return src
    .replace(/~(?=\S)/g, '~ ') // 'q~e' and 'q~ e' both tie
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const m = /^([whqest])(\.?)(r?)(~?)$/.exec(tok);
      if (!m) throw new Error(`Not a rhythm token: ${tok}`);
      if (m[1] === 't') return { t: Q / 3, trip: true, ...(m[3] ? { rest: true } : {}), ...(m[4] ? { tie: true } : {}) };
      const t = BASE[m[1]] * (m[2] ? 1.5 : 1);
      const note: RNote = { t };
      if (m[3]) note.rest = true;
      if (m[4]) note.tie = true;
      return note;
    });
}

export const rhythmTicks = (notes: RNote[]) => notes.reduce((a, n) => a + n.t, 0);

/** Start tick of every note. */
export function starts(notes: RNote[]): number[] {
  const out: number[] = [];
  let at = 0;
  for (const n of notes) {
    out.push(at);
    at += n.t;
  }
  return out;
}

/** Whether note i is heard as a new sound: not a rest, and not the far end of a tie. */
export const sounds = (notes: RNote[], i: number) => !notes[i].rest && !(i > 0 && notes[i - 1].tie);

/** When each sounding note starts, in felt beats from the start of the bar (for playback and grading). */
export function onsets(notes: RNote[], ts: TimeSig): number[] {
  const st = starts(notes);
  const bt = beatTicks(ts);
  return notes.flatMap((_, i) => (sounds(notes, i) ? [st[i] / bt] : []));
}

// ---------------------------------------------------------------------------
// Counting. In x/4: "1 e & a" for sixteenths, "1 trip let" for triplets. In 6/8 every
// eighth gets a number: "1 2 3 4 5 6".

const SUB16 = ['', 'e', '&', 'a'];
const SUBTRIP = ['', 'trip', 'let'];

/** The count a note starting at this tick is said on: '1', '2&', '3e', '1trip', or in 6/8 '4'. */
export function countAt(tick: number, ts: TimeSig): string {
  if (ts.unit === 8) return String(Math.floor(tick / (Q / 2)) + 1) + (tick % (Q / 2) ? '+' : '');
  const beat = Math.floor(tick / Q) + 1;
  const within = tick % Q;
  if (within % 3 === 0) return `${beat}${SUB16[within / 3]}`;
  if (within % 4 === 0) return `${beat}${SUBTRIP[within / 4]}`;
  return `${beat}?`;
}

/** The count under every note (rests too), as written in a counting exercise. */
export const countsOf = (notes: RNote[], ts: TimeSig) => starts(notes).map((t) => countAt(t, ts));

/** Every count in a bar at a grid ('8' = eighths, '16' = sixteenths, 't' = triplets), for saying a bar aloud. */
export function countGrid(ts: TimeSig, grid: '4' | '8' | '16' | 't'): string[] {
  const step = ts.unit === 8 ? Q / 2 : grid === '4' ? Q : grid === '8' ? Q / 2 : grid === '16' ? Q / 4 : Q / 3;
  const out: string[] = [];
  for (let t = 0; t < barTicks(ts); t += step) out.push(countAt(t, ts));
  return out;
}

/** How a count is shown: '2&' → '2 &', '3trip' → '3 trip'. */
export const countLabel = (c: string) => c.replace(/^(\d+)(.+)$/, '$1 $2');

// ---------------------------------------------------------------------------
// Words, for item labels and explanations.

const VALUE_NAME: Record<number, string> = { 48: 'whole', 36: 'dotted half', 24: 'half', 18: 'dotted quarter', 12: 'quarter', 9: 'dotted eighth', 6: 'eighth', 3: 'sixteenth' };

export function noteName(n: RNote): string {
  if (n.trip) return n.rest ? 'triplet rest' : 'triplet';
  const v = VALUE_NAME[n.t] ?? `${n.t / Q}-beat`;
  return n.rest ? `${v} rest` : v;
}

/** 'quarter, two eighths, half': consecutive equal notes grouped. */
export function describe(notes: RNote[]): string {
  const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  const parts: string[] = [];
  for (let i = 0; i < notes.length; ) {
    const name = noteName(notes[i]) + (notes[i].tie ? ' tied to' : '');
    let j = i + 1;
    while (j < notes.length && noteName(notes[j]) + (notes[j].tie ? ' tied to' : '') === name && !notes[j - 1].tie) j++;
    const k = j - i;
    parts.push(k === 1 ? name : `${NUM[k] ?? k} ${name.replace(/(rest|eighth|quarter|half|whole|sixteenth|triplet)$/, '$1s').replace(/(\w+) tied to$/, '$1s tied to')}`);
    i = j;
  }
  return parts.join(', ').replace(/ tied to, /g, ' tied to ');
}

/** Beats a value lasts, in quarter-note beats ('1½'). */
export function beatsWords(t: number): string {
  const b = t / Q;
  const whole = Math.floor(b);
  const frac = b - whole;
  const fr = frac === 0.5 ? '½' : frac === 0.25 ? '¼' : frac === 0.75 ? '¾' : '';
  return `${whole || (fr ? '' : '0')}${fr}`;
}

/** Item key for a rhythm pattern: 'rh_q-e-e-h' (time signature kept separately on the lesson). */
export const rhythmKey = (src: string) => `rh_${src.trim().split(/\s+/).join('-')}`;
export const rhythmOfKey = (key: string) => key.replace(/^rh_/, '').split('-').join(' ');
