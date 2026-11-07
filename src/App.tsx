import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine, INTERVALS, TRIADS, SEVENTH_CHORDS, MODES, SynthType } from './audioEngine';
import { CURRICULUM, getCurrentLevel, canUnlockNextLevel, getDisplayName, isProLesson, isSingOnlyLevel } from './curriculum';
import { AnalyticsEngine } from './analytics';
import { Answer, Question } from './types';
import { filterDiatonicItems } from './scaleContext';
import { realizeDiatonicSequence, sequenceStartDegreeForQuestion } from './lib/diatonic';
import { pickTapPattern, pickDictationPattern, gridToOnsets, encodeGrid } from './lib/rhythmPatterns';
import {
  loadMastery,
  saveMastery,
  recordAnswer as recordMasteryAnswer,
  pickItemWithDedupe,
  type MasteryMap,
} from './lib/itemMastery';
import { getDueItems, countDueItems, type DueItem } from './lib/spacedReview';
import { fadePrimerForMastery } from './lib/primer';
import { getCrossSegmentRecommendation } from './lib/recommendations';
import { createRotationState, nextRotatedTimbre, ROTATION_POOL, type TimbreRotationState } from './lib/timbreRotation';
import {
  buildInterleaveQueue,
  categoriesInQueue,
  categoryForLevel,
  type InterleaveCategory,
  type InterleaveItem,
} from './lib/interleaving';
import { type Checkpoint } from './lib/checkpoints';
import Path from './routes/Path';
import PracticeRoute from './routes/Practice';
import Results from './routes/Results';
import Settings, {
  DEFAULT_FEEDBACK_TIMING,
  DEFAULT_VOICE_RANGE,
  FEEDBACK_TIMING_DELAY_MS,
  SettingsState,
  VOICE_RANGE_BASE_OCTAVE,
  VOICE_RANGE_NOTES,
} from './routes/Settings';
import Stats from './routes/Stats';
import Onboarding from './routes/Onboarding';
import Paywall, { PlanId } from './routes/Paywall';
import { clearAllSessions, getStreakDays, getTodayMinutes, hasHistory, recordSession, timeSinceLastSession } from './lib/sessionStore';
import {
  flushSoon,
  resetCloudProgress,
  startSyncEngine,
  subscribeSyncState,
  signOut as syncSignOut,
  getCurrentUser,
  flushNow,
  type SyncState,
  type ProfileSnapshot,
} from './lib/syncEngine';
import { supabaseEnabled } from './lib/supabase';

const SIGNUP_PROMPTED_KEY = 'fifths.signupPrompted';
function readFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function writeFlag(key: string): void {
  try { localStorage.setItem(key, '1'); } catch { /* private mode */ }
}
import { PRODUCT_IDS, isPro, purchaseProduct, subscribeBilling } from './lib/billing';
import { trackEngagedAnon } from './lib/attribution';
import { phCapture } from './lib/posthog';
import LessonIntro from './components/LessonIntro';
import MasteryOverlay from './components/MasteryOverlay';
import StreakRecoverySheet from './components/StreakRecoverySheet';
import AuthSheet from './components/AuthSheet';
import BottomTabs, { BottomTabRoute } from './components/BottomTabs';
import { haptics } from './lib/haptics';
import { cancelStreakReminder, requestNotificationPermission, scheduleStreakReminder } from './lib/notifications';
import { getCheckpointIntro, getDailyReviewIntro, getLessonIntro, getMixedPracticeIntro } from './lib/lessonIntro';
import { parseRouteFromUrl, syncUrl, usePopStateRoute } from './lib/routing';
import { ThemePreference, loadThemePreference, useTheme } from './lib/theme';

import type { Route } from './lib/routing';
import type { AcousticKind, CurriculumLevel } from './types';

// Acoustic kinds that don't rely on a tonal center — they compare two raw pitches,
// so establishing a key with a scale reference would be misleading.
const NON_TONAL_ACOUSTIC_KINDS: AcousticKind[] = [
  'same_diff',
  'beating',
  'higher_lower',
  'consonance',
  'match_pitch',
];

// Question types whose audio already establishes their own tonal frame
// (cadence/progression always plays a key-anchored chord sequence; inversion / chord_extension /
// borrowed_chord / voicing run through buildDegreeChord which carries its own key context).
// These don't need a separate scale-reference preamble.
const SELF_KEYED_TYPES = new Set(['cadence', 'progression', 'chord_extension', 'borrowed_chord', 'voicing', 'inversion']);

// Rhythm levels are non-tonal — no scale reference, no key label.
const NON_TONAL_TYPES = new Set(['rhythm']);

type PrimerKind = NonNullable<CurriculumLevel['primerKind']>;

/**
 * Resolve the primer for a level, accounting for type-based defaults.
 * Self-keyed types (cadence/progression/etc.) and non-tonal types skip the primer.
 * Returns 'none' when no preamble should play.
 */
function defaultPrimerKindForLevel(level: CurriculumLevel): PrimerKind {
  const nonTonalAcoustic = level.type === 'acoustic' && level.acousticKind
    ? NON_TONAL_ACOUSTIC_KINDS.includes(level.acousticKind)
    : false;
  if (nonTonalAcoustic || NON_TONAL_TYPES.has(level.type)) return 'none';
  if (SELF_KEYED_TYPES.has(level.type)) return 'none';
  return 'scale';
}

function resolvePrimerKind(level: CurriculumLevel): PrimerKind {
  return level.primerKind ?? defaultPrimerKindForLevel(level);
}

/**
 * Play the primer for a key root and return the duration in seconds the caller
 * should wait before unlocking input. Returns 0 when no primer should play.
 */
async function playPrimer(rootNote: string, kind: PrimerKind): Promise<number> {
  switch (kind) {
    case 'none':
      return 0;
    case 'scale': {
      const { duration } = await audioEngine.playMajorScaleReference(rootNote, 4);
      return duration;
    }
    case 'cadence': {
      // I-IV-V-I authentic cadence — Krumhansl establishes a key faster than scale alone.
      await audioEngine.playCadence(rootNote, 'authentic', 'major');
      // playChordSequence uses ~0.75s per chord × 4 chords = ~3s; mark a similar wait.
      return 3.0;
    }
    case 'cadence_then_scale': {
      await audioEngine.playCadence(rootNote, 'authentic', 'major');
      await new Promise((r) => setTimeout(r, 3000));
      const { duration } = await audioEngine.playMajorScaleReference(rootNote, 4);
      return duration;
    }
    case 'drone': {
      // Brief tonic drone (~3s) to anchor the key by tonic alone — desirable difficulty
      // for advanced lessons where a full primer would be over-scaffolding.
      await audioEngine.toggleDrone(rootNote, true);
      await new Promise((r) => setTimeout(r, 3000));
      await audioEngine.toggleDrone(rootNote, false);
      return 0;
    }
  }
}

interface LessonConfig {
  establishTonality: boolean;
  maxQuestions: number;
  questionsPerKey: number;
}

function getLessonConfig(level: CurriculumLevel): LessonConfig {
  const nonTonalAcoustic = level.type === 'acoustic' && level.acousticKind
    ? NON_TONAL_ACOUSTIC_KINDS.includes(level.acousticKind)
    : false;
  const nonTonal = nonTonalAcoustic || NON_TONAL_TYPES.has(level.type);
  const establishTonality = level.establishTonality ?? !nonTonal;
  // Default question count scales with item-set size (4 questions per item, clamped 6..14).
  // A 2-item lesson defaults to 8 not 15 — fixes the "feels long and repetitive" feedback.
  // Lessons with itemGroups (e.g. tonic vs not_tonic) use the bucket count, not raw items.
  const effectiveItemCount =
    level.itemGroups ? Object.keys(level.itemGroups).length : Math.max(1, level.items.length);
  const sizedDefault = Math.min(14, Math.max(6, effectiveItemCount * 4));
  if (!establishTonality) {
    const maxQuestions = level.maxQuestions ?? sizedDefault;
    return { establishTonality: false, maxQuestions, questionsPerKey: maxQuestions };
  }
  const maxQuestions = level.maxQuestions ?? sizedDefault;
  // For tonal lessons with very small item sets, drop questionsPerKey from 5 → 3
  // so a single key block doesn't compound the repetition feel.
  const sizedQpK = effectiveItemCount <= 2 ? 3 : 5;
  const questionsPerKey = level.questionsPerKey ?? sizedQpK;
  return { establishTonality: true, maxQuestions, questionsPerKey };
}

function resolveGroupedAnswer(item: string, itemGroups?: Record<string, string[]>): string {
  if (!itemGroups) return item;
  for (const [bucket, members] of Object.entries(itemGroups)) {
    if (members.includes(item)) return bucket;
  }
  return item;
}

const STORAGE_KEY = 'fifths.v1';

type Persisted = {
  completedLevels: string[];
  settings: SettingsState;
  hasSeenLanding: boolean;
  hasOnboarded: boolean;
  hasEverPracticed: boolean;
  debugMode: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  synth: 'piano',
  playbackSpeed: 1,
  drone: false,
  autoPlay: true,
};

function loadPersisted(): Persisted {
  const devDefault = Boolean(import.meta.env.DEV);
  const fallback: Persisted = {
    completedLevels: [],
    settings: DEFAULT_SETTINGS,
    hasSeenLanding: false,
    hasOnboarded: false,
    hasEverPracticed: false,
    debugMode: devDefault,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      completedLevels: Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      hasSeenLanding: Boolean(parsed.hasSeenLanding),
      hasOnboarded: Boolean(parsed.hasOnboarded),
      hasEverPracticed: Boolean(parsed.hasEverPracticed),
      debugMode: typeof parsed.debugMode === 'boolean' ? parsed.debugMode : devDefault,
    };
  } catch {
    return fallback;
  }
}

function savePersisted(p: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// `?start=<lessonId>` deep link from the marketing site's tools and blog posts.
// Only free lessons qualify, so a link can't be used to skip the paywall.
function readStartParam(): string | null {
  try {
    const id = new URLSearchParams(window.location.search).get('start');
    const level = id ? CURRICULUM.find((l) => l.id === id) : undefined;
    return level && !isProLesson(level) ? level.id : null;
  } catch {
    return null;
  }
}

export default function App() {
  const initial = loadPersisted();
  const [deepLinkStart] = useState(readStartParam);

  // New visitors skip the in-app landing page: they already chose to try the
  // app on fifths.io, and a second sales page lost most of them in seconds.
  const defaultRoute: Route = !initial.hasOnboarded && !deepLinkStart ? 'onboarding' : 'path';
  const [route, setRouteState] = useState<Route>(parseRouteFromUrl(defaultRoute));
  const setRoute = (r: Route) => {
    setRouteState(r);
    syncUrl(r);
  };
  usePopStateRoute(setRouteState);

  // On first render, make sure URL reflects the route we picked (for Landing/onboarding flows).
  useEffect(() => {
    syncUrl(route, true, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [completedLevels, setCompletedLevels] = useState<string[]>(initial.completedLevels);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsState>(initial.settings);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(initial.hasOnboarded);
  const [hasEverPracticed, setHasEverPracticed] = useState<boolean>(initial.hasEverPracticed);
  const [theme, setTheme] = useState<ThemePreference>(() => loadThemePreference());
  useTheme(theme);

  // Session state
  const [analytics] = useState(() => new AnalyticsEngine());
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [currentScaleRoot, setCurrentScaleRoot] = useState<string>('C');
  const [scaleRoots, setScaleRoots] = useState<string[]>([]);
  const [isPlayingScale, setIsPlayingScale] = useState(false);
  const [lastKeyChangeQuestion, setLastKeyChangeQuestion] = useState<number>(-1);
  const [introDismissed, setIntroDismissed] = useState(false);
  // True when the user has answered but feedback hasn't been revealed yet (delayed_short mode).
  // Kept separate from showFeedback so Practice can render a "thinking..." indicator
  // without triggering the green/red feedback layout.
  const [feedbackPending, setFeedbackPending] = useState(false);
  const scaleLockRef = useRef(false);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  // Pending-feedback reveal timer. Cleaned up on unmount, route change, and handleNext.
  const pendingFeedbackTimerRef = useRef<number | null>(null);
  const [debugMode, setDebugMode] = useState(initial.debugMode);
  const [syncState, setSyncState] = useState<SyncState>('disabled');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showFirstLessonPrompt, setShowFirstLessonPrompt] = useState(false);
  const [proActive, setProActive] = useState<boolean>(isPro());
  useEffect(() => subscribeBilling(() => setProActive(isPro())), []);
  const completedLevelsRef = useRef<string[]>(initial.completedLevels);
  const settingsRef = useRef<SettingsState>(initial.settings);
  const hasEverPracticedRef = useRef<boolean>(initial.hasEverPracticed);
  // Per-item mastery map (Leitner box state + recent results buffer per (levelId, item)).
  // Used by the weighted picker in generateQuestion AND the Daily Review tile on Path.
  // Loaded from localStorage on init; saved on every answer.
  const masteryRef = useRef<MasteryMap>(loadMastery());
  // Adjacent-question dedupe ring buffer (most-recent-last). Reset on startSession.
  const recentItemTypesRef = useRef<string[]>([]);
  // Timbre-rotation state. Engages mid-session once accuracy crosses the floor on a
  // not-yet-completed lesson. Reset on startSession.
  const timbreRotationRef = useRef<TimbreRotationState>(createRotationState());
  // Set of `${levelId}::${item}` keys already seen in the current session — feeds the
  // recency bonus in getItemWeight so untouched items don't vanish under up-weighting.
  const seenThisSessionRef = useRef<Set<string>>(new Set());
  // Daily Review session state. When non-null + cursor < queue.length, the practice
  // orchestrator overrides currentLevel + the random item pick with the queued due item.
  // null = no review session active.
  const [reviewSession, setReviewSession] = useState<{ queue: DueItem[]; cursor: number } | null>(null);
  const reviewSessionRef = useRef(reviewSession);
  useEffect(() => { reviewSessionRef.current = reviewSession; }, [reviewSession]);
  // Mixed Practice / interleaving session (#5). Same shape as reviewSession but the queue
  // is sampled from completed lessons rather than the Leitner schedule, and the user must
  // tap a category before answering each question (contextual-interference benefit).
  // `label` and `kind` distinguish the global Mixed-Practice tile from a curated checkpoint
  // session — used for the intro page title and copy.
  const [interleaveSession, setInterleaveSession] = useState<
    | { queue: InterleaveItem[]; cursor: number; kind: 'global'; label: null }
    | { queue: InterleaveItem[]; cursor: number; kind: 'checkpoint'; label: string }
    | null
  >(null);
  const interleaveSessionRef = useRef(interleaveSession);
  useEffect(() => { interleaveSessionRef.current = interleaveSession; }, [interleaveSession]);
  // Tracks whether the user has tapped any category for the *current* interleave question.
  // Reset on each handleNext. Once true, the answer chips become available.
  const [interleaveCategoryPicked, setInterleaveCategoryPicked] = useState<boolean>(false);
  // The category the user actually tapped (right or wrong). Used to render a soft hint
  // "actually a [correct]" when wrong. Null until they tap.
  const [interleaveCategoryAttempt, setInterleaveCategoryAttempt] = useState<InterleaveCategory | null>(null);
  useEffect(() => { completedLevelsRef.current = completedLevels; }, [completedLevels]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { hasEverPracticedRef.current = hasEverPracticed; }, [hasEverPracticed]);
  // Each load applies the cloud profile over local settings, so changes have to reach
  // the cloud or they'd revert.
  useEffect(() => { flushSoon(); }, [settings, completedLevels]);
  const [sessionStartedAt, setSessionStartedAt] = useState<number>(0);
  const [statsTick, setStatsTick] = useState(0);
  const [masteryLevelId, setMasteryLevelId] = useState<string | null>(null);
  const [streakSheetDismissed, setStreakSheetDismissed] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const tabsActive: BottomTabRoute | null =
    route === 'path' ? 'path' : route === 'stats' ? 'stats' : route === 'settings' ? 'settings' : null;

  const isSignedIn = userEmail !== null;
  const ANON_LESSON_LIMIT = 7;
  const pendingPurchaseRef = useRef<string | null>(null);
  const pendingStartRef = useRef<string | null>(null);
  // In review or interleave mode, currentLevel flips per-question to the queue's current
  // item's source level. Each question is sampled from a different lesson.
  const reviewActiveItem =
    reviewSession && reviewSession.cursor < reviewSession.queue.length
      ? reviewSession.queue[reviewSession.cursor]
      : null;
  const interleaveActiveItem =
    interleaveSession && interleaveSession.cursor < interleaveSession.queue.length
      ? interleaveSession.queue[interleaveSession.cursor]
      : null;
  const queueActiveLevelId = reviewActiveItem?.levelId ?? interleaveActiveItem?.levelId ?? null;
  const currentLevel = queueActiveLevelId
    ? CURRICULUM.find((l) => l.id === queueActiveLevelId) ?? getCurrentLevel(completedLevels, proActive, { skipSinging: settings.skipSinging })
    : selectedLevelId
    ? CURRICULUM.find((l) => l.id === selectedLevelId) ?? getCurrentLevel(completedLevels, proActive, { skipSinging: settings.skipSinging })
    : getCurrentLevel(completedLevels, proActive, { skipSinging: settings.skipSinging });
  const lessonCfg = getLessonConfig(currentLevel);
  const stats = analytics.getSessionStats();

  // Persist on change
  useEffect(() => {
    savePersisted({
      completedLevels,
      settings,
      hasSeenLanding: true,
      hasOnboarded,
      hasEverPracticed,
      debugMode,
    });
  }, [completedLevels, settings, hasOnboarded, hasEverPracticed, debugMode]);

  // Wire audio settings
  useEffect(() => {
    audioEngine.setSynthType(settings.synth as SynthType);
    audioEngine.setPlaybackSpeed(settings.playbackSpeed);
  }, [settings.synth, settings.playbackSpeed]);

  // Drone follows setting + current scale root
  useEffect(() => {
    if (route === 'practice' && settings.drone) {
      audioEngine.toggleDrone(currentScaleRoot, true);
      return () => {
        audioEngine.toggleDrone(currentScaleRoot, false);
      };
    }
  }, [route, settings.drone, currentScaleRoot]);

  // Debug mode (Ctrl/Cmd + K)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setDebugMode((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Cloud sync engine — magic-link auth + Supabase profile/sessions sync.
  useEffect(() => {
    const getProfile = (): ProfileSnapshot => ({
      email: getCurrentUser()?.email ?? null,
      synth: settingsRef.current.synth,
      playbackSpeed: settingsRef.current.playbackSpeed,
      drone: settingsRef.current.drone,
      autoPlay: settingsRef.current.autoPlay,
      voiceRange: settingsRef.current.voiceRange ?? null,
      singDifficulty: settingsRef.current.singDifficulty ?? null,
      completedLevels: completedLevelsRef.current,
      hasEverPracticed: hasEverPracticedRef.current,
      mastery: masteryRef.current as unknown as Record<string, unknown>,
    });
    const applyProfile = (p: ProfileSnapshot) => {
      const withCloudSettings = (curr: SettingsState): SettingsState => ({
        ...curr,
        synth: p.synth as SynthType,
        playbackSpeed: p.playbackSpeed,
        drone: p.drone,
        autoPlay: p.autoPlay,
        voiceRange: (p.voiceRange as SettingsState['voiceRange']) ?? curr.voiceRange,
        singDifficulty: (p.singDifficulty as SettingsState['singDifficulty']) ?? curr.singDifficulty,
      });
      const withCloudLevels = (curr: string[]) => Array.from(new Set([...curr, ...p.completedLevels]));
      // Update the refs now rather than on the next render: the sync pushes straight
      // after this, and stale refs would overwrite the cloud with this device's older state.
      settingsRef.current = withCloudSettings(settingsRef.current);
      completedLevelsRef.current = withCloudLevels(completedLevelsRef.current);
      setSettings(withCloudSettings);
      setCompletedLevels(withCloudLevels);
      if (p.hasEverPracticed) {
        hasEverPracticedRef.current = true;
        setHasEverPracticed(true);
      }
      // Merge cloud mastery on top of local (cloud wins per key) so cross-device review queues
      // stay consistent. Last-write-wins is fine here — recordAnswer rebuilds on each answer.
      if (p.mastery && typeof p.mastery === 'object') {
        masteryRef.current = { ...masteryRef.current, ...(p.mastery as MasteryMap) };
        saveMastery(masteryRef.current);
      }
    };
    startSyncEngine({ getProfile, applyProfile });
    const unsub = subscribeSyncState((s) => {
      setSyncState(s);
      const email = getCurrentUser()?.email ?? null;
      setUserEmail(email);
      // Resume any deferred intent the user queued before signing in.
      if (email && pendingStartRef.current) {
        const id = pendingStartRef.current;
        pendingStartRef.current = null;
        setShowAuth(false);
        void startSession(id);
      }
      if (email && pendingPurchaseRef.current) {
        const id = pendingPurchaseRef.current;
        pendingPurchaseRef.current = null;
        setShowAuth(false);
        void purchaseProduct(id);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Session control ---------- */

  const startSession = useCallback(
    async (levelId: string, opts: { deferAudio?: boolean } = {}) => {
      // Without a user gesture (deep link on page load) the audio context can't
      // start yet; the lesson intro's continue tap starts it instead.
      if (!opts.deferAudio) await audioEngine.initialize();
      analytics.clearAnswers();
      setSelectedLevelId(levelId);
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setScaleRoots([]);
      setIsPlayingScale(false);
      setLastKeyChangeQuestion(-1);
      setIntroDismissed(false);
      setSessionStartedAt(Date.now());
      // Reset per-session sampling state (dedupe buffer + seen-this-session set + timbre rotation).
      recentItemTypesRef.current = [];
      seenThisSessionRef.current = new Set();
      timbreRotationRef.current = createRotationState();
      setInterleaveCategoryPicked(false);
      setInterleaveCategoryAttempt(null);
      setRoute('practice');
      cancelStreakReminder().catch(() => {});
      const level = CURRICULUM.find((l) => l.id === levelId);
      phCapture('session_started', {
        level_id: levelId,
        level_type: level?.type ?? null,
        is_first_ever_session: !hasEverPracticed,
        is_signed_in: isSignedIn,
        is_pro: proActive,
        completed_levels_count: completedLevels.length,
        is_repeat_of_level: completedLevels.includes(levelId),
      });
    },
    [analytics, hasEverPracticed, isSignedIn, proActive, completedLevels],
  );

  // Wrap startSession to enforce the anonymous lesson cap.
  const guardedStartSession = useCallback(
    (levelId: string) => {
      if (!isSignedIn && completedLevels.length >= ANON_LESSON_LIMIT) {
        pendingStartRef.current = levelId;
        setShowAuth(true);
        return;
      }
      void startSession(levelId);
    },
    [isSignedIn, completedLevels.length, startSession],
  );

  useEffect(() => {
    if (!deepLinkStart) return;
    setHasOnboarded(true);
    phCapture('deep_link_start', { level_id: deepLinkStart });
    if (!isSignedIn && completedLevels.length >= ANON_LESSON_LIMIT) return;
    void startSession(deepLinkStart, { deferAudio: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Start a Daily Review session. Pulls due items from the Leitner schedule, picks the source
   * level of the first item as a starting point, and flips into review mode where each question
   * is forced to the next due-item value (cursor advances on handleNext).
   */
  const startReviewSession = useCallback(async () => {
    const due = getDueItems(masteryRef.current, completedLevels, Date.now(), 10);
    if (due.length === 0) return;
    setReviewSession({ queue: due, cursor: 0 });
    // Reuse startSession to set up the practice route + audio + analytics; the levelId is just
    // the queue's first item's source level (currentLevel will flip per-question via reviewSession).
    void startSession(due[0].levelId);
  }, [completedLevels, startSession]);

  /**
   * Start a Mixed Practice (interleaving) session. Samples 10 (level, item) tuples across
   * the user's completed lessons with category-level dedupe. The Practice route gates answer
   * chips behind a category-pick step per question (contextual-interference benefit).
   */
  const startInterleaveSession = useCallback(async () => {
    const queue = buildInterleaveQueue(completedLevels, 10);
    if (queue.length < 2) return;
    setInterleaveSession({ queue, cursor: 0, kind: 'global', label: null });
    setInterleaveCategoryPicked(false);
    setInterleaveCategoryAttempt(null);
    void startSession(queue[0].levelId);
  }, [completedLevels, startSession]);

  /**
   * Start a curated checkpoint session — same engine as Mixed Practice, but sources are
   * limited to the checkpoint's `levelIds` and the intro/title reflect the checkpoint name.
   * If the checkpoint's lessons all share a single category (e.g. Fourths & Fifths Mix is
   * 100% interval), the category-pick gate auto-passes — there's nothing to disambiguate.
   */
  const startCheckpointSession = useCallback(
    async (cp: Checkpoint) => {
      const queue = buildInterleaveQueue(cp.levelIds, 10);
      if (queue.length < 2) return;
      setInterleaveSession({ queue, cursor: 0, kind: 'checkpoint', label: cp.name });
      setInterleaveCategoryPicked(false);
      setInterleaveCategoryAttempt(null);
      void startSession(queue[0].levelId);
    },
    [startSession],
  );

  const generateQuestion = useCallback(async () => {
    const level = currentLevel;
    let playedNotes: string[] = [];
    let itemType: string;
    let correctAnswer: string;
    let rootNote: string;
    let acousticSemis: number | undefined;
    let pendingRhythmOnsets: number[] | undefined;
    let pendingRhythmGrid: boolean[] | undefined;

    // Review / interleave mode override: when a queue-driven session is active, the queue
    // carries (levelId, item) tuples picked by the scheduler / sampler. We force the item
    // to that value and skip the weighted/dedupe picker. The orchestrator already swapped
    // `currentLevel` to the queue item's source level so playback paths "just work".
    const rs = reviewSessionRef.current;
    const is = interleaveSessionRef.current;
    const forcedItem =
      rs && rs.cursor < rs.queue.length && rs.queue[rs.cursor].levelId === level.id
        ? rs.queue[rs.cursor].item
        : is && is.cursor < is.queue.length && is.queue[is.cursor].levelId === level.id
        ? is.queue[is.cursor].item
        : null;
    const pickItem = (items: string[]): string => {
      if (forcedItem !== null) return forcedItem;
      return pickItemWithDedupe(level.id, items, recentItemTypesRef.current, masteryRef.current, seenThisSessionRef.current);
    };

    // Wait until any previous playback (scale reference, previous note) is fully done
    // before triggering the quiz sound. Prevents scale + question-note overlap.
    while (audioEngine.isPlaybackActive()) {
      await new Promise((r) => setTimeout(r, 40));
    }

    // Timbre rotation (#9) — once the learner is past acquisition on a not-yet-completed
    // lesson, rotate the synth question-to-question to break timbre-specific learning.
    // Restored to the user's chosen synth at endSession.
    // Read fresh: this callback is memoised on level and key, so the render's `stats` is stale.
    const { totalQuestions, correctAnswers } = analytics.getSessionStats();
    const sessionAccuracyPct = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const isLevelCompleted = completedLevels.includes(level.id);
    const rotatedSynth = nextRotatedTimbre(level, isLevelCompleted, totalQuestions, sessionAccuracyPct, timbreRotationRef.current);
    if (rotatedSynth) {
      audioEngine.preloadSynths(ROTATION_POOL);
      audioEngine.setSynthType(rotatedSynth);
    }

    if (level.type === 'scale_degree') {
      const randomDegree = pickItem(level.items);
      itemType = randomDegree;
      correctAnswer = resolveGroupedAnswer(randomDegree, level.itemGroups);
      rootNote = currentScaleRoot;
      try {
        playedNotes = await audioEngine.playScaleDegree(currentScaleRoot, parseInt(randomDegree) - 1, level.context!);
      } catch (err) {
        console.error('playScaleDegree error:', err);
      }
    } else if (level.type === 'acoustic') {
      rootNote = currentScaleRoot;
      try {
        if (!level.acousticKind) throw new Error(`acoustic level ${level.id} missing acousticKind`);
        if (level.acousticKind === 'match_pitch') {
          const vocalNotes = VOICE_RANGE_NOTES[settings.voiceRange ?? DEFAULT_VOICE_RANGE];
          const target = vocalNotes[Math.floor(Math.random() * vocalNotes.length)];
          itemType = 'match';
          correctAnswer = target;
          playedNotes = await audioEngine.playNote(target, 1.2);
        } else if (level.acousticKind === 'sing_sequence') {
          const shape = level.sequenceShape ?? [0, 1, 0, -1, 0];
          const scale = level.sequenceScale ?? 'major';
          const keyRoot = level.sequenceKeyRoot ?? 'C';
          const transposeStep = level.sequenceTransposeStep ?? 1;
          const startDegree = sequenceStartDegreeForQuestion(stats.totalQuestions, transposeStep);
          const baseOctave = VOICE_RANGE_BASE_OCTAVE[settings.voiceRange ?? DEFAULT_VOICE_RANGE];
          const sequence = realizeDiatonicSequence(keyRoot, scale, startDegree, shape, baseOctave);
          itemType = `seq_${startDegree}`;
          correctAnswer = sequence.join(',');
          playedNotes = await audioEngine.playSequence(sequence);
        } else {
          const answer = pickItem(level.items);
          itemType = answer;
          correctAnswer = answer;
          const acoustic = await audioEngine.playAcoustic(level.acousticKind, answer, rootNote);
          playedNotes = acoustic.notes;
          acousticSemis = acoustic.semis;
        }
      } catch (err) {
        console.error('playAcoustic error:', err);
        itemType = 'match';
        correctAnswer = 'A4';
      }
    } else if (level.type === 'cadence') {
      const pick = pickItem(level.items);
      itemType = pick;
      correctAnswer = pick;
      rootNote = currentScaleRoot;
      try {
        playedNotes = await audioEngine.playCadence(
          rootNote,
          pick as 'authentic' | 'plagal' | 'half' | 'deceptive',
          level.cadenceMode ?? 'major',
        );
      } catch (err) { console.error('playCadence error:', err); }
    } else if (level.type === 'inversion') {
      const position = pickItem(level.items);
      const qualities = level.inversionQualities ?? (level.inversionKind === 'seventh' ? ['dominant_7'] : ['major']);
      const quality = qualities[Math.floor(Math.random() * qualities.length)];
      itemType = position;
      correctAnswer = position;
      rootNote = currentScaleRoot;
      try {
        playedNotes = await audioEngine.playInversion(
          rootNote,
          quality as keyof typeof TRIADS | keyof typeof SEVENTH_CHORDS,
          position as 'root' | 'first' | 'second' | 'third',
          level.inversionKind ?? 'triad',
        );
      } catch (err) { console.error('playInversion error:', err); }
    } else if (level.type === 'progression') {
      const pick = pickItem(level.items);
      itemType = pick;
      correctAnswer = pick;
      rootNote = currentScaleRoot;
      try {
        playedNotes = await audioEngine.playProgression(rootNote, pick);
      } catch (err) { console.error('playProgression error:', err); }
    } else if (level.type === 'chord_extension') {
      const pick = pickItem(level.items);
      itemType = pick;
      correctAnswer = pick;
      rootNote = currentScaleRoot;
      try {
        playedNotes = await audioEngine.playChordExtension(
          rootNote,
          level.extensionTarget ?? 'V',
          pick as '9' | '11' | '13' | '7b9' | '7s9' | '7s11' | '7b13',
        );
      } catch (err) { console.error('playChordExtension error:', err); }
    } else if (level.type === 'borrowed_chord') {
      const pick = pickItem(level.items);
      itemType = pick;
      correctAnswer = pick;
      rootNote = currentScaleRoot;
      try {
        playedNotes = await audioEngine.playBorrowedChord(
          rootNote,
          pick as 'iv' | 'bIII' | 'bVI' | 'bVII' | 'bII',
        );
      } catch (err) { console.error('playBorrowedChord error:', err); }
    } else if (level.type === 'voicing') {
      const pick = pickItem(level.items);
      itemType = pick;
      correctAnswer = pick;
      rootNote = currentScaleRoot;
      try {
        playedNotes = await audioEngine.playVoicing(
          rootNote,
          level.voicingChord ?? 'maj7',
          pick as 'closed' | 'drop2' | 'quartal' | 'upper_structure',
        );
      } catch (err) { console.error('playVoicing error:', err); }
    } else if (level.type === 'rhythm') {
      const bpm = level.rhythmBpm ?? 100;
      rootNote = currentScaleRoot;
      const kind = level.rhythmKind ?? 'same_diff';
      try {
        if (kind === 'same_diff') {
          // Two patterns played in sequence — same or different. Use the same pattern bank.
          const pattern = pickTapPattern();
          const willDiffer = Math.random() < 0.5;
          // For "different" mode, swap one onset. Cheap mutation.
          const second = willDiffer
            ? pattern.onsets.map((o, i) => (i === 0 ? o : o + (Math.random() < 0.5 ? 0.25 : -0.25))).map((o) => Math.max(0, o))
            : pattern.onsets.slice();
          itemType = willDiffer ? 'different' : 'same';
          correctAnswer = itemType;
          // Play first pattern, then second after a 1-bar gap.
          const beatSec = 60 / bpm;
          const offsetBeats = 4.5; // one bar of rest then next pattern
          const allOnsets = [...pattern.onsets, ...second.map((o) => o + offsetBeats)];
          const r = await audioEngine.playRhythmOnsets(allOnsets, bpm, [0, offsetBeats]);
          playedNotes = [];
          void r;
          void beatSec;
        } else if (kind === 'tap_back') {
          // No audio here — RhythmTapPad plays the pattern itself (listen → ready → replay+tap).
          // We just persist the pattern data on the Question so the pad can use it.
          const pattern = pickTapPattern();
          itemType = pattern.id;
          correctAnswer = 'matched';
          playedNotes = [];
          // Stash for the Question construction below.
          pendingRhythmOnsets = pattern.onsets;
        } else if (kind === 'subdivision') {
          const pick = pickItem(level.items);
          itemType = pick;
          correctAnswer = pick;
          await audioEngine.playSubdivisionPattern(pick as 'eighths' | 'sixteenths' | 'triplets' | 'dotted', bpm);
          playedNotes = [];
        } else if (kind === 'meter') {
          const pick = pickItem(level.items);
          itemType = pick;
          correctAnswer = pick;
          await audioEngine.playMeterPattern(pick as '2/4' | '3/4' | '4/4' | '6/8' | '5/4', bpm);
          playedNotes = [];
        } else if (kind === 'dictation') {
          const pattern = pickDictationPattern();
          itemType = pattern.id;
          correctAnswer = encodeGrid(pattern.cells);
          const onsets = gridToOnsets(pattern.cells);
          await audioEngine.playRhythmOnsets(onsets, bpm, [0]);
          playedNotes = [];
          pendingRhythmGrid = pattern.cells;
        } else {
          itemType = 'unknown';
          correctAnswer = 'unknown';
        }
      } catch (err) {
        console.error('rhythm error:', err);
        itemType = 'unknown';
        correctAnswer = 'unknown';
      }
    } else {
      // Two-stage pick: first choose the answer TYPE with weighted-mastery + dedupe (so the
      // user's weak items appear more often AND we don't repeat the same item back-to-back),
      // then choose a root for that type from the diatonic list.
      const chosenType = pickItem(level.items);
      const diatonicItems = filterDiatonicItems(level.items, level.type, currentScaleRoot, level.scaleDegrees);
      const matching = diatonicItems.filter((d) => d.type === chosenType);
      const pick = matching.length > 0
        ? matching[Math.floor(Math.random() * matching.length)]
        : diatonicItems[Math.floor(Math.random() * diatonicItems.length)];
      rootNote = pick.root;
      itemType = pick.type;
      correctAnswer = itemType;
      try {
        switch (level.type) {
          case 'interval':
            playedNotes = await audioEngine.playInterval(
              rootNote,
              itemType as keyof typeof INTERVALS,
              level.intervalDirection || 'ascending',
              level.intervalPresentation || 'melodic',
            );
            break;
          case 'triad':
            playedNotes = await audioEngine.playTriad(rootNote, itemType as keyof typeof TRIADS);
            break;
          case 'seventh_chord':
            playedNotes = await audioEngine.playSeventhChord(rootNote, itemType as keyof typeof SEVENTH_CHORDS);
            break;
          case 'mode':
            playedNotes = await audioEngine.playMode(rootNote, itemType as keyof typeof MODES);
            break;
        }
      } catch (err) {
        console.error('audio error:', err);
      }
    }

    const modes = level.responseModes ?? ['select'];
    let responseMode: typeof modes[number] =
      modes.length === 1
        ? modes[0]
        : Math.random() < (level.singProbability ?? 0.5)
        ? 'sing'
        : 'select';
    // Rhythm levels override responseMode based on their kind. tap_back → 'tap', dictation → 'grid', everything else → 'select'.
    if (level.type === 'rhythm') {
      const k = level.rhythmKind ?? 'same_diff';
      responseMode = k === 'tap_back' ? 'tap' : k === 'dictation' ? 'grid' : 'select';
    }

    const singTargets =
      responseMode === 'sing'
        ? level.acousticKind === 'sing_sequence'
          ? playedNotes
          : [correctAnswer]
        : undefined;

    // Rhythm-specific question fields.
    type RhythmExtras = { rhythmKind?: typeof level.rhythmKind; rhythmBpm?: number; targetOnsets?: number[]; targetGrid?: boolean[] };
    const rhythmExtras: RhythmExtras = level.type === 'rhythm'
      ? {
          rhythmKind: level.rhythmKind,
          rhythmBpm: level.rhythmBpm ?? 100,
          targetOnsets: typeof pendingRhythmOnsets !== 'undefined' ? pendingRhythmOnsets : undefined,
          targetGrid: typeof pendingRhythmGrid !== 'undefined' ? pendingRhythmGrid : undefined,
        }
      : {};

    // Update the dedupe ring buffer (most-recent-last, max 3) and the seen-this-session set.
    recentItemTypesRef.current = [...recentItemTypesRef.current, itemType].slice(-3);
    seenThisSessionRef.current.add(`${level.id}::${itemType}`);

    setCurrentQuestion({
      id: `q_${Date.now()}`,
      type: level.type,
      correctAnswer,
      itemType,
      rootNote,
      playedNotes,
      timestamp: Date.now(),
      context: level.context,
      intervalDirection: level.intervalDirection,
      intervalPresentation: level.intervalPresentation,
      acousticKind: level.acousticKind,
      acousticSemis,
      responseMode,
      targetNotes: singTargets,
      ...rhythmExtras,
    });
    setSelectedAnswer(null);
    setShowFeedback(false);
    setQuestionStartTime(Date.now());
  }, [currentLevel, currentScaleRoot]);

  const endSession = useCallback(() => {
    const finalStats = analytics.getSessionStats();
    // Restore the user's chosen synth in case timbre rotation (#9) swapped it mid-session.
    if (timbreRotationRef.current.rotating) {
      audioEngine.setSynthType(settings.synth as SynthType);
      timbreRotationRef.current = createRotationState();
    }
    // Queue-driven sessions (review / interleave) don't unlock anything — they pull from
    // already-completed lessons.
    const inReview = reviewSessionRef.current !== null;
    const inInterleave = interleaveSessionRef.current !== null;
    const inQueueSession = inReview || inInterleave;
    if (inReview) setReviewSession(null);
    if (inInterleave) setInterleaveSession(null);
    setInterleaveCategoryPicked(false);
    setInterleaveCategoryAttempt(null);
    const unlocked = !inQueueSession && canUnlockNextLevel(currentLevel.id, finalStats.accuracy);
    const firstUnlock = unlocked && !completedLevels.includes(currentLevel.id);
    if (unlocked) {
      setCompletedLevels((prev) => (prev.includes(currentLevel.id) ? prev : [...prev, currentLevel.id]));
    }
    if (finalStats.totalQuestions > 0) {
      const startedAt = sessionStartedAt || Date.now();
      const endedAt = Date.now();
      recordSession({
        levelId: currentLevel.id,
        startedAt,
        endedAt,
        answers: analytics.getAnswers(),
        stats: finalStats,
        unlocked,
      });
      setStatsTick((n) => n + 1);
      // First-session prompt for notifications, then schedule reminder.
      if (!hasEverPracticed) {
        requestNotificationPermission().then(() => scheduleStreakReminder(22)).catch(() => {});
        trackEngagedAnon();
      } else {
        scheduleStreakReminder(22).catch(() => {});
      }
      setHasEverPracticed(true);
      phCapture('session_completed', {
        level_id: currentLevel.id,
        level_type: currentLevel.type,
        accuracy: finalStats.accuracy,
        total_questions: finalStats.totalQuestions,
        duration_ms: endedAt - startedAt,
        unlocked,
        is_first_ever_session: !hasEverPracticed,
        is_first_completion_of_level: firstUnlock,
        completed_levels_count: completedLevels.length + (firstUnlock ? 1 : 0),
        is_signed_in: isSignedIn,
        is_pro: proActive,
      });
      if (firstUnlock) {
        phCapture('level_unlocked', {
          level_id: currentLevel.id,
          level_type: currentLevel.type,
          accuracy: finalStats.accuracy,
          completed_levels_count: completedLevels.length + 1,
        });
      }
      // Ask signed-out learners once, right after a finished lesson, so they
      // land on the email list. Skippable; the hard ask stays at ANON_LESSON_LIMIT.
      if (!isSignedIn && supabaseEnabled() && !readFlag(SIGNUP_PROMPTED_KEY)) {
        writeFlag(SIGNUP_PROMPTED_KEY);
        setShowFirstLessonPrompt(true);
      }
    }
    if (firstUnlock) {
      setMasteryLevelId(currentLevel.id);
      haptics.heavy();
    }
    setRoute('results');
  }, [analytics, completedLevels, currentLevel.id, currentLevel.type, sessionStartedAt, hasEverPracticed, isSignedIn, proActive, settings.synth]);

  /* ---------- Question orchestration ---------- */

  useEffect(() => {
    if (route !== 'practice') {
      scaleLockRef.current = false;
      return;
    }
    if (!introDismissed) return;

    const run = async () => {
      const { establishTonality, maxQuestions, questionsPerKey } = lessonCfg;

      // Pick the primer to play before each key block. Falls back to type-based defaults
      // (e.g. 'none' for self-keyed and non-tonal lessons) when the level doesn't override.
      // #7 fading then downgrades the kind based on recent best accuracy for this lesson.
      // Interleave sessions skip the primer entirely — different lesson per question, no key
      // continuity to leverage; the user is mentally categorizing each question independently.
      const basePrimer = interleaveSession ? 'none' : resolvePrimerKind(currentLevel);
      const primerKind = fadePrimerForMastery(basePrimer, currentLevel.id);
      const skipPreamble = primerKind === 'none';
      // First-time setup — pick keys for the session. For tonal lessons, we pick one
      // root per block. For non-tonal lessons (beating, etc.) there's no musical key,
      // so we just seed a root and skip the preamble.
      if (scaleRoots.length === 0) {
        if (scaleLockRef.current) return;
        scaleLockRef.current = true;
        const numBlocks = Math.max(1, Math.ceil(maxQuestions / questionsPerKey));
        const roots = establishTonality
          ? Array.from({ length: numBlocks }, () => audioEngine.getRandomRootNote())
          : [audioEngine.getRandomRootNote()];
        setScaleRoots(roots);
        setCurrentScaleRoot(roots[0]);
        if (establishTonality && !skipPreamble) {
          setIsPlayingScale(true);
          try {
            const duration = await playPrimer(roots[0], primerKind);
            await new Promise((r) => setTimeout(r, duration * 1000 + 500));
          } finally {
            setIsPlayingScale(false);
            scaleLockRef.current = false;
          }
        } else {
          scaleLockRef.current = false;
        }
        return;
      }

      // Queue-driven sessions (review / interleave) end when the queue is exhausted,
      // not at maxQuestions.
      const reviewExhausted = reviewSession !== null && reviewSession.cursor >= reviewSession.queue.length;
      const interleaveExhausted = interleaveSession !== null && interleaveSession.cursor >= interleaveSession.queue.length;
      const inQueueSession = reviewSession !== null || interleaveSession !== null;
      if (reviewExhausted || interleaveExhausted || (!inQueueSession && stats.totalQuestions >= maxQuestions)) {
        endSession();
        return;
      }

      if (currentQuestion || isPlayingScale) return;

      // Key changes only happen for tonal lessons.
      if (establishTonality) {
        const questionInBlock = stats.totalQuestions % questionsPerKey;
        if (questionInBlock === 0 && stats.totalQuestions > 0 && lastKeyChangeQuestion !== stats.totalQuestions) {
          const blockIndex = Math.floor(stats.totalQuestions / questionsPerKey);
          if (blockIndex < scaleRoots.length) {
            if (scaleLockRef.current) return;
            scaleLockRef.current = true;
            const newRoot = scaleRoots[blockIndex];
            setLastKeyChangeQuestion(stats.totalQuestions);
            setCurrentScaleRoot(newRoot);
            if (skipPreamble) {
              scaleLockRef.current = false;
            } else {
              setIsPlayingScale(true);
              try {
                const duration = await playPrimer(newRoot, primerKind);
                await new Promise((r) => setTimeout(r, duration * 1000 + 500));
              } finally {
                setIsPlayingScale(false);
                scaleLockRef.current = false;
              }
              return;
            }
          }
        }
      }

      if (settings.autoPlay || currentQuestion === null) {
        generateQuestion();
      }
    };

    run();
  }, [
    route,
    scaleRoots,
    currentQuestion,
    stats.totalQuestions,
    isPlayingScale,
    lastKeyChangeQuestion,
    generateQuestion,
    endSession,
    settings.autoPlay,
    lessonCfg.establishTonality,
    lessonCfg.maxQuestions,
    lessonCfg.questionsPerKey,
    introDismissed,
  ]);

  const replaySound = async () => {
    if (!currentQuestion) return;
    try {
      switch (currentQuestion.type) {
        case 'scale_degree':
          await audioEngine.playScaleDegree(currentQuestion.rootNote, parseInt(currentQuestion.itemType) - 1, currentQuestion.context!);
          break;
        case 'interval':
          await audioEngine.playInterval(
            currentQuestion.rootNote,
            currentQuestion.itemType as keyof typeof INTERVALS,
            currentQuestion.intervalDirection || 'ascending',
            currentQuestion.intervalPresentation || 'melodic',
          );
          break;
        case 'triad':
          await audioEngine.playTriad(currentQuestion.rootNote, currentQuestion.itemType as keyof typeof TRIADS);
          break;
        case 'seventh_chord':
          await audioEngine.playSeventhChord(currentQuestion.rootNote, currentQuestion.itemType as keyof typeof SEVENTH_CHORDS);
          break;
        case 'mode':
          await audioEngine.playMode(currentQuestion.rootNote, currentQuestion.itemType as keyof typeof MODES);
          break;
        case 'acoustic':
          if (currentQuestion.acousticKind === 'match_pitch') {
            await audioEngine.playNote(currentQuestion.correctAnswer, 1.2);
          } else if (currentQuestion.acousticKind === 'sing_sequence') {
            await audioEngine.playSequence(currentQuestion.playedNotes);
          } else if (currentQuestion.acousticKind) {
            await audioEngine.playAcoustic(
              currentQuestion.acousticKind,
              currentQuestion.correctAnswer,
              currentQuestion.rootNote,
              currentQuestion.acousticSemis,
            );
          }
          break;
        case 'cadence':
          await audioEngine.playCadence(
            currentQuestion.rootNote,
            currentQuestion.itemType as 'authentic' | 'plagal' | 'half' | 'deceptive',
            (currentLevel.cadenceMode ?? 'major'),
          );
          break;
        case 'inversion': {
          // We don't persist the chord quality across replay; pick a deterministic one tied to the question id.
          const qualities = currentLevel.inversionQualities ?? (currentLevel.inversionKind === 'seventh' ? ['dominant_7'] : ['major']);
          // Use the same quality that played first time would require persisting it; for simplicity use first.
          const quality = qualities[0];
          await audioEngine.playInversion(
            currentQuestion.rootNote,
            quality as keyof typeof TRIADS | keyof typeof SEVENTH_CHORDS,
            currentQuestion.itemType as 'root' | 'first' | 'second' | 'third',
            currentLevel.inversionKind ?? 'triad',
          );
          break;
        }
        case 'progression':
          await audioEngine.playProgression(currentQuestion.rootNote, currentQuestion.itemType);
          break;
        case 'chord_extension':
          await audioEngine.playChordExtension(
            currentQuestion.rootNote,
            currentLevel.extensionTarget ?? 'V',
            currentQuestion.itemType as '9' | '11' | '13' | '7b9' | '7s9' | '7s11' | '7b13',
          );
          break;
        case 'borrowed_chord':
          await audioEngine.playBorrowedChord(
            currentQuestion.rootNote,
            currentQuestion.itemType as 'iv' | 'bIII' | 'bVI' | 'bVII' | 'bII',
          );
          break;
        case 'voicing':
          await audioEngine.playVoicing(
            currentQuestion.rootNote,
            currentLevel.voicingChord ?? 'maj7',
            currentQuestion.itemType as 'closed' | 'drop2' | 'quartal' | 'upper_structure',
          );
          break;
        case 'rhythm': {
          const bpm = currentQuestion.rhythmBpm ?? 100;
          const k = currentQuestion.rhythmKind;
          if (k === 'tap_back' && currentQuestion.targetOnsets) {
            await audioEngine.playRhythmOnsets(currentQuestion.targetOnsets, bpm, [0]);
          } else if (k === 'dictation' && currentQuestion.targetGrid) {
            const ons = [];
            for (let i = 0; i < currentQuestion.targetGrid.length; i++) {
              if (currentQuestion.targetGrid[i]) ons.push(i * 0.25);
            }
            await audioEngine.playRhythmOnsets(ons, bpm, [0]);
          } else if (k === 'subdivision') {
            await audioEngine.playSubdivisionPattern(currentQuestion.itemType as 'eighths' | 'sixteenths' | 'triplets' | 'dotted', bpm);
          } else if (k === 'meter') {
            await audioEngine.playMeterPattern(currentQuestion.itemType as '2/4' | '3/4' | '4/4' | '6/8' | '5/4', bpm);
          } else if (k === 'same_diff') {
            // Replay full A vs B sequence — not stored on Question; skip for now (not user-critical).
          }
          break;
        }
      }
    } catch (err) {
      console.error('replay error:', err);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!currentQuestion || showFeedback || feedbackPending) return;
    setSelectedAnswer(answer);

    const isCorrect = answer === currentQuestion.correctAnswer;
    // Daily Review forces delayed feedback per the curriculum-improvements playbook —
    // the spaced-review setting benefits most from the desirable-difficulty pause.
    const effectiveTiming = reviewSessionRef.current !== null
      ? 'delayed_short'
      : settings.feedbackTiming ?? DEFAULT_FEEDBACK_TIMING;
    const delayMs = FEEDBACK_TIMING_DELAY_MS[effectiveTiming];

    const revealFeedback = () => {
      setFeedbackPending(false);
      setShowFeedback(true);
      if (isCorrect) {
        haptics.success();
        audioEngine.playCorrectChime();
      } else {
        haptics.warning();
        audioEngine.playIncorrectBuzz();
      }
      // On correct, flash green briefly then advance automatically.
      if (isCorrect) {
        if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          autoAdvanceTimerRef.current = null;
          setCurrentQuestion(null);
          setSelectedAnswer(null);
          setShowFeedback(false);
          // Queue-driven sessions: advance the cursor and reset the interleave category gate
          // so the next question pulls a different item. Without this the queue stays at
          // cursor=0 and the same item gets re-asked indefinitely (and the session can't
          // exhaust because `interleaveExhausted` / `reviewExhausted` never trip).
          setReviewSession((rs) => (rs ? { ...rs, cursor: rs.cursor + 1 } : null));
          setInterleaveSession((is) => (is ? { ...is, cursor: is.cursor + 1 } : null));
          setInterleaveCategoryPicked(false);
          setInterleaveCategoryAttempt(null);
        }, 650);
      }
    };

    const responseTime = Date.now() - questionStartTime;
    const fullDescription = `${currentQuestion.rootNote} ${getDisplayName(currentQuestion.correctAnswer)}`;

    let scaleDegree: number | undefined;
    // Scale-degree mapping only makes sense for chord/interval drills where the chord root
    // varies across the scale. For type=scale_degree (degree IS the answer), mode (no per-question root),
    // and the new self-keyed types (cadence/progression/etc., where rootNote == currentScaleRoot by construction),
    // computing it would always yield 0 — meaningless.
    const NO_DEGREE_TYPES = new Set(['scale_degree', 'mode', 'cadence', 'progression', 'chord_extension', 'borrowed_chord', 'voicing', 'inversion', 'rhythm']);
    if (!NO_DEGREE_TYPES.has(currentQuestion.type)) {
      const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const rootIdx = chromatic.indexOf(currentQuestion.rootNote);
      const scaleIdx = chromatic.indexOf(currentScaleRoot);
      const interval = (rootIdx - scaleIdx + 12) % 12;
      const majorScale = [0, 2, 4, 5, 7, 9, 11];
      const sd = majorScale.indexOf(interval);
      scaleDegree = sd === -1 ? undefined : sd;
    }

    const record: Answer = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      fullDescription,
      isCorrect,
      timestamp: Date.now(),
      responseTime,
      itemType: currentQuestion.itemType,
      scaleDegree,
      rootNote: currentScaleRoot,
      questionType: currentQuestion.type,
      intervalDirection: currentQuestion.intervalDirection,
      intervalPresentation: currentQuestion.intervalPresentation,
    };
    analytics.addAnswer(record);

    // Update per-item mastery (rolling buffer + Leitner box) and persist immediately so a
    // mid-session crash doesn't lose progress. The Daily Review tile reads the same map.
    recordMasteryAnswer(masteryRef.current, currentLevel.id, currentQuestion.itemType, isCorrect);
    saveMastery(masteryRef.current);

    // Reveal — immediate or after a delay (#8 desirable-difficulty per Metcalfe / Kornell-Finn).
    // Batched mode falls back to delayed_short for v1; per-block summary UI is a follow-up.
    if (delayMs > 0) {
      setFeedbackPending(true);
      if (pendingFeedbackTimerRef.current !== null) window.clearTimeout(pendingFeedbackTimerRef.current);
      pendingFeedbackTimerRef.current = window.setTimeout(() => {
        pendingFeedbackTimerRef.current = null;
        revealFeedback();
      }, delayMs);
    } else {
      revealFeedback();
    }
  };

  const handlePick = (answer: string) => {
    if (!currentQuestion || showFeedback) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!currentQuestion || showFeedback || !selectedAnswer) return;
    handleAnswer(selectedAnswer);
  };

  const handleNext = () => {
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (pendingFeedbackTimerRef.current !== null) {
      window.clearTimeout(pendingFeedbackTimerRef.current);
      pendingFeedbackTimerRef.current = null;
    }
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setFeedbackPending(false);
    // Advance queue-driven sessions so the next question pulls a different item.
    setReviewSession((rs) => (rs ? { ...rs, cursor: rs.cursor + 1 } : null));
    setInterleaveSession((is) => (is ? { ...is, cursor: is.cursor + 1 } : null));
    setInterleaveCategoryPicked(false);
    setInterleaveCategoryAttempt(null);
  };

  const handlePickInterleaveCategory = (cat: InterleaveCategory) => {
    if (interleaveCategoryPicked) return;
    setInterleaveCategoryAttempt(cat);
    setInterleaveCategoryPicked(true);
  };

  const handlePracticeAgain = () => {
    if (selectedLevelId) startSession(selectedLevelId);
    else startSession(currentLevel.id);
  };

  const handleNextLesson = () => {
    const idx = CURRICULUM.findIndex((l) => l.id === currentLevel.id);
    const next = CURRICULUM.slice(idx + 1).find((l) => !(settings.skipSinging && isSingOnlyLevel(l)));
    if (next) startSession(next.id);
  };

  // For someone who can't or won't sing right now. Nothing else depends on the voice
  // lessons, so back on the path their next lesson is a listening one.
  const handleSkipSinging = (source: 'intro' | 'practice') => {
    phCapture('singing_skipped', { level_id: currentLevel.id, source });
    setSettings((s) => ({ ...s, skipSinging: true }));
    setSelectedLevelId(null);
    setRoute('path');
  };

  const handleResetProgress = () => {
    setCompletedLevels([]);
    setSelectedLevelId(null);
    analytics.clearAnswers();
    clearAllSessions();
    masteryRef.current = {};
    saveMastery(masteryRef.current);
    setStatsTick((n) => n + 1);
    void resetCloudProgress();
  };

  /* ---------- Render ---------- */

  if (route === 'onboarding') {
    return (
      <Onboarding
        onDone={(result) => {
          setHasOnboarded(true);
          guardedStartSession(result.startLevelId);
        }}
        onSkip={() => {
          setHasOnboarded(true);
          setRoute('path');
        }}
      />
    );
  }

  if (route === 'practice') {
    // Compute category-gate state first — it feeds both the intro copy and the Practice props.
    const queueCategories = interleaveSession ? categoriesInQueue(interleaveSession.queue) : [];
    const interleaveHasGate = queueCategories.length >= 2;
    const canSkipSinging = !interleaveSession && !reviewSession && isSingOnlyLevel(currentLevel);
    if (!introDismissed) {
      // Queue-driven sessions show a single session-level intro instead of the underlying
      // lesson's per-concept intro — the latter is misleading when questions are sampled
      // across many lessons (and the mascot/concept won't match the actual questions).
      // Checkpoint sessions name the cluster; the global Mixed Practice tile keeps its
      // generic frame; review sessions get the spacing pitch.
      const introPages =
        interleaveSession?.kind === 'checkpoint'
          ? getCheckpointIntro(interleaveSession.label, interleaveHasGate)
          : interleaveSession
          ? getMixedPracticeIntro()
          : reviewSession
          ? getDailyReviewIntro()
          : getLessonIntro(currentLevel);
      const introTitle =
        interleaveSession?.kind === 'checkpoint'
          ? interleaveSession.label
          : interleaveSession
          ? 'Mixed Practice'
          : reviewSession
          ? "Today's Review"
          : currentLevel.name;
      return (
        <LessonIntro
          pages={introPages}
          lessonName={introTitle}
          onContinue={() => {
            void audioEngine.initialize();
            setIntroDismissed(true);
          }}
          onExit={() => {
            phCapture('session_abandoned', { level_id: currentLevel.id, level_type: currentLevel.type, stage: 'intro' });
            setRoute('path');
          }}
          onSkipSinging={canSkipSinging ? () => handleSkipSinging('intro') : undefined}
        />
      );
    }
    // Interleave session: surface the category-pick gate per question. If the queue collapses
    // to a single category (curated checkpoints often do — e.g. "Fourths & Fifths" is 100%
    // interval), the gate would just be a tautological one-button tap, so we skip it.
    const interleaveCorrectCategory = interleaveSession && interleaveHasGate ? categoryForLevel(currentLevel) : null;
    const interleaveCategoryOptions = interleaveSession && interleaveHasGate ? queueCategories : null;
    return (
      <PracticeRoute
        level={currentLevel}
        question={currentQuestion}
        selectedAnswer={selectedAnswer}
        showFeedback={showFeedback}
        feedbackPending={feedbackPending}
        stats={stats}
        currentScaleRoot={currentScaleRoot}
        scaleRootIndexInSession={Math.floor(stats.totalQuestions / lessonCfg.questionsPerKey)}
        isPlayingScale={isPlayingScale}
        droneEnabled={settings.drone}
        playbackSpeed={settings.playbackSpeed}
        maxQuestions={lessonCfg.maxQuestions}
        questionsPerKey={lessonCfg.questionsPerKey}
        establishTonality={lessonCfg.establishTonality}
        singDifficulty={settings.singDifficulty}
        degreeNotation={settings.degreeNotation}
        onSkipSinging={canSkipSinging ? () => handleSkipSinging('practice') : undefined}
        interleaveCorrectCategory={interleaveCorrectCategory}
        interleaveCategoryOptions={interleaveCategoryOptions}
        interleaveCategoryAttempt={interleaveCategoryAttempt}
        interleaveCategoryPicked={interleaveCategoryPicked}
        onPickInterleaveCategory={handlePickInterleaveCategory}
        onReplay={replaySound}
        onAnswer={handleAnswer}
        onPick={handlePick}
        onSubmit={handleSubmit}
        onNext={handleNext}
        onEndSession={endSession}
        onToggleDrone={() => setSettings((s) => ({ ...s, drone: !s.drone }))}
        onSpeedChange={(v) => setSettings((s) => ({ ...s, playbackSpeed: v }))}
        onExit={() => {
          phCapture('session_abandoned', {
            level_id: currentLevel.id,
            level_type: currentLevel.type,
            stage: 'practice',
            questions_answered: stats.totalQuestions,
            accuracy: stats.accuracy,
            duration_ms: sessionStartedAt ? Date.now() - sessionStartedAt : null,
          });
          setRoute('path');
        }}
      />
    );
  }

  if (route === 'results') {
    const masteryLevel = masteryLevelId ? CURRICULUM.find((l) => l.id === masteryLevelId) : null;
    return (
      <>
        <Results
          level={currentLevel}
          stats={stats}
          insights={analytics.getInsights()}
          canUnlock={canUnlockNextLevel(currentLevel.id, stats.accuracy)}
          onBackToPath={() => setRoute('path')}
          onPracticeAgain={handlePracticeAgain}
          onNextLesson={handleNextLesson}
          onNavigate={(tab) => setRoute(tab)}
        />
        {showFirstLessonPrompt && !masteryLevel && (
          <AuthSheet reason="first_lesson" onClose={() => setShowFirstLessonPrompt(false)} />
        )}
        {masteryLevel && (
          <MasteryOverlay
            level={masteryLevel}
            onClose={() => setMasteryLevelId(null)}
            onContinue={() => {
              setMasteryLevelId(null);
              // The sign-in ask waits behind this overlay. Moving on here would unmount it
              // a few ms after it appeared, leaving it armed for the next results screen.
              if (!showFirstLessonPrompt) handleNextLesson();
            }}
          />
        )}
      </>
    );
  }

  if (route === 'settings') {
    return (
      <>
        <Settings
          settings={settings}
          onChange={setSettings}
          onResetProgress={handleResetProgress}
          onBack={() => setRoute('path')}
          onNavigate={(tab) => setRoute(tab)}
          onOpenPaywall={() => setRoute('paywall')}
          bottomPadding={isMobile && tabsActive ? 88 : 0}
          theme={theme}
          onThemeChange={setTheme}
          debugMode={debugMode}
          onToggleDebug={() => setDebugMode((v) => !v)}
          syncState={syncState}
          userEmail={userEmail}
          onOpenAuth={() => setShowAuth(true)}
          onSignOut={() => { void syncSignOut(); }}
          onSyncNow={() => { void flushNow(); }}
          isPro={proActive}
        />
        {isMobile && tabsActive && <BottomTabs active={tabsActive} onChange={(r) => setRoute(r)} />}
        {showAuth && <AuthSheet onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  if (route === 'paywall') {
    const planToProductId: Record<PlanId, string | null> = {
      free: null,
      pro: PRODUCT_IDS.proMonthly,
      studio: PRODUCT_IDS.proAnnual,
    };
    return (
      <>
        <Paywall
          trigger="manual"
          currentPlan={proActive ? 'pro' : 'free'}
          onSelect={async (plan) => {
            const productId = planToProductId[plan];
            if (!productId) { setRoute('path'); return; }
            // Anonymous users must sign in before purchase so the entitlement attaches
            // to their email (not a localStorage anon ID that can be wiped).
            if (!isSignedIn) {
              pendingPurchaseRef.current = productId;
              setShowAuth(true);
              return;
            }
            try {
              const ok = await purchaseProduct(productId);
              if (ok) setRoute('path');
              else alert(`Couldn't start checkout for ${productId}. Check the console.`);
            } catch (err) {
              console.error('[paywall] purchase error', err);
              alert(`Purchase failed: ${err instanceof Error ? err.message : 'unknown error'}`);
            }
          }}
          onDismiss={() => setRoute('path')}
        />
        {showAuth && <AuthSheet onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  if (route === 'stats') {
    return (
      <>
        <Stats
          onStart={() => guardedStartSession(currentLevel.id)}
          onBack={() => setRoute('path')}
          onNavigate={(tab) => setRoute(tab)}
          hasHistory={hasHistory()}
          hasEverPracticed={hasEverPracticed}
          bottomPadding={isMobile && tabsActive ? 88 : 0}
          isPro={proActive}
          onOpenPaywall={() => setRoute('paywall')}
        />
        {isMobile && tabsActive && <BottomTabs active={tabsActive} onChange={(r) => setRoute(r)} />}
      </>
    );
  }

  // path
  void statsTick; // re-render when stats mutate
  const streakDays = getStreakDays();
  const sinceMs = timeSinceLastSession();
  const hoursSince = sinceMs / 3_600_000;
  const showStreakRecovery =
    !streakSheetDismissed && streakDays > 0 && hoursSince >= 24 && hoursSince <= 48;
  return (
    <>
      <Path
        completedLevels={completedLevels}
        currentLevelId={currentLevel.id}
        debugMode={debugMode}
        onStart={guardedStartSession}
        onNavigate={(r) => setRoute(r)}
        onOpenPaywall={() => setRoute('paywall')}
        onOpenAuth={() => setShowAuth(true)}
        streakDays={streakDays}
        todayMinutes={getTodayMinutes()}
        bottomPadding={isMobile ? 88 : 0}
        isPro={proActive}
        isSignedIn={isSignedIn}
        dueCount={countDueItems(masteryRef.current, completedLevels)}
        onStartReview={() => { void startReviewSession(); }}
        onStartInterleave={() => { void startInterleaveSession(); }}
        recommendation={getCrossSegmentRecommendation(completedLevels, currentLevel.id, proActive)}
        onStartCheckpoint={(cp) => { void startCheckpointSession(cp); }}
      />
      {isMobile && tabsActive && <BottomTabs active={tabsActive} onChange={(r) => setRoute(r)} />}
      {showAuth && <AuthSheet onClose={() => setShowAuth(false)} />}
      {showStreakRecovery && (
        <StreakRecoverySheet
          streakDays={streakDays}
          hoursSince={hoursSince}
          onRecover={() => {
            setStreakSheetDismissed(true);
            guardedStartSession(currentLevel.id);
          }}
          onDismiss={() => setStreakSheetDismissed(true)}
          onPause={() => setStreakSheetDismissed(true)}
        />
      )}
    </>
  );
}
