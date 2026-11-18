// Named rhythm patterns for the Rhythm segment. Each pattern is a list of beat onsets
// in fractional beats (0..N-1 for an N-beat bar). All patterns assume a 4-beat bar.
// Onsets are sorted ascending. Beat 0 is the downbeat.

export interface RhythmPattern {
  id: string;
  label: string;
  bars: number;
  onsets: number[];
}

export const TAP_PATTERNS: RhythmPattern[] = [
  {
    id: 'quarters',
    label: 'Quarter notes',
    bars: 1,
    onsets: [0, 1, 2, 3],
  },
  {
    id: 'eighths_first_half',
    label: 'Eighths on beats 1-2',
    bars: 1,
    onsets: [0, 0.5, 1, 1.5, 2, 3],
  },
  {
    id: 'syncopation_basic',
    label: 'Syncopated',
    bars: 1,
    onsets: [0, 0.5, 1.5, 2, 3.5],
  },
  {
    id: 'tresillo',
    label: 'Tresillo',
    bars: 1,
    onsets: [0, 1.5, 3],
  },
  {
    id: 'afro_3_3_2',
    label: '3-3-2',
    bars: 1,
    onsets: [0, 0.75, 1.5, 2.25, 3],
  },
];

export function pickTapPattern(): RhythmPattern {
  return TAP_PATTERNS[Math.floor(Math.random() * TAP_PATTERNS.length)];
}

// Patterns the dictation level uses. 16 cells (4 beats × 4 sixteenths). Boolean per cell.
export interface DictationPattern {
  id: string;
  label: string;
  cells: boolean[]; // length 16
}

const F = false;
const T = true;

export const DICTATION_PATTERNS: DictationPattern[] = [
  {
    id: 'four_on_floor',
    label: 'Four on the floor',
    cells: [T, F, F, F,  T, F, F, F,  T, F, F, F,  T, F, F, F],
  },
  {
    id: 'backbeat',
    label: 'Backbeat',
    cells: [T, F, F, F,  F, F, F, F,  T, F, F, F,  F, F, F, F],
  },
  {
    id: 'tresillo_grid',
    label: 'Tresillo',
    cells: [T, F, F, F,  F, F, T, F,  F, F, F, F,  T, F, F, F],
  },
  {
    id: 'son_clave',
    label: 'Son clave (3-2)',
    cells: [T, F, F, F,  F, F, T, F,  F, F, F, F,  T, F, T, F],
  },
  {
    id: 'gallop',
    label: 'Gallop',
    cells: [T, F, F, T,  T, F, F, T,  T, F, F, T,  T, F, F, F],
  },
];

export function pickDictationPattern(): DictationPattern {
  return DICTATION_PATTERNS[Math.floor(Math.random() * DICTATION_PATTERNS.length)];
}

// Convert a 16-cell grid to fractional-beat onsets (each cell is 0.25 beats).
export function gridToOnsets(cells: boolean[]): number[] {
  const out: number[] = [];
  cells.forEach((on, i) => { if (on) out.push(i * 0.25); });
  return out;
}

// Encode a 16-cell grid to a stable string for storage / equality.
export function encodeGrid(cells: boolean[]): string {
  return cells.map((c) => (c ? '1' : '0')).join('');
}

export function decodeGrid(s: string): boolean[] {
  return s.split('').map((c) => c === '1');
}

/** How the second pattern of a same-or-different question differs from the first. */
export type SameDiffChange = 'other_pattern' | 'added' | 'dropped' | 'moved';

/** Shares of each kind of "different" question. The first rhythm lesson is the third
 *  lesson most learners meet, so most differences are plain to hear: a different
 *  pattern, or a hit added or missing. A hit moved by an eighth is the hardest kind. */
const CHANGE_WEIGHTS: [SameDiffChange, number][] = [
  ['other_pattern', 0.35],
  ['added', 0.25],
  ['dropped', 0.25],
  ['moved', 0.15],
];

const EIGHTH = 0.5;
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const gapOk = (xs: number[], t: number, gap: number) => xs.every((x) => Math.abs(x - t) >= gap);

/** The pattern with `change` applied, or null when this pattern can't take it. */
function applyChange(onsets: number[], change: SameDiffChange, rand: () => number): number[] | null {
  const pick = <T,>(xs: T[]) => (xs.length ? xs[Math.floor(rand() * xs.length)] : null);
  switch (change) {
    case 'other_pattern': {
      const other = pick(TAP_PATTERNS.filter((p) => p.onsets.join() !== onsets.join()));
      return other ? other.onsets.slice() : null;
    }
    case 'added': {
      // A new hit on an eighth, at least an eighth from every other hit.
      const spots = [1, 2, 3, 4, 5, 6, 7].map((k) => k * EIGHTH).filter((t) => gapOk(onsets, t, EIGHTH));
      const t = pick(spots);
      return t === null ? null : sorted([...onsets, t]);
    }
    case 'dropped': {
      // Never the downbeat, and never down to a single hit.
      if (onsets.length < 3) return null;
      const i = pick(onsets.map((_, k) => k).slice(1));
      return i === null ? null : onsets.filter((_, k) => k !== i);
    }
    case 'moved': {
      // One hit (never the downbeat) an eighth earlier or later, still inside the bar
      // and at least a sixteenth from its neighbours.
      const moves: { i: number; t: number }[] = [];
      for (let i = 1; i < onsets.length; i++) {
        const others = onsets.filter((_, k) => k !== i);
        for (const t of [onsets[i] - EIGHTH, onsets[i] + EIGHTH]) {
          if (t > 0 && t < 4 && gapOk(others, t, 0.25)) moves.push({ i, t });
        }
      }
      const m = pick(moves);
      return m === null ? null : sorted(onsets.map((x, k) => (k === m.i ? m.t : x)));
    }
  }
}

/**
 * One same-or-different rhythm question: pattern A, and pattern B that is either the same
 * or differs in one way listeners can name (another pattern, a hit added, dropped or moved).
 */
export function sameDiffPair(rand: () => number = Math.random): { a: number[]; b: number[]; change: SameDiffChange | null } {
  const a = TAP_PATTERNS[Math.floor(rand() * TAP_PATTERNS.length)].onsets.slice();
  if (rand() < 0.5) return { a, b: a.slice(), change: null };
  let r = rand();
  let change: SameDiffChange = 'other_pattern';
  for (const [kind, weight] of CHANGE_WEIGHTS) {
    if (r < weight) { change = kind; break; }
    r -= weight;
  }
  const b = applyChange(a, change, rand);
  if (b) return { a, b, change };
  return { a, b: applyChange(a, 'other_pattern', rand)!, change: 'other_pattern' };
}

/** Where pattern B starts, in beats after pattern A's downbeat: A's bar, then a bar of
 *  clicks on their own, so the two are never heard as one run. */
export const SAME_DIFF_B_OFFSET = 8;
