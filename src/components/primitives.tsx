import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';

/* ---------- Tone tokens ---------- */
export type Tone = 'ink' | 'coral' | 'mint' | 'lav' | 'butter' | 'sky' | 'soft' | 'ghost';
export type SoftTone = 'mint' | 'coral' | 'lav' | 'butter' | 'sky' | 'ink';

const beanSizes = {
  sm: { h: 36, px: 18, fs: 13 },
  md: { h: 46, px: 24, fs: 14.5 },
  lg: { h: 58, px: 30, fs: 16 },
  xl: { h: 76, px: 36, fs: 22 },
} as const;

const beanTones: Record<Tone, { bg: string; fg: string; bd: string; sh: string }> = {
  ink:    { bg: 'var(--ink-1)', fg: 'var(--page)',      bd: 'var(--ink-1)',    sh: 'var(--sh-md)' },
  coral:  { bg: 'var(--coral)', fg: '#fff',             bd: 'var(--coral)',    sh: '0 6px 16px rgba(255,138,107,0.30), 0 2px 4px rgba(198,70,50,0.12)' },
  mint:   { bg: 'var(--mint)',  fg: 'var(--mint-ink)',  bd: 'var(--mint)',     sh: 'var(--sh-sm)' },
  lav:    { bg: 'var(--lav)',   fg: 'var(--lav-ink)',   bd: 'var(--lav)',      sh: 'var(--sh-sm)' },
  butter: { bg: 'var(--butter)',fg: 'var(--butter-ink)',bd: 'var(--butter)',   sh: 'var(--sh-sm)' },
  sky:    { bg: 'var(--sky)',   fg: 'var(--sky-ink)',   bd: 'var(--sky)',      sh: 'var(--sh-sm)' },
  soft:   { bg: 'var(--card)',  fg: 'var(--ink-1)',     bd: 'var(--hairline)', sh: 'var(--sh-sm)' },
  ghost:  { bg: 'transparent',  fg: 'var(--ink-2)',     bd: 'transparent',     sh: 'none' },
};

export function Bean({
  children,
  tone = 'ink',
  size = 'md',
  style,
  onClick,
  disabled,
  type = 'button',
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: keyof typeof beanSizes;
  style?: CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
}) {
  const s = beanSizes[size];
  const t = beanTones[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: s.h / 2,
        background: t.bg,
        color: t.fg,
        border: `1.5px solid ${t.bd}`,
        fontFamily: 'var(--ui)',
        fontSize: s.fs,
        fontWeight: 600,
        letterSpacing: -0.005,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        boxShadow: t.sh,
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {children}
    </button>
  );
}

/* ---------- ColorPill ---------- */
const softTones: Record<SoftTone, { bg: string; fg: string }> = {
  mint:   { bg: 'var(--mint-soft)',   fg: 'var(--mint-ink)' },
  coral:  { bg: 'var(--coral-soft)',  fg: 'var(--coral-ink)' },
  lav:    { bg: 'var(--lav-soft)',    fg: 'var(--lav-ink)' },
  butter: { bg: 'var(--butter-soft)', fg: 'var(--butter-ink)' },
  sky:    { bg: 'var(--sky-soft)',    fg: 'var(--sky-ink)' },
  ink:    { bg: 'var(--ink-1)',       fg: 'var(--page)' },
};

export function ColorPill({
  children,
  tone = 'mint',
  style,
}: {
  children: ReactNode;
  tone?: SoftTone;
  style?: CSSProperties;
}) {
  const t = softTones[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 14px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontFamily: 'var(--ui)',
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: 0.2,
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ---------- Blob ---------- */
export function Blob({
  size = 120,
  color = 'var(--coral)',
  style,
}: {
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={style}>
      <path
        d="M60 8 C 88 6 116 22 112 52 C 110 80 92 112 58 110 C 28 108 6 82 10 52 C 14 26 34 10 60 8 Z"
        fill={color}
      />
    </svg>
  );
}

/* ---------- Squiggle (static + animated) ---------- */
export function Squiggle({
  width = 240,
  height = 36,
  color = 'var(--coral)',
  stroke = 3,
  phase = 0,
  amp = 10,
}: {
  width?: number;
  height?: number;
  color?: string;
  stroke?: number;
  phase?: number;
  amp?: number;
}) {
  const steps = 40;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = height / 2 + Math.sin(i * 0.55 + phase) * amp * (0.7 + 0.3 * Math.sin(i * 0.2 + phase * 0.6));
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path d={pts.join(' ')} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- ProgressBar ---------- */
export function ProgressBar({
  pct,
  target,
  color = 'var(--coral)',
}: {
  pct: number;
  target?: number;
  color?: string;
}) {
  return (
    <div style={{ position: 'relative', height: 10, background: 'var(--page-3)', borderRadius: 999, overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: '100%',
          background: `linear-gradient(90deg, var(--lav), ${color})`,
          borderRadius: 999,
          transition: 'width 600ms ease',
        }}
      />
      {target != null && (
        <div
          style={{
            position: 'absolute',
            left: `${target}%`,
            top: -2,
            bottom: -2,
            width: 2,
            background: 'var(--ink-1)',
            borderRadius: 2,
          }}
        />
      )}
    </div>
  );
}

/* ---------- KeyChip ---------- */
export function KeyChip({
  note,
  tone = 'soft',
  active = false,
  size = 48,
}: {
  note: string;
  tone?: 'soft' | 'mint' | 'lav' | 'coral' | 'butter' | 'sky';
  active?: boolean;
  size?: number;
}) {
  const bg =
    active ? 'var(--ink-1)' :
    tone === 'mint' ? 'var(--mint)' :
    tone === 'lav' ? 'var(--lav)' :
    tone === 'coral' ? 'var(--coral)' :
    tone === 'butter' ? 'var(--butter)' :
    tone === 'sky' ? 'var(--sky)' :
    'var(--page-2)';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.35,
        background: bg,
        color: active ? 'var(--page)' : 'var(--ink-1)',
        border: `1.5px solid ${active ? 'var(--ink-1)' : 'transparent'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--disp)',
        fontWeight: 600,
        fontSize: size * 0.4,
        boxShadow: active ? '0 4px 12px rgba(42,29,58,0.15)' : 'none',
      }}
    >
      {note}
    </div>
  );
}

/* ---------- Brand ---------- */
const LOGO_SRC = `${import.meta.env.BASE_URL}brand/favicons/favicon-128.png`;

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <img
      src={LOGO_SRC}
      width={size}
      height={size}
      alt=""
      aria-hidden
      style={{ display: 'block', borderRadius: size * 0.22 }}
    />
  );
}

export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const big = size === 'lg';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: big ? 10 : 8 }}>
      <Logo size={big ? 34 : 26} />
      <span
        style={{
          fontFamily: 'var(--disp)',
          fontWeight: 600,
          fontSize: big ? 20 : 17,
          letterSpacing: -0.2,
          color: 'var(--ink-1)',
        }}
      >
        Fifths
      </span>
    </div>
  );
}

/* ---------- Ticker hook ---------- */
export function useTicker(enabled = true) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [enabled]);
  return t;
}
