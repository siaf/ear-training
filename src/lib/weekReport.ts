// "Your week": what a learner did in the last 7 days, in a form worth sharing. The headline
// is the biggest improvement, because a score going up is what people actually share.

import { getDisplayName } from '../curriculum';
import type { PersistedSession } from './sessionStore';

const DAY = 86_400_000;
const MIN_ATTEMPTS = 5;
const MIN_GAIN = 10;

export interface WeekReport {
  /** Days with practice in the last 7. */
  days: number;
  questions: number;
  /** 0–100 */
  accuracy: number;
  minutes: number;
  /** Lessons first passed this week. */
  mastered: string[];
  /** The item whose accuracy rose most against the four weeks before. */
  improved: { label: string; before: number; after: number } | null;
  /** Without an improvement to show: the strongest item this week. */
  best: { label: string; accuracy: number } | null;
  /** The lesson the share links to: where the improvement happened, or the latest one. */
  levelId: string;
  /** The last 7 days, oldest first, for the chart. Accuracy is null on days off. */
  daily: { day: string; isToday: boolean; questions: number; accuracy: number | null }[];
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Readable item names only: "Minor 6th", "Degree 4"; not internal ids. */
function label(key: string): string | null {
  const item = key.slice(key.indexOf(':') + 1);
  const name = getDisplayName(item);
  return name && !/[_:]/.test(name) ? name : null;
}

function tally(sessions: PersistedSession[]) {
  const out = new Map<string, { attempts: number; correct: number }>();
  for (const s of sessions) {
    for (const [key, v] of Object.entries(s.items ?? {})) {
      const t = out.get(key) ?? { attempts: 0, correct: 0 };
      t.attempts += v.attempts;
      t.correct += v.correct;
      out.set(key, t);
    }
  }
  return out;
}

/** Null when there was no practice in the last 7 days. */
export function weekReport(
  sessions: PersistedSession[],
  names: (levelId: string) => string | undefined,
  now = Date.now(),
): WeekReport | null {
  const week = sessions.filter((s) => s.endedAt > now - 7 * DAY && s.endedAt <= now);
  if (week.length === 0) return null;
  const before = sessions.filter((s) => s.endedAt <= now - 7 * DAY && s.endedAt > now - 35 * DAY);

  const questions = week.reduce((n, s) => n + s.totalQuestions, 0);
  const correct = week.reduce((n, s) => n + s.correct, 0);
  const minutes = Math.round(week.reduce((n, s) => n + Math.max(0, s.endedAt - s.startedAt), 0) / 60_000);
  const mastered = [...new Set(week.filter((s) => s.unlocked).map((s) => names(s.levelId)).filter((n): n is string => Boolean(n)))];

  const now7 = tally(week);
  const then = tally(before);
  let improved: WeekReport['improved'] = null;
  let improvedKey: string | null = null;
  for (const [key, t] of now7) {
    const b = then.get(key);
    const name = label(key);
    if (!name || !b || t.attempts < MIN_ATTEMPTS || b.attempts < MIN_ATTEMPTS) continue;
    const after = Math.round((t.correct / t.attempts) * 100);
    const was = Math.round((b.correct / b.attempts) * 100);
    if (after - was >= MIN_GAIN && (!improved || after - was > improved.after - improved.before)) {
      improved = { label: name, before: was, after };
      improvedKey = key;
    }
  }

  let best: WeekReport['best'] = null;
  if (!improved) {
    for (const [key, t] of now7) {
      const name = label(key);
      if (!name || t.attempts < MIN_ATTEMPTS * 2) continue;
      const accuracy = Math.round((t.correct / t.attempts) * 100);
      if (!best || accuracy > best.accuracy) best = { label: name, accuracy };
    }
  }

  const latest = [...week].sort((a, b) => b.endedAt - a.endedAt);
  const levelId = (improvedKey && latest.find((s) => s.items?.[improvedKey!])?.levelId) || latest[0].levelId;

  const daily: WeekReport['daily'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d.getTime());
    const on = week.filter((s) => dayKey(s.endedAt) === k);
    const q = on.reduce((n, s) => n + s.totalQuestions, 0);
    const c = on.reduce((n, s) => n + s.correct, 0);
    daily.push({ day: DAY_LETTERS[d.getDay()], isToday: i === 0, questions: q, accuracy: q ? Math.round((c / q) * 100) : null });
  }

  return {
    daily,
    days: new Set(week.map((s) => dayKey(s.endedAt))).size,
    questions,
    accuracy: questions ? Math.round((correct / questions) * 100) : 0,
    minutes,
    mastered,
    improved,
    best,
    levelId,
  };
}

/** The share's words. Plain and first-person, so it reads as a person's post. */
export function weekShareText(r: WeekReport, streak: number): { title: string; text: string } {
  const headline = r.improved
    ? `${r.improved.label}: ${r.improved.before}% → ${r.improved.after}%`
    : r.best
    ? `${r.best.label} at ${r.best.accuracy}%`
    : `${r.questions} questions at ${r.accuracy}%`;
  const days = `${r.days} ${r.days === 1 ? 'day' : 'days'}`;
  const title = r.improved
    ? `A week of ear training: ${r.improved.label.toLowerCase()} went from ${r.improved.before}% to ${r.improved.after}%`
    : `A week of ear training: ${days}, ${r.questions} questions`;
  const lines = [
    `My week of ear training: ${headline}.`,
    `${days} of practice, ${r.questions} questions, ${r.accuracy}% right${streak >= 2 ? `, ${streak}-day streak` : ''}.`,
  ];
  if (r.mastered.length) lines.push(`Mastered: ${r.mastered.join(', ')}.`);
  lines.push('Training with Fifths.');
  return { title, text: lines.join(' ') };
}
