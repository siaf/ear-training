import { describe, expect, it } from 'vitest';
import { CURRICULUM, TEACHING_ORDER, getCurrentLevel, isLevelUnlocked, isSingOnlyLevel } from './curriculum';

const level = (id: string) => CURRICULUM.find((l) => l.id === id)!;

describe('skipping singing lessons', () => {
  const finishedBasics = ['found_higher_lower', 'found_same_diff', 'rhy_same_diff', 'found_beating', 'found_consonance'];

  it('recognises lessons that can only be sung', () => {
    expect(isSingOnlyLevel(level('voice_match_pitch'))).toBe(true);
    expect(isSingOnlyLevel(level('voice_step_up'))).toBe(true);
    expect(isSingOnlyLevel(level('found_consonance'))).toBe(false);
  });

  it('offers singing next by default', () => {
    expect(getCurrentLevel(finishedBasics, false).id).toBe('voice_match_pitch');
  });

  it('moves on to a listening lesson when singing is skipped', () => {
    const next = getCurrentLevel(finishedBasics, false, { skipSinging: true });
    expect(isSingOnlyLevel(next)).toBe(false);
    expect(next.segmentId).not.toBe('voice');
  });

  it('never needs a singing lesson to unlock anything outside the voice section', () => {
    const singOnly = new Set(CURRICULUM.filter(isSingOnlyLevel).map((l) => l.id));
    const blocked = CURRICULUM.filter(
      (l) => !singOnly.has(l.id) && (l.prerequisites ?? []).some((id) => singOnly.has(id)),
    );
    expect(blocked.map((l) => l.id)).toEqual([]);
  });

  it('keeps every listening lesson reachable without singing', () => {
    const done: string[] = [];
    for (let i = 0; i < CURRICULUM.length; i++) {
      const next = getCurrentLevel(done, true, { skipSinging: true });
      if (done.includes(next.id)) break;
      expect(isSingOnlyLevel(next)).toBe(false);
      expect(isLevelUnlocked(next, done)).toBe(true);
      done.push(next.id);
    }
    expect(done.length).toBe(CURRICULUM.filter((l) => !isSingOnlyLevel(l)).length);
  });
});

describe('teaching order', () => {
  it('keeps every interval free, so the mixed-interval lessons only test what was taught', () => {
    const intervals = CURRICULUM.filter((l) => l.segmentId === 'intervals');
    expect(intervals.filter((l) => l.tier === 'pro').map((l) => l.id)).toEqual([]);
  });

  it('teaches modes by brightness: major and its neighbours, minor and its neighbours, then all seven', () => {
    const modes = CURRICULUM.filter((l) => l.segmentId === 'pitch' && l.type === 'mode').map((l) => l.items);
    expect(modes).toEqual([
      ['lydian', 'ionian', 'mixolydian'],
      ['dorian', 'aeolian', 'phrygian'],
      ['lydian', 'ionian', 'mixolydian', 'dorian', 'aeolian', 'phrygian', 'locrian'],
    ]);
  });
});

describe('teaching order across sections', () => {
  const pos = (id: string) => TEACHING_ORDER.indexOf(id);

  it('lists every lesson exactly once', () => {
    expect([...TEACHING_ORDER].sort()).toEqual(CURRICULUM.map((l) => l.id).sort());
  });

  it('puts every lesson after its prerequisites', () => {
    const early = CURRICULUM.flatMap((l) =>
      (l.prerequisites ?? []).filter((p) => pos(p) > pos(l.id)).map((p) => `${l.id} before ${p}`),
    );
    expect(early).toEqual([]);
  });

  it('is the order "continue" walks, for Pro and free learners', () => {
    for (const isPro of [true, false]) {
      const done: string[] = [];
      for (;;) {
        const next = getCurrentLevel(done, isPro);
        if (done.includes(next.id) || (!isPro && next.tier === 'pro')) break;
        done.push(next.id);
      }
      expect(done).toEqual(TEACHING_ORDER.filter((id) => isPro || level(id).tier !== 'pro'));
    }
  });

  it('teaches major and minor chords free, before the tritone, cadences and modes', () => {
    expect(level('level_4').tier).toBeUndefined();
    expect(pos('level_4')).toBeLessThan(pos('ton_cadence_basic'));
    expect(pos('level_4')).toBeLessThan(pos('int_harmonic_tritone_maj7'));
    for (const id of ['level_6', 'int_all_harmonic', 'scale_degree_minor']) expect(pos(id)).toBeLessThan(pos('level_9'));
  });
});

describe('a free learner who has done every free lesson', () => {
  it('stays on a free lesson instead of pointing at a Pro one', () => {
    const allFree = CURRICULUM.filter((l) => l.tier !== 'pro').map((l) => l.id);
    const next = getCurrentLevel(allFree, false);
    expect(next.tier).toBeUndefined();
  });
});

describe('lesson fixes', () => {
  it('asks real questions in every lesson: at least two possible answers', () => {
    const oneAnswer = CURRICULUM.filter(
      (l) => !['acoustic', 'rhythm', 'melodic_dictation'].includes(l.type) && l.items.length < 2,
    );
    expect(oneAnswer.map((l) => l.id)).toEqual([]);
  });

  it('teaches the octave before the mixed-interval lessons ask it', () => {
    const taughtBefore = TEACHING_ORDER.slice(0, TEACHING_ORDER.indexOf('int_all_harmonic'))
      .map((id) => level(id))
      .filter((l) => l.segmentId === 'intervals');
    expect(taughtBefore.some((l) => l.items.includes('octave'))).toBe(true);
  });
});
