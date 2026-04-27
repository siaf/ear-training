import { ArrowLeft, ArrowRight, X as XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bean } from './primitives';
import type { LessonIntroCopy } from '../types';
import { useBreakpoint } from '../lib/useBreakpoint';

interface Props {
  pages: LessonIntroCopy[];
  lessonName: string;
  onContinue: () => void;
  onExit: () => void;
}

// Brand-kit palette: Fable=coral, Noir=mint, Major=butter, Pulse=sky.
const MASCOT_TONE: Record<NonNullable<LessonIntroCopy['mascot']>, { bg: string; ink: string }> = {
  fable: { bg: 'var(--coral-soft)', ink: 'var(--coral-ink)' },
  noir:  { bg: 'var(--mint-soft)',  ink: 'var(--mint-ink)' },
  major: { bg: 'var(--butter-soft)',ink: 'var(--butter-ink)' },
  pulse: { bg: 'var(--sky-soft)',   ink: 'var(--sky-ink)' },
};

export default function LessonIntro({ pages, lessonName, onContinue, onExit }: Props) {
  const bp = useBreakpoint();
  const mobile = bp !== 'desktop';

  const [pageIdx, setPageIdx] = useState(0);
  const page = pages[pageIdx] ?? pages[0];
  const isLast = pageIdx >= pages.length - 1;
  const hasMultiple = pages.length > 1;

  const mascot = page.mascot ?? 'fable';
  const tone = MASCOT_TONE[mascot];
  const mascotSrc = `${import.meta.env.BASE_URL}brand/mascots/${mascot}/portrait.png`;
  const mascotSize = mobile ? 160 : 220;

  const goPrev = () => setPageIdx((i) => Math.max(0, i - 1));
  const goNext = () => {
    if (isLast) onContinue();
    else setPageIdx((i) => i + 1);
  };

  // Keyboard: space/enter = next/continue, left/right = page nav, escape = exit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' && pageIdx > 0) {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx, isLast]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--page)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Top bar — exit + lesson name + pagination dots (when multi-page) */}
      <div
        style={{
          padding: mobile ? '10px 16px' : '20px 36px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onExit}
          aria-label="Exit"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--ink-5)',
            border: 'none',
            color: 'var(--ink-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <XIcon size={26} strokeWidth={2.5} />
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {hasMultiple &&
            pages.map((_, i) => (
              <button
                key={i}
                onClick={() => setPageIdx(i)}
                aria-label={`Go to page ${i + 1}`}
                style={{
                  width: i === pageIdx ? 24 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i <= pageIdx ? 'var(--ink-1)' : 'var(--ink-5)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'width 260ms cubic-bezier(0.2, 0.8, 0.2, 1), background 240ms',
                  padding: 0,
                }}
              />
            ))}
        </div>
        <div style={{ width: 48 }} />
      </div>

      {/* Mascot + bubble — re-keyed per page so animations replay */}
      <div
        key={pageIdx}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: mobile ? '12px 20px' : '36px',
          gap: mobile ? 18 : 28,
          minHeight: 0,
        }}
      >
        <div
          className="fx-mascot-enter"
          style={{
            width: mascotSize,
            height: mascotSize,
            borderRadius: '50%',
            background: tone.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src={mascotSrc}
            alt={mascot}
            style={{ width: '92%', height: '92%', objectFit: 'contain' }}
          />
        </div>

        <div
          className="fx-fade-up"
          style={{
            width: '100%',
            maxWidth: 560,
            background: 'var(--card)',
            border: '1.5px solid var(--hairline)',
            borderRadius: 20,
            padding: mobile ? '18px 18px 20px' : '24px 28px 26px',
            boxShadow: 'var(--sh-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: mobile ? 12 : 14,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--ui)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: tone.ink,
            }}
          >
            {lessonName}
            {hasMultiple && (
              <span style={{ color: 'var(--ink-3)', marginLeft: 8, fontWeight: 600 }}>
                · {pageIdx + 1} / {pages.length}
              </span>
            )}
          </div>

          <div
            style={{
              fontFamily: 'var(--disp)',
              fontSize: mobile ? 20 : 26,
              fontWeight: 600,
              lineHeight: 1.25,
              color: 'var(--ink-1)',
            }}
          >
            {page.idea}
          </div>

          <div style={{ fontSize: mobile ? 14 : 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            {page.purpose}
          </div>

          <div
            style={{
              fontSize: mobile ? 13 : 14,
              color: 'var(--ink-1)',
              lineHeight: 1.5,
              padding: mobile ? '10px 12px' : '12px 14px',
              background: 'var(--page-2)',
              borderRadius: 12,
              fontWeight: 500,
            }}
          >
            {page.expectation}
          </div>
        </div>
      </div>

      {/* Bottom CTA — back arrow + primary CTA + keyboard hint */}
      <div
        style={{
          padding: mobile ? '12px 16px 16px' : '20px 36px 28px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            maxWidth: mobile ? undefined : 560,
            margin: mobile ? undefined : '0 auto',
          }}
        >
          {pageIdx > 0 && (
            <Bean
              tone="soft"
              size={mobile ? 'md' : 'xl'}
              onClick={goPrev}
              style={{ borderRadius: mobile ? 16 : 20 }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={mobile ? 16 : 22} strokeWidth={2.5} /> back
              </span>
            </Bean>
          )}
          <Bean
            tone="ink"
            size={mobile ? 'md' : 'xl'}
            onClick={goNext}
            style={{ flex: 1, borderRadius: mobile ? 16 : 20 }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {isLast ? "let's go" : 'next'}
              <ArrowRight size={mobile ? 16 : 22} strokeWidth={2.5} />
            </span>
          </Bean>
          {!mobile && (
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
              space / ⏎
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
