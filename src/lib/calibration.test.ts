import { describe, expect, it, vi } from 'vitest';

// audioEngine pulls in Tone.js which doesn't load cleanly under vitest's Node resolver.
// buildPrompts only *references* audioEngine methods inside arrow functions it returns,
// so a thin mock is enough to keep module evaluation happy.
vi.mock('../audioEngine', () => ({
  audioEngine: {
    playInterval: vi.fn(),
    playTriad: vi.fn(),
    playSeventhChord: vi.fn(),
  },
}));

// eslint-disable-next-line import/first
import { CalibrationRating, buildPrompts, calibrationToStartLevel } from './calibration';
// eslint-disable-next-line import/first
import { CURRICULUM } from '../curriculum';

describe('calibrationToStartLevel', () => {
  it('defaults to level 1 when ratings are empty', () => {
    expect(calibrationToStartLevel([])).toBe(CURRICULUM[0].id);
  });

  it('picks level 1 for very low averages (≤2)', () => {
    expect(calibrationToStartLevel([1, 1, 2, 2])).toBe(CURRICULUM[0].id);
  });

  it('picks level 3 for medium averages (around 3)', () => {
    expect(calibrationToStartLevel([3, 3, 3, 3])).toBe(CURRICULUM[2].id);
  });

  it('picks level 5 for higher averages (around 4)', () => {
    expect(calibrationToStartLevel([4, 4, 4, 4])).toBe(CURRICULUM[4].id);
  });

  it('picks level 7 for near-perfect averages (around 5)', () => {
    expect(calibrationToStartLevel([5, 5, 5, 5])).toBe(CURRICULUM[6].id);
  });

  it('clamps to the last curriculum level if index would exceed it', () => {
    const mostlyFive: CalibrationRating[] = [5, 5, 5];
    const levelId = calibrationToStartLevel(mostlyFive);
    const idx = CURRICULUM.findIndex((l) => l.id === levelId);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(CURRICULUM.length);
  });
});

describe('buildPrompts', () => {
  it('returns four distinct prompts', () => {
    const prompts = buildPrompts();
    expect(prompts).toHaveLength(4);
    const ids = prompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('each prompt has a title, hint, and play function', () => {
    const prompts = buildPrompts();
    for (const p of prompts) {
      expect(typeof p.title).toBe('string');
      expect(p.title.length).toBeGreaterThan(0);
      expect(typeof p.hint).toBe('string');
      expect(typeof p.play).toBe('function');
    }
  });
});
