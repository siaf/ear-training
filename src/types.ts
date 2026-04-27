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

export type QuestionType = 'interval' | 'triad' | 'seventh_chord' | 'mode' | 'scale_degree' | 'acoustic';

export type AcousticKind = 'same_diff' | 'beating' | 'higher_lower' | 'consonance' | 'match_pitch' | 'sing_sequence';

export type DiatonicScale = 'major' | 'natural_minor';

export type IntervalDirection = 'ascending' | 'descending';
export type IntervalPresentation = 'harmonic' | 'melodic';

export type ResponseMode = 'select' | 'sing';

export interface Question {
  id: string;
  type: QuestionType;
  correctAnswer: string; // What the user should click (bucket name if grouped, else same as itemType)
  itemType: string; // What was actually played (e.g. scale degree '5', interval 'major_3rd')
  rootNote: string;
  playedNotes: string[];
  timestamp: number;
  context?: ScaleDegreeContext; // For scale degree questions
  intervalDirection?: IntervalDirection; // For interval questions
  intervalPresentation?: IntervalPresentation; // For interval questions
  acousticKind?: AcousticKind; // For acoustic questions
  acousticSemis?: number; // Frozen semitone interval for higher_lower / consonance so replay matches the original.
  responseMode?: ResponseMode; // Defaults to 'select'.
  targetNotes?: string[]; // Notes the user must sing (for responseMode='sing'). Defaults to playedNotes.
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
  intervalDirection?: IntervalDirection; // For interval questions
  intervalPresentation?: IntervalPresentation; // For interval questions
}

export interface SessionStats {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
  results: boolean[]; // per-question correctness in order
  weaknesses: WeaknessReport[];
  scaleDegreeWeaknesses?: ScaleDegreeWeakness[];
  intervalWeaknesses?: IntervalWeakness[];
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

export interface IntervalWeakness {
  interval: string; // e.g., "major_3rd"
  direction?: IntervalDirection;
  presentation?: IntervalPresentation;
  attempts: number;
  correct: number;
  accuracy: number;
  context: string; // e.g., "Ascending Major 3rd (Melodic)"
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
  intervalDirection?: IntervalDirection; // For interval lessons
  intervalPresentation?: IntervalPresentation; // For interval lessons (harmonic vs melodic)
  acousticKind?: AcousticKind; // For acoustic lessons
  prerequisites?: string[]; // Lesson IDs that must be completed. Omit/empty = always unlocked.
  tier?: 'pro'; // Omit = free. 'pro' = Pro-only lesson. Free users see it with a PRO badge but it never blocks downstream lesson unlocks for them.
  maxQuestions?: number; // Total questions in a session. Defaults depend on lesson type (15 tonal / 8 non-tonal).
  questionsPerKey?: number; // Questions per key block. Ignored when establishTonality is false.
  establishTonality?: boolean; // Explicit override. Defaults to true for pitch lessons, false for non-tonal acoustic kinds (same_diff, beating, higher_lower, consonance, match_pitch).
  intro?: LessonIntro; // Optional override — falls back to a type-based default. Single page or sequence of pages.
  itemGroups?: Record<string, string[]>; // Bucket items into answer groups, e.g. { stable: ['1','3','5'], unstable: ['2','4','6','7'] }
  responseModes?: ResponseMode[]; // Allowed response modes for prompts in this level. Defaults to ['select']. e.g. ['sing'] = pure sing-back, ['select','sing'] = mixed.
  singProbability?: number; // When responseModes includes both, probability (0..1) that a prompt is sing-mode. Defaults to 0.5.
  singAcceptAnyOctave?: boolean; // Sing mode: accept any octave of the target note. Defaults to true (easier); set false when octave accuracy is part of the drill.
  singToleranceCents?: number; // Sing mode: ± cents considered in tune. Defaults to 50. Tighten for harder lessons.
  singHoldMs?: number; // Sing mode: how long the user must stay in tune before the note counts. Defaults to 900ms.
  singPerNoteHoldMs?: number; // Sing-sequence mode: hold per note before advancing. Defaults to 250ms.
  // Sing-sequence configuration — diatonic.
  sequenceShape?: number[]; // Scale-step offsets from the start degree. e.g. [0, 1, 0, -1, 0] = up-step, back, down-step, back.
  sequenceScale?: DiatonicScale; // Scale to walk. Defaults to 'major'.
  sequenceKeyRoot?: string; // Tonic of the key, e.g. 'C'. Defaults to 'C'.
  sequenceTransposeStep?: number; // Scale-steps to shift start degree between questions. Defaults to 1.
}

export type Mascot = 'fable' | 'noir' | 'major' | 'pulse';
export type MascotExpression = 'portrait' | 'content' | 'curious' | 'excited' | 'happy' | 'laugh' | 'listening';

export interface LessonIntroCopy {
  idea: string; // What the skill is.
  purpose: string; // Why it matters.
  expectation: string; // What the user will do in this session.
  mascot?: Mascot;
  expression?: MascotExpression;
}

// Intros can be a single page or a short sequence. Each page can vary its mascot.
export type LessonIntro = LessonIntroCopy | LessonIntroCopy[];

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
