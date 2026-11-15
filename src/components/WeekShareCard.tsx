import { useMemo, useState } from 'react';
import { Flame, Share2, X as Close } from 'lucide-react';
import { Bean } from './primitives';
import ShareSheet from './ShareSheet';
import { CURRICULUM } from '../curriculum';
import { getAllSessions, getStreakDays } from '../lib/sessionStore';
import { weekReport, weekShareText } from '../lib/weekReport';
import { weekCard, toPngBlob } from '../lib/shareCards';
import { lessonPageUrl, SITE_URL } from '../lib/lessonPages';
import type { SharePayload } from '../lib/share';

const nameOf = (id: string) => CURRICULUM.find((l) => l.id === id)?.name;

/**
 * "Your week" with a share button: on the stats screen always (once there's practice this
 * week), and on the results screen when a streak reaches a milestone.
 */
export default function WeekShareCard({ milestone, onDismiss, mobile }: { milestone?: number; onDismiss?: () => void; mobile: boolean }) {
  const [sharing, setSharing] = useState(false);
  const report = useMemo(() => weekReport(getAllSessions(), nameOf), []);
  const streak = useMemo(() => getStreakDays(), []);
  if (!report) return null;

  const { title, text } = weekShareText(report, streak);
  const level = CURRICULUM.find((l) => l.id === report.levelId);
  const payload: SharePayload = {
    kind: milestone ? 'streak' : 'week',
    title,
    text,
    url: (target) => {
      const utm = { source: 'share', medium: target, campaign: milestone ? 'streak' : 'week' };
      return level ? lessonPageUrl(level, utm) : `${SITE_URL}/?utm_source=share&utm_medium=${target}&utm_campaign=${utm.campaign}`;
    },
  };

  const headline = report.improved
    ? <>{report.improved.label}: {report.improved.before}% → <span style={{ color: 'var(--coral-ink)' }}>{report.improved.after}%</span></>
    : <>{report.days} {report.days === 1 ? 'day' : 'days'}, {report.questions} questions, {report.accuracy}% right</>;

  return (
    <div
      style={{
        position: 'relative',
        background: milestone ? 'var(--butter-soft)' : 'var(--coral-soft)',
        border: '2px solid var(--ink-1)',
        boxShadow: '0 4px 0 var(--ink-1), 0 8px 20px rgba(42,29,58,0.08)',
        borderRadius: 24,
        padding: mobile ? '16px 16px 16px' : '18px 22px',
        marginBottom: 22,
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        alignItems: mobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: 14,
      }}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Not now"
          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}
        >
          <Close size={18} />
        </button>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {milestone ? <><Flame size={14} fill="var(--coral)" color="var(--coral-ink)" /> {milestone}-day streak</> : 'your week'}
        </div>
        <div style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontWeight: 600, fontSize: mobile ? 21 : 24, lineHeight: 1.15, color: 'var(--ink-1)' }}>
          {headline}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
          {milestone ? 'Worth showing off. Share your week?' : 'Show someone how your ear is coming along.'}
        </div>
      </div>
      <Bean tone="coral" size="md" onClick={() => setSharing(true)} style={{ flexShrink: 0, justifyContent: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Share2 size={16} aria-hidden /> share your week</span>
      </Bean>
      {sharing && (
        <ShareSheet
          heading="Share your week"
          payload={payload}
          fileName="fifths-my-week"
          makeImage={() => weekCard(report, streak).then(toPngBlob)}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}
