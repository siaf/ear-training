// The History path: the story of Western music, learned the way the app teaches
// everything, with short questions and spaced review. The eras in order, the composers who
// define them, styles you can hear (short generated passages, each showing a hallmark), the
// forms and inventions that changed music, and jazz and popular music. Content is in
// src/history/content.ts; questions are built in src/history/questions.ts.
//
// Lesson ids are permanent (progress is stored by id). See AGENTS.md.

import type { CurriculumLevel, CurriculumSegment } from './types';
import type { VisualKind } from './notation/prompt';
import { groupByAnswer } from './notation/questions';

type Lesson = Omit<CurriculumLevel, 'segmentId' | 'type' | 'unlockRequirement'> & { unlockRequirement?: number };

function lesson(segmentId: string, kind: VisualKind, l: Lesson): CurriculumLevel {
  return {
    unlockRequirement: 75,
    ...l,
    type: 'reading',
    visualKind: kind,
    segmentId,
    ...(kind === 'hx_era' ? { itemGroups: groupByAnswer(kind, l.items) } : {}),
  };
}

const facts = (...ids: string[]) => ids.map((id) => `fact_${id}`);
const composers = (...ids: string[]) => ids.map((id) => `cmp_${id}`);
const styles = (...ids: string[]) => ids.map((id) => `style_${id}`);

const eras: CurriculumSegment = {
  id: 'hxy_eras',
  pathId: 'history',
  name: 'The Eras',
  description: 'Six periods, in order',
  icon: '⏳',
  color: 'yellow',
  levels: [
    lesson('hxy_eras', 'hx_quiz', {
      id: 'hx_timeline',
      name: 'The Timeline',
      description: 'Medieval to the 20th century',
      items: facts('first_era', 'renaissance_dates', 'baroque_dates', 'classical_dates', 'romantic_dates', 'after_baroque', 'before_baroque', 'twentieth'),
      maxQuestions: 10,
      intro: [
        {
          idea: 'Western music history is usually told in six eras: Medieval, Renaissance, Baroque, Classical, Romantic and the 20th century.',
          purpose: 'Rough dates: Medieval to 1400, Renaissance to 1600, Baroque to 1750 (Bach dies), Classical to about 1820, Romantic to 1900. The edges are blurry; styles overlap.',
          expectation: 'Questions on the order and the dates.',
          mascot: 'noir',
        },
      ],
    }),
    lesson('hxy_eras', 'hx_era', {
      id: 'hx_big_names',
      name: 'The Big Names',
      description: 'Bach to Brahms',
      items: composers('bach', 'handel', 'vivaldi', 'haydn', 'mozart', 'beethoven', 'chopin', 'schubert', 'brahms', 'tchaikovsky', 'verdi', 'wagner'),
      maxQuestions: 12,
      prerequisites: ['hx_timeline'],
      intro: {
        idea: 'Most concert music comes from three eras: Baroque, Classical and Romantic.',
        purpose: 'Bach, Handel and Vivaldi are Baroque; Haydn and Mozart Classical; Beethoven starts Classical and leads into the Romantic era of Schubert, Chopin, Wagner and Brahms.',
        expectation: 'Which era is each composer from?',
        mascot: 'noir',
      },
    }),
    lesson('hxy_eras', 'hx_era', {
      id: 'hx_more_names',
      name: 'Before and After',
      description: 'Medieval, Renaissance, 20th century',
      items: composers('hildegard', 'perotin', 'machaut', 'josquin', 'tallis', 'palestrina', 'purcell', 'clara', 'debussy', 'schoenberg', 'stravinsky', 'bartok', 'copland', 'shostakovich', 'reich'),
      maxQuestions: 12,
      prerequisites: ['hx_big_names'],
      intro: {
        idea: 'Now the eras either side: chant and the first harmony, Renaissance choirs, and the 20th century\'s new sounds.',
        purpose: 'Hildegard, Pérotin and Machaut are Medieval; Josquin, Tallis and Palestrina Renaissance; Debussy, Stravinsky, Schoenberg and Reich the 20th century.',
        expectation: 'Which era is each composer from?',
        mascot: 'noir',
      },
    }),
  ],
};

const hearing: CurriculumSegment = {
  id: 'hxy_hear',
  pathId: 'history',
  name: 'Hear the Styles',
  description: 'What each era sounds like',
  icon: '🎧',
  color: 'teal',
  levels: [
    lesson('hxy_hear', 'hx_hear', {
      id: 'hx_hear_three',
      name: 'Baroque, Classical, Romantic',
      description: 'Running bass, Alberti bass, sweeping arpeggios',
      items: styles('baroque', 'classical', 'romantic'),
      maxQuestions: 10,
      prerequisites: ['hx_big_names'],
      intro: [
        {
          idea: 'Each era has hallmarks you can hear, whatever instrument plays them.',
          purpose: 'Baroque: a bass that never stops and a figure repeated a step lower each time. Classical: a broken-chord accompaniment (low, high, middle, high) under a tidy tune. Romantic: minor key, big leaps, wide arpeggios and tense chords.',
          expectation: 'These are short passages written to show each hallmark, played on your instrument, not real recordings. Listen for texture and harmony, not the sound.',
          mascot: 'pulse',
        },
      ],
    }),
    lesson('hxy_hear', 'hx_hear', {
      id: 'hx_hear_all',
      name: 'Seven Styles',
      description: 'From chant to minimalism',
      items: styles('medieval', 'baroque', 'classical', 'romantic', 'impressionist', 'blues', 'minimalist'),
      maxQuestions: 12,
      prerequisites: ['hx_hear_three', 'hx_more_names'],
      intro: {
        idea: 'Four more: Medieval chant, Impressionism, the blues and minimalism.',
        purpose: 'Chant is one line with no beat. Impressionism slides parallel chords over a whole-tone scale. The blues swings over dominant 7ths. Minimalism repeats one pattern, changing it a little at a time.',
        expectation: 'Which style is it?',
        mascot: 'pulse',
      },
    }),
  ],
};

const forms: CurriculumSegment = {
  id: 'hxy_forms',
  pathId: 'history',
  name: 'Forms and Firsts',
  description: 'Fugues, symphonies, and the inventions that changed music',
  icon: '📜',
  color: 'purple',
  levels: [
    lesson('hxy_forms', 'hx_quiz', {
      id: 'hx_forms',
      name: 'Forms and Famous Works',
      description: 'Chant, madrigal, fugue, sonata, Lied',
      items: facts('chant', 'madrigal', 'opera_birth', 'fugue', 'four_seasons', 'sonata_form', 'quartet_father', 'ode_to_joy', 'lieder', 'nocturnes', 'rite_of_spring'),
      maxQuestions: 12,
      prerequisites: ['hx_more_names'],
      intro: {
        idea: 'Each era invented or perfected its own forms.',
        purpose: 'Chant and the madrigal, then opera and the fugue (Baroque), the symphony and sonata form (Classical), the art song and the piano miniature (Romantic).',
        expectation: 'Pick the right answer.',
        mascot: 'noir',
      },
    }),
    lesson('hxy_forms', 'hx_quiz', {
      id: 'hx_firsts',
      name: 'Instruments and Inventions',
      description: 'Staff notation to the electric guitar',
      items: facts('staff_notation', 'piano', 'stradivari', 'well_tempered', 'metronome', 'saxophone', 'phonograph', 'electric_guitar'),
      maxQuestions: 10,
      prerequisites: ['hx_timeline'],
      intro: {
        idea: 'New tools changed what music could be.',
        purpose: 'Staff notation let music be written down; the piano could play soft and loud; recording let anyone hear any performance, anywhere.',
        expectation: 'Pick the right answer.',
        mascot: 'noir',
      },
    }),
  ],
};

const popular: CurriculumSegment = {
  id: 'hxy_popular',
  pathId: 'history',
  name: 'Jazz and Popular Music',
  description: 'Ragtime to hip hop',
  icon: '🎷',
  color: 'orange',
  levels: [
    lesson('hxy_popular', 'hx_quiz', {
      id: 'hx_jazz',
      name: 'The Story of Jazz',
      description: 'Ragtime, blues, swing, bebop, modal',
      items: facts('ragtime', 'twelve_bar', 'new_orleans', 'swing_era', 'bebop', 'modal_jazz'),
      maxQuestions: 10,
      prerequisites: ['hx_timeline'],
      intro: {
        idea: 'Jazz grew in New Orleans around 1900 from the blues, ragtime and brass bands.',
        purpose: 'Then came the big bands of the swing era, bebop\'s fast virtuoso playing in the 1940s, and modal jazz at the end of the 1950s.',
        expectation: 'Pick the right answer.',
        mascot: 'noir',
      },
    }),
    lesson('hxy_popular', 'hx_quiz', {
      id: 'hx_popular',
      name: 'Rock, Soul and Hip Hop',
      description: 'Popular music since the 1950s',
      items: facts('rock_and_roll', 'motown', 'hip_hop', 'electric_guitar', 'twelve_bar'),
      maxQuestions: 8,
      prerequisites: ['hx_jazz'],
      intro: {
        idea: 'Rock and roll, soul and hip hop all grew from African-American music: the blues, rhythm and blues, gospel and funk.',
        purpose: 'The 12-bar blues runs under early rock and roll; Motown made soul a worldwide sound; hip hop looped funk records into something new.',
        expectation: 'Pick the right answer.',
        mascot: 'noir',
      },
    }),
  ],
};

export const HISTORY_SEGMENTS: CurriculumSegment[] = [eras, hearing, forms, popular];

/** What "continue" walks through on the History path. */
export const HISTORY_TEACHING_ORDER: string[] = [
  'hx_timeline', 'hx_big_names', 'hx_hear_three', 'hx_firsts', 'hx_more_names', 'hx_forms', 'hx_hear_all', 'hx_jazz', 'hx_popular',
];
