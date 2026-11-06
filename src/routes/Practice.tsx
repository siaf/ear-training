import { useEffect, useState } from 'react';
import { ArrowRight, Check, Flame, Music as MusicIcon, Play as PlayIcon, Settings as SettingsIcon, X as XIcon } from 'lucide-react';
import { Bean, Blob, ColorPill, useTicker } from '../components/primitives';
import { getDisplayName } from '../curriculum';
import { CurriculumLevel, Question, SessionStats } from '../types';
import { audioEngine } from '../audioEngine';
import { useBreakpoint } from '../lib/useBreakpoint';
import SingPrompt from '../components/SingPrompt';
import SingSequence from '../components/SingSequence';
import RhythmTapPad from '../components/RhythmTapPad';
import RhythmGrid from '../components/RhythmGrid';
import { gradeGrid } from '../lib/rhythmGrader';
import { encodeGrid } from '../lib/rhythmPatterns';
import { SingDifficulty, effectiveSingTolerance } from './Settings';
import { DegreeNotation, DEFAULT_DEGREE_NOTATION, formatDegree, formatDegreeText } from '../lib/degreeNotation';
import {
  INTERLEAVE_CATEGORY_LABELS,
  type InterleaveCategory,
} from '../lib/interleaving';

interface Props {
  level: CurriculumLevel;
  question: Question | null;
  selectedAnswer: string | null;
  showFeedback: boolean;
  /** True when the user has answered but reveal is delayed (delayed_short feedback timing). */
  feedbackPending?: boolean;
  /** Mixed-practice (#5) — correct category for the current question, null when not interleaving. */
  interleaveCorrectCategory?: InterleaveCategory | null;
  /** Category chips to render in the picker (the union of categories in the queue). */
  interleaveCategoryOptions?: InterleaveCategory[] | null;
  /** What the user last tapped in the picker. Null until they tap. */
  interleaveCategoryAttempt?: InterleaveCategory | null;
  /** Has the user tapped any category for this question? Once true, answer chips unlock. */
  interleaveCategoryPicked?: boolean;
  /** Handler for category taps. */
  onPickInterleaveCategory?: (cat: InterleaveCategory) => void;
  stats: SessionStats;
  currentScaleRoot: string;
  scaleRootIndexInSession: number;
  isPlayingScale: boolean;
  droneEnabled: boolean;
  playbackSpeed: number;
  maxQuestions: number;
  questionsPerKey: number;
  establishTonality: boolean;
  singDifficulty?: SingDifficulty;
  degreeNotation?: DegreeNotation;
  onSkipSinging?: () => void;
  onReplay: () => void;
  onAnswer: (answer: string) => void;
  onPick: (answer: string) => void;
  onSubmit: () => void;
  onNext: () => void;
  onEndSession: () => void;
  onToggleDrone: () => void;
  onSpeedChange: (speed: number) => void;
  onExit: () => void;
}

function answerLabel(item: string, level: CurriculumLevel, notation: DegreeNotation): string {
  if (level.itemGroups) return getDisplayName(item); // "Stable", "Tonic", etc.
  if (level.type === 'scale_degree') return formatDegreeText(item, level.context, notation);
  return getDisplayName(item);
}

function DegreeChipLabel({
  item,
  context,
  notation,
  fontSize,
}: {
  item: string;
  context: CurriculumLevel['context'];
  notation: DegreeNotation;
  fontSize: number;
}) {
  const parts = formatDegree(item, context, notation);
  const supSize = notation === 'solfege' ? '0.55em' : '0.5em';
  return (
    <span
      aria-label={`${parts.acc}${parts.main}${parts.sup}`}
      style={{
        fontFamily: 'var(--disp)',
        fontWeight: 600,
        fontSize,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
    >
      {parts.acc && (
        <span style={{ fontSize: '0.62em', opacity: 0.85, marginRight: 1, transform: 'translateY(-0.05em)' }}>
          {parts.acc}
        </span>
      )}
      <span>{parts.main}</span>
      {parts.sup && (
        <span style={{ fontSize: supSize, fontWeight: 600, marginLeft: 1, alignSelf: 'flex-start', paddingTop: '0.25em' }}>
          {parts.sup}
        </span>
      )}
    </span>
  );
}

export default function Practice({
  level,
  question,
  selectedAnswer,
  showFeedback,
  feedbackPending = false,
  interleaveCorrectCategory = null,
  interleaveCategoryOptions = null,
  interleaveCategoryAttempt = null,
  interleaveCategoryPicked = false,
  onPickInterleaveCategory,
  stats,
  currentScaleRoot,
  isPlayingScale,
  droneEnabled,
  playbackSpeed,
  maxQuestions,
  questionsPerKey,
  establishTonality,
  singDifficulty,
  degreeNotation,
  onSkipSinging,
  onReplay,
  onAnswer,
  onPick,
  onSubmit,
  onNext,
  onEndSession,
  onToggleDrone,
  onSpeedChange,
  onExit,
}: Props) {
  const t = useTicker(true);
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);

  const bp = useBreakpoint();
  const mobile = bp !== 'desktop';
  const tablet = bp === 'tablet';

  // Scale reference is ~3s on normal speed. Track local progress from the moment
  // isPlayingScale flips true so the user sees something happening.
  const [scaleStart, setScaleStart] = useState<number | null>(null);
  useEffect(() => {
    if (isPlayingScale) setScaleStart(performance.now());
    else setScaleStart(null);
  }, [isPlayingScale]);
  const scaleElapsed = scaleStart ? (performance.now() - scaleStart) / 1000 : 0;
  const scaleEstimate = 3.0 / Math.max(0.25, playbackSpeed);
  const scaleProgress = scaleStart ? Math.min(1, scaleElapsed / scaleEstimate) : 0;
  // Tick so scaleProgress re-renders while playing.
  useEffect(() => {
    if (!isPlayingScale) return;
    const id = setInterval(() => setScaleStart((v) => (v === null ? null : v)), 80);
    return () => clearInterval(id);
  }, [isPlayingScale]);

  const answered = stats.totalQuestions;

  // Per-note hits for sing-sequence feedback. Reset whenever the question changes.
  const [sequenceHits, setSequenceHits] = useState<boolean[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => {
    setSequenceHits(null);
  }, [question?.id]);

  const options = level.itemGroups ? Object.keys(level.itemGroups) : level.items;
  const highlightIdx = selectedAnswer ? options.indexOf(selectedAnswer) : -1;
  const isCorrect = question && selectedAnswer === question.correctAnswer;
  const inSing = question?.responseMode === 'sing';
  const notation = degreeNotation ?? DEFAULT_DEGREE_NOTATION;

  // Keyboard shortcuts: 1-9 to pick an option, Space/Enter to submit or advance.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
        return;
      }
      if (showSettings) return;

      if (!question) return;

      if (e.key === ' ' || e.key === 'Enter') {
        if (showFeedback) {
          e.preventDefault();
          onNext();
        } else if (feedbackPending) {
          // Awaiting delayed reveal — ignore submit/next attempts.
        } else if (inSing) {
          // voice-driven; no keyboard submit/replay
        } else if (selectedAnswer) {
          e.preventDefault();
          onSubmit();
        } else if (!isPlayingScale) {
          e.preventDefault();
          onReplay();
        }
        return;
      }

      if (!inSing && !showFeedback && !feedbackPending && !isPlayingScale && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < options.length) {
          e.preventDefault();
          onPick(options[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, showFeedback, feedbackPending, selectedAnswer, inSing, isPlayingScale, options, onPick, onSubmit, onNext, onReplay, showSettings]);

  // Play-button sizing collapses on mobile for vertical budget.
  const playSz = mobile ? (tablet ? 88 : 68) : 148;

  // Re-evaluated every tick (useTicker runs each frame while the component is mounted).
  const audioPlaying = isPlayingScale || audioEngine.isPlaybackActive();
  void t; // tick-driven re-render also refreshes audioPlaying above

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--page)',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          padding: mobile ? '10px 16px' : '20px 36px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: mobile ? 12 : 20,
          borderBottom: '1px solid var(--hairline)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onExit}
            aria-label="Exit session"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--ink-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-1)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <XIcon size={26} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            aria-label="Practice settings"
            title="Drone, speed, scale reference"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: droneEnabled ? 'var(--mint-soft)' : 'var(--ink-5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: droneEnabled ? 'var(--mint-ink)' : 'var(--ink-1)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <SettingsIcon size={26} strokeWidth={2.25} />
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            minWidth: 0,
            position: 'relative',
          }}
        >
          {stats.currentStreak >= 2 && (
            <div
              key={stats.currentStreak}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: mobile ? '3px 10px' : '4px 14px',
                borderRadius: 999,
                background: 'var(--coral-soft)',
                border: '1.5px solid var(--coral-ink)',
                fontSize: mobile ? 13 : 15,
                fontWeight: 800,
                letterSpacing: 0.8,
                color: 'var(--coral-ink)',
                fontFamily: 'var(--ui)',
                textTransform: 'uppercase',
                animation: 'streak-pop 380ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(198,70,50,0.18)',
              }}
              title={`Best this session: ${stats.bestStreak}`}
            >
              <Flame size={mobile ? 14 : 16} strokeWidth={2.4} fill="var(--coral)" />
              {stats.currentStreak} in a row
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: mobile ? 8 : 14, width: '100%' }}>
          {Array.from({ length: Math.ceil(maxQuestions / questionsPerKey) }).map((_, chunkIdx) => {
            const chunkStart = chunkIdx * questionsPerKey;
            const chunkEnd = Math.min(chunkStart + questionsPerKey, maxQuestions);
            return (
              <div
                key={chunkIdx}
                style={{
                  flex: 1,
                  display: 'flex',
                  gap: mobile ? 3 : 4,
                  maxWidth: mobile ? 120 : 220,
                }}
              >
                {Array.from({ length: chunkEnd - chunkStart }).map((_, j) => {
                  const i = chunkStart + j;
                  const state = i < answered ? 'done' : i === answered ? 'current' : 'future';
                  const done = state === 'done';
                  const current = state === 'current';
                  const wasCorrect = done ? stats.results[i] !== false : true;
                  const doneColor = wasCorrect ? 'var(--mint-ink)' : 'var(--coral-ink)';
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: mobile ? 8 : 10,
                        borderRadius: 999,
                        background: 'var(--ink-5)',
                        overflow: 'hidden',
                        boxShadow: current
                          ? `0 0 0 ${2 + pulse * 3}px rgba(42,29,58,${0.10 + pulse * 0.10})`
                          : 'none',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: '100%',
                          borderRadius: 999,
                          background: done ? doneColor : 'var(--ink-1)',
                          transform: done || current ? 'scaleX(1)' : 'scaleX(0)',
                          transformOrigin: 'left center',
                          transition: 'transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1), background 300ms ease',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--ink-2)', fontFamily: 'var(--mono)' }}>
            {answered}/{maxQuestions}
          </span>
          <ColorPill tone="butter" style={{ padding: '3px 10px' }}>
            {stats.accuracy.toFixed(0)}%
          </ColorPill>
        </div>
      </div>

      {/* Key indicator — minimal text centered. Only shown for tonal lessons. */}
      <div
        style={{
          padding: mobile ? '6px 16px 0' : '10px 36px 0',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {establishTonality && (
          <div
            style={{
              fontSize: mobile ? 13 : 14,
              color: 'var(--ink-3)',
              letterSpacing: 0.3,
            }}
          >
            in <b style={{ color: 'var(--ink-1)', fontWeight: 700 }}>{currentScaleRoot} major</b>
          </div>
        )}
        {/* Scale-play progress strip */}
        <div
          aria-hidden
          style={{
            height: 3,
            width: mobile ? 120 : 180,
            borderRadius: 3,
            background: 'var(--ink-5)',
            overflow: 'hidden',
            opacity: isPlayingScale ? 1 : 0,
            transition: 'opacity 200ms',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${scaleProgress * 100}%`,
              background: 'var(--ink-1)',
              transition: 'width 120ms linear',
            }}
          />
        </div>
      </div>

      {/* Core — flexes to fill, absolute blobs don't take space.
          Play cluster fills the upper space; options pin to the bottom. */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: mobile ? '12px 16px 16px' : '36px 36px 28px',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* drifting blobs */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: -60,
            transform: `translate(${Math.sin(t * 0.3) * 14}px, ${Math.cos(t * 0.25) * 10}px)`,
            opacity: 0.3,
            pointerEvents: 'none',
          }}
        >
          <Blob size={mobile ? 160 : 320} color="var(--butter)" />
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            right: -60,
            transform: `translate(${Math.cos(t * 0.22) * 16}px, ${Math.sin(t * 0.28) * 12}px)`,
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        >
          <Blob size={mobile ? 140 : 260} color="var(--lav)" />
        </div>

        {/* Play + squiggle — fills vertical space; options sit at the bottom */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: mobile ? 6 : 22,
            width: '100%',
          }}
        >
          <div style={{ position: 'relative', width: playSz, height: playSz }}>
            {audioPlaying ? (
              <>
                {/* Morphing blob cluster — same ink-1 as the play button, layered opacities for depth */}
                <div
                  aria-label="Playing"
                  role="img"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `scale(${1 + pulse * 0.08}) rotate(${t * 18}deg)`,
                    transition: 'transform 120ms linear',
                    opacity: 0.25,
                  }}
                >
                  <Blob size={playSz} color="var(--ink-1)" />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `scale(${0.92 + (1 - pulse) * 0.12}) rotate(${-t * 12}deg)`,
                    transition: 'transform 120ms linear',
                    opacity: 0.55,
                  }}
                >
                  <Blob size={playSz} color="var(--ink-1)" />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `scale(${0.75 + pulse * 0.10}) rotate(${t * 8}deg)`,
                    transition: 'transform 120ms linear',
                  }}
                >
                  <Blob size={playSz} color="var(--ink-1)" />
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '2px solid var(--coral)',
                    transform: `scale(${1 + pulse * 0.45})`,
                    opacity: 1 - pulse,
                    pointerEvents: 'none',
                  }}
                />
                <button
                  onClick={onReplay}
                  disabled={isPlayingScale || !question}
                  aria-label="Replay"
                  style={{
                    width: playSz,
                    height: playSz,
                    borderRadius: '50%',
                    background: 'var(--ink-1)',
                    color: 'var(--page)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isPlayingScale || !question ? 'wait' : 'pointer',
                    boxShadow: '0 14px 36px rgba(42,29,58,0.3)',
                    transform: `scale(${1 + pulse * 0.03})`,
                  }}
                >
                  <PlayIcon
                    size={mobile ? 30 : 64}
                    strokeWidth={2}
                    fill="currentColor"
                    style={{ marginLeft: mobile ? 3 : 6 }}
                  />
                </button>
              </>
            )}
          </div>
          {!(question?.responseMode === 'sing' && !isPlayingScale) && (
            <div
              style={{
                fontSize: mobile ? 20 : 30,
                color: 'var(--ink-1)',
                fontFamily: 'var(--disp)',
                fontWeight: 600,
                letterSpacing: -0.005,
                lineHeight: 1.15,
                textAlign: 'center',
              }}
            >
              {isPlayingScale ? 'New key — listen' : 'What did you hear?'}
            </div>
          )}
        </div>

        {/* Mixed Practice (#5) — category gate: user must classify the question's category
            before the answer chips become available. Wrong picks count toward analytics but
            don't fail the question; correctness is decided by the answer chip alone. */}
        {interleaveCorrectCategory != null && interleaveCategoryOptions && !interleaveCategoryPicked && question && !showFeedback && !feedbackPending ? (
          <div style={{ marginTop: mobile ? 14 : 28, width: '100%', maxWidth: 720, zIndex: 2, position: 'relative' }}>
            <div
              style={{
                fontFamily: 'var(--ui)',
                fontSize: mobile ? 12 : 13,
                color: 'var(--ink-3)',
                textTransform: 'uppercase',
                letterSpacing: 1.6,
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: mobile ? 10 : 14,
              }}
            >
              first — what kind of question is this?
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: mobile
                  ? `repeat(${Math.min(interleaveCategoryOptions.length, 3)}, 1fr)`
                  : `repeat(${Math.min(interleaveCategoryOptions.length, 4)}, 1fr)`,
                gap: mobile ? 8 : 14,
              }}
            >
              {interleaveCategoryOptions.map((cat, i) => {
                const toneCycle = ['mint', 'lav', 'butter', 'sky', 'coral'] as const;
                const tone = toneCycle[i % toneCycle.length];
                return (
                  <button
                    key={cat}
                    onClick={() => onPickInterleaveCategory?.(cat)}
                    style={{
                      padding: mobile ? '12px 10px' : '20px 14px',
                      borderRadius: mobile ? 14 : 18,
                      background: `var(--${tone})`,
                      color: `var(--${tone}-ink)`,
                      fontFamily: 'var(--ui)',
                      fontWeight: 600,
                      fontSize: mobile ? 14 : 18,
                      border: '1.5px solid rgba(42,29,58,0.08)',
                      cursor: 'pointer',
                      boxShadow: 'var(--sh-sm)',
                      minHeight: mobile ? 44 : 64,
                    }}
                  >
                    {INTERLEAVE_CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
        {interleaveCorrectCategory != null && interleaveCategoryPicked && interleaveCategoryAttempt && !showFeedback && !feedbackPending && (
          /* Category was picked — surface a small banner so the user sees their classification feedback. */
          <div
            style={{
              marginTop: mobile ? 8 : 16,
              padding: '6px 12px',
              borderRadius: 999,
              background: interleaveCategoryAttempt === interleaveCorrectCategory ? 'var(--mint-soft)' : 'var(--coral-soft)',
              color: interleaveCategoryAttempt === interleaveCorrectCategory ? 'var(--mint-ink)' : 'var(--coral-ink)',
              fontFamily: 'var(--ui)',
              fontSize: mobile ? 12 : 13,
              fontWeight: 600,
              alignSelf: 'center',
              border: `1px solid ${interleaveCategoryAttempt === interleaveCorrectCategory ? 'var(--mint-ink)' : 'var(--coral-ink)'}`,
            }}
          >
            {interleaveCategoryAttempt === interleaveCorrectCategory ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                category: {INTERLEAVE_CATEGORY_LABELS[interleaveCorrectCategory]}
                <Check size={13} strokeWidth={3} />
              </span>
            ) : (
              `actually a ${INTERLEAVE_CATEGORY_LABELS[interleaveCorrectCategory]}`
            )}
          </div>
        )}
        {/* Sing mode — replaces the answer grid */}
        {question?.responseMode === 'sing' ? (
          !showFeedback ? (
            <div style={{ marginTop: mobile ? 14 : 28, width: '100%', maxWidth: 520, zIndex: 2, position: 'relative' }}>
              {question.targetNotes && question.targetNotes.length > 1 ? (
                <SingSequence
                  key={question.id}
                  targetNotes={question.targetNotes}
                  anyOctave={level.singAcceptAnyOctave ?? true}
                  toleranceCents={effectiveSingTolerance(level.singToleranceCents, singDifficulty)}
                  perNoteHoldMs={level.singPerNoteHoldMs ?? 250}
                  mobile={mobile}
                  onReplay={onReplay}
                  onHits={setSequenceHits}
                  onMatch={() => onAnswer(question.correctAnswer)}
                  onCancel={() => onAnswer('__skip__')}
                />
              ) : (
                <SingPrompt
                  key={question.id}
                  targetNote={question.correctAnswer}
                  anyOctave={level.singAcceptAnyOctave ?? true}
                  toleranceCents={effectiveSingTolerance(level.singToleranceCents, singDifficulty)}
                  holdMs={level.singHoldMs ?? 900}
                  mobile={mobile}
                  onMatch={() => onAnswer(question.correctAnswer)}
                  onCancel={() => onAnswer('__skip__')}
                />
              )}
              {onSkipSinging && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Bean tone="ghost" size="sm" onClick={onSkipSinging}>
                    {"can't sing right now? skip singing lessons"}
                  </Bean>
                </div>
              )}
            </div>
          ) : null
        ) : question?.responseMode === 'tap' ? (
          /* Rhythm tap-back — pad plays its own audio and captures user taps. */
          !showFeedback ? (
            <div style={{ marginTop: mobile ? 14 : 28, width: '100%', maxWidth: 520, zIndex: 2, position: 'relative' }}>
              <RhythmTapPad
                key={question.id}
                targetOnsetsBeats={question.targetOnsets ?? []}
                bpm={question.rhythmBpm ?? 100}
                toleranceMs={level.rhythmTapToleranceMs ?? 130}
                passScore={level.rhythmPassScore ?? 0.7}
                mobile={mobile}
                onComplete={(r) => onAnswer(r.passed ? question.correctAnswer : '__wrong__')}
                onCancel={() => onAnswer('__skip__')}
              />
            </div>
          ) : null
        ) : question?.responseMode === 'grid' ? (
          /* Rhythm dictation — 16-cell grid input. Strict equality grade. */
          !showFeedback ? (
            <div style={{ marginTop: mobile ? 14 : 28, width: '100%', maxWidth: 760, zIndex: 2, position: 'relative' }}>
              <RhythmGrid
                key={question.id}
                mobile={mobile}
                onReplay={onReplay}
                onSubmit={(cells) => {
                  const target = question.targetGrid ?? [];
                  const r = gradeGrid(cells, target);
                  onAnswer(r.passed ? question.correctAnswer : encodeGrid(cells));
                }}
                onCancel={() => onAnswer('__skip__')}
              />
            </div>
          ) : null
        ) : (
        <div
          style={{
            marginTop: mobile ? 14 : 48,
            width: '100%',
            maxWidth: mobile ? 720 : 860,
            display: 'grid',
            gridTemplateColumns:
              level.type === 'scale_degree'
                ? mobile
                  ? `repeat(${Math.min(options.length, 4)}, 1fr)`
                  : `repeat(${options.length}, 1fr)`
                : level.type === 'progression'
                ? 'repeat(2, 1fr)'  // progression labels are long (e.g. "I — V — vi — IV") — give them width
                : mobile
                ? 'repeat(2, 1fr)'
                : options.length <= 3
                ? `repeat(${options.length}, 1fr)`
                : options.length === 4
                ? 'repeat(2, 1fr)'
                : 'repeat(3, 1fr)',
            gap: mobile ? 8 : 14,
            zIndex: 2,
            position: 'relative',
          }}
        >
          {options.map((opt, i) => {
            const isSelected = selectedAnswer === opt;
            const isThisCorrect = question?.correctAnswer === opt;
            const showCorrect = showFeedback && isThisCorrect;
            const showWrong = showFeedback && isSelected && !isThisCorrect;
            // Bucket-key lessons (itemGroups: { stable: ['1','3','5'], ... }) render
            // their bucket names like "Stable" — not Roman numerals — so they take the
            // standard answer-chip path, not the degree-chip path. (Previously this was
            // routed through DegreeChipLabel, which crashed on parseInt('stable') = NaN.)
            const isDegree = level.type === 'scale_degree' && !level.itemGroups;
            const isTonic = isDegree && opt === '1';

            // Brand: scale degrees render as `degchip` — tonic is dark/inverted, others
            // sit on a uniform butter-soft surface. Other answer types keep the
            // tone-cycle variety that aids "pick at a glance".
            const toneCycle = ['mint', 'lav', 'butter', 'sky', 'coral'] as const;
            const tone = toneCycle[i % toneCycle.length];
            const baseBg = isDegree
              ? isTonic
                ? 'var(--ink-1)'
                : 'var(--page-2)'
              : `var(--${tone})`;
            const baseInk = isDegree
              ? isTonic
                ? 'var(--page)'
                : 'var(--ink-1)'
              : `var(--${tone}-ink)`;

            const bg = showCorrect ? 'var(--mint)' : showWrong ? 'var(--coral-soft)' : isSelected ? 'var(--ink-1)' : baseBg;
            const fg = showCorrect ? 'var(--mint-ink)' : showWrong ? 'var(--coral-ink)' : isSelected ? 'var(--page)' : baseInk;
            const border = showCorrect
              ? '2px solid var(--mint-ink)'
              : showWrong
              ? '2px solid var(--coral-ink)'
              : i === highlightIdx
              ? '2px solid var(--ink-1)'
              : isDegree && !isTonic
              ? '1.5px solid var(--hairline)'
              : '1.5px solid rgba(42,29,58,0.08)';

            return (
              <button
                key={opt}
                onClick={() => onPick(opt)}
                disabled={showFeedback || feedbackPending || !question || isPlayingScale}
                style={{
                  padding: isDegree
                    ? mobile
                      ? '14px 6px'
                      : '20px 10px'
                    : mobile
                    ? '10px 12px'
                    : '26px 24px',
                  borderRadius: isDegree ? (mobile ? 14 : 17) : mobile ? 16 : 20,
                  background: bg,
                  color: fg,
                  fontFamily: 'var(--ui)',
                  fontWeight: 600,
                  letterSpacing: -0.005,
                  fontSize: mobile ? 14.5 : 22,
                  border,
                  cursor: showFeedback || feedbackPending || !question || isPlayingScale ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--sh-sm)',
                  transition: 'all 160ms',
                  minHeight: mobile ? 44 : 76,
                  lineHeight: 1.1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!mobile && i < 9 && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 12,
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      opacity: 0.45,
                      letterSpacing: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                )}
                {isDegree ? (
                  <DegreeChipLabel
                    item={opt}
                    context={level.context}
                    notation={notation}
                    fontSize={mobile ? 26 : 36}
                  />
                ) : (
                  answerLabel(opt, level, notation)
                )}
              </button>
            );
          })}
        </div>
        )}
          </>
        )}
      </div>

      {/* Feedback or drone strip — fixed bottom, compact */}
      {feedbackPending && question ? (
        // Delayed-feedback "thinking..." state — desirable-difficulty per Metcalfe / Kornell-Finn.
        // The user has committed an answer; we sit with it for ~2.5s before revealing correctness.
        <div
          style={{
            padding: mobile ? '14px 16px' : '24px 36px',
            borderTop: '1px solid var(--hairline)',
            background: 'var(--page-2)',
            flexShrink: 0,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--disp)',
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: mobile ? 15 : 22,
              color: 'var(--ink-3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity: 0.7 + 0.3 * Math.sin(t * 4),
            }}
          >
            thinking…
          </div>
        </div>
      ) : showFeedback && question ? (
        <div
          style={{
            padding: mobile ? '10px 16px 12px' : '24px 36px 28px',
            borderTop: '1px solid var(--hairline)',
            background: isCorrect ? 'var(--mint-soft)' : 'var(--coral-soft)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              maxWidth: mobile ? undefined : 860,
              margin: mobile ? '0 0 8px' : '0 auto 14px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--disp)',
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: mobile ? 15 : 22,
                color: isCorrect ? 'var(--mint-ink)' : 'var(--coral-ink)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isCorrect ? <Check size={mobile ? 18 : 24} strokeWidth={3} /> : <XIcon size={mobile ? 18 : 24} strokeWidth={3} />}
              {isCorrect ? 'nice!' : 'not quite'}
            </div>
            {question.acousticKind === 'sing_sequence' && question.targetNotes ? (
              <div style={{ display: 'flex', gap: mobile ? 6 : 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {question.targetNotes.map((n, i) => {
                  const hit = sequenceHits?.[i];
                  const hadResult = hit !== undefined;
                  const ok = hit === true;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: !hadResult ? 'var(--page-2)' : ok ? 'var(--mint)' : 'var(--coral-soft)',
                        border: `1.5px solid ${!hadResult ? 'var(--hairline)' : ok ? 'var(--mint-ink)' : 'var(--coral-ink)'}`,
                        color: !hadResult ? 'var(--ink-3)' : ok ? 'var(--mint-ink)' : 'var(--coral-ink)',
                        fontFamily: 'var(--disp)',
                        fontStyle: 'italic',
                        fontWeight: 700,
                        fontSize: mobile ? 12 : 14,
                      }}
                    >
                      <span>{n.replace(/\d+$/, '')}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {!hadResult ? '·' : ok ? <Check size={mobile ? 12 : 14} strokeWidth={3} /> : <XIcon size={mobile ? 12 : 14} strokeWidth={3} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : !isCorrect ? (
              <div style={{ fontSize: 12, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                actually —{' '}
                {level.type === 'scale_degree' && !level.itemGroups ? (
                  <b style={{ color: 'var(--ink-1)' }}>
                    <DegreeChipLabel
                      item={question.correctAnswer}
                      context={level.context}
                      notation={notation}
                      fontSize={mobile ? 16 : 18}
                    />
                  </b>
                ) : (
                  <b style={{ color: 'var(--ink-1)' }}>{getDisplayName(question.correctAnswer)}</b>
                )}
                {question.intervalDirection && ` · ${question.intervalDirection === 'ascending' ? '↑' : '↓'}`}
                {question.intervalPresentation && ` · ${question.intervalPresentation}`}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: 'flex',
              gap: mobile ? 8 : 12,
              alignItems: 'center',
              maxWidth: mobile ? undefined : 860,
              margin: mobile ? undefined : '0 auto',
            }}
          >
            <Bean tone="ink" size={mobile ? 'md' : 'xl'} onClick={onNext} style={{ flex: 1, borderRadius: mobile ? 16 : 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                next <ArrowRight size={mobile ? 16 : 22} strokeWidth={2.5} />
              </span>
            </Bean>
            {!mobile && (
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
                space / ⏎
              </span>
            )}
            <Bean tone="soft" size={mobile ? 'md' : 'xl'} onClick={onEndSession} style={{ borderRadius: mobile ? 16 : 20 }}>
              end
            </Bean>
          </div>
        </div>
      ) : selectedAnswer && !inSing && question ? (
        <div
          style={{
            padding: mobile ? '10px 16px 12px' : '24px 36px 28px',
            borderTop: '1px solid var(--hairline)',
            background: 'var(--card)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: mobile ? 8 : 12,
              alignItems: 'center',
              maxWidth: mobile ? undefined : 860,
              margin: mobile ? undefined : '0 auto',
            }}
          >
            <Bean tone="ink" size={mobile ? 'md' : 'xl'} onClick={onSubmit} style={{ flex: 1, borderRadius: mobile ? 16 : 20 }}>
              submit
            </Bean>
            {!mobile && (
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
                space / ⏎
              </span>
            )}
          </div>
        </div>
      ) : null}

      {showSettings && (
        <div
          onClick={() => setShowSettings(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(42,29,58,0.45)',
            display: 'flex',
            alignItems: mobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 40,
            padding: mobile ? 0 : 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              borderRadius: mobile ? '20px 20px 0 0' : 20,
              padding: mobile ? '20px 20px calc(24px + env(safe-area-inset-bottom))' : 28,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 24px 60px rgba(42,29,58,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  fontFamily: 'var(--disp)',
                  fontStyle: 'italic',
                  fontWeight: 600,
                  fontSize: 20,
                  color: 'var(--ink-1)',
                }}
              >
                practice settings
              </div>
              <button
                onClick={() => setShowSettings(false)}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--page-2)',
                  border: 'none',
                  color: 'var(--ink-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <XIcon size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scale reference — only meaningful for tonal lessons */}
            {establishTonality && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--ink-1)', fontWeight: 600 }}>scale reference</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  replay {currentScaleRoot} major
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isPlayingScale) audioEngine.playMajorScaleReference(currentScaleRoot, 4);
                }}
                disabled={isPlayingScale}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--hairline)',
                  background: 'var(--page-2)',
                  fontSize: 13,
                  color: 'var(--ink-1)',
                  fontFamily: 'var(--ui)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: isPlayingScale ? 'not-allowed' : 'pointer',
                }}
              >
                <MusicIcon size={15} strokeWidth={2.25} /> play
              </button>
            </div>
            )}

            {/* Drone */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--ink-1)', fontWeight: 600 }}>drone</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  hold the root note under each question
                </div>
              </div>
              <button
                onClick={onToggleDrone}
                role="switch"
                aria-checked={droneEnabled}
                style={{
                  width: 52,
                  height: 30,
                  borderRadius: 999,
                  border: 'none',
                  background: droneEnabled ? 'var(--mint-ink)' : 'var(--ink-5)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 160ms',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: droneEnabled ? 25 : 3,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--card)',
                    transition: 'left 160ms',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                />
              </button>
            </div>

            {/* Speed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, color: 'var(--ink-1)', fontWeight: 600 }}>playback speed</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--mono)' }}>
                  {playbackSpeed.toFixed(2)}×
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0.5, 0.75, 1, 1.25, 1.5].map((s) => {
                  const active = Math.abs(s - playbackSpeed) < 0.01;
                  return (
                    <button
                      key={s}
                      onClick={() => onSpeedChange(s)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 10,
                        border: active ? '1.5px solid var(--ink-1)' : '1px solid var(--hairline)',
                        background: active ? 'var(--ink-1)' : 'var(--page-2)',
                        color: active ? 'var(--page)' : 'var(--ink-2)',
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {s}×
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
