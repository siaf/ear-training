import { Answer, ConfusionPair, SessionStats } from '../types';
import { CURRICULUM } from '../curriculum';

const STORAGE_KEY = 'fifths.sessions.v1';
const MAX_SESSIONS = 500;

export interface PersistedSession {
  id: string;
  endedAt: number;
  startedAt: number;
  levelId: string;
  segmentId: string;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  avgResponseMs: number;
  fastestMs: number;
  /** per-item counters: key is `${questionType}:${itemType}` */
  items: Record<string, { attempts: number; correct: number }>;
  confusions: ConfusionPair[];
  unlocked: boolean;
}

export interface DailyStat {
  /** YYYY-MM-DD in local time */
  day: string;
  sessions: number;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  minutesEstimate: number;
}

export interface MasteryCell {
  category: 'interval' | 'triad' | 'seventh_chord' | 'mode' | 'scale_degree';
  item: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

function load(): PersistedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(sessions: PersistedSession[]) {
  try {
    const trimmed = sessions.slice(-MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota ignored */
  }
  notifyListeners();
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notifyListeners() {
  listeners.forEach((fn) => {
    try { fn(); } catch { /* swallow */ }
  });
}

/** Subscribe to local session-store mutations (writes, clears). Returns unsubscribe. */
export function subscribeSessions(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Replace the entire session store with the merged set. Used by sync engine on pull. */
export function replaceAllSessions(sessions: PersistedSession[]) {
  save(sessions);
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function recordSession(args: {
  levelId: string;
  startedAt: number;
  endedAt: number;
  answers: Answer[];
  stats: SessionStats;
  unlocked: boolean;
}): PersistedSession {
  const { levelId, startedAt, endedAt, answers, stats, unlocked } = args;
  const level = CURRICULUM.find((l) => l.id === levelId);
  const segmentId = level?.segmentId ?? 'pitch';

  const items: Record<string, { attempts: number; correct: number }> = {};
  let totalMs = 0;
  let fastestMs = Infinity;
  for (const a of answers) {
    const key = `${a.questionType}:${a.itemType}`;
    if (!items[key]) items[key] = { attempts: 0, correct: 0 };
    items[key].attempts++;
    if (a.isCorrect) items[key].correct++;
    totalMs += a.responseTime;
    if (a.responseTime > 0 && a.responseTime < fastestMs) fastestMs = a.responseTime;
  }

  const session: PersistedSession = {
    id: `s_${endedAt}`,
    endedAt,
    startedAt,
    levelId,
    segmentId,
    totalQuestions: stats.totalQuestions,
    correct: stats.correctAnswers,
    accuracy: stats.accuracy,
    avgResponseMs: answers.length ? totalMs / answers.length : 0,
    fastestMs: Number.isFinite(fastestMs) ? fastestMs : 0,
    items,
    confusions: stats.confusionMatrix ?? [],
    unlocked,
  };

  const all = load();
  all.push(session);
  save(all);
  return session;
}

export function getAllSessions(): PersistedSession[] {
  return load();
}

export function getLastSession(): PersistedSession | null {
  const all = load();
  return all.length > 0 ? all[all.length - 1] : null;
}

export function clearAllSessions() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notifyListeners();
}

/** Returns an array of `days` entries ending today. Missing days have zero counts. */
export function getDailyStats(days = 30, now = Date.now()): DailyStat[] {
  const sessions = load();
  const byDay = new Map<string, { s: number; q: number; c: number; ms: number }>();
  for (const s of sessions) {
    const k = dayKey(s.endedAt);
    const bucket = byDay.get(k) ?? { s: 0, q: 0, c: 0, ms: 0 };
    bucket.s++;
    bucket.q += s.totalQuestions;
    bucket.c += s.correct;
    bucket.ms += Math.max(0, s.endedAt - s.startedAt);
    byDay.set(k, bucket);
  }
  const out: DailyStat[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = now - i * 86_400_000;
    const k = dayKey(t);
    const b = byDay.get(k);
    out.push({
      day: k,
      sessions: b?.s ?? 0,
      totalQuestions: b?.q ?? 0,
      correct: b?.c ?? 0,
      accuracy: b && b.q ? (b.c / b.q) * 100 : 0,
      minutesEstimate: b ? b.ms / 60_000 : 0,
    });
  }
  return out;
}

/** Consecutive-day streak counting back from today (local). */
export function getStreakDays(now = Date.now()): number {
  const sessions = load();
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => dayKey(s.endedAt)));
  let streak = 0;
  // If user practiced today, count it; otherwise start checking yesterday.
  const todayKey = dayKey(now);
  let cursor = days.has(todayKey) ? now : now - 86_400_000;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}

export function getTodayMinutes(now = Date.now()): number {
  const k = dayKey(now);
  const sessions = load().filter((s) => dayKey(s.endedAt) === k);
  const ms = sessions.reduce((n, s) => n + Math.max(0, s.endedAt - s.startedAt), 0);
  return Math.round(ms / 60_000);
}

/** Hours where user practices most; returns 24 counts 0..23. */
export function getHourlyRhythm(): number[] {
  const hours = new Array<number>(24).fill(0);
  for (const s of load()) {
    const h = new Date(s.endedAt).getHours();
    hours[h]++;
  }
  return hours;
}

export function getMasteryCells(opts: { windowMs?: number; now?: number } = {}): MasteryCell[] {
  const cutoff = opts.windowMs ? (opts.now ?? Date.now()) - opts.windowMs : 0;
  const agg = new Map<string, MasteryCell>();
  for (const s of load()) {
    if (s.endedAt < cutoff) continue;
    for (const [key, counts] of Object.entries(s.items)) {
      const [category, item] = key.split(':', 2);
      const existing = agg.get(key) ?? {
        category: category as MasteryCell['category'],
        item,
        attempts: 0,
        correct: 0,
        accuracy: 0,
      };
      existing.attempts += counts.attempts;
      existing.correct += counts.correct;
      agg.set(key, existing);
    }
  }
  const out: MasteryCell[] = [];
  agg.forEach((cell) => {
    cell.accuracy = cell.attempts ? (cell.correct / cell.attempts) * 100 : 0;
    out.push(cell);
  });
  return out;
}

export interface OverallTotals {
  sessions: number;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  longestStreak: number;
  avgResponseMs: number;
}

export function getOverallTotals(opts: { windowMs?: number; now?: number } = {}): OverallTotals {
  const cutoff = opts.windowMs ? (opts.now ?? Date.now()) - opts.windowMs : 0;
  const sessions = load().filter(s => s.endedAt >= cutoff);
  const totalQuestions = sessions.reduce((n, s) => n + s.totalQuestions, 0);
  const correct = sessions.reduce((n, s) => n + s.correct, 0);
  const totalResponseMs = sessions.reduce((n, s) => n + s.avgResponseMs * s.totalQuestions, 0);

  // longest streak: scan the sorted unique days
  const days = Array.from(new Set(sessions.map((s) => dayKey(s.endedAt)))).sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of days) {
    const t = new Date(k + 'T00:00:00').getTime();
    if (prev !== null && t - prev === 86_400_000) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = t;
  }

  return {
    sessions: sessions.length,
    totalQuestions,
    correct,
    accuracy: totalQuestions ? (correct / totalQuestions) * 100 : 0,
    longestStreak: longest,
    avgResponseMs: totalQuestions ? totalResponseMs / totalQuestions : 0,
  };
}

export function hasHistory(): boolean {
  return load().length > 0;
}

export function getLastSessionTs(): number | null {
  const last = getLastSession();
  return last?.endedAt ?? null;
}

/** ms since last session, or Infinity if none */
export function timeSinceLastSession(now = Date.now()): number {
  const ts = getLastSessionTs();
  return ts == null ? Infinity : now - ts;
}
