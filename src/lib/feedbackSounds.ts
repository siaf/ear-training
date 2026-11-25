// What to play after a wrong answer, so the learner hears the difference instead of only
// reading it. Pure: App.tsx plays the sounds, Practice.tsx shows the buttons.
import type { Question } from '../types';
import { resolutionDegree, stabilityExplanation } from './stability';

export type FeedbackSound =
  | { kind: 'interval'; item: string; label: string; tag: 'right' | 'yours' }
  | { kind: 'resolve'; label: string };

export interface FeedbackPlan {
  sounds: FeedbackSound[];
  explain?: string;
}

export function feedbackPlan(
  q: Question,
  answer: string | null,
  opts: { intervals: readonly string[]; name: (item: string) => string; degreeLabel: (d: number) => string },
): FeedbackPlan | null {
  if (!answer || answer === q.correctAnswer) return null;

  // Intervals: the right one and the one picked, from the same note.
  if (q.type === 'interval' && opts.intervals.includes(answer) && opts.intervals.includes(q.correctAnswer)) {
    return {
      sounds: [
        { kind: 'interval', item: q.correctAnswer, label: opts.name(q.correctAnswer), tag: 'right' },
        { kind: 'interval', item: answer, label: opts.name(answer), tag: 'yours' },
      ],
    };
  }

  // Stable or unstable, over the home chord: the note again, and where it goes.
  if (q.type === 'scale_degree' && q.overTonicChord) {
    const degree = parseInt(q.itemType, 10);
    if (!(degree >= 1 && degree <= 7)) return null;
    return {
      sounds: [{ kind: 'resolve', label: resolutionDegree(degree) === null ? 'hear it rest' : 'hear it resolve' }],
      explain: stabilityExplanation(degree, opts.degreeLabel),
    };
  }
  return null;
}
