import { describe, expect, it } from 'vitest';
import {
  filterDiatonicItems,
  getDiatonicIntervals,
  getDiatonicSevenths,
  getDiatonicTriads,
} from './scaleContext';

describe('getDiatonicIntervals', () => {
  it('includes the common intervals found in the major scale', () => {
    const intervals = getDiatonicIntervals();
    expect(intervals).toContain('perfect_5th');
    expect(intervals).toContain('major_3rd');
    expect(intervals).toContain('minor_7th');
    expect(intervals).not.toContain('tritone');
  });
});

describe('getDiatonicTriads', () => {
  it('produces C-major diatonic triads for root C', () => {
    const triads = getDiatonicTriads('C');
    expect(triads).toEqual([
      { root: 'C', type: 'major' },
      { root: 'D', type: 'minor' },
      { root: 'E', type: 'minor' },
      { root: 'F', type: 'major' },
      { root: 'G', type: 'major' },
      { root: 'A', type: 'minor' },
      { root: 'B', type: 'diminished' },
    ]);
  });

  it('transposes correctly for root G', () => {
    const triads = getDiatonicTriads('G');
    expect(triads[0]).toEqual({ root: 'G', type: 'major' }); // I
    expect(triads[4]).toEqual({ root: 'D', type: 'major' }); // V
    expect(triads[6]).toEqual({ root: 'F#', type: 'diminished' }); // vii°
  });
});

describe('getDiatonicSevenths', () => {
  it('produces C-major diatonic seventh chords', () => {
    const chords = getDiatonicSevenths('C');
    expect(chords[0]).toEqual({ root: 'C', type: 'major_7' });   // Imaj7
    expect(chords[4]).toEqual({ root: 'G', type: 'dominant_7' }); // V7
    expect(chords[6]).toEqual({ root: 'B', type: 'half_diminished_7' });
  });
});

describe('filterDiatonicItems', () => {
  it('filters triads by type AND scale degree', () => {
    const items = ['major', 'minor'];
    const result = filterDiatonicItems(items, 'triad', 'C', [0, 4]);
    // I (C major) and V (G major) — both major in C
    expect(result).toEqual([
      { root: 'C', type: 'major' },
      { root: 'G', type: 'major' },
    ]);
  });

  it('filters seventh chords by type AND scale degree', () => {
    const items = ['dominant_7'];
    const result = filterDiatonicItems(items, 'seventh_chord', 'C', [4]);
    expect(result).toEqual([{ root: 'G', type: 'dominant_7' }]);
  });

  it('returns empty when no degree matches the item type', () => {
    const items = ['major'];
    // ii (D minor) — no major chord on degree 1
    const result = filterDiatonicItems(items, 'triad', 'C', [1]);
    expect(result).toEqual([]);
  });

  it('for intervals, generates roots limited to allowed degrees', () => {
    const items = ['perfect_5th'];
    const result = filterDiatonicItems(items, 'interval', 'C', [0]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('perfect_5th');
    expect(result[0].root).toBe('C');
  });

  it('returns modes as-is with the scale root', () => {
    const items = ['ionian', 'dorian'];
    const result = filterDiatonicItems(items, 'mode', 'D');
    expect(result).toEqual([
      { root: 'D', type: 'ionian' },
      { root: 'D', type: 'dorian' },
    ]);
  });
});
