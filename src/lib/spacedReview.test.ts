import { describe, expect, it } from 'vitest';
import { recordAnswer, type MasteryMap } from './itemMastery';
import { getDueItems, countDueItems } from './spacedReview';

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function seed(): MasteryMap {
  const map: MasteryMap = {};
  // Item A: answered correctly once at NOW. nextDueAt = NOW + 1 day (box 2 → 3 days)
  recordAnswer(map, 'lvl_x', 'A', true, NOW); // box 2, due NOW + 3d
  // Item B: missed at NOW. box 1, due NOW + 1d
  recordAnswer(map, 'lvl_x', 'B', false, NOW);
  // Item C: answered correctly twice at NOW. box 3, due NOW + 7d
  recordAnswer(map, 'lvl_y', 'C', true, NOW);
  recordAnswer(map, 'lvl_y', 'C', true, NOW);
  // Item D: in an incomplete lesson. should never appear in dues even when overdue.
  recordAnswer(map, 'lvl_incomplete', 'D', false, NOW);
  return map;
}

describe('getDueItems', () => {
  it('returns only items past their nextDueAt and from completed lessons', () => {
    const map = seed();
    // 2 days later: A (due in 3) and C (due in 7) NOT yet due; B (due in 1) IS due.
    const due = getDueItems(map, ['lvl_x', 'lvl_y'], NOW + 2 * DAY);
    expect(due.map((d) => d.item)).toEqual(['B']);
  });

  it('returns multiple due items sorted most-overdue-first', () => {
    const map = seed();
    // 10 days later: B is 9 days overdue, A is 7 days overdue, C is 3 days overdue.
    const due = getDueItems(map, ['lvl_x', 'lvl_y'], NOW + 10 * DAY);
    expect(due.map((d) => d.item)).toEqual(['B', 'A', 'C']);
    expect(due[0].overdueMs).toBeGreaterThan(due[1].overdueMs);
    expect(due[1].overdueMs).toBeGreaterThan(due[2].overdueMs);
  });

  it('skips items in incomplete lessons', () => {
    const map = seed();
    // Item D is in lvl_incomplete, which is NOT in completedLevels.
    const due = getDueItems(map, ['lvl_x'], NOW + 30 * DAY);
    expect(due.map((d) => d.item)).not.toContain('D');
  });

  it('caps the result at the given cap', () => {
    const map: MasteryMap = {};
    for (let i = 0; i < 20; i++) recordAnswer(map, 'lvl', `item_${i}`, false, NOW);
    const due = getDueItems(map, ['lvl'], NOW + 30 * DAY, 7);
    expect(due.length).toBe(7);
  });
});

describe('countDueItems', () => {
  it('returns 0 when nothing is due', () => {
    const map = seed();
    expect(countDueItems(map, ['lvl_x', 'lvl_y'], NOW)).toBe(0);
  });
  it('counts past-due items only from completed lessons', () => {
    const map = seed();
    // 5 days later: B and A are due, C is not, D is in incomplete lesson.
    expect(countDueItems(map, ['lvl_x', 'lvl_y'], NOW + 5 * DAY)).toBe(2);
  });
});
