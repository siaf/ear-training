import { ArrowLeft, ArrowRight, X as XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Bean } from './primitives';
import type { LessonIntroCopy } from '../types';
import type { ArrivalNote } from '../lib/arrival';
import { useBreakpoint } from '../lib/useBreakpoint';
import RhythmStaff from './rhythm/RhythmStaff';
import { countLabel, countsOf, describe, parseRhythm, parseTime } from '../rhythm/model';
import Fretboard from './notation/Fretboard';
import Mascot from './Mascot';
import type { MascotHandle } from './Mascot';
import { faceForExpression } from '../mascots';

interface Props {
  pages: LessonIntroCopy[];
  lessonName: string;
  onContinue: () => void;
  onExit: () => void;
  onSkipSinging?: () => void;
  /** Opened from someone's share: "medal", "week" or "streak". Frames it as "try it yourself". */
  shared?: string | null;
  /** Opened from a free tool on fifths.io: says which, and what the app adds to it. */
  fromTool?: ArrivalNote | null;
}

// Brand-kit palette: Fable=coral, Noir=mint, Major=butter, Pulse=sky.
const MASCOT_TONE: Record<NonNullable<LessonIntroCopy['mascot']>, { bg: string; ink: string }> = {
  fable: { bg: 'var(--coral-soft)', ink: 'var(--coral-ink)' },
  noir:  { bg: 'var(--mint-soft)',  ink: 'var(--mint-ink)' },
  major: { bg: 'var(--butter-soft)',ink: 'var(--butter-ink)' },
  pulse: { bg: 'var(--sky-soft)',   ink: 'var(--sky-ink)' },
};

// Each mascot greets in character as the page opens (after the entrance), and a tap
// plays one of its music moves in turn.
const GREETING: Record<NonNullable<LessonIntroCopy['mascot']>, string> = {
  fable: 'wave', noir: 'slowblink', major: 'welcome', pulse: 'beat',
};
const ON_TAP: Record<NonNullable<LessonIntroCopy['mascot']>, string[]> = {
  fable: ['conduct', 'sing', 'beat', 'correct'],
  noir: ['beat', 'ear', 'pitch-up', 'slowblink'],
  major: ['drum', 'sing', 'proud', 'correct'],
  pulse: ['beat', 'drum', 'metronome', 'streak'],
};

export default function LessonIntro({ pages, lessonName, onContinue, onExit, onSkipSinging, shared = null, fromTool = null }: Props) {
  const bp = useBreakpoint();
  const mobile = bp !== 'desktop';

  const [pageIdx, setPageIdx] = useState(0);
  const page = pages[pageIdx] ?? pages[0];
  const isLast = pageIdx >= pages.length - 1;
  const hasMultiple = pages.length > 1;

  const mascot = page.mascot ?? 'fable';
  const tone = MASCOT_TONE[mascot];
  const mascotSize = mobile ? 160 : 220;
  const mascotRef = useRef<MascotHandle>(null);
  const taps = useRef(0);
  const onMascotTap = () => {
    const moves = ON_TAP[mascot];
    if (mascotRef.current?.play(moves[taps.current % moves.length])) taps.current += 1;
  };

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
        {page.rhythmFigure ? (
          <div className="fx-fade-up" style={{ width: '100%', maxWidth: 520, background: 'var(--card)', borderRadius: 18, border: '1px solid var(--hairline)', padding: '8px 12px', boxSizing: 'border-box' }}>
            <RhythmStaff
              notes={parseRhythm(page.rhythmFigure.src)}
              time={parseTime(page.rhythmFigure.time ?? '4/4')}
              counts={countsOf(parseRhythm(page.rhythmFigure.src), parseTime(page.rhythmFigure.time ?? '4/4')).map(countLabel)}
              ariaLabel={describe(parseRhythm(page.rhythmFigure.src))}
            />
          </div>
        ) : page.figure ? (
          // A teaching picture takes the mascot's place: the names are shown here, so
          // the questions can leave them off.
          <div className="fx-fade-up" style={{ width: '100%', maxWidth: 560 }}>
            <Fretboard
              dots={page.figure.neck.map((d) => ({ ...d, state: d.root ? ('root' as const) : ('dot' as const) }))}
              // Centre on the dots unless the page says where to look.
              focusFret={page.figure.focusFret ?? Math.round((Math.min(...page.figure.neck.map((d) => d.f)) + Math.max(...page.figure.neck.map((d) => d.f))) / 2)}
              stringNames={page.figure.stringNames}
              neck={page.figure.bass ? 'bass' : 'guitar'}
              ariaLabel={page.figure.neck.map((d) => d.label).join(', ')}
            />
          </div>
        ) : (
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
          <Mascot
            // A new page is a new greeting.
            key={`${pageIdx}-${mascot}`}
            ref={mascotRef}
            name={mascot}
            face={faceForExpression(page.expression)}
            act={GREETING[mascot]}
            actDelayMs={600}
            size="92%"
            label={mascot}
            onClick={onMascotTap}
            style={{ cursor: 'pointer' }}
          />
        </div>
        )}

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
          {(shared || fromTool) && pageIdx === 0 && (
            <div
              role="note"
              style={{
                background: 'var(--butter-soft)',
                border: '2px solid var(--ink-1)',
                boxShadow: '0 3px 0 var(--ink-1)',
                borderRadius: 14,
                padding: '10px 14px',
                fontSize: mobile ? 14 : 15,
                lineHeight: 1.4,
                color: 'var(--ink-1)',
              }}
            >
              {shared ? (
                <>
                  <b>Shared with you.</b>{' '}
                  {shared === 'medal'
                    ? 'Someone just mastered this. Can you? Try it yourself: a few minutes, free, no signup to start.'
                    : 'Someone is training their ear with this. Try it yourself: a few minutes, free, no signup to start.'}
                </>
              ) : fromTool ? (
                <>
                  <b>{fromTool.title}</b> {fromTool.body}
                </>
              ) : null}
            </div>
          )}
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
              {isLast ? (shared ? 'try it yourself' : "let's go") : 'next'}
              <ArrowRight size={mobile ? 16 : 22} strokeWidth={2.5} />
            </span>
          </Bean>
          {!mobile && (
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
              space / ⏎
            </span>
          )}
        </div>
        {onSkipSinging && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Bean tone="ghost" size="sm" onClick={onSkipSinging}>
              {"can't sing right now? skip singing lessons"}
            </Bean>
          </div>
        )}
      </div>
    </div>
  );
}
