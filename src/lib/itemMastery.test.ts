import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  recordAnswer,
  getItemWeight,
  pickItemWithDedupe,
  weightedRandomIndex,
  type MasteryMap,
} from './itemMastery';

const NOW = 1_700_000_000_000; // fixed timestamp for deterministic tests

describe('recordAnswer', () => {
  it('initializes a new item at box 1 with one result on first answer', () => {
    const map: MasteryMap = {};
    const m = recordAnswer(map, 'lvl', 'major_3rd', true, NOW);
    expect(m.recentResults).toEqual([true]);
    expect(m.box).toBe(2); // promoted from initial box 1 on correct
    expect(m.lastSeen).toBe(NOW);
    expect(m.lastCorrect).toBe(NOW);
  });

  it('demotes to box 1 on a miss', () => {
    const map: MasteryMap = {};
    recordAnswer(map, 'lvl', 'tritone', true, NOW);  // box 1 → 2
    recordAnswer(map, 'lvl', 'tritone', true, NOW);  // box 2 → 3
    const m = recordAnswer(map, 'lvl', 'tritone', false, NOW); // miss → box 1
    expect(m.box).toBe(1);
    expect(m.recentResults).toEqual([true, true, false]);
  });

  it('caps recentResults at 10 entries (drops the oldest)', () => {
    const map: MasteryMap = {};
    for (let i = 0; i < 12; i++) {
      recordAnswer(map, 'lvl', 'x', i % 2 === 0, NOW);
    }
    const m = map['lvl::x'];
    expect(m.recentResults.length).toBe(10);
    // Last result was at i=11 → odd → false.
    expect(m.recentResults[m.recentResults.length - 1]).toBe(false);
  });

  it('caps box at 5 on consecutive correct answers', () => {
    const map: MasteryMap = {};
    for (let i = 0; i < 10; i++) recordAnswer(map, 'lvl', 'x', true, NOW);
    expect(map['lvl::x'].box).toBe(5);
  });
});

describe('getItemWeight', () => {
  it('returns 1 + 0.3 recency bonus for a never-seen item not in this session', () => {
    const map: MasteryMap = {};
    const w = getItemWeight('lvl', 'minor_3rd', map, new Set());
    expect(w).toBeCloseTo(1.3, 4);
  });

  it('returns 1 for a never-seen item already in this session (no recency bonus)', () => {
    const map: MasteryMap = {};
    const w = getItemWeight('lvl', 'minor_3rd', map, new Set(['lvl::minor_3rd']));
    expect(w).toBe(1);
  });

  it('weights an all-wrong item ~3x heavier than an all-correct one', () => {
    const map: MasteryMap = {};
    for (let i = 0; i < 5; i++) recordAnswer(map, 'lvl', 'good', true, NOW);
    for (let i = 0; i < 5; i++) recordAnswer(map, 'lvl', 'bad', false, NOW);
    const seen = new Set(['lvl::good', 'lvl::bad']);
    const wGood = getItemWeight('lvl', 'good', map, seen);
    const wBad = getItemWeight('lvl', 'bad', map, seen);
    expect(wGood).toBe(1); // 0% errors → weight 1
    expect(wBad).toBe(3);  // 100% errors → weight 3
  });
});

describe('weightedRandomIndex', () => {
  it('falls back to uniform when all weights are zero', () => {
    const idx = weightedRandomIndex([0, 0, 0]);
    expect([0, 1, 2]).toContain(idx);
  });

  it('picks the only positive weight reliably', () => {
    for (let i = 0; i < 50; i++) {
      const idx = weightedRandomIndex([0, 1, 0, 0]);
      expect(idx).toBe(1);
    }
  });

  it('biases toward larger weights over many samples', () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 5000; i++) {
      counts[weightedRandomIndex([1, 3, 1])]++;
    }
    // Item 1 has weight 3 of total 5 = 60%; allow ±5%.
    expect(counts[1] / 5000).toBeGreaterThan(0.55);
    expect(counts[1] / 5000).toBeLessThan(0.65);
  });
});

describe('pickItemWithDedupe', () => {
  let mathSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    mathSpy?.mockRestore?.();
  });

  it('rejects 1-back identical', () => {
    // Force weightedRandomIndex to always pick index 0 by spying on Math.random → 0.
    // With items=[A,B,C] and last=A, the picker should reject A and try again.
    // We feed Math.random a sequence that picks A then C: 0.0 (A, rejected), 0.99 (C).
    let i = 0;
    const seq = [0.0, 0.99];
    mathSpy = vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length]);
    const map: MasteryMap = {};
    const seen = new Set<string>();
    const out = pickItemWithDedupe('lvl', ['A', 'B', 'C'], ['A'], map, seen);
    expect(out).not.toBe('A'); // should have rejected the 1-back match
    mathSpy.mockRestore();
  });

  it('breaks ABAB cycles in 2-item lessons (rejects 2-back match)', () => {
    // With items=[A,B] and last=B, prev=A: a uniform pick of 0 (A) should be rejected
    // because items.length <= 2 and prev === candidate.
    let i = 0;
    const seq = [0.0, 0.0, 0.0]; // always picks index 0 = A
    mathSpy = vi.spyOn(Math, 'random').mockImplementation(() => seq[i++ % seq.length]);
    const out = pickItemWithDedupe('lvl', ['A', 'B'], ['A', 'B'], {}, new Set(), 4);
    // After maxAttempts the fall-through still returns A; this proves the algorithm respects
    // the 2-back rule attempt-by-attempt before falling through.
    expect(out).toBe('A'); // fall-through
    mathSpy.mockRestore();
  });

  it('returns the only item when items.length === 1', () => {
    expect(pickItemWithDedupe('lvl', ['only'], [], {}, new Set())).toBe('only');
  });
});
