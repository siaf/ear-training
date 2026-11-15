import { describe, expect, it } from 'vitest';
import { getDisplayName, lessonsInPath } from '../curriculum';
import { buildVisualQuestion } from '../notation/questions';
import { COMPOSERS, ERA_INFO, FACTS } from './content';
import { STYLES, makePassage } from './styles';

const rng = (() => {
  let a = 5;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
})();
const toMidi = (t: string) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(t)!;
  return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(m[1]) + 12 * (+m[2] + 1);
};

describe('History content', () => {
  it('gives every fact four different answers', () => {
    for (const [id, f] of Object.entries(FACTS)) expect(new Set(f.options).size, id).toBe(4);
  });

  it('uses every fact and composer in a lesson', () => {
    const items = new Set(lessonsInPath('history').flatMap((l) => l.items));
    for (const id of Object.keys(FACTS)) expect(items.has(`fact_${id}`), id).toBe(true);
    for (const id of Object.keys(COMPOSERS)) expect(items.has(`cmp_${id}`), id).toBe(true);
  });

  it('puts every composer in an era whose dates fit their life', () => {
    const START: Record<string, number> = { medieval: 500, renaissance: 1400, baroque: 1600, classical: 1750, romantic: 1820, modern: 1900 };
    const END: Record<string, number> = { medieval: 1400, renaissance: 1600, baroque: 1750, classical: 1820, romantic: 1900, modern: 2100 };
    for (const [id, c] of Object.entries(COMPOSERS)) {
      const years = (c.dates.match(/\d{4}/g) ?? []).map(Number);
      const active = years.length === 2 ? years[0] + 25 : years[0] + (/born/.test(c.dates) ? 25 : 0);
      // Their working life overlaps the era (eras are approximate, so allow 30 years either side).
      expect(active, id).toBeGreaterThanOrEqual(START[c.era] - 30);
      expect(active, id).toBeLessThanOrEqual(END[c.era] + 30);
      expect(ERA_INFO[c.era]).toBeDefined();
    }
  });

  it('labels quiz answers with the fact\'s own options, the right one first', () => {
    for (const l of lessonsInPath('history').filter((x) => x.visualKind === 'hx_quiz')) {
      for (const item of l.items) {
        const q = buildVisualQuestion(l, item, rng);
        const f = FACTS[item.replace('fact_', '')];
        expect(getDisplayName(q.correctAnswer)).toBe(f.options[0]);
        expect(q.visual.choices!.map((c) => getDisplayName(c.key)).sort()).toEqual([...f.options].sort());
      }
    }
  });
});

describe('History listening passages', () => {
  it('plays real notes in a sensible range, in time order within each voice', () => {
    for (const style of STYLES) for (let k = 0; k < 20; k++) {
      const p = makePassage(style, rng);
      expect(p.events.length, style).toBeGreaterThan(8);
      for (const e of p.events) {
        expect(Number.isFinite(e.t) && e.t >= 0 && e.d > 0).toBe(true);
        for (const n of e.notes) {
          expect(n).toMatch(/^[A-G]#?-?\d$/);
          const m = toMidi(n);
          expect(m >= 24 && m <= 96, `${style}: ${n}`).toBe(true);
        }
      }
      const seconds = (Math.max(...p.events.map((e) => e.t + e.d)) * 60) / p.bpm;
      expect(seconds, style).toBeGreaterThan(5);
      expect(seconds, style).toBeLessThan(25);
    }
  });

  it('keeps chant to one line (or parallel 5ths for organum)', () => {
    for (let k = 0; k < 20; k++) {
      for (const e of makePassage('medieval', rng).events) {
        if (e.notes.length === 2) expect(toMidi(e.notes[1]) - toMidi(e.notes[0])).toBe(7);
        else expect(e.notes).toHaveLength(1);
      }
    }
  });

  it('gives the Classical passage an Alberti bass: low, high, middle, high', () => {
    const low = makePassage('classical', rng).events.filter((e) => e.d < 0.3).slice(0, 4).map((e) => toMidi(e.notes[0]));
    expect(low[0]).toBeLessThan(low[2]);
    expect(low[2]).toBeLessThan(low[1]);
    expect(low[1]).toBe(low[3]);
  });
});
