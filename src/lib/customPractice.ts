// Custom practice (Pro): the learner picks exactly what to drill, such as only minor 6ths
// and major 7ths, played descending. It runs as a queue session like Mixed Practice: each
// question is asked through a real lesson with its item forced, so audio, grading,
// mastery and stats all work unchanged. Nothing unlocks from a custom session.

import { CURRICULUM } from '../curriculum';
import { categoryForLevel, type InterleaveItem } from './interleaving';

export interface CustomVariant {
  id: string;
  label: string;
  /** Lessons that play this variant. An item is asked through the first one that has it. */
  levelIds: string[];
}

export interface CustomGroup {
  id: string;
  name: string;
  /** What the variant choice means, e.g. "How it's played". Omitted for one variant. */
  variantLabel?: string;
  variants: CustomVariant[];
  /**
   * Items a learner can pick. Only items the source lessons can really ask: chord
   * lessons draw chords from the key, so augmented triads and diminished 7ths, which
   * a major key doesn't contain, are left out.
   */
  items: string[];
}

export const CUSTOM_GROUPS: CustomGroup[] = [
  {
    id: 'intervals',
    name: 'Intervals',
    variantLabel: 'How it’s played',
    variants: [
      { id: 'harmonic', label: 'Together', levelIds: ['int_all_harmonic'] },
      { id: 'up', label: 'Up', levelIds: ['int_all_melodic_asc'] },
      { id: 'down', label: 'Down', levelIds: ['int_all_melodic_desc'] },
    ],
    items: [
      'minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd', 'perfect_4th', 'tritone',
      'perfect_5th', 'minor_6th', 'major_6th', 'minor_7th', 'major_7th', 'octave',
    ],
  },
  {
    id: 'scale_degrees',
    name: 'Scale degrees',
    variantLabel: 'Key',
    variants: [
      { id: 'major', label: 'Major', levelIds: ['scale_degree_major_full'] },
      { id: 'minor', label: 'Minor', levelIds: ['scale_degree_minor'] },
    ],
    items: ['1', '2', '3', '4', '5', '6', '7'],
  },
  {
    id: 'triads',
    name: 'Triads',
    variants: [{ id: 'all', label: 'All', levelIds: ['level_6'] }],
    items: ['major', 'minor', 'diminished'],
  },
  {
    id: 'sevenths',
    name: 'Seventh chords',
    variants: [{ id: 'all', label: 'All', levelIds: ['level_8'] }],
    items: ['major_7', 'minor_7', 'dominant_7', 'half_diminished_7'],
  },
  {
    id: 'modes',
    name: 'Modes',
    variants: [{ id: 'all', label: 'All', levelIds: ['level_10'] }],
    items: ['lydian', 'ionian', 'mixolydian', 'dorian', 'aeolian', 'phrygian', 'locrian'],
  },
  {
    id: 'progressions',
    name: 'Cadences and progressions',
    variants: [
      {
        id: 'all',
        label: 'All',
        levelIds: ['cad_full', 'prog_pop_diatonic', 'prog_jazz_cadence', 'prog_secondary_dominants'],
      },
    ],
    items: [
      'authentic', 'plagal', 'half', 'deceptive',
      'I_V_vi_IV', 'vi_IV_I_V', 'I_vi_IV_V', 'I_IV_V_I',
      'ii_V_I_major', 'ii_V_i_minor',
      'V_of_V', 'V_of_vi', 'V_of_ii', 'V_of_IV',
    ],
  },
];

export const CUSTOM_LENGTHS = [10, 20, 30] as const;

export interface CustomSelection {
  groupId: string;
  variantIds: string[];
  items: string[];
  length: number;
}

export function customGroup(id: string): CustomGroup | undefined {
  return CUSTOM_GROUPS.find((g) => g.id === id);
}

/** The lesson that asks `item` for a variant, or null if none of its lessons has it. */
export function sourceLevelFor(variant: CustomVariant, item: string): string | null {
  for (const id of variant.levelIds) {
    const level = CURRICULUM.find((l) => l.id === id);
    if (level?.items.includes(item)) return id;
  }
  return null;
}

/** A selection can start once it has two items (one item would be a guess-free drill) and a variant. */
export function canStart(sel: CustomSelection): boolean {
  const group = customGroup(sel.groupId);
  if (!group) return false;
  const items = sel.items.filter((i) => group.items.includes(i));
  const variants = group.variants.filter((v) => sel.variantIds.includes(v.id));
  return items.length >= 2 && variants.length >= 1;
}

/**
 * Builds the question queue. Items come round evenly in shuffled passes, never the same
 * item twice in a row, and each question picks one of the chosen variants at random.
 */
export function buildCustomQueue(sel: CustomSelection, random: () => number = Math.random): InterleaveItem[] {
  if (!canStart(sel)) return [];
  const group = customGroup(sel.groupId)!;
  const items = group.items.filter((i) => sel.items.includes(i));
  const variants = group.variants.filter((v) => sel.variantIds.includes(v.id));

  const shuffle = <T,>(xs: T[]): T[] => {
    const a = xs.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const order: string[] = [];
  while (order.length < sel.length) {
    const pass = shuffle(items);
    if (order.length > 0 && pass[0] === order[order.length - 1]) pass.push(pass.shift()!);
    order.push(...pass);
  }

  const queue: InterleaveItem[] = [];
  for (const item of order.slice(0, sel.length)) {
    const variant = variants[Math.floor(random() * variants.length)];
    const levelId = sourceLevelFor(variant, item) ?? variants.map((v) => sourceLevelFor(v, item)).find(Boolean);
    if (!levelId) continue;
    const level = CURRICULUM.find((l) => l.id === levelId)!;
    queue.push({ levelId, item, category: categoryForLevel(level) });
  }
  return queue;
}
