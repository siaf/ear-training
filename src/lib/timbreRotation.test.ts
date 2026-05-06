import { describe, expect, it } from 'vitest';
import {
  ROTATION_POOL,
  createRotationState,
  nextRotatedTimbre,
} from './timbreRotation';
import type { CurriculumLevel } from '../types';

const intervalLevel: CurriculumLevel = {
  id: 'test_interval',
  name: 'Test',
  type: 'interval',
  items: ['major_3rd', 'minor_3rd'],
  unlockRequirement: 80,
  description: '',
  segmentId: 'intervals',
};

const acousticLevel: CurriculumLevel = {
  id: 'test_acoustic',
  name: 'Test',
  type: 'acoustic',
  acousticKind: 'higher_lower',
  items: ['higher', 'lower'],
  unlockRequirement: 80,
  description: '',
  segmentId: 'foundations',
};

describe('timbreRotation', () => {
  it('returns null for non-eligible lesson types (e.g. acoustic)', () => {
    const state = createRotationState();
    expect(nextRotatedTimbre(acousticLevel, false, 5, 90, state)).toBeNull();
  });

  it('returns null when accuracy is below floor', () => {
    const state = createRotationState();
    expect(nextRotatedTimbre(intervalLevel, false, 5, 60, state)).toBeNull();
  });

  it('returns null when not enough questions answered', () => {
    const state = createRotationState();
    expect(nextRotatedTimbre(intervalLevel, false, 1, 100, state)).toBeNull();
  });

  it('engages rotation once accuracy crosses the floor', () => {
    const state = createRotationState();
    const first = nextRotatedTimbre(intervalLevel, false, 3, 80, state);
    expect(first).not.toBeNull();
    expect(state.rotating).toBe(true);
  });

  it('rotation is sticky once engaged even if accuracy dips', () => {
    const state = createRotationState();
    nextRotatedTimbre(intervalLevel, false, 3, 80, state); // engage
    const dipped = nextRotatedTimbre(intervalLevel, false, 5, 60, state);
    expect(dipped).not.toBeNull();
  });

  it('skips rotation entirely on a fully-completed lesson', () => {
    const state = createRotationState();
    const out = nextRotatedTimbre(intervalLevel, true, 5, 90, state);
    expect(out).toBeNull();
  });

  it('round-robins through the rotation pool', () => {
    const state = createRotationState();
    const seen: string[] = [];
    for (let i = 0; i < ROTATION_POOL.length; i++) {
      const t = nextRotatedTimbre(intervalLevel, false, 3 + i, 90, state);
      if (t) seen.push(t);
    }
    expect(seen).toEqual([...ROTATION_POOL]);
  });

  it('never picks the same timbre twice in a row', () => {
    const state = createRotationState();
    let prev: string | null = null;
    for (let i = 0; i < 20; i++) {
      const t = nextRotatedTimbre(intervalLevel, false, 3 + i, 90, state);
      if (t !== null) {
        expect(t).not.toBe(prev);
        prev = t;
      }
    }
  });
});
