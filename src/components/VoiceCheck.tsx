import { useEffect, useRef, useState } from 'react';
import { Check, Headphones } from 'lucide-react';
import { audioEngine } from '../audioEngine';
import MicTrouble from './MicTrouble';
import { Bean, Blob } from './primitives';
import { classifyMicError, reportMicProblem, type MicProblem } from '../lib/micDiagnostics';
import { createHumTracker, rangeForHum } from '../lib/voiceCheck';
import { phCapture } from '../lib/posthog';
import { useBreakpoint } from '../lib/useBreakpoint';
import type { VoiceRange } from '../routes/Settings';

interface Props {
  /** Called with the voice range heard, or null when the learner skipped. */
  onDone: (range: VoiceRange | null) => void;
  onExit: () => void;
}

type Status = 'permission' | 'listening' | 'done' | 'trouble';

const RANGE_WORDS: Record<VoiceRange, string> = { lower: 'a lower voice', mixed: 'a middle voice', higher: 'a higher voice' };
/** After this long without a steady note, suggest what to check. */
const HINT_AFTER_MS = 8000;

/**
 * Shown once, before the first singing lesson: hum any note for a moment. It proves the
 * mic hears them before a lesson depends on it, and sets the voice range from the hum.
 */
export default function VoiceCheck({ onDone, onExit }: Props) {
  const mobile = useBreakpoint() !== 'desktop';
  const [status, setStatus] = useState<Status>('permission');
  const [problem, setProblem] = useState<MicProblem>('unknown');
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [level, setLevel] = useState(0);
  const [range, setRange] = useState<VoiceRange | null>(null);
  const [showHint, setShowHint] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let handle: { stop: () => void } | null = null;
    const tracker = createHumTracker();
    doneRef.current = false;
    setStatus('permission');
    setProgress(0);
    setShowHint(false);
    const hintTimer = window.setTimeout(() => { if (!cancelled && !doneRef.current) setShowHint(true); }, HINT_AFTER_MS);

    audioEngine
      .startListening((s) => {
        if (cancelled || doneRef.current) return;
        setLevel(s.rms);
        const { progress: p, doneHz } = tracker.push(s.hz, performance.now());
        setProgress(p);
        if (doneHz !== null) {
          doneRef.current = true;
          const heard = rangeForHum(doneHz);
          setRange(heard);
          setStatus('done');
          phCapture('voice_check_completed', { range: heard, hum_hz: Math.round(doneHz) });
          handle?.stop();
        }
      }, () => {
        if (cancelled) return;
        setProblem('silent');
        setStatus('trouble');
        reportMicProblem('silent', undefined, 'voice_check');
      })
      .then((h) => {
        if (cancelled || doneRef.current) { h.stop(); return; }
        handle = h;
        setStatus('listening');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const kind = classifyMicError(err);
        setProblem(kind);
        setStatus('trouble');
        reportMicProblem(kind, err, 'voice_check');
      });

    return () => {
      cancelled = true;
      window.clearTimeout(hintTimer);
      handle?.stop();
    };
  }, [attempt]);

  const skip = () => {
    phCapture('voice_check_skipped', { status });
    onDone(null);
  };

  const blobSize = mobile ? 150 : 190;
  const done = status === 'done';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: mobile ? '12px 22px' : '22px 44px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onExit}
          aria-label="Close"
          style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--page-2)', border: 'none', fontSize: 16, color: 'var(--ink-2)', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: mobile ? 14 : 18,
          padding: mobile ? '0 22px 32px' : '0 44px 48px',
          maxWidth: 520,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
          voice check
        </div>
        <h1 style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontWeight: 600, fontSize: mobile ? 28 : 38, margin: 0, color: 'var(--ink-1)' }}>
          {done ? 'Got it.' : 'Hum any comfortable note.'}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5, maxWidth: 400 }}>
          {done && range
            ? `We'll pitch notes for ${RANGE_WORDS[range]}. You can change this in Settings.`
            : 'Hold it for a couple of seconds, so we know the mic hears you and where your voice sits.'}
        </p>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: blobSize + 20 }}>
          <div style={{ transform: `scale(${done ? 1 : 1 + Math.min(0.25, level * 4)})`, transition: 'transform 140ms ease-out' }}>
            <Blob size={blobSize} color={done || progress > 0.05 ? 'var(--mint)' : 'var(--ink-5)'} />
          </div>
          {done && (
            <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mint-ink)' }}>
              <Check size={mobile ? 56 : 68} strokeWidth={3} />
            </div>
          )}
        </div>

        {status === 'trouble' ? (
          <MicTrouble problem={problem} onRetry={() => setAttempt((a) => a + 1)} />
        ) : !done && (
          <>
            <div
              role="progressbar"
              aria-label="Hold the note"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              style={{ width: 220, height: 8, borderRadius: 999, background: 'var(--page-2)', overflow: 'hidden' }}
            >
              <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--mint-ink)', transition: 'width 120ms linear' }} />
            </div>
            <div aria-live="polite" style={{ fontSize: 13, color: 'var(--ink-3)', minHeight: 36, maxWidth: 340, lineHeight: 1.4 }}>
              {status === 'permission'
                ? 'waiting for the mic…'
                : showHint && progress === 0
                ? "Not hearing a steady note yet. Move closer to the mic, or check your computer's sound input."
                : ' '}
            </div>
          </>
        )}

        {done ? (
          <Bean tone="ink" size="md" onClick={() => onDone(range)}>start the lesson</Bean>
        ) : (
          <Bean tone="ghost" size="sm" onClick={skip}>skip for now</Bean>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-3)', marginTop: 'auto', paddingTop: 12 }}>
          <Headphones size={14} aria-hidden />
          <span>Headphones work best: the mic won't pick up the app's own notes.</span>
        </div>
      </div>
    </div>
  );
}
