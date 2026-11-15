import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../curriculum';
import { medalLabel } from './medalLabel';

describe('the lesson name on the mastery medal', () => {
  it('uses interval shorthand and arrows', () => {
    expect(medalLabel('Melodic: Fourths, Fifths and Octaves (Ascending)')).toEqual(['melodic P4, P5 & P8 ↑']);
    expect(medalLabel('Melodic: Tritones and Major Sevenths (Descending)')).toEqual(['melodic TT & M7 ↓']);
    expect(medalLabel('Harmonic: Fourths, Fifths and Octaves')).toEqual(['harmonic P4, P5 & P8']);
    expect(medalLabel('All Intervals: Melodic (Descending)')).toEqual(['all intervals: melodic ↓']);
    expect(medalLabel('Higher or Lower')).toEqual(['higher or lower']);
  });

  it('keeps Roman numerals as written, since I is major and i is minor', () => {
    expect(medalLabel('Primary Chords: I, IV or V?').join(' ')).toBe('primary chords: I, IV or V?');
    expect(medalLabel('ii-V-I (Major and Minor)').join(' ')).toBe('ii-V-I (major and minor)');
    expect(medalLabel('Tonic Triads (I and vi)').join(' ')).toBe('tonic triads (I and vi)');
  });

  it('puts the rest on two even lines', () => {
    expect(medalLabel('Voicings (Closed, Drop-2, Quartal, Upper Structure)')).toEqual(['voicings (closed, drop-2,', 'quartal, upper structure)']);
  });

  it('fits every lesson inside the medal', () => {
    for (const level of CURRICULUM) {
      const lines = medalLabel(level.name);
      expect(lines.length, level.name).toBeLessThanOrEqual(2);
      for (const line of lines) expect(line.length, `${level.name}: "${line}"`).toBeLessThanOrEqual(26);
    }
  });
});
