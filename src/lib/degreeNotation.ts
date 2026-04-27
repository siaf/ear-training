// Degree notation — pure formatter from (degree, context, notation) → display parts.
// The curriculum stores degrees as IDs '1'..'7' plus a ScaleDegreeContext
// (major / natural_minor / *_triads / *_7ths). All display knowledge lives here so
// adding a new notation = adding one function; adding a new context = extending tables.

import type { ScaleDegreeContext } from '../types';

export type DegreeNotation = 'roman' | 'number' | 'solfege';
export const DEFAULT_DEGREE_NOTATION: DegreeNotation = 'roman';

export const DEGREE_NOTATION_LABELS: Record<DegreeNotation, string> = {
  roman: 'Roman',
  number: 'Numbers',
  solfege: 'Solfège',
};

// Triad qualities by scale-degree index (0..6) for each parent mode.
type Quality = 'maj' | 'min' | 'dim' | 'aug';
const TRIAD_QUALITIES: Record<'major' | 'natural_minor', Quality[]> = {
  // I  ii  iii IV  V   vi  vii°
  major:         ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'],
  // i  ii° III iv  v   VI  VII
  natural_minor: ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'],
};

// Seventh-chord qualities by degree index for each parent mode.
type SeventhQuality = 'M7' | 'm7' | '7' | 'm7b5' | 'dim7';
const SEVENTH_QUALITIES: Record<'major' | 'natural_minor', SeventhQuality[]> = {
  // IM7 ii7 iii7 IVM7 V7  vi7 viiø7
  major:         ['M7', 'm7', 'm7', 'M7', '7', 'm7', 'm7b5'],
  // im7 iiø7 IIIM7 ivm7 vm7 VIM7 VII7
  natural_minor: ['m7', 'm7b5', 'M7', 'm7', 'm7', 'M7', '7'],
};

const ROMAN_BASE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;

// Movable-do solfège. Natural-minor degrees (b3, b6, b7) get the chromatic syllables
// — me, le, te — the standard adjustments in classical/Kodály solfège.
const SOLFEGE_MAJOR = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'];
const SOLFEGE_NAT_MINOR = ['do', 're', 'me', 'fa', 'sol', 'le', 'te'];

// Numeric degrees in natural-minor context: 1, 2, ♭3, 4, 5, ♭6, ♭7
const MINOR_DEGREE_ACCIDENTALS: ReadonlyArray<'' | '♭'> = ['', '', '♭', '', '', '♭', '♭'];

export interface DegreeParts {
  acc: string;   // accidental glyph rendered small/superscript-ish: '', '♭', '♯'
  main: string;  // the headline glyph: 'I', '7', 'do', 'iii', etc.
  sup: string;   // superscript appended after main: 'M7', '7', '°', 'ø7', '♭5'
}

// Map a ScaleDegreeContext to its parent mode and what's being asked.
function parse(context: ScaleDegreeContext | undefined): {
  mode: 'major' | 'natural_minor';
  ask: 'pitch' | 'triad' | 'seventh';
} {
  switch (context) {
    case 'natural_minor': return { mode: 'natural_minor', ask: 'pitch' };
    case 'major_triads':  return { mode: 'major',         ask: 'triad' };
    case 'minor_triads':  return { mode: 'natural_minor', ask: 'triad' };
    case 'major_7ths':    return { mode: 'major',         ask: 'seventh' };
    case 'minor_7ths':    return { mode: 'natural_minor', ask: 'seventh' };
    case 'major':
    default:              return { mode: 'major',         ask: 'pitch' };
  }
}

function romanCase(quality: Quality, degreeIdx: number): string {
  const base = ROMAN_BASE[degreeIdx];
  return quality === 'maj' || quality === 'aug' ? base : base.toLowerCase();
}

function romanSup(quality: Quality, ask: 'triad' | 'seventh', seventh?: SeventhQuality): string {
  if (ask === 'triad') {
    if (quality === 'dim') return '°';
    if (quality === 'aug') return '+';
    return '';
  }
  // seventh
  switch (seventh) {
    case 'M7':   return 'M7';
    case 'm7':   return '7';
    case '7':    return '7';
    case 'm7b5': return 'ø7';
    case 'dim7': return '°7';
    default:     return '';
  }
}

export function formatDegree(
  degree: string,
  context: ScaleDegreeContext | undefined,
  notation: DegreeNotation,
): DegreeParts {
  const idx = Math.max(0, Math.min(6, parseInt(degree, 10) - 1));
  const { mode, ask } = parse(context);

  if (notation === 'number') {
    const acc = mode === 'natural_minor' ? MINOR_DEGREE_ACCIDENTALS[idx] : '';
    return { acc, main: String(idx + 1), sup: '' };
  }

  if (notation === 'solfege') {
    const table = mode === 'natural_minor' ? SOLFEGE_NAT_MINOR : SOLFEGE_MAJOR;
    return { acc: '', main: table[idx], sup: '' };
  }

  // roman
  if (ask === 'pitch') {
    // Pitch (no chord quality given) — case from the diatonic triad on that degree
    // gives the conventional "I, ii, iii…" reading even for the bare-pitch question.
    const quality = TRIAD_QUALITIES[mode][idx];
    const acc = mode === 'natural_minor' ? MINOR_DEGREE_ACCIDENTALS[idx] : '';
    return { acc, main: romanCase(quality, idx), sup: '' };
  }
  if (ask === 'triad') {
    const quality = TRIAD_QUALITIES[mode][idx];
    const acc = mode === 'natural_minor' ? MINOR_DEGREE_ACCIDENTALS[idx] : '';
    return { acc, main: romanCase(quality, idx), sup: romanSup(quality, 'triad') };
  }
  // seventh
  const triadQ = TRIAD_QUALITIES[mode][idx];
  const seventhQ = SEVENTH_QUALITIES[mode][idx];
  const acc = mode === 'natural_minor' ? MINOR_DEGREE_ACCIDENTALS[idx] : '';
  return { acc, main: romanCase(triadQ, idx), sup: romanSup(triadQ, 'seventh', seventhQ) };
}

// Plain text for ARIA labels and aria-only contexts.
export function formatDegreeText(
  degree: string,
  context: ScaleDegreeContext | undefined,
  notation: DegreeNotation,
): string {
  const p = formatDegree(degree, context, notation);
  return `${p.acc}${p.main}${p.sup}`;
}
