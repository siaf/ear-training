import { useMemo } from 'react';
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
function Tile({ label, value, sub, bg }: { label: string; value: string; sub?: string; bg: string }) {
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
          <Tile label="Longest streak" value={`${totals?.longestStreak ?? 0}`} sub={`now · ${streak} 🔥`} bg="var(--butter)" />
          <Tile label="Total questions" value={`${totals?.totalQuestions ?? 0}`} sub={`${(totals?.accuracy ?? 0).toFixed(0)}% overall`} bg="var(--coral)" />
          <Tile
            label="Avg response"
            value={`${((totals?.avgResponseMs ?? 0) / 1000).toFixed(1)}s`}
            sub={`per question`}
            bg="var(--lav)"
          />
        </div>

        {/* Mastery + rhythm */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1.4fr 1fr',
            gap: 18,
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
            <div style={{ fontFamily: 'var(--disp)', fontSize: 20, fontWeight: 600, fontStyle: 'italic', marginBottom: 14 }}>
              mastery heatmap
            </div>
            <MasteryHeatmap cells={mastery} />
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
      </div>
      </div>
    </div>
  );
}
