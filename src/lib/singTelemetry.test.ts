import { describe, expect, it } from 'vitest';
import { SingAttemptRecorder, type SingAttemptSummary } from './singTelemetry';

const meta = { kind: 'prompt' as const, target: 'A4', anyOctave: true, toleranceCents: 50, holdMs: 900 };
const voice = (hz: number | null, rms = 0.05) => ({ hz, rms, clarity: 0, rawHz: hz });

/** Feeds frames 16 ms apart: [hz or null, cents or null, inTune]. */
function run(frames: Array<[number | null, number | null, boolean, number?]>, outcome: 'matched' | 'left' = 'left') {
  let sent: SingAttemptSummary | null = null;
  const r = new SingAttemptRecorder(meta, (s) => { sent = s; }, 0);
  r.micReady(1000); // a second waiting for the permission prompt
  let t = 1000;
  for (const [hz, cents, inTune, rms] of frames) {
    t += 16;
    r.frame(voice(hz, rms ?? 0.05), cents, inTune, t);
  }
  r.finish(outcome, t);
  return sent as unknown as SingAttemptSummary;
}

describe('SingAttemptRecorder', () => {
  it('tells a dead or quiet microphone apart from singing', () => {
    const s = run(Array.from({ length: 100 }, () => [null, null, false, 0] as [null, null, false, number]));
    expect(s.ms_to_mic).toBe(1000);
    expect(s.voice_ms).toBe(0);
    expect(s.muted_ms).toBeGreaterThan(1500);
    expect(s.first_sound_ms).toBeNull();
    expect(s.first_voice_ms).toBeNull();
    expect(s.pitch_ms).toBe(0);
    expect(s.listen_ms).toBe(1600);
  });

  it('counts holds broken by the detector losing the voice, not by singing off the note', () => {
    // In tune for 30 frames, one dropout, in tune again, then off the note.
    const inTune = Array.from({ length: 30 }, () => [440, 5, true] as [number, number, boolean]);
    const s = run([...inTune, [null, null, false, 0.05], ...inTune, [494, 200, false]]);
    expect(s.breaks_dropout).toBe(1);
    expect(s.breaks_off_pitch).toBe(1);
    expect(s.best_hold_ms).toBe(29 * 16); // never reached the 900 ms the lesson asks for
    expect(s.in_tune_ms).toBeGreaterThan(900); // although in tune for longer than that in total
    expect(s.voice_ms).toBeGreaterThan(s.in_tune_ms);
  });

  it('summarises how far off and which way the singing was', () => {
    const s = run(Array.from({ length: 50 }, (_, i) => [415, i % 2 ? -110 : -90, false] as [number, number, boolean]));
    expect(s.median_cents).toBe(-100);
    expect(s.median_abs_cents).toBe(100);
    expect(s.sharp_share).toBe(0);
    expect(s.close_ms).toBeGreaterThan(0); // within 2.5 × the tolerance
    expect(s.in_tune_ms).toBe(0);
  });

  it('sends nothing for a question left before the mic even opened', () => {
    const sent: SingAttemptSummary[] = [];
    new SingAttemptRecorder(meta, (s) => sent.push(s), 0).finish('left', 5);
    expect(sent).toHaveLength(0);
    // But waiting a while on the permission prompt and then leaving is worth knowing.
    new SingAttemptRecorder(meta, (s) => sent.push(s), 0).finish('left', 8000);
    expect(sent).toHaveLength(1);
  });

  it('sends once, with the outcome it finished on', () => {
    const sent: SingAttemptSummary[] = [];
    const r = new SingAttemptRecorder({ ...meta, kind: 'sequence', target: 'C4', notes: 3 }, (s) => sent.push(s), 0);
    r.micTrouble('denied');
    r.retry();
    r.setHits(2);
    r.finish('missed', 500);
    r.finish('left', 900);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ kind: 'sequence', outcome: 'missed', target_pitch_class: 'C', notes: 3, mic_problem: 'denied', mic_retries: 1, hits: 2, ms_to_mic: null });
  });
});
