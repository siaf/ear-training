import { describe, expect, it } from 'vitest';
import { AnalyticsEngine } from './analytics';
import { Answer } from './types';

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
    intervalDirection: 'ascending',
    intervalPresentation: 'melodic',
    ...overrides,
  };
}

describe('AnalyticsEngine', () => {
  it('returns zeros for an empty session', () => {
    const a = new AnalyticsEngine();
    const s = a.getSessionStats();
    expect(s.totalQuestions).toBe(0);
    expect(s.correctAnswers).toBe(0);
    expect(s.accuracy).toBe(0);
  });

  it('computes accuracy correctly', () => {
    const a = new AnalyticsEngine();
    a.addAnswer(mkAnswer({ isCorrect: true }));
    a.addAnswer(mkAnswer({ isCorrect: true }));
    a.addAnswer(mkAnswer({ isCorrect: false, userAnswer: 'minor_3rd' }));
    const s = a.getSessionStats();
    expect(s.totalQuestions).toBe(3);
    expect(s.correctAnswers).toBe(2);
    expect(s.accuracy).toBeCloseTo(66.6667, 2);
  });

  it('builds interval-specific weakness reports', () => {
    const a = new AnalyticsEngine();
    a.addAnswer(
      mkAnswer({
        itemType: 'perfect_4th',
        correctAnswer: 'perfect_4th',
        userAnswer: 'perfect_4th',
        isCorrect: true,
      }),
    );
    a.addAnswer(
      mkAnswer({
        itemType: 'perfect_4th',
        correctAnswer: 'perfect_4th',
        userAnswer: 'perfect_5th',
        isCorrect: false,
      }),
    );
    const s = a.getSessionStats();
    const p4 = s.intervalWeaknesses!.find((w) => w.interval === 'perfect_4th');
    expect(p4).toBeDefined();
    expect(p4!.attempts).toBe(2);
    expect(p4!.correct).toBe(1);
    expect(p4!.accuracy).toBe(50);
  });

  it('builds confusion pairs ordered by count', () => {
    const a = new AnalyticsEngine();
    a.addAnswer(
      mkAnswer({
        correctAnswer: 'major_3rd',
        userAnswer: 'minor_3rd',
        isCorrect: false,
        fullDescription: 'C major_3rd',
      }),
    );
    a.addAnswer(
      mkAnswer({
        correctAnswer: 'major_3rd',
        userAnswer: 'minor_3rd',
        isCorrect: false,
        fullDescription: 'F major_3rd',
      }),
    );
    a.addAnswer(
      mkAnswer({
        correctAnswer: 'perfect_5th',
        userAnswer: 'perfect_4th',
        isCorrect: false,
        itemType: 'perfect_5th',
        fullDescription: 'C perfect_5th',
      }),
    );
    const s = a.getSessionStats();
    expect(s.confusionMatrix!.length).toBeGreaterThanOrEqual(2);
    expect(s.confusionMatrix![0].count).toBeGreaterThanOrEqual(s.confusionMatrix![1].count);
  });

  it('clears answers on reset', () => {
    const a = new AnalyticsEngine();
    a.addAnswer(mkAnswer());
    a.addAnswer(mkAnswer());
    expect(a.getSessionStats().totalQuestions).toBe(2);
    a.clearAnswers();
    expect(a.getSessionStats().totalQuestions).toBe(0);
  });

  it('returns a shallow copy from getAnswers', () => {
    const a = new AnalyticsEngine();
    a.addAnswer(mkAnswer());
    const snap = a.getAnswers();
    a.addAnswer(mkAnswer());
    expect(snap).toHaveLength(1);
    expect(a.getAnswers()).toHaveLength(2);
  });
});
