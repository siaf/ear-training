// Per-question timbre rotation.
//
// Practice is piano-only at the surface in most setups. The McAdams / Hou timbre-
// generalization studies show that perceptual learning is timbre-specific unless
// training explicitly varies it. This module provides a small rotation policy that
// kicks in once the learner crosses a session-accuracy floor on a not-yet-completed
// lesson — so they keep the early-acquisition phase clean (single timbre) and only
// pay the timbre-variance "tax" once the basics are solid.
//
// Limited to pitch-based lesson types where timbre swapping makes pedagogical sense:
// interval, triad, seventh_chord, scale_degree. Self-keyed harmony lessons (cadence,
// progression, voicings) intentionally use a single timbre so the chord identity is
// the variable. Acoustic / sing / rhythm lessons are also skipped.

import type { SynthType } from '../audioEngine';
import type { CurriculumLevel } from '../types';

/** Lesson types eligible for timbre rotation. */
const ROTATION_TYPES: ReadonlySet<CurriculumLevel['type']> = new Set([
  'interval',
  'triad',
  'seventh_chord',
  'scale_degree',
]);

/** The rotation pool — diverse but each timbre is well-tested in our sampler / synth catalog. */
export const ROTATION_POOL: readonly SynthType[] = [
  'piano',
  'sine',
  'triangle',
  'guitar',
  'violin',
  'cello',
];

/** Minimum questions answered before rotation can engage; needs a stable accuracy signal. */
const MIN_QUESTIONS = 3;
/** Accuracy floor (0..100) gating rotation. */
const ACCURACY_FLOOR = 75;

export interface TimbreRotationState {
  /** Index into ROTATION_POOL of the most recent rotated timbre, or -1 if rotation hasn't started. */
  lastIdx: number;
  /** True once accuracy ≥ floor at least once this session — sticky for the rest of the session. */
  rotating: boolean;
}

export function createRotationState(): TimbreRotationState {
  return { lastIdx: -1, rotating: false };
}

/**
 * Decide whether to rotate timbre and, if so, which one. Returns null when the caller
 * should leave the user's chosen synth in place. Mutates `state` to record the latest pick.
 */
export function nextRotatedTimbre(
  level: CurriculumLevel,
  isLevelCompleted: boolean,
  totalQuestions: number,
  accuracyPct: number,
  state: TimbreRotationState,
): SynthType | null {
  if (!ROTATION_TYPES.has(level.type)) return null;
  // Don't rotate on a fully-mastered lesson — there's no acquisition phase left to gate on,
  // and varying timbre on a "i can do this in my sleep" lesson is just noise.
  if (isLevelCompleted) return null;
  // Engage rotation once the learner is past acquisition; sticky once on.
  if (!state.rotating && totalQuestions >= MIN_QUESTIONS && accuracyPct >= ACCURACY_FLOOR) {
    state.rotating = true;
  }
  if (!state.rotating) return null;
  // Round-robin, skipping the last index so two consecutive questions never share a timbre.
  const next = (state.lastIdx + 1) % ROTATION_POOL.length;
  state.lastIdx = next;
  return ROTATION_POOL[next];
}
