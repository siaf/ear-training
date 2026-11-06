import { describe, expect, it } from 'vitest';
import { CURRICULUM, getCurrentLevel, isLevelUnlocked, isSingOnlyLevel } from './curriculum';

const level = (id: string) => CURRICULUM.find((l) => l.id === id)!;

describe('skipping singing lessons', () => {
  const finishedBasics = ['found_higher_lower', 'found_same_diff', 'found_beating', 'found_consonance'];

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
