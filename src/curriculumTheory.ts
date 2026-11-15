// The Theory path: how music is put together, seen on the staff and heard. Scales and
// their steps, keys, the chords of a key and their Roman numerals, seventh chords,
// cadences, and the modes. Read Music teaches reading the page; this path teaches what the
// page means. Questions are built in src/theory/questions.ts.
//
// Lesson ids are permanent (progress is stored by id). See AGENTS.md.

import type { CurriculumLevel, CurriculumSegment } from './types';
import type { VisualKind } from './notation/prompt';
import { groupByAnswer } from './notation/questions';

type Lesson = Omit<CurriculumLevel, 'segmentId' | 'type' | 'unlockRequirement'> & { unlockRequirement?: number };

function lesson(segmentId: string, kind: VisualKind, l: Lesson): CurriculumLevel {
  return {
    unlockRequirement: 80,
    ...l,
    type: 'reading',
    visualKind: kind,
    segmentId,
    ...(kind === 'th_scale_step' ? { itemGroups: groupByAnswer(kind, l.items) } : {}),
  };
}

const steps = (mode: 'major' | 'minor') => [1, 2, 3, 4, 5, 6, 7].map((k) => `${mode}:${k}`);
const degrees = (...ds: number[]) => ds.map((d) => `sd_${d}`);
const numerals = (...ds: number[]) => ds.map((d) => `rn_${d}`);

const scales: CurriculumSegment = {
  id: 'thy_scales',
  pathId: 'theory',
  name: 'Scales',
  description: 'Whole steps, half steps, and the degrees of a key',
  icon: '🪜',
  color: 'blue',
  levels: [
    lesson('thy_scales', 'th_scale_step', {
      id: 'th_steps_major',
      name: 'The Major Scale',
      description: 'W W H W W W H',
      items: steps('major'),
      maxQuestions: 10,
      intro: [
        {
          idea: 'A half step is the smallest step: the very next key. A whole step is two half steps.',
          purpose: 'Every major scale, from any note, uses the same pattern: whole, whole, half, whole, whole, whole, half. The half steps fall between notes 3–4 and 7–8.',
          expectation: 'Two neighbouring notes of a scale are marked. Whole step or half step?',
          mascot: 'major',
        },
      ],
    }),
    lesson('thy_scales', 'th_scale_step', {
      id: 'th_steps_minor',
      name: 'The Minor Scale',
      description: 'W H W W H W W',
      items: steps('minor'),
      maxQuestions: 10,
      prerequisites: ['th_steps_major'],
      intro: {
        idea: 'The natural minor scale moves its half steps: they fall between 2–3 and 5–6.',
        purpose: 'That puts a minor 3rd above the tonic instead of a major one, which is most of why minor sounds darker.',
        expectation: 'Whole step or half step?',
        mascot: 'noir',
      },
    }),
    lesson('thy_scales', 'th_degree', {
      id: 'th_degrees',
      name: 'Scale Degrees',
      description: 'Tonic, dominant and the rest',
      items: degrees(1, 2, 3, 4, 5, 6, 7),
      keys: ['C', 'G', 'F', 'D'],
      maxQuestions: 12,
      prerequisites: ['th_steps_major'],
      intro: {
        idea: 'Each note of a key has a number and a name: 1 is the tonic, 5 the dominant, 4 the subdominant, 7 the leading tone.',
        purpose: 'Numbers work in every key, so "a melody that goes 5 to 1" means the same thing in C or in E♭. It\'s how musicians talk about music without naming a key.',
        expectation: 'The key is named. Which degree is the note?',
        mascot: 'major',
      },
    }),
  ],
};

const keys: CurriculumSegment = {
  id: 'thy_keys',
  pathId: 'theory',
  name: 'Keys',
  description: 'Key signatures, major and minor',
  icon: '🔑',
  color: 'yellow',
  levels: [
    lesson('thy_keys', 'key_signature', {
      id: 'th_keys_major',
      name: 'Major Keys',
      description: 'Up to four sharps or flats',
      items: ['key_C', 'key_G', 'key_D', 'key_A', 'key_E', 'key_F', 'key_Bb', 'key_Eb', 'key_Ab'],
      maxQuestions: 12,
      prerequisites: ['th_degrees'],
      intro: {
        idea: 'A key signature lists the sharps or flats the major scale of that key needs.',
        purpose: 'Sharps: the last sharp is the 7th note, so the key is a half step up. Flats: the second-to-last flat names the key (F has one flat, B♭). Each step round the circle of 5ths adds one.',
        expectation: 'Which major key?',
        mascot: 'major',
      },
    }),
    lesson('thy_keys', 'th_minor_key', {
      id: 'th_keys_minor',
      name: 'Minor Keys',
      description: 'The relative minor',
      items: ['mkey_A', 'mkey_E', 'mkey_B', 'mkey_F#', 'mkey_C#', 'mkey_D', 'mkey_G', 'mkey_C', 'mkey_F'],
      maxQuestions: 12,
      prerequisites: ['th_keys_major', 'th_steps_minor'],
      intro: {
        idea: 'Every key signature belongs to a major key and a minor key: its relative minor.',
        purpose: 'The relative minor starts on the 6th note of the major scale, a minor 3rd down. C major and A minor share every note; only the home note differs.',
        expectation: 'Which minor key has this signature?',
        mascot: 'noir',
      },
    }),
  ],
};

const chords: CurriculumSegment = {
  id: 'thy_chords',
  pathId: 'theory',
  name: 'Chords in a Key',
  description: 'Roman numerals and seventh chords',
  icon: '🏛️',
  color: 'purple',
  levels: [
    lesson('thy_chords', 'th_numeral', {
      id: 'th_numerals_c',
      name: 'The Chords of C Major',
      description: 'I ii iii IV V vi vii°',
      items: numerals(1, 2, 3, 4, 5, 6, 7),
      keys: ['C'],
      maxQuestions: 12,
      prerequisites: ['th_degrees'],
      intro: {
        idea: 'Build a triad on every note of the scale and you get the seven chords of the key.',
        purpose: 'Roman numerals name them by their root\'s degree: capitals for major (I, IV, V), small letters for minor (ii, iii, vi), and ° for the diminished vii°. The pattern is the same in every major key.',
        expectation: 'Which chord of the key is it?',
        mascot: 'major',
      },
    }),
    lesson('thy_chords', 'th_numeral', {
      id: 'th_numerals_keys',
      name: 'Chords in Any Key',
      description: 'The same numerals, other keys',
      items: numerals(1, 2, 3, 4, 5, 6, 7),
      keys: ['G', 'F', 'D', 'Bb', 'A', 'Eb'],
      maxQuestions: 12,
      prerequisites: ['th_numerals_c', 'th_keys_major'],
      intro: {
        idea: 'Find the tonic from the key, count up to the chord\'s root, and you have the numeral.',
        purpose: 'This is why musicians say "I–IV–V" instead of "G–C–D": the numerals carry over to any key.',
        expectation: 'The key is named. Which chord is it?',
        mascot: 'major',
      },
    }),
    lesson('thy_chords', 'th_seventh', {
      id: 'th_sevenths',
      name: 'Seventh Chords',
      description: 'maj7, 7, m7, m7♭5, dim7',
      items: ['sev_maj7', 'sev_7', 'sev_m7', 'sev_m7b5', 'sev_dim7'],
      maxQuestions: 12,
      prerequisites: ['th_numerals_c'],
      intro: {
        idea: 'Add one more 3rd on top of a triad and you get a seventh chord.',
        purpose: 'Name it by its triad and its 7th: a major triad with a major 7th is maj7; with a minor 7th, a dominant 7th (V7 in every key). Minor + minor 7th is m7; diminished + minor 7th is half-diminished; stack minor 3rds all the way and it\'s fully diminished.',
        expectation: 'Which seventh chord is it?',
        mascot: 'noir',
      },
    }),
  ],
};

const cadences: CurriculumSegment = {
  id: 'thy_cadences',
  pathId: 'theory',
  name: 'Cadences',
  description: 'How phrases end',
  icon: '🏁',
  color: 'teal',
  levels: [
    lesson('thy_cadences', 'th_cadence', {
      id: 'th_cadence_full_half',
      name: 'Full Stop or Comma',
      description: 'Authentic and half cadences',
      items: ['cad_authentic', 'cad_half'],
      keys: ['C', 'G', 'F'],
      maxQuestions: 10,
      prerequisites: ['th_numerals_c'],
      intro: {
        idea: 'A cadence is how a phrase ends, and the last two chords decide it.',
        purpose: 'V to I is an authentic cadence: settled, a full stop. Ending on V is a half cadence: it hangs, like a comma, waiting for more. Read the numerals, then listen for it.',
        expectation: 'How does the phrase end?',
        mascot: 'major',
      },
    }),
    lesson('thy_cadences', 'th_cadence', {
      id: 'th_cadences',
      name: 'Four Cadences',
      description: 'Authentic, plagal, half, deceptive',
      items: ['cad_authentic', 'cad_plagal', 'cad_half', 'cad_deceptive'],
      keys: ['C', 'G', 'F', 'D', 'Bb'],
      maxQuestions: 12,
      prerequisites: ['th_cadence_full_half', 'th_numerals_keys'],
      intro: {
        idea: 'Two more: IV–I is plagal (the "Amen" at the end of a hymn), and V–vi is deceptive.',
        purpose: 'The deceptive cadence sets up the home chord and swerves to vi, its relative minor. Composers use it to keep a piece going when it sounds about to end.',
        expectation: 'How does the phrase end?',
        mascot: 'major',
      },
    }),
  ],
};

const modes: CurriculumSegment = {
  id: 'thy_modes',
  pathId: 'theory',
  name: 'Modes',
  description: 'The major scale from every note',
  icon: '🌈',
  color: 'pink',
  levels: [
    lesson('thy_modes', 'th_mode', {
      id: 'th_modes_white',
      name: 'Modes on the White Keys',
      description: 'Same notes, a different home',
      items: ['mode_ionian', 'mode_dorian', 'mode_phrygian', 'mode_lydian', 'mode_mixolydian', 'mode_aeolian', 'mode_locrian'],
      maxQuestions: 12,
      prerequisites: ['th_steps_minor', 'th_degrees'],
      intro: {
        idea: 'Play the white keys from D to D and you get Dorian; from E, Phrygian; from G, Mixolydian. Each start note gives a mode.',
        purpose: 'They\'re the major scale\'s notes with a different note as home, so the whole and half steps fall in different places, and each has its own colour.',
        expectation: 'Which mode is the scale?',
        mascot: 'pulse',
      },
    }),
    lesson('thy_modes', 'th_mode', {
      id: 'th_modes_any',
      name: 'Modes on Any Note',
      description: 'Compare with the major scale',
      items: ['mode_ionian', 'mode_dorian', 'mode_phrygian', 'mode_lydian', 'mode_mixolydian', 'mode_aeolian', 'mode_locrian'],
      allowAccidentals: true,
      maxQuestions: 12,
      prerequisites: ['th_modes_white', 'th_keys_major'],
      intro: {
        idea: 'Now each mode starts anywhere. Compare it with the major scale on the same note.',
        purpose: 'Lydian raises the 4th. Mixolydian lowers the 7th. Dorian lowers the 3rd and 7th. Aeolian (natural minor) lowers 3, 6 and 7. Phrygian adds a ♭2. Locrian lowers 2, 3, 5, 6 and 7.',
        expectation: 'Which mode is the scale?',
        mascot: 'pulse',
      },
    }),
  ],
};

export const THEORY_SEGMENTS: CurriculumSegment[] = [scales, keys, chords, cadences, modes];

/** What "continue" walks through on the Theory path. */
export const THEORY_TEACHING_ORDER: string[] = [
  'th_steps_major', 'th_steps_minor', 'th_degrees',
  'th_keys_major', 'th_numerals_c', 'th_keys_minor',
  'th_cadence_full_half', 'th_numerals_keys', 'th_sevenths', 'th_cadences',
  'th_modes_white', 'th_modes_any',
];
