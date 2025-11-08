// Core types for the ear training application

export type IntervalType = 
  | 'minor_2nd' | 'major_2nd' 
  | 'minor_3rd' | 'major_3rd' 
  | 'perfect_4th' | 'tritone' | 'perfect_5th' 
  | 'minor_6th' | 'major_6th' 
  | 'minor_7th' | 'major_7th' 
  | 'octave';

export type TriadType = 
  | 'major' | 'minor' 
  | 'diminished' | 'augmented';

export type SeventhChordType = 
  | 'major_7' | 'minor_7' | 'dominant_7' 
  | 'half_diminished_7' | 'diminished_7' 
  | 'minor_major_7' | 'augmented_major_7';

export type ModeType = 
  | 'ionian' | 'dorian' | 'phrygian' | 'lydian' 
  | 'mixolydian' | 'aeolian' | 'locrian';

export type QuestionType = 'interval' | 'triad' | 'seventh_chord' | 'mode';

export interface Question {
  id: string;
  type: QuestionType;
  correctAnswer: string;
  rootNote: string;
  playedNotes: string[];
  timestamp: number;
}

export interface Answer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  fullDescription: string; // e.g., "C minor", "F# major_7"
  isCorrect: boolean;
  timestamp: number;
  responseTime: number;
}

export interface SessionStats {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  weaknesses: WeaknessReport[];
}

export interface WeaknessReport {
  item: string; // specific interval, chord, or mode
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface CurriculumLevel {
  id: string;
  name: string;
  type: QuestionType;
  items: string[];
  unlockRequirement: number; // accuracy percentage to unlock next level
  description: string;
  scaleDegrees?: number[]; // Optional: restrict to specific scale degrees (0-6 for I-VII)
}

export interface UserProgress {
  currentLevelId: string;
  completedLevels: string[];
  sessionHistory: SessionStats[];
}
