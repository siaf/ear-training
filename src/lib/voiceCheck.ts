import type { VoiceRange } from '../routes/Settings';

/** How long a steady hum must last before we trust it. */
export const HUM_HOLD_MS = 1500;
/** A silence longer than this ends the hum. */
const GAP_MS = 250;
/** Pitch may wobble this much (cents) from the hum so far and still count as one note. */
const STEADY_CENTS = 80;

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface HumProgress {
  /** 0..1 of the hold so far. */
  progress: number;
  /** The hum's pitch in Hz, once it has been held long enough. */
  doneHz: number | null;
}

/**
 * Follows the mic until someone holds one steady note. Feed it every pitch sample
 * (hz null for silence). Sliding to a different note starts the hold again.
 */
export function createHumTracker(holdMs = HUM_HOLD_MS) {
  let runStart: number | null = null;
  let lastVoicedAt: number | null = null;
  let hzs: number[] = [];
  const reset = () => { runStart = null; lastVoicedAt = null; hzs = []; };

  return {
    push(hz: number | null, t: number): HumProgress {
      if (hz === null) {
        if (lastVoicedAt !== null && t - lastVoicedAt > GAP_MS) reset();
        return { progress: runStart === null ? 0 : Math.min(1, (t - runStart) / holdMs), doneHz: null };
      }
      if (hzs.length > 0) {
        const center = median(hzs.slice(-15));
        if (Math.abs(1200 * Math.log2(hz / center)) > STEADY_CENTS) reset();
      }
      if (runStart === null) runStart = t;
      lastVoicedAt = t;
      hzs.push(hz);
      const elapsed = t - runStart;
      return { progress: Math.min(1, elapsed / holdMs), doneHz: elapsed >= holdMs ? median(hzs) : null };
    },
  };
}

/**
 * Voice range from a comfortable hum. People hum near the bottom of where they sing, so:
 * below E3 is a lower voice, up to about B3 sits in the middle, and above that is higher.
 */
export function rangeForHum(hz: number): VoiceRange {
  if (hz < 165) return 'lower';
  if (hz < 250) return 'mixed';
  return 'higher';
}
