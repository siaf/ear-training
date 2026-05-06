// Unified "Today" hub — combines today's stats (minutes / streak) with the actionable
// daily items (recommendation, daily review, mixed practice). Used in both the right rail
// on desktop and above the path on mobile, replacing what used to be three separate tiles
// stacked above the segment list.
//
// Why one panel: those three actions are all "things you do today" — keeping them visually
// together as a single hub matches the user's mental model better than three competing
// boxes. Mobile especially benefits — the standalone tiles ate ~240px of scroll real estate
// before; this panel is ~140px even with all three rows visible.
//
// ActionRow is intentionally compact: small circle icon, title, one-line subtitle, chevron.
// No big chunky shadows on the rows themselves — the panel itself has the chunky brand
// shadow, and the rows sit inside as a list. That keeps the visual weight on the panel,
// not on each item.

import { ArrowUpRight, ChevronRight, Flame, RotateCcw, Shuffle, type LucideIcon } from 'lucide-react';
import { CURRICULUM_SEGMENTS } from '../curriculum';
import type { Recommendation } from '../lib/recommendations';

export interface TodayPanelProps {
  streakDays: number;
  todayMinutes: number;
  /** Cross-segment recommendation — null = hide that row. */
  recommendation?: Recommendation | null;
  /** Items past their Leitner due date — 0 hides the review row. */
  dueCount: number;
  /** Total completed lessons — Mixed Practice row hidden when < 2. */
  completedCount: number;
  mobile: boolean;
  /** Start any specific level (used by the recommendation row). */
  onStartLevel: (id: string) => void;
  onStartReview?: () => void;
  onStartInterleave?: () => void;
}

interface ActionRowProps {
  Icon: LucideIcon;
  /** Brand color family — drives the circle icon background. */
  accent: 'coral' | 'butter' | 'lav';
  title: string;
  subtitle: string;
  mobile: boolean;
  onClick: () => void;
}

function ActionRow({ Icon, accent, title, subtitle, mobile, onClick }: ActionRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: mobile ? '8px 6px' : '10px 6px',
        borderRadius: 12,
        background: 'transparent',
        border: 'none',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--ink-1)',
        font: 'inherit',
        transition: 'background 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(42,29,58,0.04)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div
        aria-hidden
        style={{
          width: mobile ? 34 : 38,
          height: mobile ? 34 : 38,
          borderRadius: '50%',
          background: `var(--${accent})`,
          color: `var(--${accent}-ink)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1.5px solid var(--ink-1)',
        }}
      >
        <Icon size={mobile ? 16 : 18} strokeWidth={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--disp)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: mobile ? 14 : 15,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: mobile ? 11 : 12,
            color: 'var(--ink-2)',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subtitle}
        </div>
      </div>
      <ChevronRight aria-hidden size={18} color="var(--ink-3)" style={{ flexShrink: 0 }} />
    </button>
  );
}

function segmentName(id: string): string {
  return CURRICULUM_SEGMENTS.find((s) => s.id === id)?.name ?? id;
}

export default function TodayPanel({
  streakDays,
  todayMinutes,
  recommendation,
  dueCount,
  completedCount,
  mobile,
  onStartLevel,
  onStartReview,
  onStartInterleave,
}: TodayPanelProps) {
  const hasReview = dueCount > 0 && !!onStartReview;
  const hasMix = completedCount >= 2 && !!onStartInterleave;
  const hasRec = recommendation != null;
  const anyAction = hasReview || hasMix || hasRec;

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--sky)',
        borderRadius: 'var(--r-lg)',
        padding: mobile ? '14px 16px' : '18px 20px',
        border: '2px solid var(--ink-1)',
        boxShadow: '0 4px 0 var(--sky-ink), 0 8px 20px rgba(42,29,58,0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Mascot positioned in the top-right of the header so it doesn't overlap action rows */}
      <img
        src={`${import.meta.env.BASE_URL}brand/mascots/pulse/excited.png`}
        alt=""
        aria-hidden
        style={{
          position: 'absolute',
          right: -8,
          top: mobile ? -4 : -6,
          width: mobile ? 60 : 78,
          height: 'auto',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 4px 8px rgba(42,29,58,0.15))',
        }}
      />

      {/* Header — today's stats */}
      <div
        style={{
          fontSize: mobile ? 10 : 11,
          color: 'var(--sky-ink)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.4,
        }}
      >
        today
      </div>
      {mobile ? (
        <div
          style={{
            fontFamily: 'var(--disp)',
            fontSize: 22,
            fontWeight: 400,
            color: 'var(--ink-1)',
            margin: '2px 0 0',
            lineHeight: 1.1,
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
          }}
        >
          <span>{todayMinutes}m</span>
          <span style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--ui)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            streak ·
            <span style={{ color: 'var(--coral-ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Flame size={13} strokeWidth={2.4} fill="var(--coral)" /> {streakDays}
            </span>
          </span>
        </div>
      ) : (
        <>
          <div
            style={{
              fontFamily: 'var(--disp)',
              fontSize: 36,
              fontWeight: 400,
              color: 'var(--ink-1)',
              margin: '4px 0 2px',
              lineHeight: 1,
            }}
          >
            {todayMinutes} min
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            streak ·
            <span style={{ color: 'var(--coral-ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Flame size={14} strokeWidth={2.4} fill="var(--coral)" /> {streakDays}
            </span>
          </div>
        </>
      )}

      {/* Action rows — separated by a hairline so the visual hierarchy is "today header" + "today actions" */}
      {anyAction && (
        <>
          <div
            aria-hidden
            style={{
              height: 1,
              background: 'rgba(42,29,58,0.12)',
              margin: mobile ? '12px -4px 6px' : '14px -4px 6px',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {hasReview && (
              <ActionRow
                Icon={RotateCcw}
                accent="coral"
                title="Today's Review"
                subtitle={`${dueCount} ${dueCount === 1 ? 'item' : 'items'} due`}
                mobile={mobile}
                onClick={onStartReview!}
              />
            )}
            {hasRec && recommendation && (
              <ActionRow
                Icon={ArrowUpRight}
                accent="butter"
                title={`Try ${recommendation.level.name}`}
                subtitle={`${recommendation.weakSegmentAccuracy.toFixed(0)}% on ${segmentName(recommendation.weakSegmentId)} — close the gap`}
                mobile={mobile}
                onClick={() => onStartLevel(recommendation.level.id)}
              />
            )}
            {hasMix && (
              <ActionRow
                Icon={Shuffle}
                accent="lav"
                title="Mix it up"
                subtitle={`10 mixed across your ${completedCount} cleared`}
                mobile={mobile}
                onClick={onStartInterleave!}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
