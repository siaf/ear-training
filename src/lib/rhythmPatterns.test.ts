import { describe, expect, it } from 'vitest';
import { SAME_DIFF_B_OFFSET, sameDiffPair } from './rhythmPatterns';

describe('sameDiffPair', () => {
  // A seeded generator, so every run checks the same thousands of questions.
  function seeded(seed: number) {
    let s = seed;
    return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  }

  it('makes "different" questions differ in one way you can name, and "same" ones identical', () => {
    const rand = seeded(7);
    const counts: Record<string, number> = {};
    for (let n = 0; n < 4000; n++) {
      const { a, b, change } = sameDiffPair(rand);
      counts[change ?? 'same'] = (counts[change ?? 'same'] ?? 0) + 1;
      if (change === null) { expect(b).toEqual(a); continue; }
      expect(b).not.toEqual(a);
      if (change === 'added') expect(b.length).toBe(a.length + 1);
      if (change === 'dropped') expect(b.length).toBe(a.length - 1);
      if (change === 'moved') {
        expect(b.length).toBe(a.length);
        const moved = b.filter((t) => !a.includes(t));
        expect(moved).toHaveLength(1);
        expect(a.some((t) => Math.abs(t - moved[0]) === 0.5)).toBe(true); // an eighth, not a sixteenth
      }
      // Both bars start on the downbeat, stay inside the bar, and never stack two hits.
      for (const p of [a, b]) {
        expect(p[0]).toBe(0);
        for (let i = 1; i < p.length; i++) expect(p[i] - p[i - 1]).toBeGreaterThanOrEqual(0.25);
        expect(p[p.length - 1]).toBeLessThan(4);
      }
    }
    // Roughly half the questions are "same", and every kind of difference turns up.
    expect(counts.same / 4000).toBeGreaterThan(0.45);
    expect(counts.same / 4000).toBeLessThan(0.55);
    for (const kind of ['other_pattern', 'added', 'dropped', 'moved']) expect(counts[kind]).toBeGreaterThan(150);
    // The hardest kind, a moved hit, stays the rarest.
    expect(counts.moved).toBeLessThan(Math.min(counts.other_pattern, counts.added, counts.dropped));
  });

  it('leaves a full bar between the two patterns', () => {
    expect(SAME_DIFF_B_OFFSET).toBe(8);
  });
});
