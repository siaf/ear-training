import { CurriculumLevel } from './types';

// Progressive curriculum that builds musical understanding logically
export const CURRICULUM: CurriculumLevel[] = [
  {
    id: 'level_1',
    name: 'Major vs Minor Thirds',
    type: 'interval',
    items: ['minor_3rd', 'major_3rd'],
    unlockRequirement: 80,
    description: 'Learn to distinguish between major and minor thirds - the foundation of chord quality',
  },
  {
    id: 'level_2',
    name: 'Basic Intervals',
    type: 'interval',
    items: ['minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd', 'perfect_4th', 'perfect_5th'],
    unlockRequirement: 75,
    description: 'Master the most common intervals used in melodies',
  },
  {
    id: 'level_3',
    name: 'Major vs Minor Triads',
    type: 'triad',
    items: ['major', 'minor'],
    unlockRequirement: 80,
    description: 'Apply your third knowledge to full chords',
  },
  {
    id: 'level_4',
    name: 'Extended Intervals',
    type: 'interval',
    items: ['minor_6th', 'major_6th', 'minor_7th', 'major_7th', 'octave'],
    unlockRequirement: 75,
    description: 'Learn larger intervals for more complex melodies',
  },
  {
    id: 'level_5',
    name: 'Perfect Fifth',
    type: 'interval',
    items: ['perfect_5th'],
    unlockRequirement: 85,
    description: 'Master the perfect fifth - crucial for understanding chord progressions',
  },
  {
    id: 'level_6',
    name: 'All Triads',
    type: 'triad',
    items: ['major', 'minor', 'diminished', 'augmented'],
    unlockRequirement: 75,
    description: 'Complete your triad knowledge with diminished and augmented chords',
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

export function getDisplayName(item: string, type: string): string {
  // Convert snake_case to Title Case
  return item
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
