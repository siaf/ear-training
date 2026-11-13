import { describe, expect, it } from 'vitest';
import { TAP_PATTERNS, nudgeOneOnset } from './rhythmPatterns';

// Every random choice nudgeOneOnset can make, by stepping rand through [0, 1).
const RANDS = Array.from({ length: 40 }, (_, k) => k / 40);

describe('nudgeOneOnset', () => {
  for (const pattern of TAP_PATTERNS) {
    it(`moves one onset of "${pattern.id}" and keeps every hit apart`, () => {
      for (const r of RANDS) {
        const second = nudgeOneOnset(pattern.onsets, () => r);
        const changed = second.filter((t, i) => t !== pattern.onsets[i]);
        expect(changed).toHaveLength(1);
        expect(second[0]).toBe(pattern.onsets[0]);
        // Played as one run after the first pattern, as same-or-different questions do.
        const all = [...pattern.onsets, ...second.map((t) => t + 4.5)];
        for (let i = 1; i < all.length; i++) expect(all[i]).toBeGreaterThan(all[i - 1]);
        for (const t of second) {
          expect(t).toBeGreaterThanOrEqual(0);
          expect(t).toBeLessThan(4);
          expect((t * 4) % 1).toBe(0); // on the sixteenth grid
        }
      }
    });
  }
});
