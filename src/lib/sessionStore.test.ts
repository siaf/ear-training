import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllSessions,
  getDailyStats,
  getMasteryCells,
  getOverallTotals,
  getStreakDays,
  hasHistory,
  recordSession,
  timeSinceLastSession,
} from './sessionStore';
import { Answer } from '../types';

function mkAnswer(overrides: Partial<Answer> = {}): Answer {
  return {
    questionId: `q_${Math.random()}`,
    userAnswer: 'major_3rd',
    correctAnswer: 'major_3rd',
    fullDescription: 'C major_3rd',
    isCorrect: true,
    timestamp: Date.now(),
    responseTime: 1500,
    itemType: 'major_3rd',
    rootNote: 'C',
    questionType: 'interval',
    ...overrides,
  };
}

function session(end: number, correct = 8, total = 10, itemType = 'major_3rd') {
  const answers: Answer[] = [];
  for (let i = 0; i < total; i++) {
    answers.push(mkAnswer({ isCorrect: i < correct, itemType }));
  }
  recordSession({
    levelId: 'level_1',
    startedAt: end - 5 * 60 * 1000,
    endedAt: end,
    answers,
    stats: {
      totalQuestions: total,
      correctAnswers: correct,
      accuracy: (correct / total) * 100,
      currentStreak: 0,
      bestStreak: 0,
      results: [],
      weaknesses: [],
    },
    unlocked: false,
  });
}

const DAY = 86_400_000;

beforeEach(() => {
  clearAllSessions();
});
afterEach(() => {
  clearAllSessions();
});

describe('sessionStore', () => {
  it('records then reads a session', () => {
    expect(hasHistory()).toBe(false);
    session(Date.now(), 8, 10);
    expect(hasHistory()).toBe(true);
  });

  it('computes streak for three consecutive days ending today', () => {
    const now = Date.now();
    session(now - 2 * DAY);
    session(now - 1 * DAY);
    session(now);
    expect(getStreakDays(now)).toBe(3);
  });

  it('counts streak backwards from yesterday if user missed today', () => {
    const now = Date.now();
    session(now - 3 * DAY);
    session(now - 2 * DAY);
    session(now - 1 * DAY);
    expect(getStreakDays(now)).toBe(3);
  });

  it('streak is zero when no sessions exist', () => {
    expect(getStreakDays(Date.now())).toBe(0);
  });

  it('daily stats returns exactly 30 entries and accuracy is per-day', () => {
    const now = Date.now();
    session(now, 9, 10);
    const days = getDailyStats(30, now);
    expect(days).toHaveLength(30);
    const today = days[days.length - 1];
    expect(today.sessions).toBe(1);
    expect(today.accuracy).toBeCloseTo(90);
  });

  it('mastery cells aggregate across sessions', () => {
    const now = Date.now();
    session(now - 1 * DAY, 5, 10, 'major_3rd');
    session(now, 10, 10, 'major_3rd');
    const cells = getMasteryCells();
    const maj3 = cells.find((c) => c.category === 'interval' && c.item === 'major_3rd');
    expect(maj3).toBeDefined();
    expect(maj3!.attempts).toBe(20);
    expect(maj3!.correct).toBe(15);
    expect(maj3!.accuracy).toBeCloseTo(75);
  });

  it('overall totals + longest streak', () => {
    const now = Date.now();
    session(now - 4 * DAY);
    session(now - 3 * DAY);
    session(now - 2 * DAY);
    session(now);
    const t = getOverallTotals();
    expect(t.sessions).toBe(4);
    expect(t.longestStreak).toBe(3);
  });

  it('streaks survive a clock change', () => {
    const tz = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      // Clocks went back on Nov 1 2026 (a 25-hour day) and forward on Mar 8 2026 (23 hours).
      const autumn = [31, 32, 33].map((d) => new Date(2026, 9, d, 23, 30).getTime());
      autumn.forEach((t) => session(t));
      expect(getStreakDays(autumn[2])).toBe(3);
      expect(getOverallTotals().longestStreak).toBe(3);
      clearAllSessions();
      const spring = [7, 8, 9].map((d) => new Date(2026, 2, d, 0, 30).getTime());
      spring.forEach((t) => session(t));
      expect(getStreakDays(spring[2])).toBe(3);
      expect(getOverallTotals().longestStreak).toBe(3);
    } finally {
      process.env.TZ = tz;
    }
  });

  it('timeSinceLastSession reflects the most recent record', () => {
    const now = Date.now();
    session(now - 30_000);
    const since = timeSinceLastSession(now);
    expect(since).toBeGreaterThanOrEqual(29_000);
    expect(since).toBeLessThanOrEqual(60_000);
  });
});
