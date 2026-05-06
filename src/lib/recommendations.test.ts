import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCrossSegmentRecommendation, getSegmentAccuracy } from './recommendations';
import { clearAllSessions, recordSession } from './sessionStore';
import { CURRICULUM } from '../curriculum';
import type { Answer, SessionStats } from '../types';

function statsWith(total: number, correct: number): SessionStats {
  return {
    totalQuestions: total,
    correctAnswers: correct,
    accuracy: total ? (correct / total) * 100 : 0,
    currentStreak: 0,
    bestStreak: 0,
    results: [],
    weaknesses: [],
  };
}

function recordAt(levelId: string, total: number, correct: number, atMs: number) {
  const answers: Answer[] = [];
  recordSession({
    levelId,
    startedAt: atMs - 60_000,
    endedAt: atMs,
    answers,
    stats: statsWith(total, correct),
    unlocked: false,
  });
}

describe('recommendations', () => {
  beforeEach(() => clearAllSessions());
  afterEach(() => clearAllSessions());

  it('returns null when no sessions exist', () => {
    expect(getCrossSegmentRecommendation([], 'anything', true)).toBeNull();
  });

  it('aggregates per-segment accuracy across recent sessions', () => {
    const intLesson = CURRICULUM.find((l) => l.segmentId === 'intervals');
    const founLesson = CURRICULUM.find((l) => l.segmentId === 'foundations');
    if (!intLesson || !founLesson) return;
    recordAt(intLesson.id, 10, 9, Date.now()); // 90% intervals
    recordAt(founLesson.id, 10, 6, Date.now()); // 60% foundations
    const segs = getSegmentAccuracy();
    const intervals = segs.find((s) => s.segmentId === 'intervals');
    const foundations = segs.find((s) => s.segmentId === 'foundations');
    expect(intervals?.accuracy).toBeCloseTo(90);
    expect(foundations?.accuracy).toBeCloseTo(60);
  });

  it('returns null when only one segment has enough data', () => {
    const intLesson = CURRICULUM.find((l) => l.segmentId === 'intervals');
    if (!intLesson) return;
    recordAt(intLesson.id, 12, 5, Date.now());
    expect(getCrossSegmentRecommendation([], 'anything', true)).toBeNull();
  });

  it('returns null when the gap between segments is small', () => {
    const intLesson = CURRICULUM.find((l) => l.segmentId === 'intervals');
    const founLesson = CURRICULUM.find((l) => l.segmentId === 'foundations');
    if (!intLesson || !founLesson) return;
    recordAt(intLesson.id, 12, 10, Date.now()); // 83%
    recordAt(founLesson.id, 12, 9, Date.now()); // 75% — only 8pt gap
    expect(getCrossSegmentRecommendation([], 'anything', true)).toBeNull();
  });

  it('returns a recommendation when a clear weak segment exists', () => {
    const intLesson = CURRICULUM.find((l) => l.segmentId === 'intervals');
    const founLesson = CURRICULUM.find((l) => l.segmentId === 'foundations');
    if (!intLesson || !founLesson) return;
    recordAt(intLesson.id, 12, 11, Date.now()); // ~92%
    recordAt(founLesson.id, 12, 6, Date.now()); // 50%
    const rec = getCrossSegmentRecommendation([founLesson.id, intLesson.id], 'something_else', true);
    expect(rec).not.toBeNull();
    expect(rec?.weakSegmentId).toBe('foundations');
    expect(rec?.strongSegmentId).toBe('intervals');
    expect(rec?.level.segmentId).toBe('foundations');
  });

  it('does not recommend the user\'s current level', () => {
    const intLesson = CURRICULUM.find((l) => l.segmentId === 'intervals');
    const founLesson = CURRICULUM.find((l) => l.segmentId === 'foundations');
    if (!intLesson || !founLesson) return;
    recordAt(intLesson.id, 12, 11, Date.now());
    recordAt(founLesson.id, 12, 6, Date.now());
    const rec = getCrossSegmentRecommendation([], founLesson.id, true);
    expect(rec?.level.id).not.toBe(founLesson.id);
  });
});
