import { centsBetween, hzToMidi, noteToHz, noteToMidi } from './pitch';
import type { PitchSample } from './pitchDetector';

export interface GradeOptions {
  /** Max absolute cents error to accept as "in tune". Default 50 (half-semitone). */
  toleranceCents?: number;
  /** Minimum ms of continuous in-tune singing required to count a target as matched. Default 400. */
  minSustainMs?: number;
  /** If two in-tune samples are separated by more than this, the run resets. Default 150. */
  gapToleranceMs?: number;
  /** Discard samples below this clarity before grading. Default 0.9. */
  minClarity?: number;
  /** If false (default), octave is ignored — matching is by pitch class only. Useful since non-singers can't hit a target octave. */
  octaveAware?: boolean;
}

export interface TargetResult {
  target: string;
  matched: boolean;
  /** Median cents error across the matched run, or null if unmatched. Negative = flat, positive = sharp. */
  centsError: number | null;
  /** Duration of the matched in-tune run, or 0 if unmatched. */
  sustainMs: number;
}

export interface GradeResult {
  correct: boolean;
  targets: TargetResult[];
  /** First target that was NOT matched (in order), or null if all matched. */
  firstUnmatchedIndex: number | null;
}

const DEFAULTS: Required<GradeOptions> = {
  toleranceCents: 50,
  minSustainMs: 400,
  gapToleranceMs: 150,
  minClarity: 0.9,
  octaveAware: false,
};

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Signed cents error between a detected frequency and a target note. Negative = flat. */
function centsFromTarget(freq: number, targetLabel: string, octaveAware: boolean): number {
  if (octaveAware) {
    return centsBetween(freq, noteToHz(targetLabel));
  }
  // Octave-agnostic: project freq to the same octave as target, then compare.
  const targetMidi = noteToMidi(targetLabel);
  const detectedMidi = hzToMidi(freq);
  let diff = detectedMidi - targetMidi;
  // Wrap into [-6, +6) semitones so nearest octave wins.
  diff = ((diff % 12) + 12) % 12;
  if (diff >= 6) diff -= 12;
  return diff * 100;
}

/**
 * Grade a sung response against a sequence of target notes.
 * Targets must be matched in order: a later target cannot be credited before an earlier one.
 */
export function gradeSing(
  targets: string[],
  samples: PitchSample[],
  opts: GradeOptions = {},
): GradeResult {
  const o = { ...DEFAULTS, ...opts };

  const filtered = samples
    .filter((s) => s.clarity >= o.minClarity && s.frequency > 0 && Number.isFinite(s.frequency))
    .sort((a, b) => a.t - b.t);

  const results: TargetResult[] = targets.map((target) => ({
    target,
    matched: false,
    centsError: null,
    sustainMs: 0,
  }));

  let targetIdx = 0;
  let runStart: number | null = null;
  let runLastT: number | null = null;
  let runCents: number[] = [];

  const commitRunIfQualifies = () => {
    if (targetIdx >= targets.length || runStart === null || runLastT === null) return false;
    const sustain = runLastT - runStart;
    if (sustain >= o.minSustainMs) {
      results[targetIdx] = {
        target: targets[targetIdx],
        matched: true,
        centsError: median(runCents),
        sustainMs: sustain,
      };
      targetIdx++;
      return true;
    }
    return false;
  };

  for (const s of filtered) {
    if (targetIdx >= targets.length) break;
    const currentTarget = targets[targetIdx];
    const cents = centsFromTarget(s.frequency, currentTarget, o.octaveAware);
    const inTune = Math.abs(cents) <= o.toleranceCents;

    if (inTune) {
      if (runStart === null || runLastT === null || s.t - runLastT > o.gapToleranceMs) {
        // Start a fresh run. But before dropping the previous, see if it qualified.
        commitRunIfQualifies();
        if (targetIdx >= targets.length) break;
        runStart = s.t;
        runCents = [cents];
      } else {
        runCents.push(cents);
      }
      runLastT = s.t;
      // If the run already qualifies mid-stream, commit and move on.
      if (commitRunIfQualifies()) {
        runStart = null;
        runLastT = null;
        runCents = [];
      }
    } else {
      // Out of tune → possibly commit what we had, then reset.
      commitRunIfQualifies();
      runStart = null;
      runLastT = null;
      runCents = [];
    }
  }
  // End-of-stream: try to commit any trailing run.
  commitRunIfQualifies();

  const firstUnmatchedIndex = results.findIndex((r) => !r.matched);
  return {
    correct: firstUnmatchedIndex === -1,
    targets: results,
    firstUnmatchedIndex: firstUnmatchedIndex === -1 ? null : firstUnmatchedIndex,
  };
}

/** Convenience builder for tests / simulators: dense sample stream singing `label` for `durationMs`. */
export function buildSampleStream(
  segments: Array<{ label?: string; freq?: number; durationMs: number; centsOffset?: number; clarity?: number; rms?: number }>,
  sampleIntervalMs = 20,
  startT = 0,
): PitchSample[] {
  const out: PitchSample[] = [];
  let t = startT;
  for (const seg of segments) {
    const base = seg.freq ?? (seg.label ? noteToHz(seg.label) : 0);
    const freq = base * Math.pow(2, (seg.centsOffset ?? 0) / 1200);
    const clarity = seg.clarity ?? 0.98;
    const rms = seg.rms ?? 0.1;
    const end = t + seg.durationMs;
    while (t < end) {
      if (freq > 0) out.push({ frequency: freq, clarity, rms, t });
      t += sampleIntervalMs;
    }
  }
  return out;
}
