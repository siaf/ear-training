// Cross-segment lesson recommendations.
//
// Looks at the user's per-segment accuracy across recent sessions and surfaces a
// suggested lesson when one segment lags. The pitch is: "you're 95% on chord quality
// but 60% on melodic dictation — try this." It's an opt-in nudge to break out of a
// blocked-practice rut into transfer work.
//
// Heuristic, not a hard rule:
//   - Need at least MIN_SAMPLES recent attempts per segment to consider it.
//   - Only recommend if the gap between best and worst segment is ≥ GAP_THRESHOLD.
//   - The recommended lesson is whichever lesson in the weakest segment has the
//     lowest recent accuracy AND is unlocked (or the next-unstarted lesson if all
//     existing are 100%).
//   - Suppressed if the suggestion is the user's current level (they're already on it).

import { CURRICULUM, isLevelUnlocked } from '../curriculum';
import { getAllSessions } from './sessionStore';
import type { CurriculumLevel } from '../types';

const RECENT_WINDOW_MS = 30 * 86_400_000;
const MIN_SAMPLES = 8;
const GAP_THRESHOLD = 20; // percentage points between best and worst segment

export interface SegmentAccuracy {
  segmentId: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface Recommendation {
  level: CurriculumLevel;
  weakSegmentId: string;
  weakSegmentAccuracy: number;
  strongSegmentId: string;
  strongSegmentAccuracy: number;
}

/** Aggregate session totals into per-segment accuracy across the recent window. */
export function getSegmentAccuracy(now = Date.now()): SegmentAccuracy[] {
  const cutoff = now - RECENT_WINDOW_MS;
  const sessions = getAllSessions().filter((s) => s.endedAt >= cutoff);
  const agg = new Map<string, { attempts: number; correct: number }>();
  for (const s of sessions) {
    const bucket = agg.get(s.segmentId) ?? { attempts: 0, correct: 0 };
    bucket.attempts += s.totalQuestions;
    bucket.correct += s.correct;
    agg.set(s.segmentId, bucket);
  }
  const out: SegmentAccuracy[] = [];
  agg.forEach((v, k) => {
    out.push({
      segmentId: k,
      attempts: v.attempts,
      correct: v.correct,
      accuracy: v.attempts ? (v.correct / v.attempts) * 100 : 0,
    });
  });
  return out;
}

/**
 * Pick a cross-segment recommendation if one is warranted; null when accuracy is
 * even across the user's history or the user has only practiced one segment.
 *
 * `completedLevels` and `currentLevelId` come from app state — the latter is suppressed
 * from recommendations so we don't tell the user to start the lesson they're already on.
 */
export function getCrossSegmentRecommendation(
  completedLevels: string[],
  currentLevelId: string,
  isPro: boolean,
  now = Date.now(),
): Recommendation | null {
  const segments = getSegmentAccuracy(now).filter((s) => s.attempts >= MIN_SAMPLES);
  if (segments.length < 2) return null;

  const sorted = [...segments].sort((a, b) => a.accuracy - b.accuracy);
  const weak = sorted[0];
  const strong = sorted[sorted.length - 1];
  if (strong.accuracy - weak.accuracy < GAP_THRESHOLD) return null;

  // Find candidate lessons in the weak segment that are unlocked, not Pro-locked, and
  // not the user's current level.
  const candidates = CURRICULUM.filter((l) => {
    if (l.segmentId !== weak.segmentId) return false;
    if (l.id === currentLevelId) return false;
    if (l.tier === 'pro' && !isPro) return false;
    return isLevelUnlocked(l, completedLevels);
  });
  if (candidates.length === 0) return null;

  // Prefer an unstarted unlocked lesson (so the recommendation is a fresh challenge).
  // If none, fall back to the lowest-accuracy completed lesson in the weak segment.
  const completedSet = new Set(completedLevels);
  const unstarted = candidates.find((l) => !completedSet.has(l.id));
  const level = unstarted ?? candidates[0];

  return {
    level,
    weakSegmentId: weak.segmentId,
    weakSegmentAccuracy: weak.accuracy,
    strongSegmentId: strong.segmentId,
    strongSegmentAccuracy: strong.accuracy,
  };
}
