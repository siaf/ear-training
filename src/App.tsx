import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine, INTERVALS, TRIADS, SEVENTH_CHORDS, MODES, SynthType } from './audioEngine';
import { CURRICULUM, getCurrentLevel, canUnlockNextLevel, getDisplayName } from './curriculum';
import { AnalyticsEngine } from './analytics';
import { Answer, Question } from './types';
import { filterDiatonicItems } from './scaleContext';
import { realizeDiatonicSequence, sequenceStartDegreeForQuestion } from './lib/diatonic';
import Path from './routes/Path';
import PracticeRoute from './routes/Practice';
import Results from './routes/Results';
import Settings, { DEFAULT_VOICE_RANGE, SettingsState, VOICE_RANGE_BASE_OCTAVE, VOICE_RANGE_NOTES } from './routes/Settings';
import Stats from './routes/Stats';
import Landing from './routes/Landing';
import Onboarding from './routes/Onboarding';
import Paywall, { PlanId } from './routes/Paywall';
import { clearAllSessions, getStreakDays, getTodayMinutes, hasHistory, recordSession, timeSinceLastSession } from './lib/sessionStore';
import {
  startSyncEngine,
  subscribeSyncState,
  signOut as syncSignOut,
  getCurrentUser,
  flushNow,
  type SyncState,
  type ProfileSnapshot,
} from './lib/syncEngine';
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
import { getLessonIntro } from './lib/lessonIntro';
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

interface LessonConfig {
  establishTonality: boolean;
  maxQuestions: number;
  questionsPerKey: number;
}

function getLessonConfig(level: CurriculumLevel): LessonConfig {
  const nonTonal = level.type === 'acoustic' && level.acousticKind
    ? NON_TONAL_ACOUSTIC_KINDS.includes(level.acousticKind)
    : false;
  const establishTonality = level.establishTonality ?? !nonTonal;
  if (!establishTonality) {
    const maxQuestions = level.maxQuestions ?? 8;
    return { establishTonality: false, maxQuestions, questionsPerKey: maxQuestions };
  }
  const maxQuestions = level.maxQuestions ?? 15;
  const questionsPerKey = level.questionsPerKey ?? 5;
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

export default function App() {
  const initial = loadPersisted();

  const defaultRoute: Route = !initial.hasSeenLanding
    ? 'landing'
    : !initial.hasOnboarded
    ? 'onboarding'
    : 'path';
  const [route, setRouteState] = useState<Route>(parseRouteFromUrl(defaultRoute));
  const setRoute = (r: Route) => {
    setRouteState(r);
    syncUrl(r);
  };
  usePopStateRoute(setRouteState);

  // On first render, make sure URL reflects the route we picked (for Landing/onboarding flows).
  useEffect(() => {
    syncUrl(route, true);
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
  const scaleLockRef = useRef(false);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const [debugMode, setDebugMode] = useState(initial.debugMode);
  const [syncState, setSyncState] = useState<SyncState>('disabled');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [proActive, setProActive] = useState<boolean>(isPro());
  useEffect(() => subscribeBilling(() => setProActive(isPro())), []);
  const completedLevelsRef = useRef<string[]>(initial.completedLevels);
  const settingsRef = useRef<SettingsState>(initial.settings);
  const hasEverPracticedRef = useRef<boolean>(initial.hasEverPracticed);
  useEffect(() => { completedLevelsRef.current = completedLevels; }, [completedLevels]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { hasEverPracticedRef.current = hasEverPracticed; }, [hasEverPracticed]);
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
  const currentLevel = selectedLevelId
    ? CURRICULUM.find((l) => l.id === selectedLevelId) ?? getCurrentLevel(completedLevels, proActive)
    : getCurrentLevel(completedLevels, proActive);
  const lessonCfg = getLessonConfig(currentLevel);
  const stats = analytics.getSessionStats();

  // Persist on change
  useEffect(() => {
    savePersisted({
      completedLevels,
      settings,
      hasSeenLanding: route !== 'landing' || initial.hasSeenLanding,
      hasOnboarded,
      hasEverPracticed,
      debugMode,
    });
  }, [completedLevels, settings, route, initial.hasSeenLanding, hasOnboarded, hasEverPracticed, debugMode]);

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
    });
    const applyProfile = (p: ProfileSnapshot) => {
      setSettings((curr) => ({
        ...curr,
        synth: p.synth as SynthType,
        playbackSpeed: p.playbackSpeed,
        drone: p.drone,
        autoPlay: p.autoPlay,
        voiceRange: (p.voiceRange as SettingsState['voiceRange']) ?? curr.voiceRange,
        singDifficulty: (p.singDifficulty as SettingsState['singDifficulty']) ?? curr.singDifficulty,
      }));
      setCompletedLevels((curr) => Array.from(new Set([...curr, ...p.completedLevels])));
      if (p.hasEverPracticed) setHasEverPracticed(true);
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
    async (levelId: string) => {
      await audioEngine.initialize();
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

  const generateQuestion = useCallback(async () => {
    const level = currentLevel;
    let playedNotes: string[] = [];
    let itemType: string;
    let correctAnswer: string;
    let rootNote: string;
    let acousticSemis: number | undefined;

    // Wait until any previous playback (scale reference, previous note) is fully done
    // before triggering the quiz sound. Prevents scale + question-note overlap.
    while (audioEngine.isPlaybackActive()) {
      await new Promise((r) => setTimeout(r, 40));
    }

    if (level.type === 'scale_degree') {
      const randomDegree = level.items[Math.floor(Math.random() * level.items.length)];
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
          const answer = level.items[Math.floor(Math.random() * level.items.length)];
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
      const pick = level.items[Math.floor(Math.random() * level.items.length)];
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
      const position = level.items[Math.floor(Math.random() * level.items.length)];
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
      const pick = level.items[Math.floor(Math.random() * level.items.length)];
      itemType = pick;
      correctAnswer = pick;
      rootNote = currentScaleRoot;
      try {
        playedNotes = await audioEngine.playProgression(rootNote, pick);
      } catch (err) { console.error('playProgression error:', err); }
    } else if (level.type === 'chord_extension') {
      const pick = level.items[Math.floor(Math.random() * level.items.length)];
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
      const pick = level.items[Math.floor(Math.random() * level.items.length)];
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
      const pick = level.items[Math.floor(Math.random() * level.items.length)];
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
    } else {
      const diatonicItems = filterDiatonicItems(level.items, level.type, currentScaleRoot, level.scaleDegrees);
      const pick = diatonicItems[Math.floor(Math.random() * diatonicItems.length)];
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
    const responseMode =
      modes.length === 1
        ? modes[0]
        : Math.random() < (level.singProbability ?? 0.5)
        ? 'sing'
        : 'select';

    const singTargets =
      responseMode === 'sing'
        ? level.acousticKind === 'sing_sequence'
          ? playedNotes
          : [correctAnswer]
        : undefined;

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
    });
    setSelectedAnswer(null);
    setShowFeedback(false);
    setQuestionStartTime(Date.now());
  }, [currentLevel, currentScaleRoot]);

  const endSession = useCallback(() => {
    const finalStats = analytics.getSessionStats();
    const unlocked = canUnlockNextLevel(currentLevel.id, finalStats.accuracy);
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
    }
    if (firstUnlock) {
      setMasteryLevelId(currentLevel.id);
      haptics.heavy();
    }
    setRoute('results');
  }, [analytics, completedLevels, currentLevel.id, currentLevel.type, sessionStartedAt, hasEverPracticed, isSignedIn, proActive]);

  /* ---------- Question orchestration ---------- */

  useEffect(() => {
    if (route !== 'practice') {
      scaleLockRef.current = false;
      return;
    }
    if (!introDismissed) return;

    const run = async () => {
      const { establishTonality, maxQuestions, questionsPerKey } = lessonCfg;

      // First-time setup — pick keys for the session. For tonal lessons, we pick one
      // root per block and play a scale reference. For non-tonal lessons (beating, etc.)
      // there's no musical key, so we just seed a root and skip the scale playback.
      // Self-keyed types (cadences, progressions, jazz chords) carry their own key context
      // in the audio — we still pick keys + show the label, but skip the scale preamble.
      const skipScalePreamble = SELF_KEYED_TYPES.has(currentLevel.type);
      if (scaleRoots.length === 0) {
        if (scaleLockRef.current) return;
        scaleLockRef.current = true;
        const numBlocks = Math.max(1, Math.ceil(maxQuestions / questionsPerKey));
        const roots = establishTonality
          ? Array.from({ length: numBlocks }, () => audioEngine.getRandomRootNote())
          : [audioEngine.getRandomRootNote()];
        setScaleRoots(roots);
        setCurrentScaleRoot(roots[0]);
        if (establishTonality && !skipScalePreamble) {
          setIsPlayingScale(true);
          try {
            const { duration } = await audioEngine.playMajorScaleReference(roots[0], 4);
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

      if (stats.totalQuestions >= maxQuestions) {
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
            if (skipScalePreamble) {
              scaleLockRef.current = false;
            } else {
              setIsPlayingScale(true);
              try {
                const { duration } = await audioEngine.playMajorScaleReference(newRoot, 4);
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
      }
    } catch (err) {
      console.error('replay error:', err);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!currentQuestion || showFeedback) return;
    setSelectedAnswer(answer);
    setShowFeedback(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    if (isCorrect) {
      haptics.success();
      audioEngine.playCorrectChime();
    } else {
      haptics.warning();
      audioEngine.playIncorrectBuzz();
    }
    const responseTime = Date.now() - questionStartTime;
    const fullDescription = `${currentQuestion.rootNote} ${getDisplayName(currentQuestion.correctAnswer)}`;

    let scaleDegree: number | undefined;
    // Scale-degree mapping only makes sense for chord/interval drills where the chord root
    // varies across the scale. For type=scale_degree (degree IS the answer), mode (no per-question root),
    // and the new self-keyed types (cadence/progression/etc., where rootNote == currentScaleRoot by construction),
    // computing it would always yield 0 — meaningless.
    const NO_DEGREE_TYPES = new Set(['scale_degree', 'mode', 'cadence', 'progression', 'chord_extension', 'borrowed_chord', 'voicing', 'inversion']);
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

    // On correct, flash the green feedback briefly then advance automatically.
    if (isCorrect) {
      if (autoAdvanceTimerRef.current !== null) window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        setCurrentQuestion(null);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }, 650);
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
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  const handlePracticeAgain = () => {
    if (selectedLevelId) startSession(selectedLevelId);
    else startSession(currentLevel.id);
  };

  const handleNextLesson = () => {
    const idx = CURRICULUM.findIndex((l) => l.id === currentLevel.id);
    const next = CURRICULUM[idx + 1];
    if (next) startSession(next.id);
  };

  const handleResetProgress = () => {
    setCompletedLevels([]);
    setSelectedLevelId(null);
    analytics.clearAnswers();
    clearAllSessions();
    setStatsTick((n) => n + 1);
  };

  /* ---------- Render ---------- */

  if (route === 'landing') {
    return (
      <Landing
        onStart={async () => {
          await audioEngine.initialize();
          setRoute(hasOnboarded ? 'path' : 'onboarding');
        }}
        onDemo={() => audioEngine.initialize().then(() => audioEngine.playInterval('C', 'major_3rd', 'ascending', 'melodic'))}
      />
    );
  }

  if (route === 'onboarding') {
    return (
      <Onboarding
        onDone={(result) => {
          setHasOnboarded(true);
          setSelectedLevelId(result.startLevelId);
          setSettings((s) => ({ ...s, voiceRange: result.voiceRange }));
          setRoute('path');
        }}
        onSkip={() => {
          setHasOnboarded(true);
          setRoute('path');
        }}
      />
    );
  }

  if (route === 'practice') {
    if (!introDismissed) {
      return (
        <LessonIntro
          pages={getLessonIntro(currentLevel)}
          lessonName={currentLevel.name}
          onContinue={() => setIntroDismissed(true)}
          onExit={() => setRoute('path')}
        />
      );
    }
    return (
      <PracticeRoute
        level={currentLevel}
        question={currentQuestion}
        selectedAnswer={selectedAnswer}
        showFeedback={showFeedback}
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
        onReplay={replaySound}
        onAnswer={handleAnswer}
        onPick={handlePick}
        onSubmit={handleSubmit}
        onNext={handleNext}
        onEndSession={endSession}
        onToggleDrone={() => setSettings((s) => ({ ...s, drone: !s.drone }))}
        onSpeedChange={(v) => setSettings((s) => ({ ...s, playbackSpeed: v }))}
        onExit={() => setRoute('path')}
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
        {masteryLevel && (
          <MasteryOverlay
            level={masteryLevel}
            onClose={() => setMasteryLevelId(null)}
            onContinue={() => {
              setMasteryLevelId(null);
              handleNextLesson();
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
