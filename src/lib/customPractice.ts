// Custom practice (Pro): the learner saves drills of exactly what they mix up, such as
// "P5 vs m6 vs M6" played downwards, or "major triad vs dominant 7". A drill runs as a
// queue session like Mixed Practice: each question is asked through a real lesson with its
// item forced, so audio, grading, mastery and stats all work unchanged. Answer buttons show
// every item in the drill, whichever lesson asks the question. Nothing unlocks from a drill.

import { CURRICULUM, getDisplayName } from '../curriculum';
import { categoryForLevel, type InterleaveItem } from './interleaving';
import type { PersistedSession } from './sessionStore';

export interface CustomVariant {
  id: string;
  label: string;
  /** Lessons that play this variant. An item is asked through the first one that has it. */
  levelIds: string[];
}

export type DrillPalette = 'mint' | 'coral' | 'butter' | 'lav' | 'sky';

export interface CustomGroup {
  id: string;
  name: string;
  /** One line under the topic's name in the editor. */
  blurb: string;
  palette: DrillPalette;
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
    blurb: 'The distance between two notes',
    palette: 'mint',
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
    blurb: 'Where a note sits in the key',
    palette: 'coral',
    variantLabel: 'Key',
    variants: [
      { id: 'major', label: 'Major', levelIds: ['scale_degree_major_full'] },
      { id: 'minor', label: 'Minor', levelIds: ['scale_degree_minor'] },
    ],
    items: ['1', '2', '3', '4', '5', '6', '7'],
  },
  {
    id: 'chords',
    name: 'Chords',
    blurb: 'Triads and sevenths, mixed as you like',
    palette: 'butter',
    variants: [{ id: 'all', label: 'All', levelIds: ['level_6', 'level_8'] }],
    items: ['major', 'minor', 'diminished', 'major_7', 'dominant_7', 'minor_7', 'half_diminished_7'],
  },
  {
    id: 'modes',
    name: 'Modes',
    blurb: 'The colour of a scale',
    palette: 'lav',
    variants: [{ id: 'all', label: 'All', levelIds: ['level_10'] }],
    items: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
  },
  {
    id: 'progressions',
    name: 'Progressions',
    blurb: 'Cadences and chord moves',
    palette: 'sky',
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

/** A saved drill: a selection with a name and how it went last time. */
export interface CustomDrill extends CustomSelection {
  id: string;
  /** What the learner called it. Empty means use the name made from its items. */
  name: string;
  createdAt: number;
  lastPlayedAt?: number;
  /** Right answers out of questions, last time it was played. */
  lastScore?: { correct: number; total: number };
}

export function customGroup(id: string): CustomGroup | undefined {
  return CUSTOM_GROUPS.find((g) => g.id === id);
}

/* ---------- Short labels and names ---------- */

const SHORT: Record<string, string> = {
  minor_2nd: 'm2', major_2nd: 'M2', minor_3rd: 'm3', major_3rd: 'M3', perfect_4th: 'P4',
  tritone: 'TT', perfect_5th: 'P5', minor_6th: 'm6', major_6th: 'M6', minor_7th: 'm7',
  major_7th: 'M7', octave: '8ve',
  major: 'maj', minor: 'min', diminished: 'dim',
  major_7: 'maj7', dominant_7: '7', minor_7: 'm7', half_diminished_7: 'ø7',
  ionian: 'Ion', dorian: 'Dor', phrygian: 'Phr', lydian: 'Lyd', mixolydian: 'Mix', aeolian: 'Aeo', locrian: 'Loc',
  authentic: 'V–I', plagal: 'IV–I', half: '→V', deceptive: 'V–vi',
  I_V_vi_IV: 'I–V–vi–IV', vi_IV_I_V: 'vi–IV–I–V', I_vi_IV_V: 'I–vi–IV–V', I_IV_V_I: 'I–IV–V–I',
  ii_V_I_major: 'ii–V–I', ii_V_i_minor: 'iiø–V–i',
  V_of_V: 'V/V', V_of_vi: 'V/vi', V_of_ii: 'V/ii', V_of_IV: 'V/IV',
};

/** A compact label for an item: "P5", "maj7", "Dor", "V/V". Scale degrees stay as numbers. */
export function shortLabel(item: string): string {
  return SHORT[item] ?? item;
}

/** The item's full name in the editor. Triads say "triad" so they read apart from sevenths. */
export function itemLabel(groupId: string, item: string): string {
  if (groupId === 'scale_degrees') return `Degree ${item}`;
  if (groupId === 'chords' && ['major', 'minor', 'diminished'].includes(item)) return `${getDisplayName(item)} triad`;
  return getDisplayName(item);
}

/** The drill's items in the group's order, dropping any the group no longer offers. */
export function drillItems(sel: CustomSelection): string[] {
  const group = customGroup(sel.groupId);
  return group ? group.items.filter((i) => sel.items.includes(i)) : [];
}

/** A name made from the items: "P5 vs m6 vs M6", or "P4, P5, m6 +2" once there are more. */
export function autoName(sel: CustomSelection): string {
  const shorts = drillItems(sel).map(shortLabel);
  if (sel.groupId === 'scale_degrees') {
    const degrees = shorts.length <= 4 ? shorts.join(' vs ') : `${shorts.slice(0, 3).join(', ')} +${shorts.length - 3}`;
    return `Degrees ${degrees}`;
  }
  if (shorts.length === 0) return customGroup(sel.groupId)?.name ?? 'New drill';
  if (shorts.length <= 3) return shorts.join(' vs ');
  return `${shorts.slice(0, 3).join(', ')} +${shorts.length - 3}`;
}

export function drillName(drill: CustomDrill): string {
  return drill.name.trim() || autoName(drill);
}

/** "Up and down", "Together", "Major key": how the drill plays its items. */
export function variantSummary(sel: CustomSelection): string {
  const group = customGroup(sel.groupId);
  if (!group || group.variants.length < 2) return '';
  const labels = group.variants.filter((v) => sel.variantIds.includes(v.id)).map((v) => v.label.toLowerCase());
  if (labels.length === 0) return '';
  const joined = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  const text = group.id === 'scale_degrees' ? `${joined} key${labels.length > 1 ? 's' : ''}` : joined;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- Running a drill ---------- */

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
  const variants = group.variants.filter((v) => sel.variantIds.includes(v.id));
  return drillItems(sel).length >= 2 && variants.length >= 1;
}

/**
 * Builds the question queue. Items come round evenly in shuffled passes, never the same
 * item twice in a row, and each question picks one of the chosen variants at random.
 */
export function buildCustomQueue(sel: CustomSelection, random: () => number = Math.random): InterleaveItem[] {
  if (!canStart(sel)) return [];
  const group = customGroup(sel.groupId)!;
  const items = drillItems(sel);
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

/* ---------- Saved drills ---------- */

const DRILLS_KEY = 'fifths.custom_drills.v1';
/** Before drills could be saved, the builder kept one selection here. */
const OLD_SELECTION_KEY = 'fifths.custom_practice.v1';
/** Topics that were merged into Chords. */
const OLD_GROUPS: Record<string, string> = { triads: 'chords', sevenths: 'chords' };

export function newDrillId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** A fresh selection for a topic: the first way of playing it, nothing picked yet. */
export function emptySelection(groupId = CUSTOM_GROUPS[0].id, length = 10): CustomSelection {
  const group = customGroup(groupId) ?? CUSTOM_GROUPS[0];
  return { groupId: group.id, variantIds: [group.variants[0].id], items: [], length };
}

function cleanDrill(raw: unknown): CustomDrill | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<CustomDrill>;
  const groupId = OLD_GROUPS[d.groupId ?? ''] ?? d.groupId ?? '';
  const group = customGroup(groupId);
  if (!group) return null;
  const items = Array.isArray(d.items) ? d.items.filter((i) => group.items.includes(i)) : [];
  const variantIds = Array.isArray(d.variantIds) ? d.variantIds.filter((v) => group.variants.some((gv) => gv.id === v)) : [];
  return {
    id: typeof d.id === 'string' && d.id ? d.id : newDrillId(),
    name: typeof d.name === 'string' ? d.name : '',
    groupId,
    items,
    variantIds: variantIds.length > 0 ? variantIds : [group.variants[0].id],
    length: CUSTOM_LENGTHS.includes(d.length as 10) ? (d.length as number) : 10,
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
    lastPlayedAt: typeof d.lastPlayedAt === 'number' ? d.lastPlayedAt : undefined,
    lastScore: d.lastScore && typeof d.lastScore.correct === 'number' && typeof d.lastScore.total === 'number' ? d.lastScore : undefined,
  };
}

/**
 * The learner's saved drills, newest first. The first time, the one selection the old
 * builder remembered becomes a saved drill, so nobody loses what they set up.
 */
export function loadDrills(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): CustomDrill[] {
  try {
    const raw = storage.getItem(DRILLS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(cleanDrill).filter((d): d is CustomDrill => d !== null) : [];
    }
    const old = cleanDrill(JSON.parse(storage.getItem(OLD_SELECTION_KEY) ?? 'null'));
    const drills = old && canStart(old) ? [old] : [];
    storage.setItem(DRILLS_KEY, JSON.stringify(drills));
    return drills;
  } catch {
    return [];
  }
}

export function saveDrills(drills: CustomDrill[], storage: Pick<Storage, 'setItem'> = localStorage) {
  try { storage.setItem(DRILLS_KEY, JSON.stringify(drills)); } catch { /* not saved; fine */ }
}

/** Remember how a drill went, for its card. */
export function recordDrillResult(id: string, correct: number, total: number, now = Date.now()) {
  if (total <= 0) return;
  const drills = loadDrills();
  const i = drills.findIndex((d) => d.id === id);
  if (i < 0) return;
  drills[i] = { ...drills[i], lastPlayedAt: now, lastScore: { correct, total } };
  saveDrills(drills);
}

/* ---------- Drills suggested from mistakes ---------- */

export interface DrillSuggestion {
  selection: CustomSelection;
  /** How many times the learner confused these two lately. */
  count: number;
}

const INTERVAL_MARK = / ([↑↓])([♫→])$/;

let itemsByName: Map<string, { groupId: string; item: string }> | null = null;

/**
 * Confusions are stored by display name ("Minor 6th ↓→"). Maps one back to the two items,
 * when both belong to the same drill topic, and to how an interval was played.
 */
function parseConfusion(c: { mistook: string; actuallyWas: string }) {
  if (!itemsByName) {
    itemsByName = new Map();
    for (const g of CUSTOM_GROUPS) for (const item of g.items) itemsByName.set(getDisplayName(item), { groupId: g.id, item });
  }
  const a = itemsByName.get(c.actuallyWas.replace(INTERVAL_MARK, ''));
  const b = itemsByName.get(c.mistook.replace(INTERVAL_MARK, ''));
  if (!a || !b || a.groupId !== b.groupId || a.item === b.item) return null;
  const mark = c.actuallyWas.match(INTERVAL_MARK);
  const variant = a.groupId === 'intervals' && mark ? (mark[2] === '♫' ? 'harmonic' : mark[1] === '↑' ? 'up' : 'down') : null;
  return { a, b, variant };
}

/**
 * "Drill what you missed" after a session: every item the learner confused with another,
 * in the topic with the most mix-ups, played the way they were asked. Null when the
 * mistakes don't make a drill (fewer than two items, or a lesson drills can't ask).
 */
export function drillFromMistakes(
  confusions: { mistook: string; actuallyWas: string; count: number }[],
  levelId?: string,
): CustomSelection | null {
  const byGroup = new Map<string, { items: Set<string>; count: number; variants: Set<string> }>();
  for (const c of confusions) {
    const pair = parseConfusion(c);
    if (!pair) continue;
    const entry = byGroup.get(pair.a.groupId) ?? { items: new Set<string>(), count: 0, variants: new Set<string>() };
    entry.items.add(pair.a.item).add(pair.b.item);
    entry.count += c.count;
    if (pair.variant) entry.variants.add(pair.variant);
    byGroup.set(pair.a.groupId, entry);
  }
  const best = [...byGroup.entries()].sort((x, y) => y[1].count - x[1].count)[0];
  if (!best) return null;
  const [groupId, entry] = best;
  const group = customGroup(groupId)!;
  const items = group.items.filter((i) => entry.items.has(i));
  const fromLesson = group.variants.find((v) => levelId && v.levelIds.includes(levelId))?.id
    ?? (groupId === 'scale_degrees' && levelId?.includes('minor') ? 'minor' : undefined);
  const variantIds = entry.variants.size > 0
    ? group.variants.map((v) => v.id).filter((id) => entry.variants.has(id))
    : [fromLesson ?? group.variants[0].id];
  const sel = { groupId, variantIds, items, length: 10 };
  return canStart(sel) ? sel : null;
}

/**
 * Pairs the learner keeps confusing in the last `days` days, as ready-made drills, most
 * confused first. Pairs a saved drill already covers are left out.
 */
export function suggestDrills(
  sessions: PersistedSession[],
  saved: CustomSelection[],
  { days = 30, now = Date.now(), limit = 3 } = {},
): DrillSuggestion[] {
  const pairs = new Map<string, { groupId: string; items: [string, string]; count: number; variants: Map<string, number> }>();
  const since = now - days * 86_400_000;
  for (const s of sessions) {
    if (s.endedAt < since) continue;
    for (const c of s.confusions ?? []) {
      const pair = parseConfusion(c);
      if (!pair) continue;
      const { a, b, variant: markVariant } = pair;
      const group = customGroup(a.groupId)!;
      const items = [a.item, b.item].sort((x, y) => group.items.indexOf(x) - group.items.indexOf(y)) as [string, string];
      const key = `${a.groupId}:${items.join('|')}`;
      const entry = pairs.get(key) ?? { groupId: a.groupId, items, count: 0, variants: new Map() };
      entry.count += c.count;
      if (markVariant) entry.variants.set(markVariant, (entry.variants.get(markVariant) ?? 0) + c.count);
      pairs.set(key, entry);
    }
  }

  const covered = (groupId: string, items: string[]) =>
    saved.some((d) => d.groupId === groupId && items.every((i) => d.items.includes(i)));

  return [...pairs.values()]
    .filter((p) => p.count >= 2 && !covered(p.groupId, p.items))
    .sort((x, y) => y.count - x.count)
    .slice(0, limit)
    .map((p) => {
      const group = customGroup(p.groupId)!;
      const variant = [...p.variants.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? group.variants[0].id;
      return { selection: { groupId: p.groupId, variantIds: [variant], items: p.items, length: 10 }, count: p.count };
    });
}

/** Drills to start from when the learner has none and no mistakes to go on yet. */
export const STARTER_DRILLS: CustomSelection[] = [
  { groupId: 'intervals', variantIds: ['up'], items: ['minor_6th', 'major_6th'], length: 10 },
  { groupId: 'chords', variantIds: ['all'], items: ['major', 'major_7', 'dominant_7'], length: 10 },
  { groupId: 'intervals', variantIds: ['harmonic'], items: ['perfect_4th', 'tritone', 'perfect_5th'], length: 10 },
];
