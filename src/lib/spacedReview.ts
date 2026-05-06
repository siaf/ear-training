// Leitner-style spaced review.
//
// Once an item has been seen at least once (recordAnswer in itemMastery.ts populates
// box=1 and nextDueAt = now + 1 day), the Daily Review tile pulls items from any
// completed lesson whose nextDueAt has passed. Items mix across types — one question
// might be an interval, the next a chord, the next a cadence — using the original
// level's audio engine to drive playback.
//
// Box → interval mapping (in days):  1 → 1, 2 → 3, 3 → 7, 4 → 14, 5 → 30.
// Promote on correct, demote to box 1 on miss. Both happen inside itemMastery.recordAnswer;
// this module only handles the *due-list* query.

import { CURRICULUM } from '../curriculum';
import type { MasteryMap, ItemMastery } from './itemMastery';

export interface DueItem {
  levelId: string;
  item: string;
  /** ms past due (>0). Larger = more overdue, listed first. */
  overdueMs: number;
  box: ItemMastery['box'];
}

/**
 * Return items past their due date, sorted most-overdue-first, capped at `cap` (default 10).
 *
 * `completedLevels` is the user's completed-lesson set. Items from incomplete lessons are
 * skipped — review is for material the user has already worked through, not new content.
 */
export function getDueItems(
  map: MasteryMap,
  completedLevels: string[],
  now = Date.now(),
  cap = 10,
): DueItem[] {
  const completed = new Set(completedLevels);
  const out: DueItem[] = [];
  for (const [k, m] of Object.entries(map)) {
    const sep = k.indexOf('::');
    if (sep < 0) continue;
    const levelId = k.slice(0, sep);
    const item = k.slice(sep + 2);
    if (!completed.has(levelId)) continue;
    if (now < m.nextDueAt) continue;
    out.push({ levelId, item, overdueMs: now - m.nextDueAt, box: m.box });
  }
  out.sort((a, b) => b.overdueMs - a.overdueMs);
  return out.slice(0, cap);
}

/** Count of items due now. Used for the Daily Review tile badge. */
export function countDueItems(
  map: MasteryMap,
  completedLevels: string[],
  now = Date.now(),
): number {
  return getDueItems(map, completedLevels, now, Number.MAX_SAFE_INTEGER).length;
}

/**
 * Resolve a list of due items into a sequence of "review questions" — each one tagged
 * with the level config it should use for playback. The Practice route then dispatches
 * to the right audio engine method per question. Returns null entries for items whose
 * source level is no longer in the curriculum (e.g. a renamed lesson) — caller should
 * filter those.
 */
export function resolveDueLevels(due: DueItem[]): Array<{ due: DueItem; level: typeof CURRICULUM[number] | undefined }> {
  return due.map((d) => ({ due: d, level: CURRICULUM.find((l) => l.id === d.levelId) }));
}
