import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { Bean, Blob, Squiggle } from './primitives';

interface Props {
  streakDays: number;
  hoursSince: number;
  onRecover: () => void;
  onDismiss: () => void;
  onPause: () => void;
}

export default function StreakRecoverySheet({ streakDays, hoursSince, onRecover, onDismiss, onPause }: Props) {
  const [mounted, setMounted] = useState(false);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onDismiss]);

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label="Streak recovery"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(42,29,58,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onDismiss();
      }}
    >
      <div
        style={{
          background: 'var(--page)',
          width: '100%',
          maxWidth: 520,
          borderRadius: '28px 28px 0 0',
          padding: '28px 24px 24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--sh-lg)',
          transform: mounted ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(.2,.8,.3,1)',
        }}
      >
        <Blob size={160} color="var(--butter)" style={{ position: 'absolute', top: -40, right: -30, opacity: 0.6 }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--butter)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--coral-ink)',
              }}
            >
              <Flame size={18} strokeWidth={2.4} fill="var(--coral)" />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: 1, textTransform: 'uppercase' }}>
              {streakDays}-day streak · {Math.round(hoursSince)}h since last
            </div>
          </div>
          <h2
            style={{
              fontFamily: 'var(--disp)',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: -0.015,
              lineHeight: 1.1,
              margin: '0 0 10px',
            }}
          >
            You missed yesterday —{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>no biggie.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 18px' }}>
            Five minutes and your streak is safe. We'll pick eight from the intervals you've been wrestling with.
          </p>

          <Squiggle width={320} height={18} color="var(--butter-ink)" stroke={2} />

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Bean tone="coral" size="lg" onClick={onRecover} style={{ justifyContent: 'center' }}>
              5-min refresh · save streak
            </Bean>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <Bean tone="ghost" size="sm" onClick={onPause}>
                pause streak
              </Bean>
              <Bean tone="ghost" size="sm" onClick={onDismiss}>
                not now
              </Bean>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
