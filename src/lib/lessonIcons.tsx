// Centralized icon system for the curriculum: lucide-react icons for sections and lessons,
// with 2-char text labels for cases where text reads more clearly than a glyph (interval
// classes, rhythm meters). Replaces the previous emoji-on-segment + 5-glyph-on-lesson
// system, which had two problems:
//   1. Section icons (emoji 🎤 for Voice) didn't match lesson icons (generic headphones),
//      so a Voice lesson didn't visually belong to its section.
//   2. Every lesson in a section rendered the same generic star — no differentiation
//      between starter / capstone / acoustic / theory at a glance.
//
// Now: each section has a primary lucide icon that doubles as the default lesson icon,
// so lessons feel cohesive within a section. Specific lesson types override (e.g. Foundations
// gives each of its four primitives a distinct ear/wave icon; intervals use "3rd"/"P5"
// short text). Last-in-segment lessons render Trophy. Locked lessons render Lock.
// Checkpoint nodes (separate component) render Flag.

import {
  Anchor,
  AudioWaveform,
  Compass,
  Drum,
  Ear,
  Hash,
  Headphones,
  Layers,
  Lock,
  Mic,
  Mic2,
  Music,
  Music3,
  PenLine,
  Piano,
  Ruler,
  Sparkles,
  Trophy,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { CurriculumLevel } from '../types';

// Each segment's primary icon — used in the StickyBanner header AND as the default
// for any lesson in that section that doesn't have a more specific override.
const SEGMENT_ICONS: Record<string, LucideIcon> = {
  foundations: Headphones,
  voice: Mic,
  tonality: Anchor,
  pitch: Hash,
  intervals: Ruler,
  chords: Piano,
  progressions: Music3,
  jazz_harmony: Sparkles,
  rhythm: Drum,
  melodic_dictation: PenLine,
  sight_singing: Mic2,
  modal_modern: Compass,
};

export function getSegmentIcon(segmentId: string): LucideIcon {
  return SEGMENT_ICONS[segmentId] ?? Music;
}

// Foundations sub-icons — the four primitives are perceptually distinct skills, so
// they get distinct icons rather than four headphones in a row.
const FOUNDATIONS_ICONS: Record<string, LucideIcon> = {
  found_higher_lower: AudioWaveform,
  found_same_diff: Ear,
  found_beating: Waves,
  found_consonance: Headphones,
};

// Voice sub-icons — the opening primitives use Mic; sing-sequence drills use Mic2 to
// differentiate "shaped melodic line" from "single sustained pitch".
const VOICE_ICONS: Record<string, LucideIcon> = {
  voice_match_pitch: Mic,
  voice_resting_tone: Anchor,
};

// Specific override per lesson id — wins over segment defaults and type heuristics.
const LESSON_ICON_OVERRIDES: Record<string, LucideIcon> = {
  ...FOUNDATIONS_ICONS,
  ...VOICE_ICONS,
};

export type LessonIconRender =
  | { kind: 'lucide'; Component: LucideIcon }
  | { kind: 'text'; text: string };

/**
 * Resolve the icon to render inside a lesson's path node. Priority order:
 *   1. locked → Lock
 *   2. last-in-segment → Trophy (capstone signal — kept regardless of override)
 *   3. per-lesson id override (e.g. Foundations primitives, Voice basics)
 *   4. type-driven text labels (intervals → "3rd"/"P5"/"TT" etc.)
 *   5. type-driven lucide overrides (chords → Layers, sing-sequence → Mic2, …)
 *   6. segment default (so the lesson visually belongs to its section)
 */
export function getLessonIconRender(
  level: CurriculumLevel,
  isLastInSegment: boolean,
  locked: boolean,
): LessonIconRender {
  if (locked) return { kind: 'lucide', Component: Lock };
  if (isLastInSegment) return { kind: 'lucide', Component: Trophy };

  if (LESSON_ICON_OVERRIDES[level.id]) {
    return { kind: 'lucide', Component: LESSON_ICON_OVERRIDES[level.id] };
  }

  // Intervals: short text labels read more cleanly than a generic ruler — and they
  // double as a memory aid (the chip says what the lesson is about).
  if (level.type === 'interval') {
    const text = intervalText(level.id);
    if (text) return { kind: 'text', text };
  }

  // Rhythm: meter labels render naturally as text ("4/4", "8th"); other rhythm types
  // keep the segment Drum icon.
  if (level.type === 'rhythm') {
    const text = rhythmText(level.id);
    if (text) return { kind: 'text', text };
  }

  // Type-driven overrides — chord stacks, sing-sequence, etc. — these reinforce the
  // *kind* of work without diverging from the segment palette.
  if (level.type === 'triad' || level.type === 'seventh_chord' || level.type === 'inversion' || level.type === 'voicing') {
    return { kind: 'lucide', Component: Layers };
  }
  if (level.type === 'acoustic' && level.acousticKind === 'sing_sequence') {
    return { kind: 'lucide', Component: Mic2 };
  }

  return { kind: 'lucide', Component: getSegmentIcon(level.segmentId) };
}

function intervalText(id: string): string | null {
  if (id.startsWith('int_all')) return 'all';
  if (id.includes('tritone')) return 'TT';
  if (id.includes('4ths_5ths')) return '4·5';
  if (id.includes('3rds')) return '3rd';
  if (id.includes('6ths')) return '6th';
  if (id.includes('2nds')) return '2nd';
  if (id.includes('7ths')) return '7th';
  return null;
}

function rhythmText(id: string): string | null {
  if (id === 'rhy_meter') return '4/4';
  if (id === 'rhy_subdivisions') return '8th';
  return null;
}
