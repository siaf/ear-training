import { Bean, ColorPill } from './primitives';

/**
 * "Today's Review" tile pinned above the segment list on the Path screen.
 *
 * Surfaces items the user has completed but is overdue on, per the Leitner schedule
 * in [src/lib/spacedReview.ts](../lib/spacedReview.ts). Tapping the tile starts a
 * mixed-level review session that pulls one due item per question across whatever
 * lessons happen to have due items.
 *
 * Hidden when there are zero due items (and the user has at least one completed
 * lesson — otherwise the tile would shout "0 due" before the user even has history).
 */
export interface DailyReviewTileProps {
  dueCount: number;
  hasCompletedAny: boolean;
  mobile: boolean;
  onStart: () => void;
}

export default function DailyReviewTile({ dueCount, hasCompletedAny, mobile, onStart }: DailyReviewTileProps) {
  if (!hasCompletedAny) return null;
  if (dueCount === 0) return null;

  const cap = Math.min(10, dueCount);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: mobile ? 12 : 18,
        padding: mobile ? '14px 16px' : '18px 22px',
        margin: mobile ? '12px 14px 18px' : '20px 32px 28px',
        borderRadius: 18,
        background: 'var(--coral-soft)',
        border: '1.5px solid var(--coral-ink)',
        boxShadow: '0 6px 20px rgba(198,70,50,0.08)',
      }}
    >
      <div
        aria-hidden
        style={{
          width: mobile ? 44 : 56,
          height: mobile ? 44 : 56,
          borderRadius: '50%',
          background: 'var(--coral)',
          color: 'var(--page)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--disp)',
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: mobile ? 22 : 26,
          flexShrink: 0,
        }}
      >
        ✦
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--disp)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: mobile ? 18 : 22,
            color: 'var(--coral-ink)',
            lineHeight: 1.15,
          }}
        >
          Today's Review
        </div>
        <div
          style={{
            fontSize: mobile ? 13 : 14,
            color: 'var(--ink-2)',
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span>
            {dueCount} {dueCount === 1 ? 'item' : 'items'} due
          </span>
          {dueCount > 10 && (
            <ColorPill tone="butter" style={{ padding: '2px 8px', fontSize: 11 }}>
              {cap} per session
            </ColorPill>
          )}
        </div>
      </div>
      <Bean tone="ink" size={mobile ? 'md' : 'lg'} onClick={onStart} style={{ borderRadius: mobile ? 14 : 18, flexShrink: 0 }}>
        review
      </Bean>
    </div>
  );
}
