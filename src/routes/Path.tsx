import { useEffect, useMemo, useRef, useState } from 'react';
import { useBreakpoint } from '../lib/useBreakpoint';
import { CURRICULUM, CURRICULUM_SEGMENTS, isLevelUnlocked } from '../curriculum';
import { CurriculumLevel, CurriculumSegment } from '../types';
import { Bean, Brand, ColorPill } from '../components/primitives';
import DesktopSidebar from '../components/DesktopSidebar';
import { mascotForColor, segmentColor } from '../lib/segmentColors';

type NodeState = 'done' | 'current' | 'locked';

interface Props {
  completedLevels: string[];
  currentLevelId: string;
  debugMode: boolean;
  onStart: (levelId: string) => void;
  onNavigate: (route: 'settings' | 'stats') => void;
  onOpenPaywall?: () => void;
  onOpenAuth?: () => void;
  streakDays?: number;
  todayMinutes?: number;
  bottomPadding?: number;
  isPro?: boolean;
  isSignedIn?: boolean;
}

/* ---------- Right rail (desktop only) ---------- */
type UpsellMode = 'none' | 'create_account' | 'go_pro';
function PathRightRail({
  streakDays,
  todayMinutes,
  upsell,
  onUpsellClick,
}: {
  streakDays: number;
  todayMinutes: number;
  upsell: UpsellMode;
  onUpsellClick?: () => void;
}) {
  return (
    <aside style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 32 }}>
      {/* Today — Pulse = streaks / daily practice per brand kit */}
      <div
        style={{
          position: 'relative',
          background: 'var(--sky)',
          borderRadius: 'var(--r-lg)',
          padding: '18px 20px',
          border: '2px solid var(--ink-1)',
          boxShadow: '0 4px 0 var(--sky-ink), 0 8px 20px rgba(42,29,58,0.1)',
          overflow: 'hidden',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}brand/mascots/pulse/excited.png`}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            right: -8,
            bottom: -6,
            width: 80,
            height: 'auto',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 4px 8px rgba(42,29,58,0.15))',
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--sky-ink)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 }}>
          today
        </div>
        <div style={{ fontFamily: 'var(--disp)', fontSize: 36, fontWeight: 400, color: 'var(--ink-1)', margin: '4px 0 2px', lineHeight: 1 }}>
          {todayMinutes} min
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          streak · <span style={{ color: 'var(--coral-ink)', fontWeight: 600 }}>🔥 {streakDays}</span>
        </div>
      </div>
      {upsell !== 'none' && onUpsellClick && (
        /* Mode-dependent upsell card. Fable mascot = encouragement / "hand on your shoulder" per brand kit. */
        <button
          onClick={onUpsellClick}
          style={{
            position: 'relative',
            textAlign: 'left',
            background: upsell === 'create_account' ? 'var(--mint)' : 'var(--lav)',
            borderRadius: 'var(--r-lg)',
            padding: '18px 20px',
            border: '2px solid var(--ink-1)',
            boxShadow: upsell === 'create_account'
              ? '0 4px 0 var(--mint-ink), 0 8px 20px rgba(42,29,58,0.1)'
              : '0 4px 0 var(--lav-ink), 0 8px 20px rgba(42,29,58,0.1)',
            cursor: 'pointer',
            font: 'inherit',
            color: 'var(--ink-1)',
            overflow: 'hidden',
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL}brand/mascots/fable/excited.png`}
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              right: -6,
              bottom: -6,
              width: 80,
              height: 'auto',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 8px rgba(42,29,58,0.15))',
            }}
          />
          {upsell === 'create_account' ? (
            <>
              <div style={{ fontSize: 11, color: 'var(--mint-ink)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                save your progress
              </div>
              <div
                style={{
                  fontFamily: 'var(--disp)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  fontWeight: 400,
                  margin: '4px 0 6px',
                  lineHeight: 1.15,
                  maxWidth: '70%',
                }}
              >
                Take it with you.
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: '68%' }}>
                Sign in with email — practice follows you to any device.
              </div>
              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--mint-ink)', letterSpacing: 0.2 }}>
                create account →
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--lav-ink)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                Fifths pro
              </div>
              <div
                style={{
                  fontFamily: 'var(--disp)',
                  fontStyle: 'italic',
                  fontSize: 18,
                  fontWeight: 400,
                  margin: '4px 0 6px',
                  lineHeight: 1.15,
                  maxWidth: '70%',
                }}
              >
                Unlimited history.
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: '68%' }}>
                Cloud sync, full analytics, weak-item auto-drills, Pro lessons.
              </div>
              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: 'var(--lav-ink)', letterSpacing: 0.2 }}>
                see plans →
              </div>
            </>
          )}
        </button>
      )}
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
  isLastInSegment: boolean;
  isFirstInSegment: boolean;
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
  isLastInSegment,
  isFirstInSegment,
  segmentTailwindColor,
  onClick,
  proLocked = false,
}: RiverNodeProps) {
  // Smooth sine curve — period ≈ 7.4 nodes, gives a continuous S-wave.
  const amplitude = mobile ? 70 : 130;
  const offset = Math.sin(idx * 0.85) * amplitude;
  const t = useBreathe(state === 'current');
  const pulse = state === 'current' ? 0.5 + 0.5 * Math.sin(t * 2.6) : 0;
  const bubbleBob = isStartNode ? Math.sin(t * 2.2) * 2 : 0;

  const isDone = state === 'done';
  const isCur = state === 'current';
  const isLocked = state === 'locked';
  const sz = mobile ? 62 : 82;

  const iconKind = isLocked ? 'lock' : getIconKind(level, isLastInSegment);
  const iconSize = mobile ? 28 : 36;

  const shadow = isDone
    ? `0 6px 0 ${palette.ink}, 0 10px 20px rgba(42,29,58,0.18)`
    : isCur
    ? `0 6px 0 ${palette.ink}, 0 10px 24px rgba(42,29,58,0.22)`
    : `0 5px 0 rgba(42,29,58,0.10)`;

  const mascotSize = mobile ? 90 : 150;
  const emptySideOffset = -offset * 1.5; // opposite side of the curve
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: mobile ? 22 : 18,
      }}
    >
      {isFirstInSegment && (
        // Segment-owned mascot — positioned on the empty side of the curve, behind the node.
        // Mapping: coral→Fable, mint→Noir, butter→Major, sky→Pulse, lav→Fable fallback.
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
            transform: `translate(calc(-50% + ${emptySideOffset}px), -50%)`,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 8px 16px rgba(42,29,58,0.18))',
            zIndex: 1,
          }}
        />
      )}
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        transform: `translateX(${offset}px)`,
        zIndex: 2,
      }}
    >
      {isStartNode && (
        <div
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
            color: 'var(--coral-ink)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          START
        </div>
      )}
      {isCur && (
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
            background: proLocked ? 'var(--butter-soft)' : isDone ? palette.bg : isCur ? palette.bg : 'var(--card)',
            border: `3px solid ${proLocked ? 'var(--butter-ink)' : isDone || isCur ? 'var(--ink-1)' : 'var(--ink-5)'}`,
            boxShadow: shadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: proLocked ? 'var(--butter-ink)' : isDone || isCur ? '#fff' : 'var(--ink-4)',
            fontFamily: 'var(--disp)',
            fontWeight: 600,
            fontSize: mobile ? 24 : 28,
            transform: isCur ? `scale(${1 + pulse * 0.03})` : 'none',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            padding: 0,
          }}
        >
          <LevelIcon kind={iconKind} size={iconSize} />
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
        <div
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            background: isCur ? 'var(--ink-1)' : 'rgba(255,255,255,0.85)',
            color: isCur ? 'var(--page)' : isDone ? 'var(--ink-1)' : 'var(--ink-3)',
            fontSize: mobile ? 11 : 12,
            fontWeight: 600,
            letterSpacing: 0.1,
            whiteSpace: 'nowrap',
            maxWidth: mobile ? 180 : 260,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: isCur ? '0 4px 12px rgba(42,29,58,0.2)' : 'none',
          }}
        >
          {level.name}
        </div>
      </div>
      </div>
    </div>
  );
}

type IconKind = 'star' | 'trophy' | 'headphones' | 'home' | 'lock';

function getIconKind(level: CurriculumLevel, isLastInSegment: boolean): IconKind {
  if (isLastInSegment) return 'trophy';
  if (level.type === 'acoustic') return 'headphones';
  if (level.segmentId === 'tonality') return 'home';
  return 'star';
}

function LevelIcon({ kind, size }: { kind: IconKind; size: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor' } as const;
  switch (kind) {
    case 'star':
      return (
        <svg {...common}>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6-5.9-3.4-5.9 3.4 1.3-6.6L2.5 9.4l6.6-.8z" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M7 4h10v2h3.5a1 1 0 011 1v2a4 4 0 01-4 4h-.3a5 5 0 01-4.2 3.9V19h3v2H8v-2h3v-2.1A5 5 0 016.8 13h-.3a4 4 0 01-4-4V7a1 1 0 011-1H7V4zm0 4H4v1a2 2 0 002 2h1V8zm10 0v3h1a2 2 0 002-2V8h-3z" />
        </svg>
      );
    case 'headphones':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 00-9 9v6a2 2 0 002 2h3v-8H5v-.2A7 7 0 1119 12v.2h-3V20h3a2 2 0 002-2v-6a9 9 0 00-9-9z" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <path d="M12 2.8L3 10v11h6v-6h6v6h6V10z" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...common}>
          <path d="M7 10V7a5 5 0 1110 0v3h1a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h1zm2 0h6V7a3 3 0 10-6 0v3z" />
        </svg>
      );
  }
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
      <span style={{ fontSize: mobile ? 22 : 28, flexShrink: 0 }}>{segment.icon}</span>
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
}) {
  return (
    <div style={{ paddingBottom: mobile ? 30 : 40 }}>
      {segments.map((segment, si) => {
        const palette = segmentColor(segment.color, si);
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
              {segment.levels.map((level, li) => {
                const proLocked = level.tier === 'pro' && !isPro;
                const state = resolveState(level, completed, completedArr, level.id === currentLevelId, debug);
                const isStart = level.id === currentLevelId;
                const isLast = li === segment.levels.length - 1;
                return (
                  <div key={level.id} ref={isStart ? currentNodeRef : undefined}>
                    <RiverNode
                      level={level}
                      idx={li}
                      state={state}
                      palette={palette}
                      mobile={mobile}
                      isStartNode={isStart}
                      isLastInSegment={isLast}
                      isFirstInSegment={li === 1}
                      segmentTailwindColor={segment.color}
                      proLocked={proLocked}
                      onClick={() => {
                        if (proLocked) { onProTap(level.id); return; }
                        if (state === 'locked') return;
                        onStart(level.id);
                      }}
                    />
                  </div>
                );
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
  streakDays = 0,
  todayMinutes = 0,
  bottomPadding = 0,
  isPro = false,
  isSignedIn = false,
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
                <span style={{ color: 'var(--coral-ink)', fontWeight: 600 }}>🔥 {streakDays}</span>
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
                  {currentSegment ? (
                    <>
                      {currentSegment.name}{' '}
                      <span style={{ fontStyle: 'italic', color: segPalette.ink }}>· path</span>
                    </>
                  ) : (
                    'Your path'
                  )}
                </h1>
                <p style={{ fontSize: 11, color: 'var(--ink-2)', margin: '2px 0 0' }}>
                  {completedLevels.length} of {totalLevels} cleared
                </p>
              </div>
              <Bean tone="coral" size="sm" onClick={() => onStart(currentLevelId)}>
                ▶ continue
              </Bean>
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: 18,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ minWidth: 0 }}>
                {currentSegment && (
                  <ColorPill
                    tone={
                      (['coral', 'lav', 'mint', 'butter', 'sky'] as const).find((c) => `var(--${c})` === segPalette.bg) ?? 'lav'
                    }
                    style={{ marginBottom: 8 }}
                  >
                    your path
                  </ColorPill>
                )}
                <h1
                  style={{
                    fontFamily: 'var(--disp)',
                    fontSize: 44,
                    fontWeight: 600,
                    letterSpacing: -0.02,
                    margin: 0,
                  }}
                >
                  {currentSegment ? (
                    <>
                      {currentSegment.name}{' '}
                      <span style={{ fontStyle: 'italic', color: segPalette.ink }}>· your path</span>
                    </>
                  ) : (
                    'Your path'
                  )}
                </h1>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '6px 0 0' }}>
                  {completedLevels.length} of {totalLevels} cleared
                </p>
              </div>
              <Bean tone="coral" size="md" onClick={() => onStart(currentLevelId)}>
                ▶ Continue
              </Bean>
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
                />
              </div>
            </div>
            {!mobile && (
              <PathRightRail
                streakDays={streakDays}
                todayMinutes={todayMinutes}
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
