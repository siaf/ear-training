import * as React from 'react';
import { Check } from 'lucide-react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { Bean, Brand, ColorPill, ProgressBar } from '../components/primitives';
import { CurriculumLevel, SessionStats } from '../types';
import { CURRICULUM, getDisplayName } from '../curriculum';
import DesktopSidebar, { SidebarTab } from '../components/DesktopSidebar';

interface Props {
  level: CurriculumLevel;
  stats: SessionStats;
  insights: string[];
  canUnlock: boolean;
  onBackToPath: () => void;
  onPracticeAgain: () => void;
  onNextLesson: () => void;
  onNavigate?: (tab: SidebarTab) => void;
}

function Scorecard({
  label,
  value,
  sub,
  bg,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  bg: string;
}) {
  return (
    <div style={{ background: bg, borderRadius: 22, padding: '18px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, color: 'var(--ink-2)' }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--disp)',
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: -0.03,
          color: 'var(--ink-1)',
          margin: '6px 0 2px',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{sub}</div>}
    </div>
  );
}

export default function Results({
  level,
  stats,
  insights,
  canUnlock,
  onBackToPath,
  onPracticeAgain,
  onNextLesson,
  onNavigate,
}: Props) {
  const mobile = useBreakpoint() !== 'desktop';

  const avgResponse = stats.weaknesses.reduce((sum, w) => sum + w.attempts, 0);
  const top3Confusions = stats.confusionMatrix?.slice(0, 3) ?? [];
  const weakestInterval = stats.intervalWeaknesses?.[stats.intervalWeaknesses.length - 1];
  const weakestDegree = stats.scaleDegreeWeaknesses?.[stats.scaleDegreeWeaknesses.length - 1];

  const nextLevelIdx = CURRICULUM.findIndex((l) => l.id === level.id) + 1;
  const nextLevel = CURRICULUM[nextLevelIdx];

  const shortfall = Math.max(0, level.unlockRequirement - stats.accuracy);
  void weakestInterval;
  void weakestDegree;

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
      {!mobile && onNavigate && <DesktopSidebar active="path" onNavigate={onNavigate} />}
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
            <Bean tone="ghost" size="sm" onClick={onBackToPath}>
              ← back to path
            </Bean>
          </div>
        )}
        <div style={{ padding: mobile ? '0 22px 20px' : '32px 44px 40px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <ColorPill tone={canUnlock ? 'mint' : 'lav'} style={{ marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Check size={13} strokeWidth={3} /> {canUnlock ? 'level unlocked' : 'session complete'}
          </span>
        </ColorPill>
        <h1
          style={{
            fontFamily: 'var(--disp)',
            fontSize: mobile ? 30 : 54,
            fontWeight: 600,
            letterSpacing: -0.02,
            lineHeight: 1.02,
            margin: '0 0 14px',
          }}
        >
          {stats.accuracy >= 90
            ? 'Sharp ear.'
            : stats.accuracy >= 75
            ? 'Nice ear.'
            : stats.accuracy >= 50
            ? 'Coming together.'
            : 'Good effort.'}{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--coral-ink)' }}>{level.name}</span>
          {stats.accuracy >= 75 ? ' is starting to click.' : '.'}
        </h1>

        {/* Scorecards */}
        <div style={{ display: 'grid', gap: mobile ? 10 : 14, gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', marginBottom: mobile ? 14 : 24 }}>
          <Scorecard label="Accuracy" value={`${stats.accuracy.toFixed(0)}%`} sub={`${stats.correctAnswers}/${stats.totalQuestions}`} bg="var(--mint)" />
          <Scorecard label="Questions" value={`${stats.totalQuestions}`} sub="answered" bg="var(--butter)" />
          <Scorecard label="Target" value={`${level.unlockRequirement}%`} sub={canUnlock ? 'passed' : `−${shortfall.toFixed(0)}%`} bg="var(--coral)" />
          <Scorecard
            label="Session"
            value={avgResponse ? <Check size={28} strokeWidth={3} color="var(--lav-ink)" /> : '—'}
            sub="recorded"
            bg="var(--lav)"
          />
        </div>

        {/* Coach note + mastery nudge */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1.4fr 1fr',
            gap: mobile ? 12 : 18,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 24,
              padding: mobile ? 18 : 24,
              border: '1.5px solid var(--hairline)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--disp)',
                fontSize: mobile ? 18 : 22,
                fontWeight: 600,
                fontStyle: 'italic',
                marginBottom: 8,
              }}
            >
              coach note
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 18, lineHeight: 1.5 }}>
              {insights[0] || `Solid pass on ${level.name}.`}
              {top3Confusions.length > 0 && (
                <>
                  {' '}The wobble is on{' '}
                  <b style={{ color: 'var(--coral-ink)' }}>
                    {getDisplayName(top3Confusions[0].actuallyWas)}
                  </b>{' '}
                  — you heard <i>{getDisplayName(top3Confusions[0].mistook)}</i>{' '}
                  {top3Confusions[0].count > 1 ? `${top3Confusions[0].count}×.` : 'once.'}
                </>
              )}
            </div>

            {/* Interval bar mini-chart */}
            {stats.intervalWeaknesses && stats.intervalWeaknesses.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {stats.intervalWeaknesses.slice(0, 4).map((b, i) => {
                  const color = b.accuracy >= 80 ? 'var(--mint)' : b.accuracy >= 60 ? 'var(--butter)' : 'var(--coral)';
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 80, display: 'flex', alignItems: 'flex-end' }}>
                        <div
                          style={{
                            width: '100%',
                            height: `${Math.max(8, b.accuracy)}%`,
                            background: color,
                            borderRadius: '12px 12px 4px 4px',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--ink-2)',
                          marginTop: 6,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {b.interval.replace(/_/g, ' ')} · {b.accuracy.toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--lav)', borderRadius: 24, padding: mobile ? 18 : 24 }}>
            <div
              style={{
                fontFamily: 'var(--disp)',
                fontSize: mobile ? 15 : 18,
                fontWeight: 600,
                fontStyle: 'italic',
                color: 'var(--lav-ink)',
                marginBottom: 10,
              }}
            >
              mastery nudge
            </div>
            <div
              style={{
                fontFamily: 'var(--disp)',
                fontSize: mobile ? 22 : 28,
                fontWeight: 600,
                lineHeight: 1.15,
                marginBottom: 12,
              }}
            >
              {canUnlock ? (
                <>
                  <span style={{ fontStyle: 'italic' }}>Level unlocked.</span> Next: {nextLevel?.name ?? 'done!'}
                </>
              ) : (
                <>
                  {shortfall.toFixed(0)}% from unlocking <span style={{ fontStyle: 'italic' }}>{level.name}</span>
                </>
              )}
            </div>
            <ProgressBar pct={stats.accuracy} target={level.unlockRequirement} color="var(--lav-ink)" />
            <div style={{ fontSize: 12, color: 'var(--lav-ink)', marginTop: 14 }}>
              {canUnlock
                ? 'Keep the rhythm — your ear is tuning.'
                : `One more clean session (target ${level.unlockRequirement}%) and you're in.`}
            </div>
          </div>
        </div>

        {/* Top confusions */}
        {top3Confusions.length > 0 && (
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 24,
              padding: mobile ? 18 : 24,
              border: '1.5px solid var(--hairline)',
              marginBottom: 24,
            }}
          >
            <div style={{ fontFamily: 'var(--disp)', fontSize: mobile ? 17 : 20, fontWeight: 600, fontStyle: 'italic', marginBottom: 10 }}>
              what you mixed up
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {top3Confusions.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: 'var(--page-2)',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--ink-1)' }}>
                    You heard <i style={{ color: 'var(--coral-ink)' }}>{getDisplayName(c.mistook)}</i> — it was{' '}
                    <b>{getDisplayName(c.actuallyWas)}</b>
                  </div>
                  <ColorPill tone="coral">{c.count}×</ColorPill>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scale-degree breakdown (compact) */}
        {stats.scaleDegreeWeaknesses && stats.scaleDegreeWeaknesses.length > 0 && (
          <div
            style={{
              background: 'var(--card)',
              borderRadius: 24,
              padding: mobile ? 18 : 24,
              border: '1.5px solid var(--hairline)',
              marginBottom: 24,
            }}
          >
            <div style={{ fontFamily: 'var(--disp)', fontSize: mobile ? 17 : 20, fontWeight: 600, fontStyle: 'italic', marginBottom: 10 }}>
              by scale degree
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stats.scaleDegreeWeaknesses.slice(0, 5).map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: 'var(--page-2)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{w.context}</span>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 13,
                      color: w.accuracy >= 80 ? 'var(--mint-ink)' : w.accuracy >= 60 ? 'var(--butter-ink)' : 'var(--coral-ink)',
                      fontWeight: 600,
                    }}
                  >
                    {w.correct}/{w.attempts} · {w.accuracy.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: 32 }}>
          {nextLevel && canUnlock && (
            <Bean tone="coral" size="lg" onClick={onNextLesson}>
              next lesson → {nextLevel.name}
            </Bean>
          )}
          <Bean tone="ink" size="lg" onClick={onPracticeAgain}>
            keep going →
          </Bean>
          <Bean tone="soft" size="lg" onClick={onBackToPath}>
            done for today
          </Bean>
        </div>
      </div>
      </div>
    </div>
  );
}

export { Scorecard };
