import { audioEngine } from '../audioEngine';
import { CURRICULUM } from '../curriculum';

export type CalibrationRating = 1 | 2 | 3 | 4 | 5;

export interface CalibrationPrompt {
  id: string;
  title: string;
  hint: string;
  play: () => Promise<unknown>;
}

/** The four warm-up plays. Roots are randomized per prompt for variety. */
export function buildPrompts(): CalibrationPrompt[] {
  const roots = ['C', 'D', 'F', 'G'];
  const pick = () => roots[Math.floor(Math.random() * roots.length)];
  return [
    {
      id: 'major-3rd-harmonic',
      title: 'How clearly did you hear the two notes together?',
      hint: 'Two notes, struck at the same time.',
      play: () => audioEngine.playInterval(pick(), 'major_3rd', 'ascending', 'harmonic'),
    },
    {
      id: 'perfect-5th-melodic',
      title: 'How clearly did you hear them moving apart?',
      hint: 'Two notes, one after the other.',
      play: () => audioEngine.playInterval(pick(), 'perfect_5th', 'ascending', 'melodic'),
    },
    {
      id: 'major-triad',
      title: 'Could you hear the chord as bright or dark?',
      hint: 'Three notes together.',
      play: () => audioEngine.playTriad(pick(), 'major'),
    },
    {
      id: 'dominant-7',
      title: 'Did the chord feel like it wanted to resolve?',
      hint: 'A chord with a little tension.',
      play: () => audioEngine.playSeventhChord(pick(), 'dominant_7'),
    },
  ];
}

/** Returns the id of the level the user should start on, based on average rating. */
export function calibrationToStartLevel(ratings: CalibrationRating[]): string {
  if (ratings.length === 0) return CURRICULUM[0].id;
  const avg = ratings.reduce((n, r) => n + r, 0) / ratings.length;

  // Average rating → starting level index (clamped to curriculum length).
  // Spec: ≤2 → lvl 1, 3 → lvl 3, 4 → lvl 5, 5 → lvl 7
  let idx: number;
  if (avg <= 2) idx = 0;
  else if (avg < 3.5) idx = 2;
  else if (avg < 4.5) idx = 4;
  else idx = 6;

  idx = Math.min(idx, CURRICULUM.length - 1);
  return CURRICULUM[idx].id;
}
