// One `sing_attempt` event per singing question, summarising what the microphone and the
// pitch detector heard. Match the Pitch loses more learners than any other first lesson
// (16 quits from 9 people, 18–25 Nov), and the existing events can't say why: most quits
// come before the first answer, with or without a mic error. These numbers separate the
// three explanations:
//
//   - the mic:     long wait for permission, or no sound at all (voice_ms near 0)
//   - the code:    in tune for long stretches, but every hold broken by a dropout
//                  (in_tune_ms high, best_hold_ms short, breaks_dropout high)
//   - the singing: plenty of voice, but rarely in tune (median_abs_cents far off)
//
// The mic is also muted while the app plays the note, and for its ring-out (about 2.5–3.5 s
// at the start of each question), so muted_ms and first_sound_ms say how much of the
// learner's time went to that.
//
// Numbers only: no audio, nothing about the person.

import type { PitchSample } from './pitchDetect';

/** Below this the detector treats the input as silence (pitchDetect.ts MIN_RMS). */
const VOICE_RMS = 0.004;
/** Ignore frame gaps longer than this (a backgrounded tab), so one pause can't dominate. */
const MAX_FRAME_MS = 100;

export type SingOutcome = 'matched' | 'missed' | 'skipped' | 'left';

export interface SingAttemptMeta {
  kind: 'prompt' | 'sequence';
  target: string;          // "A4", or the first note of a sequence
  notes?: number;          // sequence length
  anyOctave: boolean;
  toleranceCents: number;
  holdMs: number;
}

export interface SingAttemptSummary extends Record<string, unknown> {
  kind: SingAttemptMeta['kind'];
  outcome: SingOutcome;
  target_pitch_class: string;
  notes: number | null;
  any_octave: boolean;
  tolerance_cents: number;
  hold_ms: number;
  mic_problem: string | null;
  mic_retries: number;
  ms_to_mic: number | null;
  listen_ms: number;
  muted_ms: number;
  first_sound_ms: number | null;
  first_voice_ms: number | null;
  first_pitch_ms: number | null;
  voice_ms: number;
  pitch_ms: number;
  in_tune_ms: number;
  close_ms: number;
  best_hold_ms: number;
  breaks_dropout: number;
  breaks_off_pitch: number;
  median_cents: number | null;
  median_abs_cents: number | null;
  sharp_share: number | null;
  max_rms: number;
  median_voice_rms: number | null;
  hits: number | null;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export class SingAttemptRecorder {
  private readonly startedAt: number;
  private micReadyAt: number | null = null;
  private lastFrameAt: number | null = null;
  private micProblem: string | null = null;
  private retries = 0;
  private firstVoiceAt: number | null = null;
  private firstSoundAt: number | null = null;
  private mutedMs = 0;
  private firstPitchAt: number | null = null;
  private voiceMs = 0;
  private pitchMs = 0;
  private inTuneMs = 0;
  private closeMs = 0;
  private holdStart: number | null = null;
  private bestHold = 0;
  private breaksDropout = 0;
  private breaksOffPitch = 0;
  private cents: number[] = [];
  private voiceRms: number[] = [];
  private maxRms = 0;
  private hits: number | null = null;
  private done = false;

  constructor(
    private readonly meta: SingAttemptMeta,
    private readonly report: (summary: SingAttemptSummary) => void,
    now: number = performance.now(),
  ) {
    this.startedAt = now;
  }

  /** The microphone is open and samples are arriving. */
  micReady(now: number = performance.now()): void {
    if (this.micReadyAt === null) this.micReadyAt = now;
  }

  micTrouble(problem: string): void {
    this.micProblem = problem;
  }

  /** The learner pressed "try again" after a mic problem. */
  retry(): void {
    this.retries += 1;
  }

  /** Sequences: how many notes were hit. */
  setHits(hits: number): void {
    this.hits = hits;
  }

  /**
   * One detector frame. `centsOff` is against the note being asked for (null when no pitch),
   * and `inTune` is what the component itself decided, so the summary matches the grading.
   */
  frame(s: PitchSample, centsOff: number | null, inTune: boolean, now: number = performance.now()): void {
    if (this.done) return;
    if (this.micReadyAt === null) this.micReadyAt = now;
    const dt = this.lastFrameAt === null ? 0 : Math.min(MAX_FRAME_MS, Math.max(0, now - this.lastFrameAt));
    this.lastFrameAt = now;
    const since = now - this.micReadyAt;

    // Exactly zero is the app muting the mic around its own playback (a real room never is).
    if (s.rms === 0) this.mutedMs += dt;
    else if (this.firstSoundAt === null) this.firstSoundAt = since;
    if (s.rms > this.maxRms) this.maxRms = s.rms;
    if (s.rms >= VOICE_RMS) {
      this.voiceMs += dt;
      if (this.firstVoiceAt === null) this.firstVoiceAt = since;
      if (this.voiceRms.length < 4000) this.voiceRms.push(s.rms);
    }
    if (centsOff !== null) {
      this.pitchMs += dt;
      if (this.firstPitchAt === null) this.firstPitchAt = since;
      if (this.cents.length < 4000) this.cents.push(centsOff);
      if (Math.abs(centsOff) <= this.meta.toleranceCents * 2.5) this.closeMs += dt;
    }

    if (inTune) {
      this.inTuneMs += dt;
      if (this.holdStart === null) this.holdStart = now;
      this.bestHold = Math.max(this.bestHold, now - this.holdStart);
    } else if (this.holdStart !== null) {
      // Why the hold ended: the detector lost the voice, or the voice left the note.
      if (centsOff === null) this.breaksDropout += 1;
      else this.breaksOffPitch += 1;
      this.holdStart = null;
    }
  }

  /** Sends the event once; later calls do nothing. */
  finish(outcome: SingOutcome, now: number = performance.now()): void {
    if (this.done) return;
    this.done = true;
    // Left before anything happened: React's development double-start, or a question gone
    // too fast to say anything. Not worth an event.
    if (outcome === 'left' && this.micReadyAt === null && this.micProblem === null && now - this.startedAt < 1000) return;
    const abs = this.cents.map((c) => Math.abs(c));
    const sharp = this.cents.filter((c) => c > 0).length;
    const round = (x: number | null) => (x === null ? null : Math.round(x));
    const rms = (x: number | null) => (x === null ? null : Math.round(x * 10000) / 10000);
    this.report({
      kind: this.meta.kind,
      outcome,
      target_pitch_class: this.meta.target.replace(/-?\d+$/, ''),
      notes: this.meta.notes ?? null,
      any_octave: this.meta.anyOctave,
      tolerance_cents: this.meta.toleranceCents,
      hold_ms: this.meta.holdMs,
      mic_problem: this.micProblem,
      mic_retries: this.retries,
      ms_to_mic: round(this.micReadyAt === null ? null : this.micReadyAt - this.startedAt),
      listen_ms: Math.round(this.micReadyAt === null ? 0 : now - this.micReadyAt),
      muted_ms: Math.round(this.mutedMs),
      first_sound_ms: round(this.firstSoundAt),
      first_voice_ms: round(this.firstVoiceAt),
      first_pitch_ms: round(this.firstPitchAt),
      voice_ms: Math.round(this.voiceMs),
      pitch_ms: Math.round(this.pitchMs),
      in_tune_ms: Math.round(this.inTuneMs),
      close_ms: Math.round(this.closeMs),
      best_hold_ms: Math.round(this.bestHold),
      breaks_dropout: this.breaksDropout,
      breaks_off_pitch: this.breaksOffPitch,
      median_cents: round(median(this.cents)),
      median_abs_cents: round(median(abs)),
      sharp_share: this.cents.length ? Math.round((sharp / this.cents.length) * 100) / 100 : null,
      max_rms: rms(this.maxRms) ?? 0,
      median_voice_rms: rms(median(this.voiceRms)),
      hits: this.hits,
    });
  }
}
