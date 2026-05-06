import { describe, expect, it } from 'vitest';
import { buildInterleaveQueue, categoriesInQueue, categoryForLevel } from './interleaving';
import { CURRICULUM } from '../curriculum';

describe('interleaving', () => {
  it('returns empty when fewer than 2 sources are completed', () => {
    expect(buildInterleaveQueue([], 10)).toEqual([]);
    const oneLesson = CURRICULUM[0];
    expect(buildInterleaveQueue([oneLesson.id], 10)).toEqual([]);
  });

  it('returns empty when all completed levels are missing from curriculum', () => {
    expect(buildInterleaveQueue(['ghost_a', 'ghost_b'], 10)).toEqual([]);
  });

  it('produces a queue of the requested length when sources allow', () => {
    const ids = CURRICULUM.slice(0, 5).map((l) => l.id);
    const q = buildInterleaveQueue(ids, 10);
    expect(q.length).toBe(10);
  });

  it('every queue entry references a completed source level', () => {
    const ids = CURRICULUM.slice(0, 5).map((l) => l.id);
    const q = buildInterleaveQueue(ids, 10);
    q.forEach((it) => expect(ids).toContain(it.levelId));
  });

  it('item field is one of the source level items', () => {
    const ids = CURRICULUM.slice(0, 5).map((l) => l.id);
    const q = buildInterleaveQueue(ids, 10);
    q.forEach((it) => {
      const lvl = CURRICULUM.find((l) => l.id === it.levelId)!;
      expect(lvl.items).toContain(it.item);
    });
  });

  it('avoids consecutive same-category items when source diversity allows', () => {
    // Pick lessons that span multiple categories.
    const diverse = [
      'found_higher_lower', // acoustic
      'ton_stable_unstable', // scale_degree
      'int_harmonic_4ths_5ths', // interval
      'level_4', // triad
    ].filter((id) => CURRICULUM.find((l) => l.id === id));
    if (diverse.length < 3) return; // skip if curriculum changed
    const q = buildInterleaveQueue(diverse, 20);
    let adjacentSame = 0;
    for (let i = 1; i < q.length; i++) {
      if (q[i].category === q[i - 1].category) adjacentSame++;
    }
    // Allow some leakage from the bounded retry, but not many.
    expect(adjacentSame).toBeLessThan(q.length / 3);
  });

  it('categoriesInQueue returns the union of categories', () => {
    const ids = CURRICULUM.slice(0, 5).map((l) => l.id);
    const q = buildInterleaveQueue(ids, 20);
    const cats = categoriesInQueue(q);
    q.forEach((it) => expect(cats).toContain(it.category));
  });

  it('categoryForLevel maps known types correctly', () => {
    const interval = CURRICULUM.find((l) => l.type === 'interval');
    if (interval) expect(categoryForLevel(interval)).toBe('interval');
    const triad = CURRICULUM.find((l) => l.type === 'triad');
    if (triad) expect(categoryForLevel(triad)).toBe('chord');
  });
});
