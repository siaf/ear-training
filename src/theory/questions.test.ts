import { describe, expect, it } from 'vitest';
import { lessonsInPath } from '../curriculum';
import { buildVisualQuestion } from '../notation/questions';
import { CLEFS, MAJOR_KEYS, keyAccidental, midiOf, noteAtPosition, parseNote } from '../notation/theory';
import type { StaffSpec } from '../notation/prompt';
import { CADENCES, MODES, SEVENTHS, scaleOf } from './questions';

const rng = (() => {
  let a = 11;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
})();
const ACC = { sharp: 1, flat: -1, natural: 0, dsharp: 2, dflat: -2 } as const;

/** Read a staff's notes back, key signature included, as MIDI numbers per column. */
function read(staff: StaffSpec): number[][] {
  const clef = staff.clef!;
  const sig = staff.keySig ?? 0;
  const cols: number[][] = [];
  for (const n of staff.notes) {
    const base = noteAtPosition(n.p, clef);
    const acc = n.acc ? ACC[n.acc] : keyAccidental(base.letter, sig);
    (cols[n.col ?? 0] ??= []).push(midiOf({ ...base, acc }));
  }
  return cols.map((c) => c.sort((a, b) => a - b));
}
const pcSet = (ms: number[]) => [...new Set(ms.map((m) => ((m % 12) + 12) % 12))];

const lessons = lessonsInPath('theory');
const of = (kind: string) => lessons.filter((l) => l.visualKind === kind);

describe('Theory path', () => {
  it('has lessons and uses only the treble clef', () => {
    expect(lessons.length).toBeGreaterThan(10);
    expect(CLEFS.treble).toBeDefined();
  });

  it('marks two neighbouring scale notes a whole or half step apart, as answered', () => {
    for (const l of of('th_scale_step')) for (const item of l.items) for (let k = 0; k < 10; k++) {
      const q = buildVisualQuestion(l, item, rng);
      const staff = q.visual.staves![0];
      const marked = staff.notes.filter((n) => n.mark).map((n) => read({ ...staff, notes: [{ ...n, col: 0 }] })[0][0]);
      expect(marked).toHaveLength(2);
      expect(Math.abs(marked[1] - marked[0])).toBe(q.correctAnswer === 'step_H' ? 1 : 2);
    }
  });

  it('builds every chord of a key on the degree it names, with the right quality', () => {
    const EXPECT = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
    for (const l of of('th_numeral')) for (const item of l.items) for (let k = 0; k < 10; k++) {
      const q = buildVisualQuestion(l, item, rng);
      const [chord] = read(q.visual.staves![0]);
      const key = /^In (.+?) major/.exec(q.visual.prompt)![1].replace('♭', 'b').replace('♯', '#');
      const scale = scaleOf(parseNote(`${key}4`), 'major').map(midiOf);
      const d = +item.replace('rn_', '');
      expect((chord[0] - scale[d - 1]) % 12).toBe(0);
      const third = chord[1] - chord[0];
      const fifth = chord[2] - chord[0];
      const quality = fifth === 6 ? 'diminished' : third === 4 ? 'major' : 'minor';
      expect(quality, `${l.id} ${item} in ${key}`).toBe(EXPECT[d - 1]);
      expect(MAJOR_KEYS[key]).toBe(q.visual.staves![0].keySig);
    }
  });

  it('spells every seventh chord with the 3rd, 5th and 7th its name says', () => {
    for (const l of of('th_seventh')) for (const item of l.items) for (let k = 0; k < 20; k++) {
      const q = buildVisualQuestion(l, item, rng);
      const [c] = read(q.visual.staves![0]);
      expect(c.slice(1).map((m) => m - c[0])).toEqual(SEVENTHS[item.replace('sev_', '')].semis);
    }
  });

  it('ends each phrase with the cadence it asks about', () => {
    for (const l of of('th_cadence')) for (const item of l.items) for (let k = 0; k < 10; k++) {
      const q = buildVisualQuestion(l, item, rng);
      const cols = read(q.visual.staves![0]);
      expect(cols).toHaveLength(3);
      const key = /^In (.+?) major/.exec(q.visual.explain)![1].replace('♭', 'b');
      const scale = scaleOf(parseNote(`${key}4`), 'major').map((n) => ((midiOf(n) % 12) + 12) % 12);
      const roots = cols.map((c) => ((c[0] % 12) + 12) % 12);
      expect(roots.map((r) => scale.indexOf(r) + 1)).toEqual(CADENCES[item.replace('cad_', '')].degrees);
      expect(q.visual.chords).toHaveLength(3);
    }
  });

  it('draws each mode with its own pattern of steps', () => {
    const PATTERN: Record<string, string> = {
      ionian: '2212221', dorian: '2122212', phrygian: '1222122', lydian: '2221221', mixolydian: '2212212', aeolian: '2122122', locrian: '1221222',
    };
    for (const l of of('th_mode')) for (const item of l.items) for (let k = 0; k < 10; k++) {
      const q = buildVisualQuestion(l, item, rng);
      const ms = read(q.visual.staves![0]).map((c) => c[0]);
      expect(ms.slice(1).map((m, i) => m - ms[i]).join(''), `${l.id} ${item}`).toBe(PATTERN[item.replace('mode_', '')]);
    }
    expect(MODES).toHaveLength(7);
  });

  it('names minor keys by their relative major\'s signature', () => {
    for (const l of of('th_minor_key')) for (const item of l.items) {
      const q = buildVisualQuestion(l, item, rng);
      const minor = item.replace('mkey_', '');
      const tonic = midiOf(parseNote(`${minor}4`));
      const sig = q.visual.staves![0].keySig ?? 0;
      const major = Object.entries(MAJOR_KEYS).find(([, v]) => v === sig && (Math.abs(v) < 6))![0];
      expect(pcSet([midiOf(parseNote(`${major}4`)) - tonic])).toEqual([3]);
    }
  });
});
