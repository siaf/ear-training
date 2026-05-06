import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audioEngine';
import { gradeTaps, type TapGradeResult } from '../lib/rhythmGrader';

/**
 * Tap-back rhythm input.
 *
 * Flow:
 *   1. listen   — pattern plays once on mount via audioEngine. Playhead sweeps.
 *   2. ready    — user clicks "start" to begin tap phase.
 *   3. tap      — pattern plays AGAIN. User taps the pad along with the audio.
 *                 Tap times are captured (performance.now()) and graded against the audio's onset times.
 *   4. done     — onComplete fires with the grade.
 *
 * The grader uses a ±toleranceMs window. Pass = score >= passScore (default 0.7).
 */
export interface RhythmTapPadProps {
  targetOnsetsBeats: number[]; // pattern onsets in fractional beats
  bpm: number;
  toleranceMs?: number;
  passScore?: number;
  mobile: boolean;
  onComplete: (result: TapGradeResult & { passed: boolean }) => void;
  onCancel: () => void;
}

type Phase = 'listen' | 'ready' | 'tap' | 'done';

export default function RhythmTapPad({
  targetOnsetsBeats,
  bpm,
  toleranceMs = 130,
  passScore = 0.7,
  mobile,
  onComplete,
  onCancel,
}: RhythmTapPadProps) {
  const beatSec = 60 / bpm;
  const lastBeat = Math.max(0, ...targetOnsetsBeats);
  const totalDurMs = (lastBeat + 0.7) * beatSec * 1000;

  const [phase, setPhase] = useState<Phase>('listen');
  const [playheadProgress, setPlayheadProgress] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const tapsRef = useRef<number[]>([]);
  const playStartRef = useRef<number>(0);
  const onsetTimesRef = useRef<number[]>([]);
  const reportedRef = useRef(false);

  // Listen phase: play once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await audioEngine.playRhythmOnsets(targetOnsetsBeats, bpm, [0]);
      if (cancelled) return;
      playStartRef.current = r.onsetTimesMs[0] ?? performance.now();
      onsetTimesRef.current = r.onsetTimesMs;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate the playhead while in listen or tap phase.
  useEffect(() => {
    if (phase !== 'listen' && phase !== 'tap') return;
    const id = window.setInterval(() => {
      const start = playStartRef.current;
      if (!start) return;
      const now = performance.now();
      const progress = Math.min(1, Math.max(0, (now - start) / totalDurMs));
      setPlayheadProgress(progress);
      if (now >= start + totalDurMs + 250) {
        window.clearInterval(id);
        if (phase === 'listen') {
          setPhase('ready');
        } else if (phase === 'tap' && !reportedRef.current) {
          reportedRef.current = true;
          const grade = gradeTaps(tapsRef.current, onsetTimesRef.current, toleranceMs);
          const passed = grade.score >= passScore;
          setPhase('done');
          onComplete({ ...grade, passed });
        }
      }
    }, 30);
    return () => window.clearInterval(id);
  }, [phase, totalDurMs, toleranceMs, passScore, onComplete]);

  async function startTap() {
    tapsRef.current = [];
    setTapCount(0);
    reportedRef.current = false;
    setPlayheadProgress(0);
    const r = await audioEngine.playRhythmOnsets(targetOnsetsBeats, bpm, [0]);
    playStartRef.current = r.onsetTimesMs[0] ?? performance.now();
    onsetTimesRef.current = r.onsetTimesMs;
    setPhase('tap');
  }

  function recordTap() {
    if (phase !== 'tap') return;
    tapsRef.current.push(performance.now());
    setTapCount(tapsRef.current.length);
  }

  // Spacebar = tap during the tap phase.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'tap') return;
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        recordTap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const padSize = mobile ? 180 : 240;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: mobile ? 14 : 22, width: '100%' }}>
      <div
        style={{
          fontSize: mobile ? 13 : 15,
          color: 'var(--ink-2)',
          fontFamily: 'var(--ui)',
          fontWeight: 600,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {phase === 'listen' && 'Listen'}
        {phase === 'ready' && 'Your turn — tap along to the replay'}
        {phase === 'tap' && `Tap along · ${tapCount} ${tapCount === 1 ? 'tap' : 'taps'}`}
        {phase === 'done' && 'Done'}
      </div>

      <div
        aria-hidden
        style={{
          width: '100%',
          maxWidth: 520,
          height: 6,
          borderRadius: 3,
          background: 'var(--ink-5)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${playheadProgress * 100}%`,
            background: phase === 'tap' ? 'var(--coral)' : 'var(--ink-1)',
            transition: 'width 30ms linear',
          }}
        />
      </div>

      <button
        onClick={() => {
          if (phase === 'ready') startTap();
          else if (phase === 'tap') recordTap();
        }}
        onTouchStart={(e) => {
          if (phase === 'tap') {
            e.preventDefault();
            recordTap();
          }
        }}
        disabled={phase === 'listen' || phase === 'done'}
        aria-label={phase === 'ready' ? 'Start tap-back' : 'Tap'}
        style={{
          width: padSize,
          height: padSize,
          borderRadius: '50%',
          background: phase === 'tap' ? 'var(--coral)' : phase === 'ready' ? 'var(--ink-1)' : 'var(--ink-5)',
          color: phase === 'listen' ? 'var(--ink-2)' : 'var(--page)',
          border: 'none',
          cursor: phase === 'listen' || phase === 'done' ? 'wait' : 'pointer',
          fontFamily: 'var(--disp)',
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: mobile ? 22 : 32,
          boxShadow: '0 14px 36px rgba(42,29,58,0.3)',
          touchAction: 'manipulation',
        }}
      >
        {phase === 'listen' ? '· · ·' : phase === 'ready' ? 'start' : phase === 'tap' ? 'tap' : '✓'}
      </button>

      {phase === 'ready' && (
        <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0, textAlign: 'center', maxWidth: 360 }}>
          The pattern will play again. Tap the pad (or press space) once for each onset you hear.
        </p>
      )}

      <button
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-3)',
          fontSize: 12,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        skip
      </button>
    </div>
  );
}
