import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../curriculum';
import type { Question } from '../types';
import { feedbackPlan } from './feedbackSounds';
import { degreeSemitones, resolutionDegree, stabilityExplanation } from './stability';

const opts = {
  intervals: ['perfect_4th', 'perfect_5th', 'octave'],
  name: (k: string) => ({ perfect_4th: 'Perfect 4th', perfect_5th: 'Perfect 5th', octave: 'Octave' }[k] ?? k),
  degreeLabel: (d: number) => String(d),
};

const q = (over: Partial<Question>): Question => ({
  id: 'q', type: 'interval', correctAnswer: 'perfect_5th', itemType: 'perfect_5th', rootNote: 'C',
  playedNotes: [], timestamp: 0, ...over,
});

describe('stable and unstable notes', () => {
  it('rests on the home chord and leans every other note to its nearest chord note', () => {
    expect([1, 3, 5].map(resolutionDegree)).toEqual([null, null, null]);
    expect(resolutionDegree(2)).toBe(1);
    expect(resolutionDegree(4)).toBe(3);
    expect(resolutionDegree(6)).toBe(5);
    expect(resolutionDegree(7)).toBe(8);
  });

  it('resolves each unstable note by a step of one or two semitones, in major and minor', () => {
    const major = [0, 2, 4, 5, 7, 9, 11];
    const naturalMinor = [0, 2, 3, 5, 7, 8, 10];
    for (const scale of [major, naturalMinor]) {
      for (const d of [2, 4, 6, 7]) {
        const step = Math.abs(degreeSemitones(resolutionDegree(d)!, scale) - degreeSemitones(d, scale));
        expect(step === 1 || step === 2).toBe(true);
      }
    }
  });

  it('agrees with what the lessons call stable', () => {
    for (const id of ['ton_stable_unstable', 'ton_stable_unstable_all']) {
      const level = CURRICULUM.find((l) => l.id === id)!;
      expect(level.overTonicChord).toBe(true);
      for (const d of level.itemGroups!.stable) expect(resolutionDegree(Number(d))).toBeNull();
      for (const d of level.itemGroups!.unstable) expect(resolutionDegree(Number(d))).not.toBeNull();
    }
  });

  it('says where the note went, and never names 8', () => {
    expect(stabilityExplanation(7, String)).toBe('That was 7. It leans up to 1.');
    expect(stabilityExplanation(4, String)).toBe('That was 4. It leans down to 3.');
    expect(stabilityExplanation(5, String)).toMatch(/rests/);
  });
});

describe('sounds after a wrong answer', () => {
  it('plays nothing after a right answer', () => {
    expect(feedbackPlan(q({}), 'perfect_5th', opts)).toBeNull();
  });

  it('offers the right interval and the one picked, from the same root', () => {
    const plan = feedbackPlan(q({}), 'perfect_4th', opts)!;
    expect(plan.sounds).toEqual([
      { kind: 'interval', item: 'perfect_5th', label: 'Perfect 5th', tag: 'right' },
      { kind: 'interval', item: 'perfect_4th', label: 'Perfect 4th', tag: 'yours' },
    ]);
  });

  it('resolves a stable/unstable note only in lessons played over the home chord', () => {
    const note = q({ type: 'scale_degree', itemType: '7', correctAnswer: 'unstable', context: 'major' });
    expect(feedbackPlan(note, 'stable', opts)).toBeNull();
    const plan = feedbackPlan({ ...note, overTonicChord: true }, 'stable', opts)!;
    expect(plan.sounds).toEqual([{ kind: 'resolve', label: 'hear it resolve' }]);
    expect(plan.explain).toBe('That was 7. It leans up to 1.');
  });
});
