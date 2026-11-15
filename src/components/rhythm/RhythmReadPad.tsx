// Read-and-tap for the Rhythm path. The learner reads the rhythm, presses start, hears a
// count-in, and taps the rhythm on the pad (or the space bar) while the metronome keeps
// the beat. The rhythm itself is never played first: hearing it would give the answer
// away. Taps are graded against what was scheduled, allowing for one steady delay
// (gradeTapsSteady), and the result goes back to the question so it can colour the notes.

import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../audioEngine';
import { gradeTapsSteady } from '../../lib/rhythmGrader';

export interface TapOutcome {
  passed: boolean;
  hits: boolean[]; // one per sounding note
  extra: number;
  shiftMs: number;
}

interface Props {
  spec: { onsets: number[]; bpm: number; countIn: number; beatsPerBar: number; toleranceMs: number; metronome: boolean };
  mobile: boolean;
  onDone: (r: TapOutcome) => void;
}

type Phase = 'ready' | 'count' | 'tap' | 'done';

export default function RhythmReadPad({ spec, mobile, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [beat, setBeat] = useState(0); // beats since the count-in began
  const [flash, setFlash] = useState(0);
  const taps = useRef<number[]>([]);
  const done = useRef(onDone);
  done.current = onDone;
  const timing = useRef<{ startMs: number; onsetTimesMs: number[]; t0: number } | null>(null);
  const beatMs = 60000 / spec.bpm;
  const endBeat = spec.countIn + Math.max(spec.beatsPerBar, Math.ceil(Math.max(0, ...spec.onsets) + 0.5));

  async function start() {
    if (phase !== 'ready') return;
    taps.current = [];
    const r = await audioEngine.playRhythmBar({ ...spec, hits: false, metronome: spec.metronome });
    timing.current = { startMs: r.startMs, onsetTimesMs: r.onsetTimesMs, t0: r.startMs - spec.countIn * beatMs };
    setPhase('count');
  }

  // Follow the clock: count-in numbers, then the bar, then grade.
  useEffect(() => {
    if (phase !== 'count' && phase !== 'tap') return;
    const id = window.setInterval(() => {
      const t = timing.current;
      if (!t) return;
      const b = Math.floor((performance.now() - t.t0) / beatMs);
      setBeat(b);
      if (phase === 'count' && b >= spec.countIn) setPhase('tap');
      if (b >= endBeat) {
        window.clearInterval(id);
        const early = t.startMs - Math.min(spec.toleranceMs, beatMs / 2);
        const counted = taps.current.filter((x) => x >= early);
        const g = gradeTapsSteady(counted, t.onsetTimesMs, spec.toleranceMs);
        const passed = g.hits.every(Boolean) && g.extraTaps.length <= 1;
        setPhase('done');
        done.current({ passed, hits: g.hits, extra: g.extraTaps.length, shiftMs: g.shiftMs });
      }
    }, 20);
    return () => window.clearInterval(id);
  }, [phase, beatMs, endBeat, spec.countIn, spec.toleranceMs]);

  const tap = () => {
    if (phase === 'ready') return;
    if (phase === 'done') return;
    taps.current.push(performance.now());
    setFlash((f) => f + 1);
  };

  // Space bar taps (and starts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      e.preventDefault();
      if (e.repeat) return;
      if (phase === 'ready') void start();
      else tap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const counting = phase === 'count' ? String(Math.min(spec.countIn, beat + 1)) : null;
  const label =
    phase === 'ready' ? 'start' : phase === 'count' ? counting : phase === 'tap' ? 'tap' : 'done';
  const size = mobile ? 132 : 160;

  return (
    <div
      data-phase={phase}
      data-targets={timing.current ? JSON.stringify(timing.current.onsetTimesMs) : undefined}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}
    >
      <div style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--ui)', fontWeight: 600, textAlign: 'center', minHeight: 18 }}>
        {phase === 'ready' && `${spec.countIn} clicks count you in, then tap the rhythm${spec.metronome ? ' over the clicks' : ''}.`}
        {phase === 'count' && 'Get ready…'}
        {phase === 'tap' && 'Tap the rhythm'}
      </div>
      <button
        type="button"
        aria-label={phase === 'ready' ? 'Start' : 'Tap'}
        onPointerDown={(e) => {
          e.preventDefault();
          if (phase === 'ready') void start();
          else tap();
        }}
        disabled={phase === 'done'}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: 'none',
          background: phase === 'ready' ? 'var(--ink-1)' : phase === 'tap' ? 'var(--sky)' : 'var(--page-2)',
          color: phase === 'ready' ? 'var(--page)' : 'var(--ink-1)',
          fontFamily: 'var(--disp)',
          fontWeight: 700,
          fontSize: phase === 'count' ? 48 : 22,
          cursor: phase === 'done' ? 'default' : 'pointer',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transform: `scale(${flash % 2 ? 0.96 : 1})`,
          transition: 'transform 60ms, background 120ms',
          boxShadow: 'var(--sh-sm)',
        }}
      >
        {label}
      </button>
    </div>
  );
}
