// The Rhythm path: reading rhythm and hearing it, both ways round. Each idea comes in four
// kinds of lesson:
//   values  how long a note or rest lasts (rhythm_value)
//   count   which count a note falls on (rhythm_count)
//   tap     read a bar and tap it after a count-in (rhythm_tap); the rhythm is never
//           played first, since hearing it would give the answer away
//   hear    hear a bar and pick which of three written rhythms it was (rhythm_hear)
// Order: the beat (quarters and halves), eighths, dots and ties, sixteenths, syncopation,
// then triplets and 6/8. Rhythms are written in the notation of src/rhythm/model.ts;
// questions are built in src/rhythm/questions.ts.
//
// Lesson ids are permanent (progress is stored by id). See AGENTS.md.

import type { CurriculumLevel, CurriculumSegment } from './types';
import type { VisualKind } from './notation/prompt';
import { groupByAnswer } from './notation/questions';
import { rhythmKey } from './rhythm/model';

type Lesson = Omit<CurriculumLevel, 'segmentId' | 'type' | 'unlockRequirement'> & { unlockRequirement?: number };

function lesson(segmentId: string, kind: VisualKind, l: Lesson): CurriculumLevel {
  return {
    unlockRequirement: 80,
    ...l,
    type: 'reading',
    visualKind: kind,
    segmentId,
    ...(kind === 'rhythm_value' ? { itemGroups: groupByAnswer(kind, l.items) } : {}),
  };
}

/** A lesson whose items are its rhythms (tap and hear lessons). */
const byRhythm = (pool: string[]) => ({ items: pool.map(rhythmKey), rhythmPool: pool });
const counts = (...cs: string[]) => cs.map((c) => `ct_${c}`);

// ---------------------------------------------------------------------------
// Rhythm pools. Each is a set of one-bar rhythms that a lesson draws from.

const QUARTERS = ['q q q q', 'h q q', 'q q h', 'h h', 'q h q', 'w', 'q qr q q', 'h qr q', 'qr q h', 'q q qr q'];
const EIGHTHS = ['e e q q q', 'q e e q q', 'q q e e q', 'q q q e e', 'e e e e h', 'q e e e e q', 'e e q e e q', 'h e e q', 'q q e e e e'];
const EIGHTH_RESTS = ['er e q q q', 'q er e q q', 'q q er e q', 'q q q er e', 'er e er e h', 'q er e er e q', 'er e q er e q'];
const DOTTED = ['q. e q q', 'q q. e q', 'q q q. e', 'q. e q. e', 'h. q', 'q. e h', 'h q. e', 'q h.'];
const TIES = ['q~e e q q', 'h~e e q', 'q e e~e e q', 'q q~e e q', 'e e~q q q'];
const SIXTEENTHS_24 = ['s s s s q', 'q s s s s', 'e s s q', 's s e q', 'q e s s', 'e. s q', 'q e. s', 's s s s s s s s', 'e s s s s e'];
const SIXTEENTHS = ['s s s s q q q', 'q s s s s q q', 'e s s q q q', 's s e q q q', 'q q e s s q', 'e. s q q q', 'q e. s q q', 'q q s s s s q'];
const SYNCOPATION = ['e q e q q', 'q e q e q', 'e q q e q', 'e q e e q e', 'q. q. q', 'q. e~q q', 'e q. q q', 'q e q. q'];
const TRIPLETS_24 = ['t t t q', 'q t t t', 't t t t t t', 'e e t t t', 't t t e e'];
const TRIPLETS = ['t t t q q q', 'q t t t q q', 'q q t t t q', 't t t t t t h', 'e e t t t q q', 'q q q t t t'];
const SIX_EIGHT = ['q e q e', 'q. q.', 'e e e q e', 'q e e e e', 'q. e e e', 'e e e q.', 'q e q.'];

// ---------------------------------------------------------------------------

const beat: CurriculumSegment = {
  id: 'rhy_beat',
  pathId: 'rhythm',
  name: 'The Beat',
  description: 'Quarters, halves and wholes, and counting to four',
  icon: '🥁',
  color: 'orange',
  levels: [
    lesson('rhy_beat', 'rhythm_value', {
      id: 'ry_values_long',
      name: 'Whole, Half, Quarter',
      description: 'How long each note and rest lasts',
      items: ['val_w', 'val_h', 'val_q', 'val_wr', 'val_hr', 'val_qr'],
      maxQuestions: 10,
      intro: [
        {
          idea: 'Rhythm is counted in beats. In 4/4 there are four beats in a bar, and a quarter note lasts one.',
          purpose: 'A half note lasts two (an open head), a whole note four (an open head, no stem). Each rest is a silence of the same length.',
          expectation: 'Say how many beats each note or rest lasts.',
          mascot: 'pulse',
          rhythmFigure: { src: 'q q h' },
        },
      ],
    }),
    lesson('rhy_beat', 'rhythm_count', {
      id: 'ry_count_quarters',
      name: 'Counting to Four',
      description: 'Which beat does the note start on?',
      items: counts('1', '2', '3', '4'),
      rhythmPool: QUARTERS,
      maxQuestions: 10,
      prerequisites: ['ry_values_long'],
      intro: {
        idea: 'Count every beat, even the ones inside a long note: 1, 2, 3, 4.',
        purpose: 'A half note on 1 takes beats 1 and 2, so the next note starts on 3. Counting the beats you don\'t play is what keeps you in time.',
        expectation: 'One note is marked. Which beat does it start on?',
        mascot: 'pulse',
        rhythmFigure: { src: 'h q q' },
      },
    }),
    lesson('rhy_beat', 'rhythm_tap', {
      id: 'ry_tap_quarters',
      name: 'Tap Quarters and Halves',
      description: 'Read the bar, then tap it',
      ...byRhythm(QUARTERS),
      rhythmBpm: 72,
      maxQuestions: 8,
      unlockRequirement: 75,
      prerequisites: ['ry_count_quarters'],
      intro: {
        idea: 'Read the bar, press start, and tap the rhythm after four clicks.',
        purpose: 'The clicks keep going, one per beat. Tap when a note starts, and hold still through long notes and rests.',
        expectation: 'You won\'t hear the rhythm first: reading it is the point. It plays once you\'ve tapped.',
        mascot: 'pulse',
      },
    }),
    lesson('rhy_beat', 'rhythm_hear', {
      id: 'ry_hear_quarters',
      name: 'Hear Quarters and Halves',
      description: 'Which written rhythm was it?',
      ...byRhythm(QUARTERS),
      rhythmBpm: 80,
      maxQuestions: 10,
      prerequisites: ['ry_count_quarters'],
      intro: {
        idea: 'Now the other way: hear a bar and find it on paper.',
        purpose: 'Four clicks count you in, then the rhythm plays. Count along, and notice which beats have a new sound.',
        expectation: 'Pick the rhythm you heard: A, B or C.',
        mascot: 'pulse',
      },
    }),
  ],
};

const eighths: CurriculumSegment = {
  id: 'rhy_eighths',
  pathId: 'rhythm',
  name: 'Eighth Notes',
  description: 'Two to a beat: "1 &"',
  icon: '🎵',
  color: 'yellow',
  levels: [
    lesson('rhy_eighths', 'rhythm_value', {
      id: 'ry_values_eighths',
      name: 'Eighths and Their Rests',
      description: 'Half a beat each',
      items: ['val_e', 'val_er', 'val_q', 'val_qr', 'val_h'],
      maxQuestions: 10,
      prerequisites: ['ry_values_long'],
      intro: {
        idea: 'An eighth note lasts half a beat. On its own it has a flag; in pairs the flags join into a beam.',
        purpose: 'The eighth rest is the little 7-shaped sign. Two eighths fill the time of one quarter.',
        expectation: 'How many beats does each one last?',
        mascot: 'pulse',
        rhythmFigure: { src: 'e e q e e q' },
      },
    }),
    lesson('rhy_eighths', 'rhythm_count', {
      id: 'ry_count_eighths',
      name: 'Counting "1 &"',
      description: 'The beat and the "and" between',
      items: counts('1', '1&', '2', '2&', '3', '3&', '4', '4&'),
      rhythmPool: [...EIGHTHS, ...EIGHTH_RESTS],
      maxQuestions: 12,
      prerequisites: ['ry_values_eighths', 'ry_count_quarters'],
      intro: {
        idea: 'Split every beat in two and count "1 & 2 & 3 & 4 &".',
        purpose: 'The number is the beat; the "&" is halfway to the next one. A note on an "&" falls between the clicks.',
        expectation: 'Which count is the marked note on?',
        mascot: 'pulse',
        rhythmFigure: { src: 'q e e q e e' },
      },
    }),
    lesson('rhy_eighths', 'rhythm_tap', {
      id: 'ry_tap_eighths',
      name: 'Tap Eighths',
      description: 'Two taps to a click',
      ...byRhythm(EIGHTHS),
      rhythmBpm: 72,
      maxQuestions: 8,
      unlockRequirement: 75,
      prerequisites: ['ry_count_eighths', 'ry_tap_quarters'],
    }),
    lesson('rhy_eighths', 'rhythm_hear', {
      id: 'ry_hear_eighths',
      name: 'Hear Eighths',
      description: 'Which written rhythm was it?',
      ...byRhythm(EIGHTHS),
      rhythmBpm: 84,
      maxQuestions: 10,
      prerequisites: ['ry_count_eighths', 'ry_hear_quarters'],
    }),
    lesson('rhy_eighths', 'rhythm_tap', {
      id: 'ry_tap_offbeats',
      name: 'Off the Beat',
      description: 'Eighth rests: tap on the "&"',
      ...byRhythm(EIGHTH_RESTS),
      rhythmBpm: 66,
      maxQuestions: 8,
      unlockRequirement: 75,
      prerequisites: ['ry_tap_eighths'],
      intro: {
        idea: 'An eighth rest on the beat pushes the note to the "&".',
        purpose: 'Feel the click as the "1" you don\'t play, then tap halfway to the next one. It\'s the first step to syncopation.',
        expectation: 'Tap the notes only, never the rests.',
        mascot: 'pulse',
        rhythmFigure: { src: 'er e er e h' },
      },
    }),
  ],
};

const dots: CurriculumSegment = {
  id: 'rhy_dots',
  pathId: 'rhythm',
  name: 'Dots and Ties',
  description: 'Notes that last past the beat',
  icon: '🔗',
  color: 'teal',
  levels: [
    lesson('rhy_dots', 'rhythm_value', {
      id: 'ry_values_dotted',
      name: 'Dotted Notes',
      description: 'A dot adds half again',
      items: ['val_h.', 'val_q.', 'val_h', 'val_q', 'val_e'],
      maxQuestions: 10,
      prerequisites: ['ry_values_eighths'],
      intro: {
        idea: 'A dot after a note adds half its value again.',
        purpose: 'A dotted half is 2 + 1 = 3 beats. A dotted quarter is 1 + ½ = 1½ beats, so it\'s usually followed by an eighth to get back on the beat.',
        expectation: 'How many beats?',
        mascot: 'pulse',
        rhythmFigure: { src: 'q. e h' },
      },
    }),
    lesson('rhy_dots', 'rhythm_count', {
      id: 'ry_count_dotted',
      name: 'Counting Dotted Rhythms',
      description: 'Where the eighth after the dot lands',
      items: counts('2', '2&', '3', '3&', '4', '4&'),
      rhythmPool: DOTTED,
      maxQuestions: 10,
      prerequisites: ['ry_values_dotted', 'ry_count_eighths'],
      intro: {
        idea: 'A dotted quarter on 1 lasts through "1 & 2", so the eighth after it is on "2 &".',
        purpose: 'Count the eighths inside the long note and the short one falls into place.',
        expectation: 'Which count is the marked note on?',
        mascot: 'pulse',
        rhythmFigure: { src: 'q. e q q' },
      },
    }),
    lesson('rhy_dots', 'rhythm_tap', {
      id: 'ry_tap_dotted',
      name: 'Tap Dotted Rhythms',
      description: 'Long, short',
      ...byRhythm(DOTTED),
      rhythmBpm: 72,
      maxQuestions: 8,
      unlockRequirement: 75,
      prerequisites: ['ry_count_dotted', 'ry_tap_eighths'],
    }),
    lesson('rhy_dots', 'rhythm_tap', {
      id: 'ry_tap_ties',
      name: 'Ties',
      description: 'Two notes, one sound',
      ...byRhythm(TIES),
      rhythmBpm: 66,
      maxQuestions: 8,
      unlockRequirement: 75,
      prerequisites: ['ry_tap_dotted'],
      intro: {
        idea: 'A tie joins two notes into one longer sound: play the first, hold through the second.',
        purpose: 'A quarter tied to an eighth sounds exactly like a dotted quarter. Ties are how a note is written across a beat or a bar line.',
        expectation: 'Tap only where a sound starts, not at the far end of a tie.',
        mascot: 'pulse',
        rhythmFigure: { src: 'q e e~e e q' },
      },
    }),
    lesson('rhy_dots', 'rhythm_hear', {
      id: 'ry_hear_dotted',
      name: 'Hear Dots and Ties',
      description: 'Which written rhythm was it?',
      ...byRhythm([...DOTTED, ...TIES]),
      rhythmBpm: 80,
      maxQuestions: 10,
      prerequisites: ['ry_tap_ties', 'ry_hear_eighths'],
    }),
  ],
};

const sixteenths: CurriculumSegment = {
  id: 'rhy_sixteenths',
  pathId: 'rhythm',
  name: 'Sixteenths',
  description: 'Four to a beat: "1 e & a"',
  icon: '🎶',
  color: 'blue',
  levels: [
    lesson('rhy_sixteenths', 'rhythm_value', {
      id: 'ry_values_sixteenths',
      name: 'Sixteenths',
      description: 'A quarter of a beat',
      items: ['val_s', 'val_sr', 'val_e', 'val_e.', 'val_q'],
      maxQuestions: 10,
      prerequisites: ['ry_values_dotted'],
      intro: {
        idea: 'A sixteenth note lasts a quarter of a beat: two flags, or two beams.',
        purpose: 'A dotted eighth (¾) and a sixteenth (¼) fill one beat between them: the "long-short" of a shuffle or a march.',
        expectation: 'How many beats?',
        mascot: 'pulse',
        rhythmFigure: { src: 's s s s e e e. s q' },
      },
    }),
    lesson('rhy_sixteenths', 'rhythm_count', {
      id: 'ry_count_sixteenths',
      name: 'Counting "1 e & a"',
      description: 'Every quarter of the beat has a name',
      items: counts('1', '1e', '1&', '1a', '2', '2e', '2&', '2a'),
      rhythmPool: SIXTEENTHS_24,
      rhythmTime: '2/4',
      maxQuestions: 12,
      prerequisites: ['ry_values_sixteenths', 'ry_count_eighths'],
      intro: {
        idea: 'Split each beat in four and say "1 e & a, 2 e & a".',
        purpose: '"&" is still halfway. "e" comes just after the beat, "a" just before the next. These bars are in 2/4, two beats, so the counts stay short.',
        expectation: 'Which count is the marked note on?',
        mascot: 'pulse',
        rhythmFigure: { src: 'e s s s s e', time: '2/4' },
      },
    }),
    lesson('rhy_sixteenths', 'rhythm_tap', {
      id: 'ry_tap_sixteenths',
      name: 'Tap Sixteenths',
      description: 'Slow and even',
      ...byRhythm(SIXTEENTHS),
      rhythmBpm: 60,
      maxQuestions: 8,
      unlockRequirement: 70,
      prerequisites: ['ry_count_sixteenths', 'ry_tap_dotted'],
    }),
    lesson('rhy_sixteenths', 'rhythm_hear', {
      id: 'ry_hear_sixteenths',
      name: 'Hear Sixteenths',
      description: 'Which written rhythm was it?',
      ...byRhythm(SIXTEENTHS),
      rhythmBpm: 72,
      maxQuestions: 10,
      prerequisites: ['ry_count_sixteenths', 'ry_hear_eighths'],
    }),
  ],
};

const syncopation: CurriculumSegment = {
  id: 'rhy_sync',
  pathId: 'rhythm',
  name: 'Syncopation',
  description: 'Accents off the beat',
  icon: '⚡',
  color: 'pink',
  levels: [
    lesson('rhy_sync', 'rhythm_count', {
      id: 'ry_count_sync',
      name: 'Counting Syncopation',
      description: 'Notes that start on the "&"',
      items: counts('1&', '2', '2&', '3', '3&', '4&'),
      rhythmPool: SYNCOPATION,
      maxQuestions: 10,
      prerequisites: ['ry_count_dotted'],
      intro: {
        idea: 'Syncopation puts long notes on the "&", so the beat itself goes quiet.',
        purpose: 'An eighth, then a quarter: the quarter starts on "1 &" and rings through beat 2. Keep counting the beat underneath and it stops feeling like a stumble.',
        expectation: 'Which count is the marked note on?',
        mascot: 'pulse',
        rhythmFigure: { src: 'e q e q q' },
      },
    }),
    lesson('rhy_sync', 'rhythm_tap', {
      id: 'ry_tap_sync',
      name: 'Tap Syncopation',
      description: 'Hold the beat, play around it',
      ...byRhythm(SYNCOPATION),
      rhythmBpm: 72,
      maxQuestions: 8,
      unlockRequirement: 75,
      prerequisites: ['ry_count_sync', 'ry_tap_ties'],
      intro: {
        idea: 'The last rhythm here is 3 + 3 + 2: three eighths, three eighths, two.',
        purpose: 'It\'s the tresillo, the pattern under a huge amount of Latin, pop and dance music. Written as dotted quarters or with a tie, it sounds the same.',
        expectation: 'Tap the notes; the clicks keep the beat.',
        mascot: 'pulse',
        rhythmFigure: { src: 'q. q. q' },
      },
    }),
    lesson('rhy_sync', 'rhythm_hear', {
      id: 'ry_hear_sync',
      name: 'Hear Syncopation',
      description: 'Which written rhythm was it?',
      ...byRhythm(SYNCOPATION),
      rhythmBpm: 84,
      maxQuestions: 10,
      prerequisites: ['ry_count_sync', 'ry_hear_dotted'],
    }),
  ],
};

const threes: CurriculumSegment = {
  id: 'rhy_threes',
  pathId: 'rhythm',
  name: 'Triplets and 6/8',
  description: 'Beats split in three',
  icon: '🔺',
  color: 'purple',
  levels: [
    lesson('rhy_threes', 'rhythm_count', {
      id: 'ry_count_triplets',
      name: 'Triplets',
      description: 'Three in the time of two: "1 trip let"',
      items: counts('1', '1trip', '1let', '2', '2trip', '2let'),
      rhythmPool: TRIPLETS_24,
      rhythmTime: '2/4',
      maxQuestions: 10,
      prerequisites: ['ry_count_eighths'],
      intro: {
        idea: 'A triplet squeezes three eighths into one beat. The 3 over the beam says so.',
        purpose: 'Count "1 trip let, 2 trip let". Unlike "1 &", the beat is split into three equal parts, so it rolls instead of marching.',
        expectation: 'Which count is the marked note on?',
        mascot: 'pulse',
        rhythmFigure: { src: 't t t e e', time: '2/4' },
      },
    }),
    lesson('rhy_threes', 'rhythm_tap', {
      id: 'ry_tap_triplets',
      name: 'Tap Triplets',
      description: 'Three even taps per click',
      ...byRhythm(TRIPLETS),
      rhythmBpm: 63,
      maxQuestions: 8,
      unlockRequirement: 70,
      prerequisites: ['ry_count_triplets', 'ry_tap_eighths'],
    }),
    lesson('rhy_threes', 'rhythm_hear', {
      id: 'ry_hear_triplets',
      name: 'Hear Triplets',
      description: 'Twos or threes?',
      ...byRhythm([...TRIPLETS, 'e e q q q', 'q e e q q', 'q q e e q']),
      rhythmBpm: 72,
      maxQuestions: 10,
      prerequisites: ['ry_count_triplets', 'ry_hear_eighths'],
    }),
    lesson('rhy_threes', 'rhythm_count', {
      id: 'ry_count_68',
      name: 'Counting 6/8',
      description: 'Six eighths, felt in two',
      items: counts('1', '2', '3', '4', '5', '6'),
      rhythmPool: SIX_EIGHT,
      rhythmTime: '6/8',
      maxQuestions: 10,
      prerequisites: ['ry_count_triplets'],
      intro: {
        idea: 'In 6/8 the eighth note gets the count: six to a bar, felt as two big beats of three.',
        purpose: 'Count "1 2 3 4 5 6", leaning on 1 and 4. A quarter takes two counts, a dotted quarter three: one big beat.',
        expectation: 'Which count is the marked note on?',
        mascot: 'pulse',
        rhythmFigure: { src: 'q e q e', time: '6/8' },
      },
    }),
    lesson('rhy_threes', 'rhythm_tap', {
      id: 'ry_tap_68',
      name: 'Tap 6/8',
      description: 'Two clicks a bar',
      ...byRhythm(SIX_EIGHT),
      rhythmTime: '6/8',
      rhythmBpm: 52,
      maxQuestions: 8,
      unlockRequirement: 75,
      prerequisites: ['ry_count_68', 'ry_tap_eighths'],
      intro: {
        idea: 'The clicks fall on 1 and 4: the two big beats.',
        purpose: 'Each click has three eighths inside it. Long-short (quarter, eighth) is the lilt of a jig or a lullaby.',
        expectation: 'Tap the notes.',
        mascot: 'pulse',
      },
    }),
    lesson('rhy_threes', 'rhythm_hear', {
      id: 'ry_hear_68',
      name: 'Hear 6/8',
      description: 'Which written rhythm was it?',
      ...byRhythm(SIX_EIGHT),
      rhythmTime: '6/8',
      rhythmBpm: 56,
      maxQuestions: 10,
      prerequisites: ['ry_count_68', 'ry_hear_eighths'],
    }),
  ],
};

export const RHYTHM_SEGMENTS: CurriculumSegment[] = [beat, eighths, dots, sixteenths, syncopation, threes];

/** What "continue" walks through on the Rhythm path. */
export const RHYTHM_TEACHING_ORDER: string[] = [
  'ry_values_long', 'ry_count_quarters', 'ry_tap_quarters', 'ry_hear_quarters',
  'ry_values_eighths', 'ry_count_eighths', 'ry_tap_eighths', 'ry_hear_eighths', 'ry_tap_offbeats',
  'ry_values_dotted', 'ry_count_dotted', 'ry_tap_dotted', 'ry_tap_ties', 'ry_hear_dotted',
  'ry_count_sync', 'ry_tap_sync', 'ry_hear_sync',
  'ry_values_sixteenths', 'ry_count_sixteenths', 'ry_tap_sixteenths', 'ry_hear_sixteenths',
  'ry_count_triplets', 'ry_tap_triplets', 'ry_hear_triplets', 'ry_count_68', 'ry_tap_68', 'ry_hear_68',
];
