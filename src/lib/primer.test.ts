import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fadePrimerForMastery } from './primer';
import { recordSession, clearAllSessions } from './sessionStore';
import type { Answer, SessionStats } from '../types';

function emptyStats(accuracy: number): SessionStats {
  return {
    totalQuestions: 10,
    correctAnswers: Math.round((accuracy / 100) * 10),
    accuracy,
    currentStreak: 0,
    bestStreak: 0,
    results: [],
    weaknesses: [],
  };
}

function recordFor(levelId: string, accuracy: number, atMs: number) {
  const answers: Answer[] = [];
  recordSession({
    levelId,
    startedAt: atMs - 60_000,
    endedAt: atMs,
    answers,
    stats: emptyStats(accuracy),
    unlocked: false,
  });
}

describe('fadePrimerForMastery', () => {
  beforeEach(() => clearAllSessions());
  afterEach(() => clearAllSessions());

  it('returns base when no sessions exist for the level', () => {
    expect(fadePrimerForMastery('cadence_then_scale', 'unseen_level')).toBe('cadence_then_scale');
  });

  it('returns base when recent best accuracy is below the fade threshold', () => {
    recordFor('lvl', 80, Date.now());
    recordFor('lvl', 85, Date.now());
    expect(fadePrimerForMastery('cadence_then_scale', 'lvl')).toBe('cadence_then_scale');
  });

  it('downgrades cadence_then_scale → cadence at ≥90% accuracy', () => {
    recordFor('lvl', 92, Date.now());
    expect(fadePrimerForMastery('cadence_then_scale', 'lvl')).toBe('cadence');
  });

  it('downgrades cadence → drone', () => {
    recordFor('lvl2', 95, Date.now());
    expect(fadePrimerForMastery('cadence', 'lvl2')).toBe('drone');
  });

  it('downgrades scale → drone', () => {
    recordFor('lvl3', 91, Date.now());
    expect(fadePrimerForMastery('scale', 'lvl3')).toBe('drone');
  });

  it('downgrades drone → none', () => {
    recordFor('lvl4', 100, Date.now());
    expect(fadePrimerForMastery('drone', 'lvl4')).toBe('none');
  });

  it('keeps none as none', () => {
    recordFor('lvl5', 100, Date.now());
    expect(fadePrimerForMastery('none', 'lvl5')).toBe('none');
  });

  it('uses the highest of the recent sessions, not the most recent', () => {
    recordFor('lvl6', 95, Date.now() - 10_000);
    recordFor('lvl6', 70, Date.now() - 5_000);
    recordFor('lvl6', 75, Date.now()); // most-recent low; best-of-three is 95
    expect(fadePrimerForMastery('cadence_then_scale', 'lvl6')).toBe('cadence');
  });
});
