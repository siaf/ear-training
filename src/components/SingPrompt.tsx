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
  targetNote: string;           // e.g. "A4"
  anyOctave?: boolean;          // default true — accept any octave of the target
  toleranceCents?: number;      // default 50 — ±this many cents counts as "in tune"
  holdMs?: number;              // default 900 — how long they must stay in tune
  mobile: boolean;
  onMatch: () => void;          // called once when the user holds the note in tune
  onCancel: () => void;         // user bailed
}

type Status = 'idle' | 'permission' | 'listening' | 'trouble';
type Zone = 'idle' | 'far' | 'close' | 'onTarget';

function zoneFor(centsOff: number | null, tol: number): Zone {
  if (centsOff === null) return 'idle';
  const abs = Math.abs(centsOff);
  if (abs <= tol) return 'onTarget';
  if (abs <= tol * 2.5) return 'close';
  return 'far';
}

function zoneColor(zone: Zone): string {
  switch (zone) {
    case 'onTarget': return 'var(--mint)';
    case 'close': return 'var(--butter)';
    case 'far': return 'var(--coral)';
    case 'idle': return 'var(--ink-5)';
  }
}

export default function SingPrompt({
  targetNote,
  anyOctave = true,
  toleranceCents = 50,
  holdMs = 900,
  mobile,
  onMatch,
  onCancel,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [sample, setSample] = useState<PitchSample>({ hz: null, rms: 0, clarity: 0, rawHz: null });
  const [holdPct, setHoldPct] = useState(0);
  const [problem, setProblem] = useState<MicProblem>('unknown');
  const [attempt, setAttempt] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const matchedRef = useRef(false);
  const handleRef = useRef<ListenHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('permission');

    const centsFn = anyOctave ? centsFromTargetAnyOctave : centsFromTarget;

    audioEngine
      .startListening((s) => {
        if (cancelled) return;
        setSample(s);

        if (matchedRef.current) return;
        const inTune = s.hz !== null && Math.abs(centsFn(s.hz, targetNote)) <= toleranceCents;

        const now = performance.now();
        if (inTune) {
          if (holdStartRef.current === null) holdStartRef.current = now;
          const elapsed = now - holdStartRef.current;
          setHoldPct(Math.min(1, elapsed / holdMs));
          if (elapsed >= holdMs && !matchedRef.current) {
            matchedRef.current = true;
            onMatch();
          }
        } else {
          holdStartRef.current = null;
          setHoldPct(0);
        }
      }, () => {
        if (cancelled) return;
        setProblem('silent');
        setStatus('trouble');
        reportMicProblem('silent', undefined, 'sing_prompt');
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
        reportMicProblem(kind, err, 'sing_prompt');
      });

    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNote, attempt]);

  // Derived readouts
  const heardMidi = sample.hz ? hzToMidi(sample.hz) : null;
  const centsOff =
    sample.hz !== null ? (anyOctave ? centsFromTargetAnyOctave : centsFromTarget)(sample.hz, targetNote) : null;
  const zone = zoneFor(centsOff, toleranceCents);
  const blobColor = zoneColor(zone);

  // Scale the blob with volume + closeness (flat-ish when silent, swells when close)
  const proximity = centsOff === null
    ? 0
    : Math.max(0, 1 - Math.min(1, Math.abs(centsOff) / (toleranceCents * 3)));
  const blobScale = 1 + 0.05 * sample.rms * 20 + 0.08 * proximity;
  const blobSize = mobile ? 180 : 240;

  // Direction hint: ↑ = sing higher, ↓ = sing lower
  const directionHint =
    centsOff === null || zone === 'onTarget'
      ? null
      : centsOff > 0
      ? 'down'
      : 'up';

  const meterCenter = 50;
  const meterX = centsOff === null ? meterCenter : meterCenter + (Math.max(-100, Math.min(100, centsOff)) / 100) * 50;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: mobile ? 12 : 18, width: '100%' }}>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
        {status === 'permission' && 'waiting for mic…'}
        {status === 'listening' && ' '}
        {status === 'trouble' && (problem === 'denied' ? 'microphone blocked' : 'mic problem')}
      </div>

      <div
        style={{
          fontFamily: 'var(--disp)',
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: mobile ? 28 : 40,
          color: 'var(--ink-1)',
        }}
      >
        sing {targetNote.replace(/\d+$/, '')}
      </div>

      {/* Blob — primary feedback */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: blobSize }}>
        <div
          style={{
            transform: `scale(${blobScale})`,
            transition: 'transform 160ms ease-out',
          }}
        >
          <Blob size={blobSize} color={blobColor} />
        </div>
        {/* Direction overlay */}
        {directionHint && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: mobile ? 56 : 76,
              lineHeight: 1,
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
            <Check size={mobile ? 56 : 76} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Live zone hint — color-coded, sized to read at a glance */}
      <div
        aria-live="polite"
        style={{
          fontSize: mobile ? 14 : 16,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color:
            zone === 'onTarget' ? 'var(--mint-ink)'
            : zone === 'close' ? 'var(--coral-ink)'
            : zone === 'far' ? 'var(--coral-ink)'
            : 'var(--ink-3)',
          minHeight: mobile ? 18 : 20,
          textAlign: 'center',
        }}
      >
        {status === 'listening' && (
          zone === 'far' ? 'way off — try again'
          : zone === 'close' ? 'close — fine-tune'
          : zone === 'onTarget' ? 'nice — hold it'
          : ' '
        )}
      </div>

      {/* Fine-tune meter (secondary) */}
      <div style={{ width: '100%', maxWidth: 360, padding: '0 16px' }}>
        <div
          style={{
            position: 'relative',
            height: 8,
            borderRadius: 999,
            background: 'var(--ink-5)',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${meterCenter - (toleranceCents / 100) * 50}%`,
              right: `${100 - (meterCenter + (toleranceCents / 100) * 50)}%`,
              background: 'var(--mint)',
              borderRadius: 999,
              opacity: 0.35,
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: -3,
              left: '50%',
              width: 2,
              height: 14,
              background: 'var(--ink-1)',
              transform: 'translateX(-50%)',
              borderRadius: 2,
            }}
          />
          {sample.hz !== null && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: -4,
                left: `${meterX}%`,
                width: 12,
                height: 18,
                background: 'var(--ink-1)',
                borderRadius: 6,
                transform: 'translateX(-50%)',
                boxShadow: '0 2px 6px rgba(42,29,58,0.25)',
                transition: 'left 120ms',
              }}
            />
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 11,
            color: 'var(--ink-3)',
            fontFamily: 'var(--mono)',
          }}
        >
          <span>−100¢</span>
          <span>
            {heardMidi ? `${heardMidi.noteName} ${centsOff! >= 0 ? '+' : ''}${Math.round(centsOff!)}¢` : '—'}
          </span>
          <span>+100¢</span>
        </div>
      </div>

      {/* Hold progress */}
      <div style={{ width: '100%', maxWidth: 360, padding: '0 16px' }}>
        <div style={{ height: 5, borderRadius: 5, background: 'var(--ink-5)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${holdPct * 100}%`,
              background: 'var(--coral)',
              transition: 'width 100ms',
            }}
          />
        </div>
      </div>

      {status === 'trouble' && <MicTrouble problem={problem} onRetry={() => setAttempt((n) => n + 1)} />}

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
        skip question
      </button>
    </div>
  );
}
