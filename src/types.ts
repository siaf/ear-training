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

export type ScaleDegreeType = 
  | '1' | '2' | '3' | '4' | '5' | '6' | '7';

export type ScaleDegreeContext = 
  | 'major' | 'natural_minor' | 'major_triads' | 'minor_triads' | 'major_7ths' | 'minor_7ths';

export type QuestionType = 'interval' | 'triad' | 'seventh_chord' | 'mode' | 'scale_degree';

export interface Question {
  id: string;
  type: QuestionType;
  correctAnswer: string;
  rootNote: string;
  playedNotes: string[];
  timestamp: number;
  context?: ScaleDegreeContext; // For scale degree questions
}

export interface Answer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  fullDescription: string; // e.g., "C minor", "F# major_7"
  isCorrect: boolean;
  timestamp: number;
  responseTime: number;
  // Enhanced tracking
  itemType: string; // e.g., "major_3rd", "minor", "ionian"
  scaleDegree?: number; // 0-6 for which scale degree this was played from
  rootNote: string; // The root note of the scale context
  questionType: QuestionType; // interval, triad, scale_degree, etc.
}

export interface SessionStats {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  weaknesses: WeaknessReport[];
  scaleDegreeWeaknesses?: ScaleDegreeWeakness[];
  confusionMatrix?: ConfusionPair[];
}

export interface WeaknessReport {
  item: string; // specific interval, chord, or mode
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface ScaleDegreeWeakness {
  degree: number; // 0-6 for scale degrees 1-7
  attempts: number;
  correct: number;
  accuracy: number;
  context: string; // e.g., "intervals from V", "triads on ii"
}

export interface ConfusionPair {
  mistook: string; // What they thought it was
  actuallyWas: string; // What it actually was
  count: number; // How many times this confusion happened
}

export interface CurriculumLevel {
  id: string;
  name: string;
  type: QuestionType;
  items: string[];
  unlockRequirement: number; // accuracy percentage to unlock next level
  description: string;
  scaleDegrees?: number[]; // Optional: restrict to specific scale degrees (0-6 for I-VII)
  context?: ScaleDegreeContext; // For scale degree questions
  segmentId: string; // Which segment/section this level belongs to
}

export interface CurriculumSegment {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon identifier
  color: string; // Tailwind color class (e.g., 'purple', 'blue', 'green')
  levels: CurriculumLevel[];
}

export interface UserProgress {
  currentLevelId: string;
  completedLevels: string[];
  sessionHistory: SessionStats[];
}
