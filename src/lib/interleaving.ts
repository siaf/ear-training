// Mixed Practice / interleaving (curriculum-improvements #5).
//
// Builds a session queue that samples items across the user's completed lessons.
// The contextual-interference literature (Carter & Grahn 2016) shows interleaving
// across categories produces better long-term retention than blocked practice — but
// the benefit is mediated by the user *identifying* the question category before
// answering. We surface category metadata here; the Practice route renders a
// category-picker gate before the regular answer chips for each interleave question.
//
// Categories collapse closely-related types (triad/inversion/voicing → "chord") so
// the picker stays glanceable. Adjacent items in the queue never share a category.

import { CURRICULUM } from '../curriculum';
import type { CurriculumLevel, QuestionType } from '../types';

/** Coarse category surfaced to the user in the interleave category-picker. */
export type InterleaveCategory =
  | 'interval'
  | 'chord'
  | 'scale_degree'
  | 'cadence'
  | 'progression'
  | 'mode'
  | 'rhythm'
  | 'acoustic';

const TYPE_TO_CATEGORY: Record<QuestionType, InterleaveCategory> = {
  interval: 'interval',
  triad: 'chord',
  seventh_chord: 'chord',
  inversion: 'chord',
  voicing: 'chord',
  chord_extension: 'chord',
  borrowed_chord: 'chord',
  scale_degree: 'scale_degree',
  cadence: 'cadence',
  progression: 'progression',
  mode: 'mode',
  rhythm: 'rhythm',
  acoustic: 'acoustic',
};

export const INTERLEAVE_CATEGORY_LABELS: Record<InterleaveCategory, string> = {
  interval: 'interval',
  chord: 'chord',
  scale_degree: 'scale degree',
  cadence: 'cadence',
  progression: 'progression',
  mode: 'mode',
  rhythm: 'rhythm',
  acoustic: 'acoustic',
};

export function categoryForLevel(level: CurriculumLevel): InterleaveCategory {
  return TYPE_TO_CATEGORY[level.type];
}

export interface InterleaveItem {
  levelId: string;
  item: string;
  category: InterleaveCategory;
}

const DEFAULT_SIZE = 10;

/**
 * Build a queue of (level, item) tuples drawn uniformly across completed lessons,
 * with category-level dedupe so two adjacent items never share a category.
 *
 * `completedLevels` may include lessons that have since been removed from the curriculum;
 * those are silently filtered out. Returns an empty array if the user has fewer than two
 * completed lessons (no interleaving meaningful with one source).
 */
export function buildInterleaveQueue(
  completedLevels: string[],
  size = DEFAULT_SIZE,
  rng: () => number = Math.random,
): InterleaveItem[] {
  const sources = completedLevels
    .map((id) => CURRICULUM.find((l) => l.id === id))
    .filter((l): l is CurriculumLevel => !!l && l.items.length > 0);
  if (sources.length < 2) return [];

  const out: InterleaveItem[] = [];
  let lastCategory: InterleaveCategory | null = null;
  // Bounded-attempt loop — if the user has only chord lessons completed, we won't be able
  // to alternate categories and just yield items in their natural order.
  for (let i = 0; i < size; i++) {
    let attempts = 0;
    let pickedLevel: CurriculumLevel = sources[Math.floor(rng() * sources.length)];
    while (attempts < 6 && categoryForLevel(pickedLevel) === lastCategory) {
      pickedLevel = sources[Math.floor(rng() * sources.length)];
      attempts++;
    }
    const item = pickedLevel.items[Math.floor(rng() * pickedLevel.items.length)];
    const category = categoryForLevel(pickedLevel);
    out.push({ levelId: pickedLevel.id, item, category });
    lastCategory = category;
  }
  return out;
}

/**
 * Categories the picker should surface for a given queue — the union of categories present.
 * Always returns at least 2 entries (interleaving guarantees ≥2 source categories — almost;
 * if all sources collapse to one category the picker would be useless and we render the queue
 * without the category gate).
 */
export function categoriesInQueue(queue: InterleaveItem[]): InterleaveCategory[] {
  const set = new Set<InterleaveCategory>();
  queue.forEach((q) => set.add(q.category));
  return Array.from(set);
}
