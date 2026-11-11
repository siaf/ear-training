import { describe, expect, it } from 'vitest';
import { degreeOf, encodeMelody, gradeMelody, makeMelody, type MelodyRules } from './melody';

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

describe('melodic dictation melodies', () => {
  it('names steps across the octave as degrees 1 to 7', () => {
    expect(degreeOf(0)).toBe('1');
    expect(degreeOf(4)).toBe('5');
    expect(degreeOf(-1)).toBe('7');
    expect(degreeOf(7)).toBe('1');
  });

  it('follows the rules on every melody', () => {
    const rules: MelodyRules = { length: 5, range: [-2, 7], maxLeap: 4, startDegrees: [1, 3, 5], endDegrees: [1, 3, 5] };
    const random = seeded(11);
    for (let i = 0; i < 300; i++) {
      const m = makeMelody(rules, random);
      expect(m).toHaveLength(5);
      expect(['1', '3', '5']).toContain(degreeOf(m[0]));
      expect(['1', '3', '5']).toContain(degreeOf(m[4]));
      for (let j = 1; j < m.length; j++) {
        expect(m[j]).not.toBe(m[j - 1]);
        expect(Math.abs(m[j] - m[j - 1])).toBeLessThanOrEqual(4);
        expect(m[j]).toBeGreaterThanOrEqual(-2);
        expect(m[j]).toBeLessThanOrEqual(7);
      }
    }
  });

  it('keeps the first lesson to steps within 1 to 5', () => {
    const rules: MelodyRules = { length: 3, range: [0, 4], maxLeap: 1, startDegrees: [1, 3, 5], endDegrees: [1, 3, 5] };
    const random = seeded(5);
    for (let i = 0; i < 100; i++) {
      const m = makeMelody(rules, random);
      expect(Math.abs(m[1] - m[0])).toBe(1);
      expect(Math.abs(m[2] - m[1])).toBe(1);
    }
  });

  it('marks each note right or wrong', () => {
    expect(gradeMelody(encodeMelody(['1', '2', '4']), '1-2-3')).toEqual([true, true, false]);
    expect(gradeMelody('', '1-2')).toEqual([false, false]);
  });
});
