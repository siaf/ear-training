import { describe, expect, it } from 'vitest';
import { weekReport, weekShareText } from './weekReport';
import type { PersistedSession } from './sessionStore';

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 15, 18).getTime();
const NAMES: Record<string, string> = { int_harmonic_6ths: 'Harmonic: Sixths', level_1: 'Tonic Major vs Minor Thirds' };

function session(daysAgo: number, items: Record<string, [number, number]>, extra: Partial<PersistedSession> = {}): PersistedSession {
  const entries = Object.entries(items);
  const attempts = entries.reduce((n, [, [a]]) => n + a, 0);
  const correct = entries.reduce((n, [, [, c]]) => n + c, 0);
  return {
    id: `${daysAgo}-${Math.random()}`, endedAt: NOW - daysAgo * DAY, startedAt: NOW - daysAgo * DAY - 5 * 60_000,
    levelId: 'int_harmonic_6ths', segmentId: 'intervals', totalQuestions: attempts, correct,
    accuracy: attempts ? (correct / attempts) * 100 : 0, avgResponseMs: 0, fastestMs: 0,
    items: Object.fromEntries(entries.map(([k, [a, c]]) => [k, { attempts: a, correct: c }])),
    confusions: [], unlocked: false, ...extra,
  };
}

describe('your week', () => {
  it('leads with the biggest improvement against the weeks before', () => {
    const r = weekReport([
      session(20, { 'interval:minor_6th': [10, 5], 'interval:major_6th': [10, 8] }),
      session(2, { 'interval:minor_6th': [10, 9], 'interval:major_6th': [10, 9] }),
      session(1, { 'interval:minor_6th': [10, 8] }, { unlocked: true }),
    ], (id) => NAMES[id], NOW)!;
    expect(r.improved).toEqual({ label: 'Minor 6th', before: 50, after: 85 });
    expect(r).toMatchObject({ days: 2, questions: 30, accuracy: 87, minutes: 10, mastered: ['Harmonic: Sixths'], levelId: 'int_harmonic_6ths' });
  });

  it('charts the last seven days, oldest first, with days off empty', () => {
    const r = weekReport([
      session(2, { 'interval:minor_6th': [10, 9] }),
      session(0, { 'interval:minor_6th': [10, 6] }),
    ], (id) => NAMES[id], NOW)!;
    // NOW is Sunday 15 November 2026.
    expect(r.daily.map((d) => d.day).join('')).toBe('MTWTFSS');
    expect(r.daily.map((d) => d.accuracy)).toEqual([null, null, null, null, 90, null, 60]);
    expect(r.daily[6]).toMatchObject({ isToday: true, questions: 10 });
  });

  it('falls back to the strongest item when nothing improved enough to show', () => {
    const r = weekReport([session(1, { 'interval:perfect_5th': [12, 11], 'interval:perfect_4th': [12, 7] })], (id) => NAMES[id], NOW)!;
    expect(r.improved).toBeNull();
    expect(r.best).toEqual({ label: 'Perfect 5th', accuracy: 92 });
  });

  it('has nothing to share without practice this week', () => {
    expect(weekReport([session(9, { 'interval:octave': [10, 10] })], (id) => NAMES[id], NOW)).toBeNull();
  });

  it('writes a plain first-person post', () => {
    const r = weekReport([
      session(20, { 'interval:minor_6th': [10, 5] }),
      session(1, { 'interval:minor_6th': [10, 9] }, { unlocked: true }),
    ], (id) => NAMES[id], NOW)!;
    const { title, text } = weekShareText(r, 7);
    expect(title).toBe('A week of ear training: minor 6th went from 50% to 90%');
    expect(text).toBe('My week of ear training: Minor 6th: 50% → 90%. 1 day of practice, 10 questions, 90% right, 7-day streak. Mastered: Harmonic: Sixths. Training with Fifths.');
  });
});
