// Pure logic for the vocal range test: note math, pitch-frame analysis,
// hold-to-accept stability tracking, voice-type estimation and URL encoding.
// No DOM / React here so it can be unit-checked in Node (see _src/check.mjs).
import { PitchDetector } from 'pitchy';

// ---------------- Note math ----------------
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function hzToMidiFloat(hz) {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 57 -> "A3", 61 -> "C#4" (ASCII sharp; use prettyNote for display). */
export function midiToName(midi) {
  const m = Math.round(midi);
  return SHARP_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

/** Display form with a real sharp sign: "C♯4". */
export function prettyNote(midi) {
  return midiToName(midi).replace('#', '♯');
}

/**
 * Parse "A3", "C#4", "Cs4", "Db4", "C♯4", "D♭4" -> MIDI number, or null.
 * Accepts the "s" spelling so share links never need a URL-encoded "#".
 */
export function nameToMidi(name) {
  if (typeof name !== 'string') return null;
  const m = name.trim().match(/^([A-Ga-g])(#|s|♯|b|♭)?(-?\d)$/);
  if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  let pc = base;
  if (m[2] === '#' || m[2] === 's' || m[2] === '♯') pc += 1;
  if (m[2] === 'b' || m[2] === '♭') pc -= 1;
  return pc + (parseInt(m[3], 10) + 1) * 12;
}

/** URL-safe note token: C#4 -> "Cs4". */
export function midiToUrlToken(midi) {
  return midiToName(midi).replace('#', 's');
}

// ---------------- Frame analysis ----------------
// Human singing range we accept. Outside this, a detection is almost always a
// sub-/super-harmonic error or room noise. A1 (55 Hz) .. F#6 (~1480 Hz).
export const MIN_HZ = 55;
export const MAX_HZ = 1480;
export const MIN_CLARITY = 0.9; // pitchy clarity; ~0.9+ is reliable for voice
export const MIN_RMS = 0.008;   // silence gate; low enough for soft low notes

export function createFrameAnalyzer(bufferSize) {
  const detector = PitchDetector.forFloat32Array(bufferSize);
  return function analyze(buf, sampleRate) {
    let sumSq = 0;
    for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
    const rms = Math.sqrt(sumSq / buf.length);
    if (rms < MIN_RMS) return { hz: null, clarity: 0, rms, sumSq };
    const [hz, clarity] = detector.findPitch(buf, sampleRate);
    if (!(clarity >= MIN_CLARITY) || !Number.isFinite(hz) || hz < MIN_HZ || hz > MAX_HZ) {
      return { hz: null, clarity, rms, sumSq };
    }
    return { hz, clarity, rms, sumSq };
  };
}

// ---------------- Stability tracker ----------------
function median(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Accepts a note only after it has been held within `tolerance` semitones for
 * `holdMs`. Brief dropouts (< gapMs) and up to `maxOutliers` consecutive
 * off-pitch frames (octave glitches, consonants) are ignored instead of
 * resetting the hold.
 *
 * push(midiFloat | null, tMs) -> {
 *   live:     midiFloat | null   current run's median (what the user is singing)
 *   progress: 0..1               how far through the hold
 *   stable:   int | null         accepted note while the hold is satisfied
 * }
 */
export function createStabilityTracker(opts = {}) {
  const holdMs = opts.holdMs ?? 400;
  const tolerance = opts.tolerance ?? 0.5;
  const gapMs = opts.gapMs ?? 160;
  const maxOutliers = opts.maxOutliers ?? 3;
  const windowSize = 24;

  let run = [];
  let runStart = 0;
  let lastValid = -Infinity;
  let outliers = [];

  function reset() { run = []; outliers = []; }

  return {
    reset,
    push(m, t) {
      if (m == null) {
        if (t - lastValid > gapMs) reset();
      } else {
        lastValid = t;
        if (run.length === 0) {
          run = [m]; runStart = t; outliers = [];
        } else {
          const center = median(run);
          if (Math.abs(m - center) <= tolerance) {
            run.push(m);
            if (run.length > windowSize) run.shift();
            outliers = [];
          } else {
            outliers.push(m);
            if (outliers.length > maxOutliers) {
              // Persistent new pitch: start a fresh run from the outliers.
              run = outliers.slice(); runStart = t; outliers = [];
            }
          }
        }
      }
      if (run.length === 0) return { live: null, progress: 0, stable: null };
      const live = median(run);
      const progress = Math.min(1, (t - runStart) / holdMs);
      return { live, progress, stable: progress >= 1 ? Math.round(live) : null };
    },
  };
}

// ---------------- Voice types ----------------
// Commonly cited choral/classical ranges (e.g. the ranges used in most voice
// pedagogy references). Individual voices vary — these are conventions.
export const VOICE_TYPES = [
  { id: 'bass',          label: 'Bass',          low: 40, high: 64 }, // E2–E4
  { id: 'baritone',      label: 'Baritone',      low: 45, high: 69 }, // A2–A4
  { id: 'tenor',         label: 'Tenor',         low: 48, high: 72 }, // C3–C5
  { id: 'alto',          label: 'Alto',          low: 53, high: 77 }, // F3–F5 (contralto)
  { id: 'mezzo',         label: 'Mezzo-soprano', low: 57, high: 81 }, // A3–A5
  { id: 'soprano',       label: 'Soprano',       low: 60, high: 84 }, // C4–C6
];

/**
 * Score each voice type by how well its conventional range lines up with the
 * singer's (overlap / union), nudged by how close the range centres are.
 * Returns the best type plus a runner-up when it is essentially tied.
 */
export function estimateVoiceType(low, high) {
  const center = (low + high) / 2;
  const scored = VOICE_TYPES.map((v) => {
    const overlap = Math.max(0, Math.min(high, v.high) - Math.max(low, v.low));
    const union = Math.max(high, v.high) - Math.min(low, v.low);
    const jaccard = union > 0 ? overlap / union : 0;
    const centerDist = Math.abs(center - (v.low + v.high) / 2);
    return { ...v, score: jaccard - 0.01 * centerDist };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  const matches = [best];
  if (scored[1] && best.score - scored[1].score <= 0.05) matches.push(scored[1]);
  // Keep low-to-high order for display ("Baritone or tenor").
  matches.sort((a, b) => a.low - b.low);
  const span = high - low;
  return {
    types: matches,
    label: matches.map((m, i) => (i ? m.label.toLowerCase() : m.label)).join(' or '),
    // Under ~an octave and a bit there isn't enough range to tell types apart.
    tentative: span < 14,
  };
}

export function describeSpan(semitones) {
  const oct = Math.floor(semitones / 12);
  const rest = semitones % 12;
  const parts = [];
  if (oct) parts.push(oct + (oct === 1 ? ' octave' : ' octaves'));
  if (rest || !oct) parts.push(rest + (rest === 1 ? ' semitone' : ' semitones'));
  return parts.join(' + ');
}

// ---------------- URL ----------------
export const MIN_MIDI = 28; // E1
export const MAX_MIDI = 96; // C7

export function parseResultFromSearch(search) {
  try {
    const p = new URLSearchParams(search);
    const low = nameToMidi(p.get('low'));
    const high = nameToMidi(p.get('high'));
    if (low == null || high == null) return null;
    if (low < MIN_MIDI || high > MAX_MIDI || high <= low) return null;
    return { low, high };
  } catch (_) {
    return null;
  }
}

export function resultQuery(low, high) {
  return '?low=' + midiToUrlToken(low) + '&high=' + midiToUrlToken(high);
}
