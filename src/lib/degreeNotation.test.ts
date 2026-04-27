import { describe, expect, it } from 'vitest';
import { formatDegree, formatDegreeText } from './degreeNotation';

describe('formatDegree — Roman numerals', () => {
  it('major pitch context: I ii iii IV V vi vii°(no sup for pitch)', () => {
    const expected = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
    for (let i = 0; i < 7; i++) {
      expect(formatDegreeText(String(i + 1), 'major', 'roman')).toBe(expected[i]);
    }
  });

  it('natural-minor pitch context: i ii° III iv v VI VII with ♭ on 3,6,7', () => {
    expect(formatDegreeText('1', 'natural_minor', 'roman')).toBe('i');
    expect(formatDegreeText('2', 'natural_minor', 'roman')).toBe('ii');
    expect(formatDegreeText('3', 'natural_minor', 'roman')).toBe('♭III');
    expect(formatDegreeText('4', 'natural_minor', 'roman')).toBe('iv');
    expect(formatDegreeText('5', 'natural_minor', 'roman')).toBe('v');
    expect(formatDegreeText('6', 'natural_minor', 'roman')).toBe('♭VI');
    expect(formatDegreeText('7', 'natural_minor', 'roman')).toBe('♭VII');
  });

  it('major triads: vii gets ° in sup', () => {
    expect(formatDegree('7', 'major_triads', 'roman')).toEqual({ acc: '', main: 'vii', sup: '°' });
    expect(formatDegree('1', 'major_triads', 'roman')).toEqual({ acc: '', main: 'I', sup: '' });
    expect(formatDegree('5', 'major_triads', 'roman')).toEqual({ acc: '', main: 'V', sup: '' });
  });

  it('major sevenths: V → V7, vii → viiø7, I → IM7', () => {
    expect(formatDegree('1', 'major_7ths', 'roman')).toEqual({ acc: '', main: 'I', sup: 'M7' });
    expect(formatDegree('5', 'major_7ths', 'roman')).toEqual({ acc: '', main: 'V', sup: '7' });
    expect(formatDegree('7', 'major_7ths', 'roman')).toEqual({ acc: '', main: 'vii', sup: 'ø7' });
    expect(formatDegree('2', 'major_7ths', 'roman')).toEqual({ acc: '', main: 'ii', sup: '7' });
  });

  it('minor sevenths: ii → iiø7, ♭III → ♭IIIM7, ♭VII → ♭VII7', () => {
    expect(formatDegree('2', 'minor_7ths', 'roman')).toEqual({ acc: '', main: 'ii', sup: 'ø7' });
    expect(formatDegree('3', 'minor_7ths', 'roman')).toEqual({ acc: '♭', main: 'III', sup: 'M7' });
    expect(formatDegree('7', 'minor_7ths', 'roman')).toEqual({ acc: '♭', main: 'VII', sup: '7' });
  });
});

describe('formatDegree — Numbers', () => {
  it('major: 1..7 plain', () => {
    for (let i = 0; i < 7; i++) {
      expect(formatDegreeText(String(i + 1), 'major', 'number')).toBe(String(i + 1));
    }
  });
  it('natural minor: 1, 2, ♭3, 4, 5, ♭6, ♭7', () => {
    expect(formatDegreeText('3', 'natural_minor', 'number')).toBe('♭3');
    expect(formatDegreeText('6', 'natural_minor', 'number')).toBe('♭6');
    expect(formatDegreeText('7', 'natural_minor', 'number')).toBe('♭7');
    expect(formatDegreeText('1', 'natural_minor', 'number')).toBe('1');
  });
});

describe('formatDegree — Solfège', () => {
  it('major: do re mi fa sol la ti', () => {
    const expected = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'];
    for (let i = 0; i < 7; i++) {
      expect(formatDegreeText(String(i + 1), 'major', 'solfege')).toBe(expected[i]);
    }
  });
  it('natural minor (do-based): do re me fa sol le te', () => {
    const expected = ['do', 're', 'me', 'fa', 'sol', 'le', 'te'];
    for (let i = 0; i < 7; i++) {
      expect(formatDegreeText(String(i + 1), 'natural_minor', 'solfege')).toBe(expected[i]);
    }
  });
});
