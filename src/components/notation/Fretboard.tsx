// Guitar or bass neck for the Guitar path, frets 0–12, standard tuning, lowest string at
// the bottom (the view looking down at the neck as you play, and the same as tab).
// Drawn on a white card like the Read Music staff, so the pastel dots carry the colour.
// Geometry follows the tools' neck (site/tools/guitar-fretboard-notes/_src/neck.jsx).

import { useEffect, useRef } from 'react';
import { BASS_STRING_NAMES, FRETS, INLAYS, STRING_NAMES, STRING_SHORT, posKey, type NeckId } from '../../notation/theory';

export type DotState = 'root' | 'target' | 'dot' | 'ghost' | 'ok' | 'bad' | 'reveal';
export interface Dot {
  s: number;
  f: number;
  state: DotState;
  label?: string;
}

interface Props {
  dots: Dot[];
  /** Strings that take taps; others are dimmed. Omit for all six. */
  strings?: number[];
  onTap?: (pos: { s: number; f: number }) => void;
  focusFret?: number;
  ariaLabel: string;
  /** Name the strings beside the neck. Off while a question asks for what they'd give away. */
  showStringNames?: boolean;
  /** Other string names, low to high, e.g. for the all-4ths "even neck". */
  stringNames?: string[];
  /** Guitar (6 strings) or bass (4). */
  neck?: NeckId;
}

const LABEL_W = 0; // string names sit in their own column, outside the scrolling neck
const LABEL_COL = 22;
const NUT = 40;
const ROW = 34;
const TOP = 18;
const FOOT = 20;
const neckH = (count: number) => TOP + ROW * (count - 1) + 18;
const heightOf = (count: number) => neckH(count) + FOOT;
const FRET_X = (() => {
  // Frets get gently narrower up the neck, like a real guitar.
  const xs = [LABEL_W + NUT];
  for (let i = 1; i <= FRETS; i++) xs.push(xs[i - 1] + 54 * Math.pow(0.965, i - 1));
  return xs;
})();
const W = Math.ceil(FRET_X[FRETS] + 10);
const fretCenter = (f: number) => (f === 0 ? LABEL_W + NUT / 2 : (FRET_X[f - 1] + FRET_X[f]) / 2);
const fretWidth = (f: number) => (f === 0 ? NUT : FRET_X[f] - FRET_X[f - 1]);
const yOf = (s: number, count: number) => TOP + (count - 1 - s) * ROW; // lowest string at the bottom

const FILL: Record<DotState, string> = {
  root: 'var(--ink-1)',
  // The asked-about note is lavender: mint and coral mean right and wrong.
  target: 'var(--lav)',
  dot: 'var(--lav)',
  // The rest of a chord or scale shape: there, but quiet beside the asked note.
  ghost: 'var(--card)',
  ok: 'var(--mint)',
  bad: 'var(--coral-soft)',
  reveal: 'var(--mint)',
};
const INK: Record<DotState, string> = {
  root: 'var(--page)',
  target: 'var(--lav-ink)',
  dot: 'var(--lav-ink)',
  ghost: 'var(--ink-2)',
  ok: 'var(--mint-ink)',
  bad: 'var(--coral-ink)',
  reveal: 'var(--mint-ink)',
};

/** Minimum drawn width, so frets stay big enough to tap on a phone. The neck scrolls sideways below it. */
export const NECK_MIN_PX = 520;

export default function Fretboard({ dots, strings, onTap, focusFret, ariaLabel, showStringNames = true, stringNames, neck = 'guitar' }: Props) {
  const count = neck === 'bass' ? 4 : 6;
  const all = Array.from({ length: count }, (_, s) => s);
  const Y = (s: number) => yOf(s, count);
  const H = heightOf(count);
  const NECK_H = neckH(count);
  const at = (s: number, f: number) => posKey(neck === 'bass' ? { s, f, n: 'bass' } : { s, f });
  const scroller = useRef<HTMLDivElement | null>(null);
  const active = (s: number) => !strings || strings.includes(s);

  // Keep the part of the neck the question is about in view on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth + 2) return;
    const scale = el.scrollWidth / W;
    const left = focusFret != null ? fretCenter(focusFret) * scale - el.clientWidth / 2 : 0;
    el.scrollLeft = Math.max(0, left);
  }, [focusFret, ariaLabel]);

  const midY = TOP + (ROW * (count - 1)) / 2;
  const x0 = FRET_X[0];
  const x1 = FRET_X[FRETS];

  return (
    <div style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>
      {/* String names stay put while the neck scrolls. */}
      <StringLabels strings={strings} show={showStringNames} names={stringNames ?? (neck === 'bass' ? BASS_STRING_NAMES : STRING_SHORT)} count={count} />
    <div ref={scroller} style={{ flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role={onTap ? 'group' : 'img'}
        aria-label={ariaLabel}
        style={{ width: '100%', minWidth: NECK_MIN_PX, maxWidth: 860, height: 'auto', display: 'block', margin: '0 auto' }}
      >
        <rect x={x0} y={TOP - 12} width={x1 - x0} height={ROW * (count - 1) + 24} rx="3" fill="var(--card)" stroke="var(--ink-5)" />
        {INLAYS.map((f) =>
          f === 12 ? (
            [-1, 1].map((r) => <circle key={`i12${r}`} cx={fretCenter(12)} cy={midY + ROW * r} r="5" fill="var(--ink-5)" />)
          ) : (
            <circle key={`i${f}`} cx={fretCenter(f)} cy={midY} r="5" fill="var(--ink-5)" />
          ),
        )}
        {FRET_X.map((x, i) => (
          <line key={`f${i}`} x1={x} x2={x} y1={TOP - 12} y2={TOP + ROW * (count - 1) + 12} stroke={i === 0 ? 'var(--ink-1)' : 'var(--ink-4)'} strokeWidth={i === 0 ? 5 : 1.6} />
        ))}
        {all.map((s) => (
          <g key={`s${s}`} opacity={active(s) ? 1 : 0.3}>
            <line x1={4} x2={x1 + 4} y1={Y(s)} y2={Y(s)} stroke="var(--ink-2)" strokeWidth={neck === 'bass' ? 3.4 - s * 0.4 : 2.6 - s * 0.34} />
          </g>
        ))}
        {Array.from({ length: FRETS + 1 }, (_, f) => (
          <text
            key={`n${f}`}
            x={fretCenter(f)}
            y={NECK_H + 12}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight={INLAYS.includes(f) ? 700 : 500}
            fill={INLAYS.includes(f) ? 'var(--ink-2)' : 'var(--ink-3)'}
            fontFamily="var(--ui)"
          >
            {f === 0 ? 'open' : f}
          </text>
        ))}
        {dots.map((d) => {
          const cx = fretCenter(d.f);
          const cy = Y(d.s);
          return (
            <g key={`d${at(d.s, d.f)}-${d.state}`} data-pos={at(d.s, d.f)} data-state={d.state}>
              <circle cx={cx} cy={cy} r={12.5} fill={FILL[d.state]} stroke={d.state === 'bad' ? 'var(--coral-ink)' : d.state === 'ghost' ? 'var(--ink-3)' : d.state === 'root' ? 'none' : 'var(--card)'} strokeWidth={d.state === 'bad' ? 2 : 1.5} />
              {d.label && (
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={d.label.length > 2 ? 9 : 11.5} fontWeight="700" fill={INK[d.state]} fontFamily="var(--ui)">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        {onTap &&
          all.filter(active).flatMap((s) =>
            Array.from({ length: FRETS + 1 }, (_, f) => (
              <rect
                key={`c${s}-${f}`}
                data-pos={at(s, f)}
                x={fretCenter(f) - fretWidth(f) / 2}
                y={Y(s) - ROW / 2}
                width={fretWidth(f)}
                height={ROW}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={`${(neck === 'bass' ? BASS_STRING_NAMES : STRING_NAMES)[s]} string, ${f === 0 ? 'open' : `fret ${f}`}`}
                onClick={() => onTap({ s, f })}
              />
            )),
          )}
      </svg>
    </div>
    </div>
  );
}

/** The string names, in a column that doesn't scroll, at the same heights as the strings. */
function StringLabels({ strings, show, names, count }: { strings?: number[]; show: boolean; names: string[]; count: number }) {
  return (
    <div style={{ position: 'relative', width: LABEL_COL, flexShrink: 0 }} aria-hidden data-string-names>
      {Array.from({ length: count }, (_, s) => (
        <span
          key={s}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${(yOf(s, count) / heightOf(count)) * 100}%`,
            transform: 'translateY(-50%)',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--ink-2)',
            opacity: !strings || strings.includes(s) ? 1 : 0.35,
            fontFamily: 'var(--ui)',
          }}
        >
          {show ? names[s] : ''}
        </span>
      ))}
    </div>
  );
}
