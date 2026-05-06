import { describe, expect, it } from 'vitest';
import { gradeTaps, gradeGrid } from './rhythmGrader';

describe('gradeTaps', () => {
  it('full match — 4 quarter-note taps land within tolerance', () => {
    const targets = [0, 600, 1200, 1800]; // quarter notes at 100bpm = 600ms each
    const taps   = [10, 595, 1210, 1790];
    const r = gradeTaps(taps, targets, 80);
    expect(r.hits).toEqual([true, true, true, true]);
    expect(r.score).toBe(1);
  });

  it('penalises a missed onset', () => {
    const targets = [0, 600, 1200, 1800];
    const taps   = [10, 1210, 1790]; // missed beat 2
    const r = gradeTaps(taps, targets, 80);
    expect(r.hits).toEqual([true, false, true, true]);
    expect(r.recall).toBeCloseTo(0.75, 2);
    expect(r.precision).toBe(1);
    expect(r.score).toBeCloseTo(0.875, 2);
  });

  it('penalises extra taps that fall outside tolerance', () => {
    const targets = [0, 600, 1200, 1800];
    const taps   = [10, 300, 595, 1210, 1790]; // extra tap at 300ms (no target nearby)
    const r = gradeTaps(taps, targets, 80);
    expect(r.hits).toEqual([true, true, true, true]);
    expect(r.recall).toBe(1);
    expect(r.precision).toBe(4 / 5);
    expect(r.extraTaps).toEqual([300]);
  });

  it('marks a tap outside tolerance as miss', () => {
    const targets = [0, 600];
    const taps   = [0, 1000]; // 400ms late on beat 2
    const r = gradeTaps(taps, targets, 130);
    expect(r.hits).toEqual([true, false]);
  });

  it('handles zero taps gracefully', () => {
    const r = gradeTaps([], [0, 600], 130);
    expect(r.score).toBe(0);
    expect(r.hits).toEqual([false, false]);
  });
});

describe('gradeGrid', () => {
  it('exact match passes', () => {
    const target = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
    const r = gradeGrid(target, target);
    expect(r.score).toBe(1);
    expect(r.passed).toBe(true);
  });

  it('one-cell error fails (strict)', () => {
    const target = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
    const user = target.slice();
    user[7] = true; // user added an extra hit
    const r = gradeGrid(user, target);
    expect(r.score).toBeCloseTo(15 / 16, 4);
    expect(r.passed).toBe(false);
  });
});
