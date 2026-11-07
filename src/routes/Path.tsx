import { useEffect, useMemo, useRef, useState } from 'react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { CURRICULUM, CURRICULUM_SEGMENTS, isLevelUnlocked } from '../curriculum';
import { CurriculumLevel, CurriculumSegment } from '../types';
import { Bean, Brand } from '../components/primitives';
import DesktopSidebar from '../components/DesktopSidebar';
import TodayPanel from '../components/TodayPanel';
import UpsellCard, { type UpsellMode } from '../components/UpsellCard';
import type { Recommendation } from '../lib/recommendations';
import { CHECKPOINTS, type Checkpoint } from '../lib/checkpoints';
import { Flag, Flame, Lock as LockIcon } from 'lucide-react';
import { getLessonIconRender, getSegmentIcon, type LessonIconRender } from '../lib/lessonIcons';
import { mascotForColor, segmentColor } from '../lib/segmentColors';
import { phCapture } from '../lib/posthog';

type NodeState = 'done' | 'current' | 'locked';

interface Props {
  completedLevels: string[];
  currentLevelId: string;
  debugMode: boolean;
  onStart: (levelId: string) => void;
  onNavigate: (route: 'settings' | 'stats') => void;
  onOpenPaywall?: () => void;
  onOpenAuth?: () => void;
  showSignIn?: boolean; // Only once we know they're signed out, and accounts are available.
  streakDays?: number;
  todayMinutes?: number;
  bottomPadding?: number;
  isPro?: boolean;
  isSignedIn?: boolean;
  /** Count of items past their Leitner-schedule due date. 0 hides the tile. */
  dueCount?: number;
  /** Called when the user taps the Daily Review tile. */
  onStartReview?: () => void;
  /** Called when the user taps the Mixed Practice tile. Hidden if user has fewer than 2 completed lessons. */
  onStartInterleave?: () => void;
  /** Cross-segment recommendation surfaced when one segment lags the others. Null = hide tile. */
  recommendation?: Recommendation | null;
  /** Called when the user taps a checkpoint node on the path itself. */
  onStartCheckpoint?: (cp: Checkpoint) => void;
}

/* ---------- Right rail (desktop only) ---------- */
function PathRightRail({
  streakDays,
  todayMinutes,
  recommendation,
  dueCount,
  completedCount,
  onStartLevel,
  onStartReview,
  onStartInterleave,
  upsell,
  onUpsellClick,
}: {
  streakDays: number;
  todayMinutes: number;
  recommendation?: Recommendation | null;
  dueCount: number;
  completedCount: number;
  onStartLevel: (id: string) => void;
  onStartReview?: () => void;
  onStartInterleave?: () => void;
  upsell: UpsellMode;
  onUpsellClick?: () => void;
}) {
  return (
    <aside style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TodayPanel
        streakDays={streakDays}
        todayMinutes={todayMinutes}
        recommendation={recommendation}
        dueCount={dueCount}
        completedCount={completedCount}
        mobile={false}
        onStartLevel={onStartLevel}
        onStartReview={onStartReview}
        onStartInterleave={onStartInterleave}
      />
      {onUpsellClick && <UpsellCard mode={upsell} mobile={false} onClick={onUpsellClick} />}
    </aside>
  );
}

function resolveState(
  level: CurriculumLevel,
  completed: Set<string>,
  completedArr: string[],
  isCurrent: boolean,
  debug: boolean,
): NodeState {
  if (completed.has(level.id)) return 'done';
  if (isCurrent) return 'current';
  return isLevelUnlocked(level, completedArr, { unlockAll: debug }) ? 'current' : 'locked';
}

interface RiverNodeProps {
  level: CurriculumLevel;
  idx: number;
  state: NodeState;
  palette: ReturnType<typeof segmentColor>;
  mobile: boolean;
  isStartNode: boolean;
  isSectionNext: boolean;
  hasAnyDone: boolean;
  isLastInSegment: boolean;
  segmentTailwindColor: string;
  onClick: () => void;
  proLocked?: boolean;
}

function useBreathe(active: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf: number;
    const start = performance.now();
    const loop = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return t;
}

function RiverNode({
  level,
  idx,
  state,
  palette,
  mobile,
  isStartNode,
  isSectionNext,
  hasAnyDone,
  isLastInSegment,
  segmentTailwindColor,
  onClick,
  proLocked = false,
}: RiverNodeProps) {
  // Smooth sine curve — period ≈ 7.4 nodes, gives a continuous S-wave.
  const amplitude = mobile ? 70 : 130;
  const offset = Math.sin(idx * 0.85) * amplitude;
  const t = useBreathe(isStartNode);
  const pulse = isStartNode ? 0.5 + 0.5 * Math.sin(t * 2.6) : 0;
  const bubbleBob = isStartNode ? Math.sin(t * 2.2) * 2 : 0;

  const isDone = state === 'done';
  const isCur = state === 'current';
  const isLocked = state === 'locked';
  const sz = mobile ? 62 : 82;

  const iconRender = getLessonIconRender(level, isLastInSegment, isLocked);
  const iconSize = mobile ? 28 : 36;

  const shadow = isDone
    ? `0 6px 0 var(--ink-1), 0 10px 20px rgba(42,29,58,0.18)`
    : isSectionNext
    ? `0 6px 0 var(--ink-1), 0 10px 24px rgba(42,29,58,0.22)`
    : `0 5px 0 rgba(42,29,58,0.10)`;

  const mascotSize = 80;
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: mobile ? 22 : 18,
      }}
    >
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        transform: `translateX(${offset}px)`,
        zIndex: 2,
      }}
    >
      {isSectionNext && (
        // Section-owned mascot — stands to the left of the section's next-up node, like a guide.
        // Anchored to the button's center via translate so label width can't shift it around.
        <img
          src={`${import.meta.env.BASE_URL}brand/mascots/${mascotForColor(segmentTailwindColor)}/portrait.png`}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: mascotSize,
            height: 'auto',
            transform: `translate(calc(-100% - ${sz / 2 + 12}px), -50%)`,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 8px 16px rgba(42,29,58,0.18))',
            zIndex: 1,
          }}
        />
      )}
      {isSectionNext && (
        <button
          type="button"
          onClick={onClick}
          aria-label={isStartNode ? (hasAnyDone ? 'Continue' : 'Start') : 'Jump here'}
          style={{
            position: 'absolute',
            bottom: `calc(100% - ${mobile ? 2 : 4}px)`,
            left: '50%',
            transform: `translateX(-50%) translateY(${bubbleBob}px)`,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'var(--card)',
            border: '2px solid var(--ink-1)',
            boxShadow: '0 3px 0 var(--ink-1)',
            fontFamily: 'var(--disp)',
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: mobile ? 12 : 13,
            letterSpacing: 0.5,
            color: isStartNode ? 'var(--coral-ink)' : palette.ink,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            zIndex: 3,
          }}
        >
          {isStartNode ? (hasAnyDone ? 'CONTINUE' : 'START') : 'JUMP HERE'}
        </button>
      )}
      {isStartNode && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            width: sz,
            height: sz,
            borderRadius: '50%',
            border: `2px solid ${palette.bg}`,
            transform: `translateX(-50%) scale(${1 + pulse * 0.55})`,
            opacity: 1 - pulse,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <button
          onClick={onClick}
          disabled={isLocked}
          aria-label={proLocked ? `${level.name} — Pro lesson` : level.name}
          style={{
            width: sz,
            height: sz,
            borderRadius: '50%',
            background: proLocked ? 'var(--butter-soft)' : isDone ? palette.bg : isSectionNext ? palette.bg : 'var(--card)',
            border: `3px solid ${proLocked ? 'var(--butter-ink)' : isDone || isSectionNext ? 'var(--ink-1)' : 'var(--ink-5)'}`,
            boxShadow: shadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: proLocked ? 'var(--butter-ink)' : isDone || isSectionNext ? '#fff' : 'var(--ink-4)',
            fontFamily: 'var(--disp)',
            fontWeight: 600,
            fontSize: mobile ? 24 : 28,
            transform: isCur ? `scale(${1 + pulse * 0.03})` : 'none',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            padding: 0,
          }}
        >
          <NodeIconBody render={iconRender} size={iconSize} />
        </button>
        {proLocked && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'var(--butter)',
              color: 'var(--butter-ink)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.6,
              fontFamily: 'var(--ui)',
              border: '1.5px solid var(--butter-ink)',
              boxShadow: '0 2px 0 var(--butter-ink)',
              zIndex: 4,
            }}
          >
            PRO
          </span>
        )}
        {isDone && !proLocked && (
          <span
            aria-label="Completed"
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: mobile ? 22 : 26,
              height: mobile ? 22 : 26,
              borderRadius: '50%',
              background: 'var(--mint)',
              color: 'var(--mint-ink)',
              border: '2px solid var(--ink-1)',
              boxShadow: '0 2px 0 var(--ink-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4,
            }}
          >
            <svg width={mobile ? 12 : 14} height={mobile ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
        <div
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: isSectionNext ? 'var(--ink-1)' : 'rgba(255,255,255,0.85)',
            color: isSectionNext ? 'var(--page)' : isDone ? 'var(--ink-1)' : 'var(--ink-3)',
            fontSize: mobile ? 11 : 12,
            fontWeight: 600,
            letterSpacing: 0.1,
            whiteSpace: 'nowrap',
            maxWidth: mobile ? 180 : 260,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: isSectionNext ? '0 4px 12px rgba(42,29,58,0.2)' : 'none',
          }}
        >
          {level.name}
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * Render whatever the lesson-icon resolver produced — a lucide component OR a short
 * text label (e.g. "3rd", "TT") — at the requested size, centered. Used by both
 * RiverNode (regular lessons) and CheckpointNode (mix nodes use a Flag icon directly).
 */
function NodeIconBody({ render, size }: { render: LessonIconRender; size: number }) {
  if (render.kind === 'lucide') {
    const Icon = render.Component;
    return <Icon size={size} strokeWidth={2.2} />;
  }
  // Text label — sized to roughly match icon visual weight. We use the display font
  // and a slight italic tilt to feel hand-set rather than mechanical.
  const fontSize = render.text.length <= 2 ? size * 0.78 : size * 0.62;
  return (
    <span
      style={{
        fontFamily: 'var(--disp)',
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize,
        lineHeight: 1,
        letterSpacing: -0.01,
      }}
    >
      {render.text}
    </span>
  );
}

/**
 * Checkpoint node — a "mix" milestone rendered inline on the path between lesson
 * clusters. Anchored after the LAST constituent lesson in segment order, so the user
 * walks the path and naturally encounters "Fourths & Fifths Mix" right after clearing
 * those three lessons.
 *
 * Visual: butter-tinted circle with a star icon and a "MIX" badge — visually distinct
 * from regular lesson nodes (segment-tinted, varied icons) so the user can scan the
 * path and see the review checkpoints at a glance. Locked state mirrors RiverNode.
 */
function CheckpointNode({
  checkpoint,
  idx,
  locked,
  mobile,
  onClick,
}: {
  checkpoint: Checkpoint;
  idx: number;
  locked: boolean;
  mobile: boolean;
  onClick: () => void;
}) {
  // Same wave parameters as RiverNode so the checkpoint sits on the same S-curve.
  // Half-step offset (idx + 0.5) puts it visually between siblings rather than overlapping.
  const amplitude = mobile ? 70 : 130;
  const offset = Math.sin((idx + 0.5) * 0.85) * amplitude;
  const sz = mobile ? 62 : 82;
  const iconSize = mobile ? 28 : 36;

  const shadow = locked
    ? '0 5px 0 rgba(42,29,58,0.10)'
    : '0 6px 0 var(--butter-ink), 0 10px 20px rgba(42,29,58,0.18)';

  return (
    <div style={{ position: 'relative', marginBottom: mobile ? 22 : 18 }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          transform: `translateX(${offset}px)`,
          zIndex: 2,
        }}
      >
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onClick}
            disabled={locked}
            aria-label={locked ? `${checkpoint.name} (locked — clear the cluster's lessons first)` : checkpoint.name}
            style={{
              width: sz,
              height: sz,
              borderRadius: '50%',
              background: locked ? 'var(--card)' : 'var(--butter)',
              border: `3px solid ${locked ? 'var(--ink-5)' : 'var(--ink-1)'}`,
              boxShadow: shadow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: locked ? 'var(--ink-4)' : 'var(--butter-ink)',
              cursor: locked ? 'not-allowed' : 'pointer',
              padding: 0,
            }}
          >
            <NodeIconBody
              render={{ kind: 'lucide', Component: locked ? LockIcon : Flag }}
              size={iconSize}
            />
          </button>
          {!locked && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--ink-1)',
                color: 'var(--page)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.6,
                fontFamily: 'var(--ui)',
                border: '1.5px solid var(--ink-1)',
                boxShadow: '0 2px 0 var(--ink-1)',
                zIndex: 4,
              }}
            >
              MIX
            </span>
          )}
          <div
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              background: locked ? 'rgba(255,255,255,0.85)' : 'var(--butter-soft)',
              color: locked ? 'var(--ink-3)' : 'var(--butter-ink)',
              fontSize: mobile ? 11 : 12,
              fontWeight: 600,
              fontStyle: 'italic',
              fontFamily: 'var(--disp)',
              whiteSpace: 'nowrap',
              maxWidth: mobile ? 200 : 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              border: locked ? 'none' : '1.5px solid var(--butter-ink)',
            }}
          >
            {checkpoint.name}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Group checkpoints by their anchor lesson within a single segment. The anchor is the
 * LAST lesson of the checkpoint's `levelIds` in segment-order — so a "consonant intervals
 * mix" anchors after the last 6ths lesson, not before. Cross-segment checkpoints are
 * skipped (none exist today; defensive).
 */
function checkpointAnchorsForSegment(segment: CurriculumSegment): Map<string, Checkpoint[]> {
  const anchors = new Map<string, Checkpoint[]>();
  for (const cp of CHECKPOINTS) {
    if (cp.segmentId !== segment.id) continue;
    let lastIdx = -1;
    for (let i = segment.levels.length - 1; i >= 0; i--) {
      if (cp.levelIds.includes(segment.levels[i].id)) { lastIdx = i; break; }
    }
    if (lastIdx === -1) continue;
    const anchorId = segment.levels[lastIdx].id;
    if (!anchors.has(anchorId)) anchors.set(anchorId, []);
    anchors.get(anchorId)!.push(cp);
  }
  return anchors;
}


function StickyBanner({
  segment,
  unitIdx,
  mobile,
}: {
  segment: CurriculumSegment;
  unitIdx: number;
  mobile: boolean;
}) {
  const palette = segmentColor(segment.color, CURRICULUM_SEGMENTS.findIndex((s) => s.id === segment.id));
  return (
    <div
      style={{
        position: 'sticky',
        top: mobile ? 0 : 12,
        zIndex: 10,
        background: palette.bg,
        color: palette.ink,
        padding: mobile ? '12px 18px' : '16px 26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        borderRadius: mobile ? 0 : 'var(--r-lg)',
        border: mobile ? 'none' : '2px solid var(--ink-1)',
        boxShadow: mobile ? '0 4px 12px rgba(42,29,58,0.15)' : '0 4px 0 var(--ink-1), 0 8px 20px rgba(42,29,58,0.12)',
        margin: mobile ? 0 : '0 12px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div
          style={{
            fontSize: mobile ? 10 : 11,
            textTransform: 'uppercase',
            letterSpacing: 1.8,
            fontWeight: 700,
            opacity: 0.7,
          }}
        >
          Section 1 · Unit {unitIdx + 1}
        </div>
        <div
          style={{
            fontFamily: 'var(--disp)',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: mobile ? 18 : 24,
            letterSpacing: -0.01,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {segment.name}
        </div>
      </div>
      {(() => {
        const SegIcon = getSegmentIcon(segment.id);
        return (
          <span style={{ display: 'inline-flex', flexShrink: 0, color: palette.ink }}>
            <SegIcon size={mobile ? 22 : 28} strokeWidth={2.2} />
          </span>
        );
      })()}
    </div>
  );
}

function RiverInner({
  segments,
  mobile,
  completed,
  completedArr,
  currentLevelId,
  debug,
  onStart,
  onProTap,
  isPro,
  currentNodeRef,
  onStartCheckpoint,
}: {
  segments: CurriculumSegment[];
  mobile: boolean;
  completed: Set<string>;
  completedArr: string[];
  currentLevelId: string;
  debug: boolean;
  onStart: (levelId: string) => void;
  onProTap: (levelId: string) => void;
  isPro: boolean;
  currentNodeRef: React.MutableRefObject<HTMLDivElement | null>;
  onStartCheckpoint?: (cp: Checkpoint) => void;
}) {
  return (
    <div style={{ paddingBottom: mobile ? 30 : 40 }}>
      {segments.map((segment, si) => {
        const palette = segmentColor(segment.color, si);
        const sectionNextId = segment.levels.find(
          (l) => !completed.has(l.id) && isLevelUnlocked(l, completedArr, { unlockAll: debug }),
        )?.id;
        const checkpointAnchors = checkpointAnchorsForSegment(segment);
        return (
          <section key={segment.id} style={{ position: 'relative' }}>
            <StickyBanner segment={segment} unitIdx={si} mobile={mobile} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: mobile ? '36px 0 28px' : '48px 0 36px',
              }}
            >
              {segment.levels.flatMap((level, li) => {
                const proLocked = level.tier === 'pro' && !isPro;
                const state = resolveState(level, completed, completedArr, level.id === currentLevelId, debug);
                const isStart = level.id === currentLevelId;
                const isSectionNext = level.id === sectionNextId;
                const isLast = li === segment.levels.length - 1;
                const out: React.ReactNode[] = [
                  <div key={`l-${level.id}`} ref={isStart ? currentNodeRef : undefined}>
                    <RiverNode
                      level={level}
                      idx={li}
                      state={state}
                      palette={palette}
                      mobile={mobile}
                      isStartNode={isStart}
                      isSectionNext={isSectionNext}
                      hasAnyDone={completedArr.length > 0}
                      isLastInSegment={isLast}
                      segmentTailwindColor={segment.color}
                      proLocked={proLocked}
                      onClick={() => {
                        if (proLocked) { onProTap(level.id); return; }
                        if (state === 'locked') return;
                        onStart(level.id);
                      }}
                    />
                  </div>,
                ];
                // Inline checkpoint nodes anchored after this lesson — one or more curated
                // mix milestones that review the cluster the user just walked through.
                const cps = checkpointAnchors.get(level.id);
                if (cps && onStartCheckpoint) {
                  for (const cp of cps) {
                    const locked = !cp.levelIds.every((id) => completed.has(id));
                    out.push(
                      <CheckpointNode
                        key={`cp-${cp.id}`}
                        checkpoint={cp}
                        idx={li}
                        locked={locked}
                        mobile={mobile}
                        onClick={() => onStartCheckpoint(cp)}
                      />,
                    );
                  }
                }
                return out;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function Path({
  completedLevels,
  currentLevelId,
  debugMode,
  onStart,
  onNavigate,
  onOpenPaywall,
  onOpenAuth,
  showSignIn = false,
  streakDays = 0,
  todayMinutes = 0,
  bottomPadding = 0,
  isPro = false,
  isSignedIn = false,
  dueCount = 0,
  onStartReview,
  onStartInterleave,
  recommendation = null,
  onStartCheckpoint,
}: Props) {
  const upsellMode: UpsellMode = isPro
    ? 'none'
    : !isSignedIn
    ? 'create_account'
    : 'go_pro';
  const onUpsellClick = upsellMode === 'create_account' ? onOpenAuth : onOpenPaywall;
  const onProTap = (_levelId: string) => {
    if (!isSignedIn && onOpenAuth) onOpenAuth();
    else if (onOpenPaywall) onOpenPaywall();
  };
  const bp = useBreakpoint();
  const mobile = bp !== 'desktop';
  const signInButton = showSignIn && onOpenAuth && (
    <Bean
      tone="mint"
      size={mobile ? 'sm' : 'md'}
      onClick={() => {
        phCapture('path_sign_in_clicked');
        onOpenAuth();
      }}
    >
      sign in
    </Bean>
  );

  const completed = useMemo(() => new Set(completedLevels), [completedLevels]);
  const segments = useMemo(() => CURRICULUM_SEGMENTS.filter((s) => s.levels.length > 0), []);
  const totalLevels = segments.reduce((n, s) => n + s.levels.length, 0);

  const currentLevel = CURRICULUM.find((l) => l.id === currentLevelId) ?? CURRICULUM[0];
  const currentSegment = segments.find((s) => s.id === currentLevel.segmentId);
  const segIdx = segments.findIndex((s) => s.id === currentLevel.segmentId);
  const segPalette = currentSegment ? segmentColor(currentSegment.color, segIdx) : segmentColor('purple', 0);

  const currentNodeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = currentNodeRef.current;
    if (el) el.scrollIntoView({ behavior: 'auto', block: 'center' });
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        background: 'linear-gradient(180deg, var(--page) 0%, var(--page-2) 100%)',
        flexDirection: mobile ? 'column' : 'row',
      }}
    >
      {!mobile && (
        <DesktopSidebar
          active="path"
          onNavigate={(tab) => {
            if (tab !== 'path') onNavigate(tab);
          }}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {mobile ? (
          <>
            <div
              style={{
                padding: '10px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--page)',
                borderBottom: '1px solid var(--hairline)',
              }}
            >
              <Brand />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: 'var(--coral-ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Flame size={13} strokeWidth={2.4} fill="var(--coral)" /> {streakDays}
                </span>
                <span style={{ color: 'var(--ink-3)' }}>{todayMinutes}m today</span>
              </div>
            </div>
            <div
              style={{
                padding: '10px 18px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                background: 'var(--page)',
                borderBottom: '1px solid var(--hairline)',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1
                  style={{
                    fontFamily: 'var(--disp)',
                    fontSize: 20,
                    fontWeight: 600,
                    letterSpacing: -0.015,
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Your <span style={{ fontStyle: 'italic', color: segPalette.ink }}>path</span>
                </h1>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', margin: '2px 0 0' }}>
                  {completedLevels.length} of {totalLevels} cleared
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {signInButton}
                <Bean tone="coral" size="sm" onClick={() => onStart(currentLevelId)}>
                  ▶ continue
                </Bean>
              </div>
            </div>
          </>
        ) : null}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingBottom: mobile ? 20 + bottomPadding : 0,
          }}
        >
          {!mobile && (
            <div
              style={{
                maxWidth: 1100,
                margin: '0 auto',
                width: '100%',
                padding: '32px 44px 8px',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 18,
                }}
              >
                <h1
                  style={{
                    fontFamily: 'var(--disp)',
                    fontSize: 44,
                    fontWeight: 600,
                    letterSpacing: -0.02,
                    margin: 0,
                  }}
                >
                  Your <span style={{ fontStyle: 'italic', color: segPalette.ink }}>path</span>
                </h1>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  {signInButton}
                  <Bean tone="coral" size="md" onClick={() => onStart(currentLevelId)}>
                    ▶ Continue
                  </Bean>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '6px 0 0' }}>
                {completedLevels.length} of {totalLevels} cleared
              </p>
            </div>
          )}
          <div
            style={{
              maxWidth: mobile ? undefined : 1100,
              margin: '0 auto',
              padding: mobile ? 0 : '0 44px',
              display: mobile ? 'block' : 'flex',
              gap: 32,
              alignItems: 'flex-start',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ flex: mobile ? 'none' : 1, minWidth: 0 }}>
              <div style={{ maxWidth: mobile ? undefined : 720, margin: '0 auto' }}>
                {/* Mobile: render the unified Today panel above the path. Desktop has it
                    in the right rail instead. Replaces what used to be three standalone
                    tiles (DailyReview / Recommendation / Mixed Practice) stacked here. */}
                {mobile && (
                  <div style={{ margin: '12px 14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <TodayPanel
                      streakDays={streakDays}
                      todayMinutes={todayMinutes}
                      recommendation={recommendation}
                      dueCount={dueCount}
                      completedCount={completedLevels.length}
                      mobile
                      onStartLevel={onStart}
                      onStartReview={onStartReview}
                      onStartInterleave={onStartInterleave}
                    />
                    {onUpsellClick && (
                      <UpsellCard mode={upsellMode} mobile onClick={onUpsellClick} />
                    )}
                  </div>
                )}
                <RiverInner
                  segments={segments}
                  mobile={mobile}
                  completed={completed}
                  completedArr={completedLevels}
                  currentLevelId={currentLevelId}
                  debug={debugMode}
                  onStart={onStart}
                  onProTap={onProTap}
                  isPro={isPro}
                  currentNodeRef={currentNodeRef}
                  onStartCheckpoint={onStartCheckpoint}
                />
              </div>
            </div>
            {!mobile && (
              <PathRightRail
                streakDays={streakDays}
                todayMinutes={todayMinutes}
                recommendation={recommendation}
                dueCount={dueCount}
                completedCount={completedLevels.length}
                onStartLevel={onStart}
                onStartReview={onStartReview}
                onStartInterleave={onStartInterleave}
                upsell={upsellMode}
                onUpsellClick={onUpsellClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
