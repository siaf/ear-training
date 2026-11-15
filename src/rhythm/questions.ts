// Questions for the Rhythm path. A lesson's items say what's practised:
//   rhythm_value  'val_q.'    a note or rest value: how many beats?
//   rhythm_count  'ct_2&'     a count: a bar is drawn with a note on that count marked
//   rhythm_hear   'rh_q-e-e-h' a rhythm: heard, then picked from three written ones
//   rhythm_tap    'rh_q-e-e-h' a rhythm: read, then tapped after a count-in
// The rhythms come from the lesson's rhythmPool, in the notation of src/rhythm/model.ts.

import type { CurriculumLevel } from '../types';
import type { BuiltQuestion, Rng } from '../notation/questions';
import {
  Q,
  beatsPerBar,
  beatsWords,
  countLabel,
  countsOf,
  describe,
  onsets,
  parseRhythm,
  parseTime,
  rhythmKey,
  rhythmOfKey,
  sounds,
  starts,
  countAt,
  noteName,
  type RNote,
  type TimeSig,
} from './model';

const pick = <T,>(arr: readonly T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const timeOf = (level: CurriculumLevel): TimeSig => parseTime(level.rhythmTime ?? '4/4');
const bpmOf = (level: CurriculumLevel) => level.rhythmBpm ?? 72;
const countInOf = (ts: TimeSig) => Math.max(2, beatsPerBar(ts));

function playSpec(level: CurriculumLevel, notes: RNote[], metronome = false) {
  const ts = timeOf(level);
  return { onsets: onsets(notes, ts), bpm: bpmOf(level), countIn: countInOf(ts), beatsPerBar: beatsPerBar(ts), metronome };
}

const sayCounts = (notes: RNote[], ts: TimeSig) => countsOf(notes, ts).map((c, i) => (notes[i].rest ? `(${countLabel(c)})` : countLabel(c))).join(', ');

// ---------------------------------------------------------------------------
// Labels, for answer chips and items.

export function rhythmLabel(key: string): string | null {
  let m: RegExpExecArray | null;
  if ((m = /^beats_([\d.]+)$/.exec(key))) {
    const w = beatsWords(+m[1] * Q);
    return `${w} beat${+m[1] === 1 ? '' : 's'}`;
  }
  if ((m = /^val_(.+)$/.exec(key))) {
    const n = parseRhythm(m[1])[0];
    return cap(n.rest ? noteName(n) : `${noteName(n)} note`);
  }
  if ((m = /^ct_(.+)$/.exec(key))) return countLabel(m[1]);
  if ((m = /^opt_([A-Z])$/.exec(key))) return m[1];
  if (key === 'tap_miss') return 'Not quite in time';
  if (/^rh_/.test(key)) return cap(describe(parseRhythm(rhythmOfKey(key))));
  return null;
}

/** The answer chip for a value item: how many quarter-note beats it lasts. */
export const valueAnswer = (item: string) => `beats_${parseRhythm(item.replace(/^val_/, ''))[0].t / Q}`;

// ---------------------------------------------------------------------------

function buildValue(item: string): BuiltQuestion {
  const n = parseRhythm(item.replace(/^val_/, ''))[0];
  const dotted = [9, 18, 36].includes(n.t);
  const plain = dotted ? n.t / 1.5 : n.t;
  const what = n.rest ? `A ${noteName(n)}: silence` : `A ${noteName(n)} note`;
  const how = dotted
    ? ` The dot adds half its value again: ${beatsWords(plain)} + ${beatsWords(plain / 2)} = ${beatsWords(n.t)}.`
    : n.t >= 2 * Q
    ? ` ${n.rest ? 'A rest has the same value as the note it matches' : 'An open head'}${n.t === 4 * Q ? ', no stem' : ', with a stem'}.`
    : n.t === Q
    ? ` ${n.rest ? 'It lasts as long as a quarter note' : 'A filled head and a stem'}: the beat itself in 4/4.`
    : ` Each flag (or beam) halves it: ${n.t === Q / 2 ? 'one flag, half a beat' : 'two flags, a quarter of a beat'}.`;
  return {
    correctAnswer: `beats_${n.t / Q}`,
    rootNote: 'C',
    responseMode: 'select',
    visual: {
      prompt: n.rest ? 'How many beats of silence?' : 'How many beats does this note last?',
      rhythm: { notes: [n], time: { beats: 4, unit: 4 }, free: true },
      explain: `${what} lasts ${beatsWords(n.t)} beat${n.t === Q ? '' : 's'} in 4/4.${how}`,
      sound: [],
      rhythmPlay: n.rest ? undefined : { onsets: [0], bpm: 72, countIn: 4, beatsPerBar: 4, metronome: true },
    },
  };
}

function buildCount(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const ts = timeOf(level);
  const want = item.replace(/^ct_/, '');
  const options: Array<{ notes: RNote[]; i: number }> = [];
  for (const src of level.rhythmPool ?? []) {
    const notes = parseRhythm(src);
    const st = starts(notes);
    notes.forEach((_, i) => {
      if (sounds(notes, i) && countAt(st[i], ts) === want) options.push({ notes, i });
    });
  }
  if (!options.length) throw new Error(`${level.id}: no rhythm in the pool has a note on ${want}`);
  // Prefer notes that aren't the bar's first, so the answer isn't always "1".
  const pool = options.filter((o) => o.i > 0).length && want !== '1' ? options.filter((o) => o.i > 0) : options;
  const { notes, i } = pick(pool, rng);
  const counts = countsOf(notes, ts).map(countLabel);
  const grid = ts.unit === 8 ? 'every eighth gets a number' : notes.some((n) => n.trip) ? 'triplets are counted "1 trip let"' : notes.some((n) => n.t % 6 !== 0) ? 'sixteenths are counted "1 e & a"' : 'eighths are counted "1 &"';
  return {
    correctAnswer: item,
    rootNote: 'C',
    responseMode: 'select',
    visual: {
      prompt: 'Which count is the marked note on?',
      rhythm: { notes, time: ts, mark: i, counts },
      explain: `Count every note from the start of the bar (${grid}): ${sayCounts(notes, ts)}. The marked note is on ${countLabel(want)}.`,
      sound: [],
      rhythmPlay: playSpec(level, notes, true),
    },
  };
}

/** How far apart two rhythms are: onsets in one and not the other. */
function distance(a: RNote[], b: RNote[], ts: TimeSig): number {
  const oa = new Set(onsets(a, ts).map((o) => o.toFixed(3)));
  const ob = new Set(onsets(b, ts).map((o) => o.toFixed(3)));
  let d = 0;
  for (const o of oa) if (!ob.has(o)) d++;
  for (const o of ob) if (!oa.has(o)) d++;
  return d;
}

function buildHear(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  const ts = timeOf(level);
  const notes = parseRhythm(rhythmOfKey(item));
  // Two other rhythms from the lesson that sound different, the closest ones first.
  const others = (level.rhythmPool ?? [])
    .filter((src) => rhythmKey(src) !== item)
    .map((src) => ({ src, notes: parseRhythm(src), d: distance(parseRhythm(src), notes, ts) }))
    .filter((o) => o.d > 0) // sounding the same as the answer would be a second right answer
    .map((o) => ({ ...o, d: o.d + rng() * 0.9 })) // vary which near ones are picked
    .sort((a, b) => a.d - b.d)
    // Written differently but sounding the same as one already picked: skip it.
    .filter((o, k, all) => all.slice(0, k).every((p) => distance(p.notes, o.notes, ts) > 0))
    .slice(0, 2);
  const set = [{ notes, right: true }, ...others.map((o) => ({ notes: o.notes, right: false }))];
  for (let k = set.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [set[k], set[j]] = [set[j], set[k]];
  }
  const letters = ['A', 'B', 'C'];
  const right = letters[set.findIndex((x) => x.right)];
  return {
    correctAnswer: `opt_${right}`,
    rootNote: 'C',
    responseMode: 'select',
    visual: {
      prompt: 'Which rhythm did you hear?',
      choices: set.map((x, k) => ({ key: `opt_${letters[k]}`, rhythm: { notes: x.notes, time: ts } })),
      explain: `It was ${right}: ${describe(notes)}. Counted: ${sayCounts(notes, ts)}.`,
      sound: [],
      listen: true,
      rhythmPlay: playSpec(level, notes),
    },
  };
}

function buildTap(level: CurriculumLevel, item: string): BuiltQuestion {
  const ts = timeOf(level);
  const notes = parseRhythm(rhythmOfKey(item));
  const spec = playSpec(level, notes, level.metronome ?? true);
  // Half the gap between the closest two notes, at most 110 ms, so a tap can't count for a neighbour.
  const beatMs = 60000 / spec.bpm;
  const gaps = spec.onsets.slice(1).map((o, k) => (o - spec.onsets[k]) * beatMs);
  const toleranceMs = Math.min(110, ...gaps.map((g) => g * 0.45));
  return {
    correctAnswer: item,
    rootNote: 'C',
    responseMode: 'tap_rhythm',
    visual: {
      prompt: 'Read it, then tap it',
      rhythm: { notes, time: ts, counts: countsOf(notes, ts).map(countLabel) },
      explain: `Count it: ${sayCounts(notes, ts)}. Tap on each note, and stay silent through the rests${notes.some((n) => n.tie) ? ' and the far end of each tie' : ''}.`,
      sound: [],
      rhythmPlay: { ...spec, metronome: true },
      tapRhythm: { ...spec, toleranceMs, metronome: level.metronome ?? true },
    },
  };
}

export function buildRhythmQuestion(level: CurriculumLevel, item: string, rng: Rng): BuiltQuestion {
  switch (level.visualKind) {
    case 'rhythm_value': return buildValue(item);
    case 'rhythm_count': return buildCount(level, item, rng);
    case 'rhythm_hear': return buildHear(level, item, rng);
    case 'rhythm_tap': return buildTap(level, item);
    default: throw new Error(`${level.id} is not a rhythm lesson`);
  }
}

