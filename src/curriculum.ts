import { CurriculumLevel, CurriculumSegment } from './types';

// Organized curriculum with segments
export const CURRICULUM_SEGMENTS: CurriculumSegment[] = [
  {
    id: 'foundations',
    name: 'Foundations',
    description: 'Build your musical ear from the ground up with scale degrees',
    icon: '🎯',
    color: 'purple',
    levels: [
      {
        id: 'scale_degree_major_1',
        name: 'Major Scale Degrees 1-3-5',
        type: 'scale_degree',
        items: ['1', '3', '5'],
        context: 'major',
        unlockRequirement: 80,
        description: 'Identify the tonic triad notes (1, 3, 5) in a major scale',
        segmentId: 'foundations',
      },
      {
        id: 'scale_degree_major_2',
        name: 'Major Scale Degrees 1-5',
        type: 'scale_degree',
        items: ['1', '2', '3', '4', '5'],
        context: 'major',
        unlockRequirement: 75,
        description: 'Identify scale degrees 1-5 in a major scale',
        segmentId: 'foundations',
      },
      {
        id: 'scale_degree_major_full',
        name: 'All Major Scale Degrees',
        type: 'scale_degree',
        items: ['1', '2', '3', '4', '5', '6', '7'],
        context: 'major',
        unlockRequirement: 75,
        description: 'Identify all 7 scale degrees in a major scale',
        segmentId: 'foundations',
      },
      {
        id: 'scale_degree_minor',
        name: 'Natural Minor Scale Degrees',
        type: 'scale_degree',
        items: ['1', '2', '3', '4', '5', '6', '7'],
        context: 'natural_minor',
        unlockRequirement: 75,
        description: 'Identify all 7 scale degrees in natural minor',
        segmentId: 'foundations',
      },
    ],
  },
  {
    id: 'harmonic_ear',
    name: 'Harmonic Ear',
    description: 'Recognize chords built on scale degrees',
    icon: '🎹',
    color: 'blue',
    levels: [
      {
        id: 'scale_degree_major_triads',
        name: 'Major Scale Triads (Harmonic)',
        type: 'scale_degree',
        items: ['1', '2', '3', '4', '5', '6', '7'],
        context: 'major_triads',
        unlockRequirement: 70,
        description: 'Identify triads built on each scale degree in major',
        segmentId: 'harmonic_ear',
      },
      {
        id: 'scale_degree_minor_triads',
        name: 'Minor Scale Triads (Harmonic)',
        type: 'scale_degree',
        items: ['1', '2', '3', '4', '5', '6', '7'],
        context: 'minor_triads',
        unlockRequirement: 70,
        description: 'Identify triads built on each scale degree in minor',
        segmentId: 'harmonic_ear',
      },
      {
        id: 'scale_degree_major_7ths',
        name: 'Major Scale 7th Chords',
        type: 'scale_degree',
        items: ['1', '2', '3', '4', '5', '6', '7'],
        context: 'major_7ths',
        unlockRequirement: 70,
        description: 'Identify 7th chords built on each scale degree in major',
        segmentId: 'harmonic_ear',
      },
      {
        id: 'scale_degree_minor_7ths',
        name: 'Minor Scale 7th Chords',
        type: 'scale_degree',
        items: ['1', '2', '3', '4', '5', '6', '7'],
        context: 'minor_7ths',
        unlockRequirement: 70,
        description: 'Identify 7th chords built on each scale degree in minor',
        segmentId: 'harmonic_ear',
      },
    ],
  },
  {
    id: 'intervals',
    name: 'Intervals',
    description: 'Master melodic intervals in context',
    icon: '📏',
    color: 'green',
    levels: [
      {
        id: 'level_1',
        name: 'Tonic Major vs Minor Thirds',
        type: 'interval',
        items: ['minor_3rd', 'major_3rd'],
        scaleDegrees: [0],
        unlockRequirement: 80,
        description: 'Learn major and minor thirds from the root note',
        segmentId: 'intervals',
      },
      {
        id: 'level_2',
        name: 'Dominant Major vs Minor Thirds',
        type: 'interval',
        items: ['minor_3rd', 'major_3rd'],
        scaleDegrees: [4],
        unlockRequirement: 80,
        description: 'Practice thirds from the 5th scale degree',
        segmentId: 'intervals',
      },
      {
        id: 'level_3',
        name: 'All Thirds in Scale',
        type: 'interval',
        items: ['minor_3rd', 'major_3rd'],
        unlockRequirement: 75,
        description: 'Identify thirds from any scale degree',
        segmentId: 'intervals',
      },
    ],
  },
  {
    id: 'triads',
    name: 'Triads',
    description: 'Recognize three-note chords',
    icon: '🔺',
    color: 'yellow',
    levels: [
      {
        id: 'level_4',
        name: 'Tonic Triads (I and vi)',
        type: 'triad',
        items: ['major', 'minor'],
        scaleDegrees: [0, 5],
        unlockRequirement: 80,
        description: 'Learn the tonic major chord and its relative minor',
        segmentId: 'triads',
      },
      {
        id: 'level_5',
        name: 'Dominant Triads (V)',
        type: 'triad',
        items: ['major'],
        scaleDegrees: [4],
        unlockRequirement: 85,
        description: 'Master the dominant chord',
        segmentId: 'triads',
      },
      {
        id: 'level_6',
        name: 'All Diatonic Triads',
        type: 'triad',
        items: ['major', 'minor', 'diminished'],
        unlockRequirement: 75,
        description: 'Identify all triads in the major scale',
        segmentId: 'triads',
      },
    ],
  },
  {
    id: 'seventh_chords',
    name: 'Seventh Chords',
    description: 'Advanced four-note harmony',
    icon: '7️⃣',
    color: 'red',
    levels: [
      {
        id: 'level_7',
        name: 'Common Seventh Chords',
        type: 'seventh_chord',
        items: ['major_7', 'minor_7', 'dominant_7'],
        unlockRequirement: 75,
        description: 'Learn the most common seventh chords',
        segmentId: 'seventh_chords',
      },
      {
        id: 'level_8',
        name: 'Advanced Seventh Chords',
        type: 'seventh_chord',
        items: ['major_7', 'minor_7', 'dominant_7', 'half_diminished_7', 'diminished_7', 'minor_major_7'],
        unlockRequirement: 70,
        description: 'Master all seventh chord qualities',
        segmentId: 'seventh_chords',
      },
    ],
  },
  {
    id: 'modes',
    name: 'Modes',
    description: 'Explore modal colors and flavors',
    icon: '🌈',
    color: 'indigo',
    levels: [
      {
        id: 'level_9',
        name: 'Major vs Minor Modes',
        type: 'mode',
        items: ['ionian', 'lydian', 'mixolydian', 'aeolian', 'dorian'],
        unlockRequirement: 70,
        description: 'Distinguish between major and minor modes',
        segmentId: 'modes',
      },
      {
        id: 'level_10',
        name: 'All Modes',
        type: 'mode',
        items: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
        unlockRequirement: 70,
        description: 'Master all seven modes',
        segmentId: 'modes',
      },
    ],
  },
];

// Flatten all levels from segments for backwards compatibility
export const CURRICULUM: CurriculumLevel[] = CURRICULUM_SEGMENTS.flatMap(segment => segment.levels);

export function getCurrentLevel(completedLevels: string[]): CurriculumLevel {
  const nextLevel = CURRICULUM.find(level => !completedLevels.includes(level.id));
  return nextLevel || CURRICULUM[CURRICULUM.length - 1];
}

export function canUnlockNextLevel(currentLevelId: string, accuracy: number): boolean {
  const currentLevel = CURRICULUM.find(level => level.id === currentLevelId);
  if (!currentLevel) return false;
  return accuracy >= currentLevel.unlockRequirement;
}

export function getDisplayName(item: string): string {
  // Convert snake_case to Title Case
  return item
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
