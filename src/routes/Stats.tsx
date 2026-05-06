import * as React from 'react';
import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Blob, Brand, ColorPill } from '../components/primitives';
import DesktopSidebar, { SidebarTab } from '../components/DesktopSidebar';
import {
  DailyStat,
  MasteryCell,
  getDailyStats,
  getHourlyRhythm,
  getMasteryCells,
  getOverallTotals,
  getStreakDays,
} from '../lib/sessionStore';
import { getDisplayName } from '../curriculum';

interface Props {
  onStart: () => void;
  onBack: () => void;
  onNavigate?: (tab: SidebarTab) => void;
  hasHistory?: boolean;
  hasEverPracticed?: boolean;
  bottomPadding?: number;
  isPro?: boolean;
  onOpenPaywall?: () => void;
}

/* ---------- Wave chart (30-day smoothed accuracy) ---------- */
function WaveChart({ data, width, height }: { data: DailyStat[]; width: number; height: number }) {
  const padding = 12;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = data.map((d, i) => ({
    x: padding + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padding + innerH - (d.accuracy / 100) * innerH,
    hasData: d.totalQuestions > 0,
    d,
  }));

  // Smoothed path using quadratic bezier midpoints
  const path: string[] = [];
  if (points.length > 0) {
    path.push(`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`);
    for (let i = 0; i < points.length - 1; i++) {
      const p = points[i];
      const n = points[i + 1];
      const mx = (p.x + n.x) / 2;
      const my = (p.y + n.y) / 2;
      path.push(`Q ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`);
    }
    const last = points[points.length - 1];
    path.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`);
  }

  const fillPath =
    path.length > 0
      ? `${path.join(' ')} L ${(padding + innerW).toFixed(1)} ${(padding + innerH).toFixed(1)} L ${padding.toFixed(1)} ${(padding + innerH).toFixed(1)} Z`
      : '';

  const hasAny = data.some((d) => d.totalQuestions > 0);

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="wave-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--coral)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {/* baseline (missing days) */}
      <line
        x1={padding}
        x2={width - padding}
        y1={padding + innerH}
        y2={padding + innerH}
        stroke="var(--ink-5)"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      {hasAny && (
        <>
          <path d={fillPath} fill="url(#wave-grad)" />
          <path d={path.join(' ')} fill="none" stroke="var(--coral)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {points.map((p, i) =>
        p.hasData ? <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--coral)" /> : null,
      )}
      {!hasAny && (
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="var(--ink-3)" fontSize="12" fontFamily="var(--ui)">
          no sessions yet
        </text>
      )}
    </svg>
  );
}

/* ---------- Generic spider/radar chart ---------- */
interface RadarAxis {
  label: string;
  fullLabel: string;
  accuracy: number;
  attempts: number;
  correct: number;
}

type RadarTone = 'coral' | 'lav' | 'butter' | 'sky';

const RADAR_TONE: Record<RadarTone, { fill: string; ink: string }> = {
  coral: { fill: 'var(--coral)', ink: 'var(--coral-ink)' },
  lav: { fill: 'var(--lav)', ink: 'var(--lav-ink)' },
  butter: { fill: 'var(--butter)', ink: 'var(--butter-ink)' },
  sky: { fill: 'var(--sky)', ink: 'var(--sky-ink)' },
};

function Radar({
  axes,
  size,
  tone = 'coral',
  compact = false,
}: {
  axes: RadarAxis[];
  size: number;
  tone?: RadarTone;
  compact?: boolean;
}) {
  const palette = RADAR_TONE[tone];
  if (axes.length < 3) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-3)',
          fontFamily: 'var(--ui)',
          fontSize: 12,
        }}
      >
        not enough items yet
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const labelMargin = compact ? 38 : 56;
  const radius = size / 2 - labelMargin;
  const angle = (i: number) => -Math.PI / 2 + (i / axes.length) * Math.PI * 2;
  const point = (i: number, value: number): [number, number] => {
    const a = angle(i);
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const toStr = ([x, y]: [number, number]) => `${x.toFixed(1)},${y.toFixed(1)}`;

  const ringValues = [25, 50, 75, 100];
  // Build the user shape from only the axes that have data — otherwise untouched axes
  // pull the polygon to the center and the filled region collapses.
  const userPoints = axes
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.attempts > 0)
    .map(({ s, i }) => point(i, s.accuracy));
  const userPolygon = userPoints.map(toStr).join(' ');
  const userLine = userPoints.length === 2
    ? `M ${userPoints[0][0]} ${userPoints[0][1]} L ${userPoints[1][0]} ${userPoints[1][1]}`
    : '';
  const targetPolygon = axes.map((_, i) => toStr(point(i, 80))).join(' ');
  const hasAny = userPoints.length > 0;
  const showPctText = !compact;
  const labelFontSize = compact ? 10 : 12;
  const dotR = compact ? 3 : 4;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ringValues.map((pct, i) => {
        const pts = axes.map((_, j) => toStr(point(j, pct))).join(' ');
        const isOuter = i === ringValues.length - 1;
        return (
          <polygon
            key={pct}
            points={pts}
            fill="none"
            stroke="var(--ink-5)"
            strokeWidth={isOuter ? 1 : 0.7}
            strokeDasharray={isOuter ? undefined : '2 4'}
          />
        );
      })}

      {axes.map((_, i) => {
        const [x, y] = point(i, 100);
        return (
          <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--ink-5)" strokeWidth={0.7} />
        );
      })}

      <polygon
        points={targetPolygon}
        fill="none"
        stroke="var(--mint-ink)"
        strokeWidth={1.2}
        strokeDasharray="5 4"
        opacity={0.85}
      />

      {hasAny && (
        <>
          {userPoints.length >= 3 && (
            <polygon
              points={userPolygon}
              fill={palette.fill}
              fillOpacity={0.55}
              stroke={palette.ink}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          )}
          {userPoints.length === 2 && (
            <path d={userLine} stroke={palette.ink} strokeWidth={2} fill="none" />
          )}
          {axes.map((s, i) => {
            if (s.attempts === 0) return null;
            const [x, y] = point(i, s.accuracy);
            return (
              <circle key={i} cx={x} cy={y} r={dotR} fill={palette.ink}>
                <title>{`${s.fullLabel} · ${s.correct}/${s.attempts} · ${s.accuracy.toFixed(0)}%`}</title>
              </circle>
            );
          })}
        </>
      )}

      {!compact &&
        ringValues.slice(0, -1).map((pct) => (
          <text
            key={`tick-${pct}`}
            x={cx + 3}
            y={cy - (pct / 100) * radius - 2}
            fontFamily="var(--mono)"
            fontSize="9"
            fill="var(--ink-4)"
          >
            {pct}
          </text>
        ))}

      {axes.map((s, i) => {
        const a = angle(i);
        const lx = cx + Math.cos(a) * (radius + (compact ? 14 : 22));
        const ly = cy + Math.sin(a) * (radius + (compact ? 14 : 22));
        const cosA = Math.cos(a);
        const anchor = cosA > 0.25 ? 'start' : cosA < -0.25 ? 'end' : 'middle';
        const untouched = s.attempts === 0;
        return (
          <g key={`label-${i}`}>
            <text
              x={lx}
              y={showPctText ? ly - 2 : ly + 4}
              textAnchor={anchor}
              fontFamily="var(--ui)"
              fontSize={labelFontSize}
              fontWeight={600}
              fill={untouched ? 'var(--ink-3)' : 'var(--ink-1)'}
            >
              {s.label}
              <title>{s.fullLabel}</title>
            </text>
            {showPctText && (
              <text
                x={lx}
                y={ly + 12}
                textAnchor={anchor}
                fontFamily="var(--mono)"
                fontSize="11"
                fill={untouched ? 'var(--ink-4)' : palette.ink}
                fontWeight={600}
              >
                {untouched ? '—' : `${s.accuracy.toFixed(0)}%`}
              </text>
            )}
          </g>
        );
      })}

      {!hasAny && (
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontFamily="var(--ui)"
          fontSize="12"
          fill="var(--ink-3)"
        >
          no data yet
        </text>
      )}
    </svg>
  );
}

/* ---------- Radar axis builders ---------- */
// Intervals laid out in circle-of-fifths order (each step = +7 semitones, mod 12).
// Spreads tonally-similar intervals apart and lands inversion-related intervals on
// opposite sides of the radar — so the polygon shape reflects real ear-training
// structure instead of clustering small intervals on one side.
const INTERVAL_ORDER = [
  'minor_2nd',     // 1 semitone
  'minor_6th',     // 8
  'minor_3rd',     // 3
  'minor_7th',     // 10
  'perfect_4th',   // 5
  'octave',        // 12
  'perfect_5th',   // 7
  'major_2nd',     // 2
  'major_6th',     // 9
  'major_3rd',     // 4
  'major_7th',     // 11
  'tritone',       // 6
];
const INTERVAL_SHORT: Record<string, string> = {
  minor_2nd: 'm2', major_2nd: 'M2',
  minor_3rd: 'm3', major_3rd: 'M3',
  perfect_4th: 'P4', tritone: 'TT', perfect_5th: 'P5',
  minor_6th: 'm6', major_6th: 'M6',
  minor_7th: 'm7', major_7th: 'M7',
  octave: '8ve',
};
// Scale degrees in circle-of-fifths order within the major scale: 1-5-2-6-3-7-4.
// Tonic triad members (1, 3, 5) end up roughly 120° apart; tendency tones (4, 7) opposite stable tones.
const DEGREE_ORDER = ['1', '5', '2', '6', '3', '7', '4'];
const TRIAD_SHORT: Record<string, string> = {
  major: 'maj', minor: 'min', diminished: 'dim', augmented: 'aug',
};
const SEVENTH_SHORT: Record<string, string> = {
  major_7: 'maj7', dominant_7: '7', minor_7: 'm7',
  half_diminished_7: 'ø7', diminished_7: '°7', minor_major_7: 'mΔ7',
};
// Combined chord order — interleaved so no two adjacent axes share a triad
// quality (major / minor / dim / aug). All ten chord-quality adjacencies cross
// quality boundaries, so the polygon spreads across the full circle instead of
// clumping triads on one side and 7ths on the other.
const CHORD_ORDER: Array<{ category: 'triad' | 'seventh_chord'; item: string }> = [
  { category: 'triad', item: 'major' },                    // M
  { category: 'triad', item: 'minor' },                    // m
  { category: 'triad', item: 'diminished' },               // D
  { category: 'seventh_chord', item: 'major_7' },          // M
  { category: 'seventh_chord', item: 'minor_7' },          // m
  { category: 'seventh_chord', item: 'half_diminished_7' },// D
  { category: 'seventh_chord', item: 'dominant_7' },       // M
  { category: 'seventh_chord', item: 'minor_major_7' },    // m
  { category: 'seventh_chord', item: 'diminished_7' },     // D
  { category: 'triad', item: 'augmented' },                // A (lone aug, sits across from a major-quality)
];

function aggregateItem(cells: MasteryCell[], category: MasteryCell['category'], item: string) {
  const matches = cells.filter((c) => c.category === category && c.item === item);
  const attempts = matches.reduce((n, c) => n + c.attempts, 0);
  const correct = matches.reduce((n, c) => n + c.correct, 0);
  return {
    attempts,
    correct,
    accuracy: attempts ? (correct / attempts) * 100 : 0,
  };
}

function categoryAxes(cells: MasteryCell[]): RadarAxis[] {
  const cats: Array<{ key: MasteryCell['category']; label: string }> = [
    { key: 'scale_degree', label: 'Scale degrees' },
    { key: 'interval', label: 'Intervals' },
    { key: 'triad', label: 'Triads' },
    { key: 'seventh_chord', label: '7th chords' },
    { key: 'mode', label: 'Modes' },
  ];
  return cats.map((cat) => {
    const items = cells.filter((c) => c.category === cat.key);
    const attempts = items.reduce((n, c) => n + c.attempts, 0);
    const correct = items.reduce((n, c) => n + c.correct, 0);
    return {
      label: cat.label,
      fullLabel: cat.label,
      attempts,
      correct,
      accuracy: attempts ? (correct / attempts) * 100 : 0,
    };
  });
}

function intervalAxes(cells: MasteryCell[]): RadarAxis[] {
  return INTERVAL_ORDER.map((item) => {
    const a = aggregateItem(cells, 'interval', item);
    return {
      label: INTERVAL_SHORT[item] ?? item,
      fullLabel: getDisplayName(item),
      ...a,
    };
  });
}

function degreeAxes(cells: MasteryCell[]): RadarAxis[] {
  return DEGREE_ORDER.map((item) => {
    const a = aggregateItem(cells, 'scale_degree', item);
    return {
      label: item,
      fullLabel: `Scale degree ${item}`,
      ...a,
    };
  });
}

function RadarLegend({ tone = 'coral' }: { tone?: RadarTone }) {
  const palette = RADAR_TONE[tone];
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        fontFamily: 'var(--ui)',
        fontSize: 11,
        color: 'var(--ink-3)',
        marginTop: 4,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 3,
            background: palette.fill,
            border: `1.5px solid ${palette.ink}`,
          }}
        />
        you
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 14, height: 0, borderTop: '2px dashed var(--mint-ink)' }} />
        target 80%
      </span>
    </div>
  );
}

function chordAxes(cells: MasteryCell[]): RadarAxis[] {
  return CHORD_ORDER.map(({ category, item }) => {
    const a = aggregateItem(cells, category, item);
    const isTriad = category === 'triad';
    return {
      label: isTriad ? (TRIAD_SHORT[item] ?? item) : (SEVENTH_SHORT[item] ?? item),
      fullLabel: `${getDisplayName(item)}${isTriad ? ' triad' : ' chord'}`,
      ...a,
    };
  });
}

/* ---------- Mastery heatmap ---------- */
function MasteryHeatmap({ cells }: { cells: MasteryCell[] }) {
  const categories: Array<{ key: MasteryCell['category']; label: string; color: string }> = [
    { key: 'scale_degree', label: 'Scale degrees', color: 'var(--coral)' },
    { key: 'interval', label: 'Intervals', color: 'var(--lav)' },
    { key: 'triad', label: 'Triads', color: 'var(--mint)' },
    { key: 'seventh_chord', label: '7th chords', color: 'var(--butter)' },
    { key: 'mode', label: 'Modes', color: 'var(--sky)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {categories.map((cat) => {
        const items = cells.filter((c) => c.category === cat.key).sort((a, b) => a.item.localeCompare(b.item));
        if (items.length === 0) {
          return (
            <div key={cat.key}>
              <div style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                {cat.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>— no data yet</div>
            </div>
          );
        }
        return (
          <div key={cat.key}>
            <div
              style={{
                fontFamily: 'var(--ui)',
                fontSize: 11,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              {cat.label}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {items.map((c) => {
                const hue =
                  c.accuracy >= 80 ? 'var(--mint)' : c.accuracy >= 60 ? 'var(--butter)' : 'var(--coral)';
                const ink =
                  c.accuracy >= 80 ? 'var(--mint-ink)' : c.accuracy >= 60 ? 'var(--butter-ink)' : 'var(--coral-ink)';
                const opacity = Math.min(1, 0.4 + c.attempts / 20);
                return (
                  <div
                    key={c.item}
                    title={`${getDisplayName(c.item)} · ${c.correct}/${c.attempts} · ${c.accuracy.toFixed(0)}%`}
                    style={{
                      minWidth: 70,
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: hue,
                      color: ink,
                      opacity,
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid var(--hairline)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getDisplayName(c.item) || c.item}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>
                      {c.accuracy.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Rhythm strip ---------- */
function RhythmStrip({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56 }}>
      {hours.map((n, i) => {
        const pct = n / max;
        return (
          <div
            key={i}
            title={`${i}:00 · ${n} sessions`}
            style={{
              flex: 1,
              height: `${Math.max(2, pct * 100)}%`,
              background: pct > 0 ? 'var(--lav)' : 'var(--ink-5)',
              borderRadius: 4,
              minWidth: 6,
            }}
          />
        );
      })}
    </div>
  );
}

/* ---------- Stat tile ---------- */
function Tile({ label, value, sub, bg }: { label: string; value: string; sub?: React.ReactNode; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 22, padding: '16px 18px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, color: 'var(--ink-2)' }}>
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontFamily: 'var(--disp)',
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: -0.02,
          color: 'var(--ink-1)',
          margin: '4px 0 2px',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{sub}</div>}
    </div>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({
  mobile,
  onStart,
  onBack,
  postReset,
}: {
  mobile: boolean;
  onStart: () => void;
  onBack: () => void;
  postReset: boolean;
}) {
  const headline = postReset ? (
    <>
      Clean slate — <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>go.</span>
    </>
  ) : (
    <>
      Your <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>heartbeat</span> shows up after one session.
    </>
  );
  const sub = postReset
    ? 'Reset complete. Your ear will build itself back up faster than last time.'
    : 'Daily accuracy, mastery heatmap, and the rhythm you practice on — all coming back with real data, not stubs.';
  const cta = postReset ? 'start fresh →' : 'start your first session →';
  return (
    <div style={{ minHeight: '100vh', background: 'var(--page)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: mobile ? '12px 22px' : '22px 44px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Brand />
        <Bean tone="ghost" size="sm" onClick={onBack}>
          ← back
        </Bean>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Blob size={240} color="var(--butter)" style={{ position: 'absolute', top: 40, left: 40, opacity: 0.4 }} />
        <Blob size={280} color="var(--mint)" style={{ position: 'absolute', bottom: 40, right: 40, opacity: 0.4 }} />
        <div style={{ textAlign: 'center', maxWidth: 520, position: 'relative', zIndex: 2 }}>
          <ColorPill tone={postReset ? 'mint' : 'coral'} style={{ marginBottom: 14 }}>
            {postReset ? 'fresh start' : 'stats · soon'}
          </ColorPill>
          <h1
            style={{
              fontFamily: 'var(--disp)',
              fontSize: mobile ? 32 : 48,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -0.02,
              margin: '0 0 14px',
            }}
          >
            {headline}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', margin: '0 0 24px', lineHeight: 1.5 }}>{sub}</p>
          <Bean tone="coral" size="lg" onClick={onStart}>
            {cta}
          </Bean>
        </div>
      </div>
    </div>
  );
}

/* ---------- Stats route ---------- */
export default function Stats({
  onStart,
  onBack,
  onNavigate,
  hasHistory = false,
  hasEverPracticed = false,
  bottomPadding = 0,
  isPro = false,
  onOpenPaywall,
}: Props) {
  const mobile = useBreakpoint() !== 'desktop';

  // Free tier: 7-day window. Pro: full history.
  const FREE_WINDOW_MS = 7 * 86_400_000;
  const windowOpts = isPro ? {} : { windowMs: FREE_WINDOW_MS };
  const dailyDays = isPro ? 30 : 7;
  const days = useMemo(() => (hasHistory ? getDailyStats(dailyDays) : []), [hasHistory, dailyDays]);
  const mastery = useMemo(() => (hasHistory ? getMasteryCells(windowOpts) : []), [hasHistory, isPro]);
  const hours = useMemo(() => (hasHistory ? getHourlyRhythm() : []), [hasHistory]);
  const totals = useMemo(() => (hasHistory ? getOverallTotals(windowOpts) : null), [hasHistory, isPro]);
  const streak = useMemo(() => (hasHistory ? getStreakDays() : 0), [hasHistory]);

  const weekSessions = days.slice(-7).reduce((n, d) => n + d.sessions, 0);
  const weekAvgAccuracy = (() => {
    const active = days.slice(-7).filter((d) => d.totalQuestions > 0);
    if (active.length === 0) return 0;
    return active.reduce((n, d) => n + d.accuracy, 0) / active.length;
  })();

  if (!hasHistory) return <EmptyState mobile={mobile} onStart={onStart} onBack={onBack} postReset={hasEverPracticed} />;

  const chartWidth = mobile ? 340 : 720;
  const chartHeight = mobile ? 140 : 180;
  const radarSize = mobile ? 320 : 380;
  const splitRadarSize = mobile ? 300 : 360;
  const masteryAttempts = mastery.reduce((n, c) => n + c.attempts, 0);
  const masteryCorrect = mastery.reduce((n, c) => n + c.correct, 0);
  const masteryAccuracy = masteryAttempts ? (masteryCorrect / masteryAttempts) * 100 : 0;
  const overallAxes = categoryAxes(mastery);
  const intervalRadarAxes = intervalAxes(mastery);
  const degreeRadarAxes = degreeAxes(mastery);
  const chordRadarAxes = chordAxes(mastery);
  const summarize = (axes: RadarAxis[]) => {
    const attempts = axes.reduce((n, a) => n + a.attempts, 0);
    const correct = axes.reduce((n, a) => n + a.correct, 0);
    return { attempts, accuracy: attempts ? (correct / attempts) * 100 : 0 };
  };
  const intervalSummary = summarize(intervalRadarAxes);
  const degreeSummary = summarize(degreeRadarAxes);
  const chordSummary = summarize(chordRadarAxes);

  return (
    <div
      style={{
        height: mobile ? undefined : '100vh',
        minHeight: mobile ? '100vh' : undefined,
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        background: 'var(--page)',
      }}
    >
      {!mobile && onNavigate && <DesktopSidebar active="stats" onNavigate={onNavigate} />}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: mobile ? 'visible' : 'auto',
          minWidth: 0,
        }}
      >
        {mobile && (
          <div
            style={{
              padding: '12px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Brand />
            <Bean tone="ghost" size="sm" onClick={onBack}>
              ← back
            </Bean>
          </div>
        )}

      <div
        style={{
          padding: mobile ? `0 22px ${40 + bottomPadding}px` : '32px 44px 40px',
          maxWidth: 1100,
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <ColorPill tone="lav" style={{ marginBottom: 14 }}>
          your heartbeat
        </ColorPill>
        <h1
          style={{
            fontFamily: 'var(--disp)',
            fontSize: mobile ? 28 : 44,
            fontWeight: 600,
            letterSpacing: -0.02,
            margin: '0 0 20px',
          }}
        >
          Stats — <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>{isPro ? '30-day rhythm' : '7-day window'}</span>
        </h1>

        {!isPro && onOpenPaywall && (
          <button
            onClick={onOpenPaywall}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'var(--lav-soft)',
              border: '1px solid var(--lav)',
              borderRadius: 16,
              padding: '12px 16px',
              marginBottom: 18,
              color: 'var(--lav-ink)',
              fontFamily: 'var(--ui)',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span>Showing the last 7 days. Pro shows your full history + auto-drills your weak items.</span>
            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>see plans →</span>
          </button>
        )}

        {/* Wave chart */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--hairline)',
            borderRadius: 24,
            padding: mobile ? 16 : 24,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 600, fontStyle: 'italic' }}>daily accuracy</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>last 30 days</div>
            </div>
            <div
              className="mono"
              style={{ fontFamily: 'var(--disp)', fontSize: 28, fontWeight: 600, color: 'var(--coral-ink)' }}
            >
              {weekAvgAccuracy.toFixed(0)}%
              <span style={{ fontFamily: 'var(--ui)', fontSize: 12, color: 'var(--ink-3)', marginLeft: 6 }}>
                wk avg
              </span>
            </div>
          </div>
          <WaveChart data={days} width={chartWidth} height={chartHeight} />
        </div>

        {/* Stat tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: 10,
            marginBottom: 18,
          }}
        >
          <Tile label="Sessions (wk)" value={`${weekSessions}`} sub={`of 7 days`} bg="var(--mint)" />
          <Tile
            label="Longest streak"
            value={`${totals?.longestStreak ?? 0}`}
            sub={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                now · {streak} <Flame size={12} strokeWidth={2.4} fill="var(--coral)" color="var(--coral-ink)" />
              </span>
            }
            bg="var(--butter)"
          />
          <Tile label="Total questions" value={`${totals?.totalQuestions ?? 0}`} sub={`${(totals?.accuracy ?? 0).toFixed(0)}% overall`} bg="var(--coral)" />
          <Tile
            label="Avg response"
            value={`${((totals?.avgResponseMs ?? 0) / 1000).toFixed(1)}s`}
            sub={`per question`}
            bg="var(--lav)"
          />
        </div>

        {/* Skill radar + rhythm */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1.4fr 1fr',
            gap: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--hairline)',
              borderRadius: 24,
              padding: mobile ? 16 : 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 600, fontStyle: 'italic' }}>
                  skill radar
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  accuracy across the five mastery categories
                </div>
              </div>
              {masteryAttempts > 0 && (
                <div
                  className="mono"
                  style={{ fontFamily: 'var(--disp)', fontSize: 24, fontWeight: 600, color: 'var(--coral-ink)' }}
                >
                  {masteryAccuracy.toFixed(0)}%
                  <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}>
                    overall
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
              <Radar axes={overallAxes} size={radarSize} tone="coral" />
            </div>
            <RadarLegend tone="coral" />
          </div>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--hairline)',
              borderRadius: 24,
              padding: mobile ? 16 : 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 600, fontStyle: 'italic' }}>when you practice</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>24-hour rhythm</div>
            </div>
            <RhythmStrip hours={hours} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--ink-3)',
              }}
            >
              <span>12a</span>
              <span>6a</span>
              <span>noon</span>
              <span>6p</span>
              <span>11p</span>
            </div>
          </div>
        </div>

        {/* Intervals + Scale degrees radars (separate per-item drill-downs) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
            gap: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--hairline)',
              borderRadius: 24,
              padding: mobile ? 16 : 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--disp)', fontSize: 18, fontWeight: 600, fontStyle: 'italic' }}>
                  intervals
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  arranged by circle of fifths
                </div>
              </div>
              {intervalSummary.attempts > 0 && (
                <div
                  className="mono"
                  style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 600, color: 'var(--lav-ink)' }}
                >
                  {intervalSummary.accuracy.toFixed(0)}%
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px 0' }}>
              <Radar axes={intervalRadarAxes} size={splitRadarSize} tone="lav" compact />
            </div>
            <RadarLegend tone="lav" />
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--hairline)',
              borderRadius: 24,
              padding: mobile ? 16 : 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: 'var(--disp)', fontSize: 18, fontWeight: 600, fontStyle: 'italic' }}>
                  scale degrees
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  1 through 7, circle-of-fifths order
                </div>
              </div>
              {degreeSummary.attempts > 0 && (
                <div
                  className="mono"
                  style={{ fontFamily: 'var(--disp)', fontSize: 22, fontWeight: 600, color: 'var(--sky-ink)' }}
                >
                  {degreeSummary.accuracy.toFixed(0)}%
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4px 0' }}>
              <Radar axes={degreeRadarAxes} size={splitRadarSize} tone="sky" />
            </div>
            <RadarLegend tone="sky" />
          </div>
        </div>

        {/* Chord radar — full width so 10 axes have room to breathe */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--hairline)',
            borderRadius: 24,
            padding: mobile ? 16 : 24,
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 600, fontStyle: 'italic' }}>
                chords
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                triads & 7ths interleaved by quality — adjacent axes never share a triad type
              </div>
            </div>
            {chordSummary.attempts > 0 && (
              <div
                className="mono"
                style={{ fontFamily: 'var(--disp)', fontSize: 24, fontWeight: 600, color: 'var(--butter-ink)' }}
              >
                {chordSummary.accuracy.toFixed(0)}%
                <span style={{ fontFamily: 'var(--ui)', fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}>
                  overall
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
            <Radar axes={chordRadarAxes} size={mobile ? 320 : 420} tone="butter" />
          </div>
          <RadarLegend tone="butter" />
        </div>

        {/* Mastery heatmap (per-item drill-down) */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--hairline)',
            borderRadius: 24,
            padding: mobile ? 16 : 24,
          }}
        >
          <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 600, fontStyle: 'italic', marginBottom: 4 }}>
            mastery heatmap
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 14 }}>
            per-item accuracy — green ≥ 80%, yellow ≥ 60%, coral below
          </div>
          <MasteryHeatmap cells={mastery} />
        </div>
      </div>
      </div>
    </div>
  );
}
