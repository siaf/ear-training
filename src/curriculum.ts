import { CurriculumLevel } from './types';

// Progressive curriculum that builds musical understanding logically
export const CURRICULUM: CurriculumLevel[] = [
  {
    id: 'level_1',
    name: 'Tonic Major vs Minor Thirds',
    type: 'interval',
    items: ['minor_3rd', 'major_3rd'],
    scaleDegrees: [0], // Only from root (I)
    unlockRequirement: 80,
    description: 'Learn major and minor thirds from the root note - the foundation of chord quality',
  },
  {
    id: 'level_2',
    name: 'Dominant Major vs Minor Thirds',
    type: 'interval',
    items: ['minor_3rd', 'major_3rd'],
    scaleDegrees: [4], // Only from dominant (V)
    unlockRequirement: 80,
    description: 'Practice major and minor thirds from the 5th scale degree (dominant)',
  },
  {
    id: 'level_3',
    name: 'All Thirds in Scale',
    type: 'interval',
    items: ['minor_3rd', 'major_3rd'],
    unlockRequirement: 75,
    description: 'Identify major and minor thirds from any scale degree',
  },
  {
    id: 'level_4',
    name: 'Tonic Triads (I and vi)',
    type: 'triad',
    items: ['major', 'minor'],
    scaleDegrees: [0, 5], // I (major) and vi (minor)
    unlockRequirement: 80,
    description: 'Learn to hear the tonic major chord and its relative minor',
  },
  {
    id: 'level_5',
    name: 'Dominant Triads (V)',
    type: 'triad',
    items: ['major'],
    scaleDegrees: [4], // V (major)
    unlockRequirement: 85,
    description: 'Master the dominant chord - the most important chord after the tonic',
  },
  {
    id: 'level_6',
    name: 'All Diatonic Triads',
    type: 'triad',
    items: ['major', 'minor', 'diminished'],
    unlockRequirement: 75,
    description: 'Identify all triads that naturally occur in the major scale',
  },
  {
    id: 'level_7',
    name: 'Common Seventh Chords',
    type: 'seventh_chord',
    items: ['major_7', 'minor_7', 'dominant_7'],
    unlockRequirement: 75,
    description: 'Learn the most common seventh chords in jazz and popular music',
  },
  {
    id: 'level_8',
    name: 'Advanced Seventh Chords',
    type: 'seventh_chord',
    items: ['major_7', 'minor_7', 'dominant_7', 'half_diminished_7', 'diminished_7', 'minor_major_7'],
    unlockRequirement: 70,
    description: 'Master all seventh chord qualities',
  },
  {
    id: 'level_9',
    name: 'Major vs Minor Modes',
    type: 'mode',
    items: ['ionian', 'lydian', 'mixolydian', 'aeolian', 'dorian'],
    unlockRequirement: 70,
    description: 'Distinguish between major-sounding and minor-sounding modes',
  },
  {
    id: 'level_10',
    name: 'All Modes',
    type: 'mode',
    items: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
    unlockRequirement: 70,
    description: 'Master all seven modes of the major scale',
  },
];

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
