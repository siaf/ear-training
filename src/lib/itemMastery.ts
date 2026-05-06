// Per-item mastery tracking + weighted sampling.
//
// Every answered question updates a per-(level, item) rolling buffer of the last N
// recent results (default 10). The weight used for sampling next time = 1 + 2*errorRate,
// so items with 100% recent miss show up ~3x as often as items with 0% miss.
//
// Items not yet seen in the current session also get a small recency bonus to ensure
// full coverage early on. After a few questions the weighting takes over.
//
// This module is the single source of truth for "how well does the user know each item
// across all their history" — used by both the in-lesson sampler (weighted picks) and
// the Daily Review tile (Leitner scheduling lives in spacedReview.ts).

const STORAGE_KEY = 'fifths.mastery.v1';
const RECENT_WINDOW = 10;

export interface ItemMastery {
  /** Last RECENT_WINDOW results, oldest first. true = correct. */
  recentResults: boolean[];
  /** ms since epoch of the last attempt. */
  lastSeen: number;
  /** ms since epoch of the last correct answer. */
  lastCorrect: number;
  /** Leitner box (1-5). 1 = newest/most-due, 5 = mature. Promoted on correct, demoted on miss. */
  box: 1 | 2 | 3 | 4 | 5;
  /** ms since epoch when this item is next due for spaced review. */
  nextDueAt: number;
}

/** Map keyed by `${levelId}::${item}`. Flat layout makes JSON serialization trivial. */
export type MasteryMap = Record<string, ItemMastery>;

const BOX_INTERVALS_DAYS: Record<ItemMastery['box'], number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

const DAY_MS = 86_400_000;

function key(levelId: string, item: string): string {
  return `${levelId}::${item}`;
}

function emptyMastery(now: number): ItemMastery {
  return {
    recentResults: [],
    lastSeen: now,
    lastCorrect: 0,
    box: 1,
    nextDueAt: now + BOX_INTERVALS_DAYS[1] * DAY_MS,
  };
}

/** Load the entire mastery map from localStorage. Returns an empty object on first run / parse error. */
export function loadMastery(): MasteryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as MasteryMap) : {};
  } catch {
    return {};
  }
}

export function saveMastery(map: MasteryMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota ignored */
  }
  notifyListeners();
}

export function clearMastery() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  notifyListeners();
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notifyListeners() {
  listeners.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
}
export function subscribeMastery(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Replace the entire map. Used by the sync engine on pull. */
export function replaceMastery(map: MasteryMap) {
  saveMastery(map);
}

/**
 * Record an answer for (levelId, item). Updates the rolling buffer + Leitner box.
 * Returns the updated row so callers can branch on it (e.g. flag three-strike escalation).
 */
export function recordAnswer(
  map: MasteryMap,
  levelId: string,
  item: string,
  isCorrect: boolean,
  now = Date.now(),
): ItemMastery {
  const k = key(levelId, item);
  const existing = map[k] ?? emptyMastery(now);
  const recentResults = [...existing.recentResults, isCorrect].slice(-RECENT_WINDOW);

  let box = existing.box;
  if (isCorrect) {
    box = Math.min(5, box + 1) as ItemMastery['box'];
  } else {
    box = 1; // demote to box 1 on any miss
  }
  const nextDueAt = now + BOX_INTERVALS_DAYS[box] * DAY_MS;

  const updated: ItemMastery = {
    recentResults,
    lastSeen: now,
    lastCorrect: isCorrect ? now : existing.lastCorrect,
    box,
    nextDueAt,
  };
  map[k] = updated;
  return updated;
}

/**
 * Compute the sampling weight for one item.
 *
 *   weight = 1 + 2 * errorRate(recent results)
 *
 * Items not seen this session get a small +0.3 recency bonus so untouched items don't
 * vanish under heavy weighting on a single problem child. `seenThisSession` is the set
 * of `${levelId}::${item}` keys the in-progress session has already shown.
 *
 * Returns a positive number; the caller normalizes weights for weighted sampling.
 */
export function getItemWeight(
  levelId: string,
  item: string,
  map: MasteryMap,
  seenThisSession: Set<string>,
): number {
  const m = map[key(levelId, item)];
  let weight = 1;
  if (m && m.recentResults.length > 0) {
    const errorRate = m.recentResults.filter((c) => !c).length / m.recentResults.length;
    weight = 1 + 2 * errorRate;
  }
  if (!seenThisSession.has(key(levelId, item))) {
    weight += 0.3;
  }
  return weight;
}

/**
 * Weighted random pick. Returns the index in `items`. If weights sum to zero (shouldn't
 * happen in practice), falls back to uniform.
 */
export function weightedRandomIndex(weights: number[]): number {
  const total = weights.reduce((n, w) => n + Math.max(0, w), 0);
  if (total <= 0) return Math.floor(Math.random() * weights.length);
  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += Math.max(0, weights[i]);
    if (r < acc) return i;
  }
  return weights.length - 1;
}

/**
 * Pick an item from a level's items list using weighted sampling + adjacent-question dedupe.
 *
 *   - Weight items by mastery (frequent misses get up-weighted).
 *   - Reject candidates that match the immediately previous item (1-back).
 *   - For 2-item lessons (where 1-back rejection guarantees alternation),
 *     also reject 2-back identical so we don't get a forced ABABAB pattern indefinitely;
 *     this only triggers when items.length <= 2.
 *   - Fall through after `maxAttempts` rejections to avoid edge-case infinite loops.
 *
 * Pure function; pass in the recent history. Caller updates the history after committing
 * the question.
 */
export function pickItemWithDedupe(
  levelId: string,
  items: string[],
  recentItemTypes: string[], // most-recent-last
  map: MasteryMap,
  seenThisSession: Set<string>,
  maxAttempts = 8,
): string {
  if (items.length === 0) throw new Error(`pickItemWithDedupe: empty items for ${levelId}`);
  if (items.length === 1) return items[0];

  const weights = items.map((item) => getItemWeight(levelId, item, map, seenThisSession));

  for (let i = 0; i < maxAttempts; i++) {
    const idx = weightedRandomIndex(weights);
    const candidate = items[idx];
    const last = recentItemTypes[recentItemTypes.length - 1];
    const prev = recentItemTypes[recentItemTypes.length - 2];
    // 1-back identical → reject.
    if (last === candidate) continue;
    // 2-item lessons: also reject 2-back identical to break ABABAB cycles.
    if (items.length <= 2 && prev === candidate) continue;
    return candidate;
  }
  // Fall through: weighted pick regardless of dedupe.
  return items[weightedRandomIndex(weights)];
}
