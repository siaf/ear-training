import { describe, expect, it } from 'vitest';
import { centsBetween, centsOffNearest, hzToMidi, hzToNote, midiToHz, noteToHz, noteToMidi } from './pitch';

describe('pitch utilities', () => {
  it('A4 = 440 Hz = MIDI 69', () => {
    expect(hzToMidi(440)).toBeCloseTo(69, 6);
    expect(midiToHz(69)).toBeCloseTo(440, 6);
  });

  it('C4 = MIDI 60', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToHz('C4')).toBeCloseTo(261.6256, 3);
  });

  it('parses sharps and flats', () => {
    expect(noteToMidi('F#4')).toBe(66);
    expect(noteToMidi('Gb4')).toBe(66); // enharmonic
    expect(noteToMidi('Bb3')).toBe(58);
  });

  it('hzToNote rounds to nearest semitone', () => {
    // 10 cents sharp of C4 still rounds to C4
    const sharpC = noteToHz('C4') * Math.pow(2, 10 / 1200);
    expect(hzToNote(sharpC).label).toBe('C4');
  });

  it('centsOffNearest is 0 for on-pitch notes', () => {
    expect(Math.abs(centsOffNearest(440))).toBeLessThan(1e-6);
  });

  it('centsBetween is ~100 for a semitone', () => {
    expect(centsBetween(noteToHz('C#4'), noteToHz('C4'))).toBeCloseTo(100, 5);
  });
});
