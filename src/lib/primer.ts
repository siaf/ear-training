// Primer selection + fading.
//
// The base primer kind comes from the curriculum level (or a type-based default —
// see resolvePrimerKind in App.tsx). Once a learner has mastered the lesson, the
// primer becomes redundant scaffolding — the desirable-difficulty literature (Bjork)
// favors fading the support rather than removing it abruptly.
//
// Fading rule: if best accuracy across this lesson's recent sessions is ≥90%, downgrade
// the primer one rung. We look at the last RECENT_SESSIONS sessions for this level only.
// "Recent" means by completion time — the most current sessions reflect the user's
// current state better than aggregate history.

import { CurriculumLevel } from '../types';
import { getAllSessions } from './sessionStore';

type PrimerKind = NonNullable<CurriculumLevel['primerKind']>;

const RECENT_SESSIONS = 3;
const FADE_ACCURACY = 90;

/** One step down the support-fading ladder. */
const FADE_DOWN: Record<PrimerKind, PrimerKind> = {
  cadence_then_scale: 'cadence',
  cadence: 'drone',
  scale: 'drone',
  drone: 'none',
  none: 'none',
};

/**
 * Apply primer fading based on recent performance for this level.
 * If the user's recent best for this level is ≥90%, the primer steps down one rung.
 */
export function fadePrimerForMastery(base: PrimerKind, levelId: string): PrimerKind {
  if (base === 'none') return 'none';
  const sessions = getAllSessions()
    .filter((s) => s.levelId === levelId)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, RECENT_SESSIONS);
  if (sessions.length === 0) return base;
  const bestAccuracy = Math.max(...sessions.map((s) => s.accuracy));
  if (bestAccuracy >= FADE_ACCURACY) return FADE_DOWN[base];
  return base;
}
