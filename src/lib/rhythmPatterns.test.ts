import { describe, expect, it } from 'vitest';
import { EASY_CHANGES, SAME_DIFF_B_OFFSET, sameDiffPair, type SameDiffChange } from './rhythmPatterns';

describe('sameDiffPair', () => {
  // A seeded generator, so every run checks the same thousands of questions.
  function seeded(seed: number) {
    let s = seed;
    return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  }

  function check(changes: SameDiffChange[] | undefined, n = 4000) {
    const rand = seeded(7);
    const counts: Record<string, number> = {};
    for (let k = 0; k < n; k++) {
      const { a, b, change } = sameDiffPair(changes, rand);
      counts[change ?? 'same'] = (counts[change ?? 'same'] ?? 0) + 1;
      if (change === null) { expect(b).toEqual(a); continue; }
      expect(b).not.toEqual(a);
      if (change === 'added') expect(b.length).toBe(a.length + 1);
      if (change === 'dropped') expect(b.length).toBe(a.length - 1);
      if (change === 'moved' || change === 'nudged') {
        expect(b.length).toBe(a.length);
        const moved = b.filter((t) => !a.includes(t));
        expect(moved).toHaveLength(1);
        const step = change === 'moved' ? 0.5 : 0.25;
        expect(a.some((t) => Math.abs(t - moved[0]) === step)).toBe(true);
      }
      // Both bars start on the downbeat, stay inside the bar, and never stack two hits.
      for (const p of [a, b]) {
        expect(p[0]).toBe(0);
        for (let i = 1; i < p.length; i++) expect(p[i] - p[i - 1]).toBeGreaterThanOrEqual(0.25);
        expect(p[p.length - 1]).toBeLessThan(4);
      }
    }
    // Roughly half the questions are "same".
    expect(counts.same / n).toBeGreaterThan(0.45);
    expect(counts.same / n).toBeLessThan(0.55);
    return counts;
  }

  it('asks the first rhythm lesson only for differences that are easy to hear', () => {
    const counts = check(undefined);
    expect(EASY_CHANGES).toEqual(['other_pattern', 'added', 'dropped']);
    for (const kind of EASY_CHANGES) expect(counts[kind]).toBeGreaterThan(300);
    expect(counts.moved ?? 0).toBe(0);
    expect(counts.nudged ?? 0).toBe(0);
  });

  it('asks the moved-hits lesson only about one hit moved, by an eighth more often than a sixteenth', () => {
    const counts = check(['moved', 'nudged']);
    expect(Object.keys(counts).sort()).toEqual(['moved', 'nudged', 'same']);
    expect(counts.moved).toBeGreaterThan(counts.nudged);
  });

  it('leaves a full bar between the two patterns', () => {
    expect(SAME_DIFF_B_OFFSET).toBe(8);
  });
});
