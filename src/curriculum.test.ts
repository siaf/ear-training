import { describe, expect, it } from 'vitest';
import { CURRICULUM, PATHS, PATH_TEACHING_ORDER, TEACHING_ORDER, getCurrentLevel, getNextLessonAfter, isLevelUnlocked, isSingOnlyLevel, lessonsInPath, pathOfLevel } from './curriculum';

const EAR = lessonsInPath('ear');

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
    for (let i = 0; i < EAR.length; i++) {
      const next = getCurrentLevel(done, true, { skipSinging: true });
      if (done.includes(next.id)) break;
      expect(isSingOnlyLevel(next)).toBe(false);
      expect(isLevelUnlocked(next, done)).toBe(true);
      done.push(next.id);
    }
    expect(done.length).toBe(EAR.filter((l) => !isSingOnlyLevel(l)).length);
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
    expect([...TEACHING_ORDER].sort()).toEqual(EAR.map((l) => l.id).sort());
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

describe('separate paths', () => {
  for (const { id: path } of PATHS) {
    const order = PATH_TEACHING_ORDER[path];
    const lessons = lessonsInPath(path);
    const pos = (id: string) => order.indexOf(id);

    it(`${path}: teaching order lists every lesson in the path exactly once`, () => {
      expect([...order].sort()).toEqual(lessons.map((l) => l.id).sort());
    });

    it(`${path}: puts every lesson after its prerequisites, all in the same path`, () => {
      const problems = lessons.flatMap((l) =>
        (l.prerequisites ?? []).flatMap((p) => [
          ...(pathOfLevel(p) !== path ? [`${l.id} needs ${p} from another path`] : []),
          ...(pos(p) > pos(l.id) ? [`${l.id} before ${p}`] : []),
          ...(CURRICULUM.some((x) => x.id === p) ? [] : [`${l.id} needs missing ${p}`]),
        ]),
      );
      expect(problems).toEqual([]);
    });

    it(`${path}: "continue" walks the path's own order and never leaves it`, () => {
      const done: string[] = [];
      for (;;) {
        const next = getCurrentLevel(done, true, { path });
        if (done.includes(next.id)) break;
        expect(pathOfLevel(next)).toBe(path);
        done.push(next.id);
      }
      expect(done).toEqual(order);
    });
  }

  it('gives every lesson a unique id across all paths', () => {
    const ids = CURRICULUM.map((l) => l.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('starts each new path with a lesson that needs nothing first', () => {
    for (const path of ['read', 'guitar'] as const) {
      expect(getCurrentLevel([], false, { path }).prerequisites ?? []).toEqual([]);
    }
  });
});

describe('"next lesson" after finishing one', () => {
  const upTo = (id: string) => TEACHING_ORDER.slice(0, TEACHING_ORDER.indexOf(id) + 1);

  it('moves on from the lesson just finished, not back to one skipped earlier', () => {
    // Every lesson up to Harmonic 6ths except the rhythm ones, the way one learner skipped them.
    const done = upTo('int_harmonic_6ths').filter((id) => !id.startsWith('rhy_'));
    const next = getNextLessonAfter('int_harmonic_6ths', done, false);
    expect(next.id).not.toBe('rhy_same_diff');
    expect(TEACHING_ORDER.indexOf(next.id)).toBeGreaterThan(TEACHING_ORDER.indexOf('int_harmonic_6ths'));
    // The skipped lesson is still where "continue" on the path starts.
    expect(getCurrentLevel(done, false).id).toBe('rhy_same_diff');
  });

  it('keeps the teaching order for someone going lesson by lesson', () => {
    expect(getNextLessonAfter('found_same_diff', upTo('found_same_diff'), false).id).toBe('rhy_same_diff');
    expect(getNextLessonAfter('rhy_same_diff', upTo('rhy_same_diff'), false).id).toBe('found_beating');
  });

  it('skips lessons already passed, singing ones when singing is off, and Pro ones on the free plan', () => {
    const done = [...upTo('found_consonance'), 'ton_stable_unstable', 'ton_stable_unstable_all'];
    const next = getNextLessonAfter('found_consonance', done, false, { skipSinging: true });
    expect(next.id).toBe('ton_is_tonic');
    for (const id of TEACHING_ORDER) {
      const n = getNextLessonAfter(id, upTo(id), false);
      if (!upTo(id).includes(n.id)) expect(n.tier).not.toBe('pro');
    }
  });

  it('falls back to the earliest unfinished lesson past the end of a course', () => {
    const last = TEACHING_ORDER[TEACHING_ORDER.length - 1];
    const done = TEACHING_ORDER.filter((id) => id !== 'found_beating');
    expect(getNextLessonAfter(last, done, true).id).toBe('found_beating');
  });
});
