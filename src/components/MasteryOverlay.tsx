import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Share2 } from 'lucide-react';
import { Bean } from './primitives';
import { CurriculumLevel } from '../types';
import { CURRICULUM, CURRICULUM_SEGMENTS, isProLesson } from '../curriculum';
import { mascotForPalette, segmentColor, segmentPaletteName } from '../lib/segmentColors';
import { cardArt } from '../lib/cardArt';
import ShareSheet from './ShareSheet';
import { achievementCard, toPngBlob } from '../lib/shareCards';
import { appShareUrl, firstPersonClaim, type SharePayload } from '../lib/share';
import { medalLabel } from '../lib/medalLabel';

interface Props {
  level: CurriculumLevel;
  onClose: () => void;
  onContinue: () => void;
  /** The learner's next lesson in teaching order, if there is one. */
  next?: CurriculumLevel | null;
  /** Play the lesson again, to firm up a pass. */
  onRepeat?: () => void;
  /** This session's score, to say when a pass was narrow. */
  accuracy?: number;
}

/** Below this, a pass is worth another run before moving on. */
const SOLID_PASS = 90;

const PARTICLE_COUNT = 60;
const COLORS = ['var(--mint)', 'var(--coral)', 'var(--butter)', 'var(--lav)', 'var(--sky)'];

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function Confetti() {
  const reduced = prefersReducedMotion();
  const pieces = reduced ? [] : Array.from({ length: PARTICLE_COUNT });
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const duration = 1.6 + Math.random() * 1.4;
        const color = COLORS[i % COLORS.length];
        const size = 6 + Math.random() * 6;
        const rotation = Math.random() * 360;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-20px',
              width: size,
              height: size * 1.6,
              background: color,
              borderRadius: 2,
              transform: `rotate(${rotation}deg)`,
              animation: `fifths-confetti-fall ${duration}s cubic-bezier(.2,.8,.4,1) ${delay}s forwards`,
              opacity: 0.9,
            }}
          />
        );
      })}
      <style>{`
        @keyframes fifths-confetti-fall {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate3d(${Math.random() > 0.5 ? '30px' : '-30px'}, 120vh, 0) rotate(540deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

function Medallion({ color, inkColor, lines }: { color: string; inkColor: string; lines: string[] }) {
  const twoLines = lines.length > 1;
  return (
    <svg width="240" height="240" viewBox="0 0 240 240" aria-hidden>
      <defs>
        <radialGradient id="medallion-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="0.6" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="112" fill={color} stroke={inkColor} strokeWidth="6" />
      <circle cx="120" cy="120" r="112" fill="url(#medallion-glow)" />
      <circle cx="120" cy="120" r="88" fill="none" stroke={inkColor} strokeWidth="2" strokeDasharray="3 6" opacity="0.5" />
      <text
        x="120"
        y="108"
        textAnchor="middle"
        fill={inkColor}
        style={{ font: 'italic 400 18px "DM Serif Display", Georgia, serif' }}
      >
        Mastery
      </text>
      <text x="120" y="140" textAnchor="middle" fill={inkColor} style={{ font: '400 26px "DM Serif Display", Georgia, serif' }}>
        unlocked
      </text>
      {lines.map((line, i) => (
        <text
          key={i}
          x="120"
          y={twoLines ? 164 + i * 14 : 170}
          textAnchor="middle"
          fill={inkColor}
          opacity="0.75"
          style={{ font: `500 ${twoLines ? 11 : 12}px Outfit, system-ui` }}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}

export default function MasteryOverlay({ level, onClose, onContinue, next = null, onRepeat, accuracy }: Props) {
  const narrow = accuracy !== undefined && accuracy < SOLID_PASS;
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = prefersReducedMotion();
  // Escape closes the share sheet first, not the medal behind it.
  const sharingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sharingRef.current) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const idx = CURRICULUM.findIndex((l) => l.id === level.id);
  const palette = segmentColor(level.segmentId ?? 'purple', idx);
  const [sharing, setSharing] = useState(false);
  sharingRef.current = sharing;
  const claim = firstPersonClaim(level.description, level.name);
  const share: SharePayload = {
    kind: 'medal',
    title: `Just mastered "${level.name}" in my ear training`,
    text: claim.startsWith('I can ')
      ? `${claim} Just mastered "${level.name}" in my ear training 🎧`
      : `Just mastered "${level.name}" in my ear training 🎧`,
    // Opens the app on this lesson, so whoever sees it can try it themselves.
    url: (target) => appShareUrl(isProLesson(level) ? null : level.id, { medium: target, campaign: 'medal' }),
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Mastery unlocked"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(42,29,58,0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <Confetti />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          background: 'var(--card)',
          borderRadius: 34,
          padding: '32px 28px 28px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: 'var(--sh-lg)',
          transform: mounted ? 'scale(1)' : 'scale(0.4)',
          opacity: mounted ? 1 : 0,
          transition: reduced ? 'opacity 120ms ease' : 'transform 520ms cubic-bezier(.2,1.3,.3,1), opacity 200ms ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Medallion color={palette.bg} inkColor={palette.ink} lines={medalLabel(level.name)} />
        </div>
        <h2
          style={{
            fontFamily: 'var(--disp)',
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: -0.015,
            margin: '12px 0 8px',
            lineHeight: 1.05,
          }}
        >
          <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>{level.name}</span>
          <br />
          mastered.
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: '0 0 22px', lineHeight: 1.5 }}>
          {next
            ? level.type === 'reading' || level.type === 'fretboard'
              ? <>You just unlocked <b>{next.name}</b>. Keep going.</>
              : <>Your ear just unlocked <b>{next.name}</b>. Keep the rhythm.</>
            : <>You've cleared every level on the path. More coming soon.</>}
          {narrow && (
            <>
              <br />
              You passed with {Math.round(accuracy!)}%. One more run would lock it in.
            </>
          )}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Bean tone="coral" size="lg" onClick={onContinue}>
            keep going →
          </Bean>
          {onRepeat && (
            <Bean tone={narrow ? 'ink' : 'soft'} size="lg" onClick={onRepeat}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={17} strokeWidth={2.5} aria-hidden />
                repeat lesson
              </span>
            </Bean>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSharing(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--coral-ink)',
            }}
          >
            <Share2 size={15} strokeWidth={2.5} aria-hidden /> share your medal
          </button>
          <span aria-hidden style={{ color: 'var(--ink-4)' }}>·</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-3)',
            }}
          >
            savor it · see results
          </button>
        </div>
      </div>
      {sharing && (
        <ShareSheet
          heading="Share your medal"
          payload={share}
          fileName={`fifths-${level.id}-medal`}
          makeImage={() => {
            const paletteName = segmentPaletteName(level.segmentId ?? 'purple', idx);
            return achievementCard({
              name: level.name,
              lines: medalLabel(level.name),
              palette: paletteName,
              claim,
              sub: claim.startsWith('I can ') ? level.name : level.description,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              facts: [accuracy !== undefined ? `${Math.round(accuracy)}% right` : '', CURRICULUM_SEGMENTS.find((sg) => sg.levels.some((l) => l.id === level.id))?.name ?? ''],
              art: cardArt(mascotForPalette(paletteName)),
            }).then(toPngBlob);
          }}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}
