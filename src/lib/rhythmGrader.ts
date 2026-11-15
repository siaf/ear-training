// Rhythm tap grader.
// Compares a sequence of user-tap timestamps against expected onset timestamps
// (both in performance.now() ms). Returns per-onset hit/miss + an overall score.
//
// Algorithm:
//   1. For each target onset, find the nearest user tap within ±toleranceMs.
//      The first match wins; that tap is consumed.
//   2. Hits / target = recall.
//   3. Hits / userTaps = precision (over-taps reduce precision toward 0.5).
//   4. score = (recall + precision) / 2 in [0..1].
//
// This is intentionally lenient. The first rhythm lessons tolerate ~130 ms because
// listeners new to rhythm work cluster their taps later than the beat by ~50–100 ms.

export interface TapGradeResult {
  hits: boolean[]; // length = targetOnsets.length
  matchedTaps: (number | null)[]; // for each target onset, the user tap that matched (ms) or null
  extraTaps: number[]; // user taps that didn't align to any target
  score: number; // 0..1
  recall: number;
  precision: number;
}

export function gradeTaps(
  userTapsMs: number[],
  targetOnsetsMs: number[],
  toleranceMs = 130,
): TapGradeResult {
  const hits: boolean[] = new Array(targetOnsetsMs.length).fill(false);
  const matchedTaps: (number | null)[] = new Array(targetOnsetsMs.length).fill(null);
  const tapConsumed = new Array(userTapsMs.length).fill(false);

  // Greedy: walk targets left-to-right, match the closest unconsumed tap within tolerance.
  for (let i = 0; i < targetOnsetsMs.length; i++) {
    const target = targetOnsetsMs[i];
    let bestIdx = -1;
    let bestDelta = Infinity;
    for (let j = 0; j < userTapsMs.length; j++) {
      if (tapConsumed[j]) continue;
      const delta = Math.abs(userTapsMs[j] - target);
      if (delta <= toleranceMs && delta < bestDelta) {
        bestDelta = delta;
        bestIdx = j;
      }
    }
    if (bestIdx !== -1) {
      hits[i] = true;
      matchedTaps[i] = userTapsMs[bestIdx];
      tapConsumed[bestIdx] = true;
    }
  }

  const extraTaps = userTapsMs.filter((_, j) => !tapConsumed[j]);
  const hitCount = hits.filter((h) => h).length;
  const recall = targetOnsetsMs.length > 0 ? hitCount / targetOnsetsMs.length : 0;
  const precision = userTapsMs.length > 0 ? hitCount / userTapsMs.length : 0;
  const score = (recall + precision) / 2;
  return { hits, matchedTaps, extraTaps, score, recall, precision };
}

// Strict equality grader for the dictation grid level. Pass = exact match.
export function gradeGrid(userCells: boolean[], targetCells: boolean[]): { score: number; passed: boolean } {
  if (userCells.length !== targetCells.length) return { score: 0, passed: false };
  let matches = 0;
  for (let i = 0; i < userCells.length; i++) {
    if (userCells[i] === targetCells[i]) matches++;
  }
  const score = matches / userCells.length;
  // Pass if all 16 cells match (strict) — user has unlimited time on the grid.
  const passed = score === 1;
  return { score, passed };
}

/**
 * Taps graded as above, but first lined up with the rhythm by the one steady shift that
 * fits best. Touch screens, Bluetooth headphones and slow devices all add a fixed delay
 * between a note sounding and a tap registering; a learner who is consistently 80 ms late
 * on every note is still playing the rhythm. Uneven timing still fails.
 */
export function gradeTapsSteady(
  userTapsMs: number[],
  targetOnsetsMs: number[],
  toleranceMs = 110,
  shifts: number[] = Array.from({ length: 25 }, (_, i) => -80 + i * 10), // -80 … +160 ms
): TapGradeResult & { shiftMs: number } {
  // Best score first; among equal scores, the shift that lines the taps up most closely.
  const residual = (r: TapGradeResult, shift: number) =>
    r.matchedTaps.reduce<number>((a, t, i) => a + (t === null ? 0 : Math.abs(t - shift - targetOnsetsMs[i])), 0);
  let best = { ...gradeTaps(userTapsMs, targetOnsetsMs, toleranceMs), shiftMs: 0 };
  let bestResidual = residual(best, 0);
  for (const shift of shifts) {
    const r = gradeTaps(userTapsMs.map((t) => t - shift), targetOnsetsMs, toleranceMs);
    const matched = { ...r, matchedTaps: r.matchedTaps.map((t) => (t === null ? null : t + shift)) };
    const res = residual(matched, shift);
    if (r.score > best.score + 1e-9 || (Math.abs(r.score - best.score) < 1e-9 && res < bestResidual - 1e-6)) {
      best = { ...matched, shiftMs: shift };
      bestResidual = res;
    }
  }
  return best;
}
