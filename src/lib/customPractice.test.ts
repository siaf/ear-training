import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../curriculum';
import { filterDiatonicItems } from '../scaleContext';
import { CUSTOM_GROUPS, buildCustomQueue, canStart, sourceLevelFor } from './customPractice';

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

describe('custom practice', () => {
  it('only offers items a source lesson can really ask', () => {
    for (const group of CUSTOM_GROUPS) {
      for (const item of group.items) {
        const levelIds = group.variants.map((v) => sourceLevelFor(v, item));
        expect(levelIds.every(Boolean), `${group.id}: ${item}`).toBe(true);
        for (const id of levelIds) {
          const level = CURRICULUM.find((l) => l.id === id)!;
          if (['interval', 'triad', 'seventh_chord'].includes(level.type)) {
            // Chord and interval questions are drawn from the key, so the item must occur in it.
            expect(filterDiatonicItems([item], level.type, 'C', level.scaleDegrees).length, `${group.id}: ${item}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('needs at least two items and a variant', () => {
    expect(canStart({ groupId: 'intervals', variantIds: ['up'], items: ['minor_6th'], length: 10 })).toBe(false);
    expect(canStart({ groupId: 'intervals', variantIds: [], items: ['minor_6th', 'major_6th'], length: 10 })).toBe(false);
    expect(canStart({ groupId: 'intervals', variantIds: ['up'], items: ['minor_6th', 'major_6th'], length: 10 })).toBe(true);
  });

  it('asks only the chosen items, evenly, never twice in a row, through the chosen variants', () => {
    const queue = buildCustomQueue(
      { groupId: 'intervals', variantIds: ['down'], items: ['minor_6th', 'major_6th', 'major_7th'], length: 20 },
      seeded(7),
    );
    expect(queue).toHaveLength(20);
    expect(new Set(queue.map((q) => q.levelId))).toEqual(new Set(['int_all_melodic_desc']));
    const counts = new Map<string, number>();
    queue.forEach((q) => counts.set(q.item, (counts.get(q.item) ?? 0) + 1));
    expect([...counts.keys()].sort()).toEqual(['major_6th', 'major_7th', 'minor_6th']);
    for (const n of counts.values()) expect(n).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < queue.length; i++) expect(queue[i].item).not.toBe(queue[i - 1].item);
  });

  it('routes each progression to the lesson that has it', () => {
    const queue = buildCustomQueue(
      { groupId: 'progressions', variantIds: ['all'], items: ['deceptive', 'ii_V_I_major'], length: 10 },
      seeded(3),
    );
    for (const q of queue) {
      expect(q.levelId).toBe(q.item === 'deceptive' ? 'cad_full' : 'prog_jazz_cadence');
    }
  });
});
