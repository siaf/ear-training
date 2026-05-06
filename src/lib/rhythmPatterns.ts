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
