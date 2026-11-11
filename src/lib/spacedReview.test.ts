import { describe, expect, it } from 'vitest';
import { recordAnswer, type MasteryMap } from './itemMastery';
import { getDueItems, countDueItems, isStillAskable } from './spacedReview';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function seed(): MasteryMap {
  const map: MasteryMap = {};
  // Item A: answered correctly once at NOW. nextDueAt = NOW + 1 day (box 2 → 3 days)
  recordAnswer(map, 'level_10', 'lydian', true, NOW); // box 2, due NOW + 3d
  // Item B: missed at NOW. box 1, due NOW + 1d
  recordAnswer(map, 'level_10', 'dorian', false, NOW);
  // Item C: answered correctly twice at NOW. box 3, due NOW + 7d
  recordAnswer(map, 'level_6', 'minor', true, NOW);
  recordAnswer(map, 'level_6', 'minor', true, NOW);
  // Item D: in an incomplete lesson. should never appear in dues even when overdue.
  recordAnswer(map, 'level_8', 'major_7', false, NOW);
  return map;
}

describe('getDueItems', () => {
  it('returns only items past their nextDueAt and from completed lessons', () => {
    const map = seed();
    // 2 days later: A (due in 3) and C (due in 7) NOT yet due; B (due in 1) IS due.
    const due = getDueItems(map, ['level_10', 'level_6'], NOW + 2 * DAY);
    expect(due.map((d) => d.item)).toEqual(['dorian']);
  });

  it('returns multiple due items sorted most-overdue-first', () => {
    const map = seed();
    // 10 days later: B is 9 days overdue, A is 7 days overdue, C is 3 days overdue.
    const due = getDueItems(map, ['level_10', 'level_6'], NOW + 10 * DAY);
    expect(due.map((d) => d.item)).toEqual(['dorian', 'lydian', 'minor']);
    expect(due[0].overdueMs).toBeGreaterThan(due[1].overdueMs);
    expect(due[1].overdueMs).toBeGreaterThan(due[2].overdueMs);
  });

  it('skips items in incomplete lessons', () => {
    const map = seed();
    // Item D is in level_8, which is NOT in completedLevels.
    const due = getDueItems(map, ['level_10'], NOW + 30 * DAY);
    expect(due.map((d) => d.item)).not.toContain('major_7');
  });

  it('caps the result at the given cap', () => {
    const map: MasteryMap = {};
    for (let i = 0; i < 20; i++) recordAnswer(map, 'rhy_dictation', `item_${i}`, false, NOW);
    const due = getDueItems(map, ['rhy_dictation'], NOW + 30 * DAY, 7);
    expect(due.length).toBe(7);
  });
});

describe('countDueItems', () => {
  it('returns 0 when nothing is due', () => {
    const map = seed();
    expect(countDueItems(map, ['level_10', 'level_6'], NOW)).toBe(0);
  });
  it('counts past-due items only from completed lessons', () => {
    const map = seed();
    // 5 days later: B and A are due, C is not, D is in incomplete lesson.
    expect(countDueItems(map, ['level_10', 'level_6'], NOW + 5 * DAY)).toBe(2);
  });
});

describe('saved items the curriculum no longer asks', () => {
  it('drops them from review instead of leaving them due forever', () => {
    const map: MasteryMap = {};
    // Modes: Brighter or Darker Than Major used to include Aeolian; it now asks Lydian, Ionian, Mixolydian.
    recordAnswer(map, 'level_9', 'aeolian', false, NOW);
    recordAnswer(map, 'level_9', 'lydian', false, NOW);
    recordAnswer(map, 'retired_lesson', 'major', false, NOW);
    const due = getDueItems(map, ['level_9', 'retired_lesson'], NOW + 2 * DAY);
    expect(due.map((d) => `${d.levelId}:${d.item}`)).toEqual(['level_9:lydian']);
    expect(countDueItems(map, ['level_9', 'retired_lesson'], NOW + 2 * DAY)).toBe(1);
  });

  it('keeps generated items such as a dictation melody or a rhythm pattern', () => {
    expect(isStillAskable('md_steps_3', 'melody')).toBe(true);
    expect(isStillAskable('rhy_dictation', 'pattern_7')).toBe(true);
    expect(isStillAskable('level_9', 'aeolian')).toBe(false);
  });
});
