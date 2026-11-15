// What a visual question shows. Plain data, so a question can be stored, replayed and
// tested without rendering anything. src/notation/questions.ts builds these;
// src/components/VisualPrompt.tsx draws them.

import type { ClefId, NeckId } from './theory';
import type { RNote, TimeSig } from '../rhythm/model';

export type VisualKind =
  // Read Music
  | 'clef_sign' // a clef on its own: which note does it mark?
  | 'staff_note' // name the note
  | 'staff_find' // tap where a named note goes
  | 'staff_compare' // a note in one clef: tap the same pitch in another
  | 'shape_interval' // two notes, no clef: the interval's size
  | 'shape_triad' // three notes, no clef: root position or which inversion
  | 'staff_interval' // two notes in a clef: the interval with its quality
  | 'staff_triad' // a chord in a clef: its quality
  | 'chord_root' // an inverted chord: its root
  | 'key_signature' // a key signature: which major key
  | 'note_in_key' // a note under a key signature: its full name
  | 'transpose' // a transposing instrument's written note: what sounds
  | 'score_chord' // a chord spread over a score: its quality
  // Guitar
  | 'fret_across' // a named root and a dot one string away: the 4th up or the 5th down
  | 'fret_note' // name the dot
  | 'fret_find' // tap a named note on a string
  | 'fret_octave' // tap the octave above a dot
  | 'fret_interval' // name the interval between root and dot
  | 'fret_interval_find' // tap an interval above the root
  | 'fret_triad' // name a three-note chord shape
  | 'fret_shape_tone' // a chord or scale shape: which degree is the marked dot?
  | 'fret_shape_find' // a shape with one degree missing: tap it
  | 'staff_to_fret' // a written note: tap it on the neck
  // Rhythm
  | 'rhythm_value' // one note or rest: how many beats?
  | 'rhythm_count' // a bar with one note marked: which count is it on?
  | 'rhythm_hear' // hear a bar: which of the written rhythms was it?
  | 'rhythm_tap' // read a bar, then tap it after a count-in
  // Theory
  | 'th_scale_step' // a scale with two notes marked: whole or half step?
  | 'th_degree' // a note in a named key: which scale degree?
  | 'th_numeral' // a chord in a named key: which Roman numeral?
  | 'th_minor_key' // a key signature: which minor key?
  | 'th_seventh' // a seventh chord: which quality?
  | 'th_cadence' // three chords: which cadence ends the phrase?
  | 'th_mode' // a scale: which mode?
  // History
  | 'hx_era' // a composer: which era?
  | 'hx_quiz' // a question with four answers
  | 'hx_hear'; // a short passage: which style?

export type AccGlyph = 'sharp' | 'flat' | 'natural' | 'dsharp' | 'dflat';

export interface StaffNote {
  p: number; // staff position, 0 = bottom line
  acc?: AccGlyph; // accidental to draw in front of the note
  col?: number; // horizontal slot, 0 first; notes sharing a slot form a chord
  root?: boolean; // tint as the root once answered
  mark?: boolean; // highlighted: the note(s) a question asks about
}

export interface StaffSpec {
  clef: ClefId | null; // null = no clef: the shape is all there is
  label?: string; // instrument name, drawn to the left
  keySig?: number; // sharps (>0) or flats (<0)
  notes: StaffNote[];
  /** Text under each column (e.g. Roman numerals), shown once answered. */
  labelsAfter?: string[];
}

export interface FretMark {
  s: number;
  f: number;
  kind: 'root' | 'target' | 'dot' | 'ghost'; // ghost: the rest of a shape, drawn quietly
  label?: string;
  /** Label once answered, e.g. a shape's degrees. */
  after?: string;
}

export interface VisualPrompt {
  /** The instruction above the picture, e.g. "Name this note". */
  prompt: string;
  /** Staves, top to bottom. Two with `grand` = a grand staff. */
  staves?: StaffSpec[];
  grand?: boolean;
  /** Score lessons: draw a bracket and the instrument labels. */
  score?: boolean;
  fretboard?: { marks: FretMark[]; focusFret?: number; strings?: number[]; neck?: NeckId };
  /** Tap answers. A tap on any accepted spot is right. */
  tap?:
    | { target: 'staff'; staff: number; accept: number[]; range: [number, number]; acc?: AccGlyph }
    | { target: 'fret'; accept: string[]; strings?: number[] };
  /** A rhythm on a one-line staff. `counts` show under the notes once answered. */
  rhythm?: { notes: RNote[]; time: TimeSig; mark?: number; counts?: string[]; free?: boolean };
  /** Answer buttons for this question only, in place of the lesson's (e.g. A, B, C, each a written rhythm). */
  choices?: Array<{ key: string; rhythm?: { notes: RNote[]; time: TimeSig } }>;
  /** Rhythm playback: a count-in, then the rhythm. Onsets are in beats. */
  rhythmPlay?: { onsets: number[]; bpm: number; countIn: number; beatsPerBar: number; metronome?: boolean };
  /** A big line of text in a card (a composer's name), with more shown once answered. */
  card?: { text: string; after?: string };
  /** A short passage of music (History listening). */
  passage?: { events: Array<{ t: number; notes: string[]; d: number }>; bpm: number };
  /** Chords to play one after another (a cadence), each a list of tones. */
  chords?: string[][];
  /** Play the sound as soon as the question is up (listening questions). */
  listen?: boolean;
  /** Tap-the-rhythm questions: what's graded. Taps are matched to the onsets after the count-in. */
  tapRhythm?: { onsets: number[]; bpm: number; countIn: number; beatsPerBar: number; toleranceMs: number; metronome: boolean };
  /** What to add to the picture once answered (e.g. the note the learner should have found). */
  reveal?: { staffNotes?: Array<StaffNote & { staff: number }>; fretMarks?: FretMark[]; labelLine?: { staff: number; p: number; text: string } };
  /** One or two sentences shown after answering: how to read it, not just what it was. */
  explain: string;
  /** Sounding pitches ('C#4' style) for the hear-it button. Played together when `together`. */
  sound: string[];
  together?: boolean;
}
