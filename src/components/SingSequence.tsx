import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { audioEngine } from '../audioEngine';
import MicTrouble from './MicTrouble';
import { classifyMicError, reportMicProblem, type MicProblem } from '../lib/micDiagnostics';
import { Blob } from './primitives';
import {
  centsFromTarget,
  centsFromTargetAnyOctave,
  hzToMidi,
  type ListenHandle,
  type PitchSample,
} from '../lib/pitchDetect';

interface Props {
  targetNotes: string[];          // Full sequence to sing, in order.
  anyOctave?: boolean;            // default true
  toleranceCents?: number;        // default 50
  perNoteHoldMs?: number;         // default 250
  perNoteTimeoutMs?: number;      // default 6000 — auto-skip this note after this long
  mobile: boolean;
  onReplay?: () => void;          // Re-play the sequence so the user can hear it again.
  onHits?: (hits: boolean[]) => void; // Per-note pass/miss, in target order. Fired once at end.
  onMatch: () => void;            // Called once when every note has been hit in order.
  onCancel: () => void;            // Called when skipped or any note timed out.
}

type Status = 'idle' | 'permission' | 'listening' | 'trouble';
type Zone = 'idle' | 'far' | 'close' | 'onTarget';

function zoneFor(centsOff: number | null, tol: number): Zone {
  if (centsOff === null) return 'idle';
  const abs = Math.abs(centsOff);
  if (abs <= tol) return 'onTarget';
  // "close" = within ~2 semitones — you can see yourself getting warmer.
  if (abs <= Math.max(tol * 3, 200)) return 'close';
  return 'far';
}

// Convert a note name to its fundamental frequency in Hz.
function noteToHz(name: string): number {
  const match = name.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) return 0;
  const [, letter, accidental, octaveStr] = match;
  const letterMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semis = letterMap[letter];
  if (accidental === '#') semis += 1;
  if (accidental === 'b') semis -= 1;
  const midi = semis + (parseInt(octaveStr, 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function zoneColor(zone: Zone): string {
  switch (zone) {
    case 'onTarget': return 'var(--mint)';
    case 'close': return 'var(--butter)';
    case 'far': return 'var(--coral)';
    case 'idle': return 'var(--ink-5)';
  }
}

export default function SingSequence({
  targetNotes,
  anyOctave = true,
  toleranceCents = 50,
  perNoteHoldMs = 250,
  perNoteTimeoutMs = 6000,
  mobile,
  onReplay,
  onHits,
  onMatch,
  onCancel,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [sample, setSample] = useState<PitchSample>({ hz: null, rms: 0, clarity: 0, rawHz: null });
  const [smoothedHz, setSmoothedHz] = useState<number | null>(null);
  const [idx, setIdx] = useState(0);
  const [targetStartedAt, setTargetStartedAt] = useState<number>(performance.now());
  const [problem, setProblem] = useState<MicProblem>('unknown');
  const [attempt, setAttempt] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const idxRef = useRef(0);
  const matchedRef = useRef(false);
  const handleRef = useRef<ListenHandle | null>(null);
  const smoothHzRef = useRef<number | null>(null);
  const lastGoodHzRef = useRef<number | null>(null);
  const lastGoodAtRef = useRef<number>(0);
  const targetStartRef = useRef<number>(performance.now());
  const missesRef = useRef(0);
  const hitsRef = useRef<boolean[]>([]);

  // Keep idxRef in sync so the mic callback sees current value without stale closure.
  useEffect(() => {
    idxRef.current = idx;
    targetStartRef.current = performance.now();
    setTargetStartedAt(targetStartRef.current);
    holdStartRef.current = null;
  }, [idx]);

  // Advance to the next note (or finish the sequence).
  const advance = (missed: boolean) => {
    const i = idxRef.current;
    hitsRef.current[i] = !missed;
    if (missed) missesRef.current += 1;
    const next = i + 1;
    idxRef.current = next;
    holdStartRef.current = null;
    setIdx(next);
    if (next >= targetNotes.length && !matchedRef.current) {
      matchedRef.current = true;
      if (onHits) onHits([...hitsRef.current]);
      if (missesRef.current > 0) onCancel();
      else onMatch();
    }
  };

  useEffect(() => {
    let cancelled = false;
    setStatus('permission');

    const centsFn = anyOctave ? centsFromTargetAnyOctave : centsFromTarget;

    audioEngine
      .startListening((s) => {
        if (cancelled) return;
        setSample(s);

        // Exponential moving average on detected hz — smooths out jittery single-frame readings.
        // Also sticky: if the detector briefly drops (common in voice — breath/consonants),
        // we hold the last good value for 200ms so the UI doesn't flicker to grey.
        const nowMs = performance.now();
        if (s.hz !== null) {
          const prev = smoothHzRef.current;
          const alpha = 0.35;
          const next = prev === null ? s.hz : alpha * s.hz + (1 - alpha) * prev;
          smoothHzRef.current = next;
          lastGoodHzRef.current = next;
          lastGoodAtRef.current = nowMs;
          setSmoothedHz(next);
        } else if (lastGoodHzRef.current !== null && nowMs - lastGoodAtRef.current < 200) {
          // Hold last value briefly — user is between notes or paused momentarily.
          setSmoothedHz(lastGoodHzRef.current);
        } else {
          smoothHzRef.current = null;
          lastGoodHzRef.current = null;
          setSmoothedHz(null);
        }

        if (matchedRef.current) return;

        const i = idxRef.current;
        if (i >= targetNotes.length) return;
        const target = targetNotes[i];
        const now = performance.now();

        // Per-note timeout → count as miss and auto-advance.
        if (now - targetStartRef.current >= perNoteTimeoutMs) {
          advance(true);
          return;
        }

        const heardHz = smoothHzRef.current;
        const inTune = heardHz !== null && Math.abs(centsFn(heardHz, target)) <= toleranceCents;
        if (inTune) {
          if (holdStartRef.current === null) holdStartRef.current = now;
          if (now - holdStartRef.current >= perNoteHoldMs) {
            advance(false);
          }
        } else {
          holdStartRef.current = null;
        }
      }, () => {
        if (cancelled) return;
        setProblem('silent');
        setStatus('trouble');
        reportMicProblem('silent', undefined, 'sing_sequence');
      })
      .then((handle) => {
        if (cancelled) {
          handle.stop();
          return;
        }
        handleRef.current = handle;
        setStatus('listening');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const kind = classifyMicError(err);
        setProblem(kind);
        setStatus('trouble');
        reportMicProblem(kind, err, 'sing_sequence');
      });

    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNotes.join('|'), attempt]);

  const currentTarget = targetNotes[Math.min(idx, targetNotes.length - 1)];
  const centsFn = anyOctave ? centsFromTargetAnyOctave : centsFromTarget;
  const centsOff = smoothedHz !== null ? centsFn(smoothedHz, currentTarget) : null;
  const zone = zoneFor(centsOff, toleranceCents);
  const blobColor = zoneColor(zone);
  const heardMidi = smoothedHz ? hzToMidi(smoothedHz) : null;
  const targetHz = noteToHz(currentTarget);

  // Timeout progress (0..1) — how much of the per-note window has elapsed.
  const timeoutPct = idx < targetNotes.length
    ? Math.min(1, (performance.now() - targetStartedAt) / perNoteTimeoutMs)
    : 0;

  const proximity = centsOff === null
    ? 0
    : Math.max(0, 1 - Math.min(1, Math.abs(centsOff) / (toleranceCents * 3)));
  const blobScale = 1 + 0.05 * sample.rms * 20 + 0.08 * proximity;
  const blobSize = mobile ? 140 : 190;
  const directionHint =
    centsOff === null || zone === 'onTarget'
      ? null
      : centsOff > 0 ? 'down' : 'up';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: mobile ? 10 : 14, width: '100%' }}>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
        {status === 'permission' && 'waiting for mic…'}
        {status === 'listening' && `sing the phrase · note ${Math.min(idx + 1, targetNotes.length)}/${targetNotes.length}`}
        {status === 'trouble' && (problem === 'denied' ? 'microphone blocked' : 'mic problem')}
      </div>

      {/* Sequence dots */}
      <div style={{ display: 'flex', gap: mobile ? 8 : 12, alignItems: 'flex-end' }}>
        {targetNotes.map((n, i) => {
          const isDone = i < idx;
          const isCurrent = i === idx;
          const dotSize = isCurrent ? (mobile ? 38 : 48) : mobile ? 28 : 34;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: isDone ? 'var(--mint)' : isCurrent ? 'var(--ink-1)' : 'var(--page-2)',
                  border: `2px solid ${isDone ? 'var(--mint-ink)' : isCurrent ? 'var(--ink-1)' : 'var(--ink-5)'}`,
                  color: isDone ? 'var(--mint-ink)' : isCurrent ? 'var(--page)' : 'var(--ink-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--disp)',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  fontSize: isCurrent ? (mobile ? 15 : 18) : mobile ? 12 : 14,
                  transition: 'all 160ms',
                }}
              >
                {n.replace(/\d+$/, '')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Blob — current-target feedback */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: blobSize }}>
        <div style={{ transform: `scale(${blobScale})`, transition: 'transform 140ms ease-out' }}>
          <Blob size={blobSize} color={blobColor} />
        </div>
        {directionHint && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: mobile ? 40 : 56,
              color: 'var(--ink-1)',
              opacity: 0.9,
              pointerEvents: 'none',
              fontWeight: 700,
            }}
          >
            {directionHint === 'up' ? '↑' : '↓'}
          </div>
        )}
        {zone === 'onTarget' && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--mint-ink)',
              pointerEvents: 'none',
            }}
          >
            <Check size={mobile ? 40 : 56} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Debug readout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, auto)',
          gap: '4px 12px',
          fontSize: 11,
          fontFamily: 'var(--mono)',
          color: 'var(--ink-3)',
          background: 'var(--card)',
          border: '1px solid var(--hairline)',
          borderRadius: 10,
          padding: '8px 12px',
        }}
      >
        <span>target</span>
        <span>you</span>
        <span>raw</span>
        <span>Δ</span>
        <span>mic</span>
        <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>
          {currentTarget} · {targetHz.toFixed(1)}Hz
        </span>
        <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>
          {smoothedHz ? `${heardMidi?.noteName} · ${smoothedHz.toFixed(1)}Hz` : sample.rms > 0.002 ? 'no lock' : '— silent —'}
        </span>
        <span style={{ color: 'var(--ink-3)' }}>
          {sample.rawHz !== null ? `${sample.rawHz.toFixed(1)}Hz` : '—'}
        </span>
        <span
          style={{
            color: zone === 'onTarget' ? 'var(--mint-ink)' : zone === 'close' ? 'var(--butter-ink)' : 'var(--coral-ink)',
            fontWeight: 600,
          }}
        >
          {centsOff === null ? '—' : `${centsOff >= 0 ? '+' : ''}${Math.round(centsOff)}¢`}
        </span>
        <span style={{ color: sample.rms > 0.004 ? 'var(--mint-ink)' : 'var(--ink-3)', fontWeight: 600 }}>
          {(sample.rms * 100).toFixed(1)}
        </span>
      </div>

      {/* Per-note timeout */}
      <div style={{ width: '100%', maxWidth: 360, padding: '0 16px' }}>
        <div style={{ height: 3, borderRadius: 3, background: 'var(--ink-5)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${timeoutPct * 100}%`,
              background: timeoutPct > 0.75 ? 'var(--coral)' : 'var(--ink-3)',
              transition: 'width 200ms linear, background 200ms',
            }}
          />
        </div>
      </div>

      {status === 'trouble' && <MicTrouble problem={problem} onRetry={() => setAttempt((n) => n + 1)} />}

      <div style={{ display: 'flex', gap: 8 }}>
        {onReplay && (
          <button
            onClick={onReplay}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              background: 'var(--ink-1)',
              color: 'var(--page)',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ▶ replay phrase
          </button>
        )}
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            background: 'transparent',
            border: '1px solid var(--ink-5)',
            color: 'var(--ink-2)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          skip
        </button>
      </div>
    </div>
  );
}
