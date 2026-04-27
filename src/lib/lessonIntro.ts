import type { CurriculumLevel, LessonIntroCopy, Mascot } from '../types';

// --- Mascot assignment per brand kit -------------------------------------
// Fable  (coral)  — onboarding, hints, first encounter with a new concept.
// Noir   (mint)   — listening drills, pitch matching, interval recognition.
// Major  (butter) — summaries, mastery, capstone "all X" lessons.
// Pulse  (sky)    — rhythm, timing, sing-sequence (rhythmic melodic shapes).

// First-in-concept lesson IDs get Fable — they're the user's introduction.
const FIRST_IN_CONCEPT = new Set<string>([
  'found_higher_lower',          // very first lesson
  'ton_is_tonic',                // first tonality concept
  'scale_degree_major_1',        // first scale-degree teaching
  'int_harmonic_4ths_5ths',      // first intervals teaching
  'level_4',                     // first triad teaching ("Tonic Triads")
  'level_7',                     // first 7th chord teaching
  'level_9',                     // first mode drill
]);

// Comprehensive / mastery lessons get Major — end-of-unit warmth.
const CAPSTONE = new Set<string>([
  'scale_degree_major_full',
  'scale_degree_minor',
  'level_6',                     // All Diatonic Triads
  'level_8',                     // Advanced Seventh Chords
  'level_10',                    // All Modes
  'int_all_harmonic',
  'int_all_melodic_asc',
  'int_all_melodic_desc',
]);

function pickMascot(level: CurriculumLevel): Mascot {
  if (FIRST_IN_CONCEPT.has(level.id)) return 'fable';
  if (CAPSTONE.has(level.id)) return 'major';
  if (level.type === 'acoustic' && level.acousticKind === 'sing_sequence') return 'pulse';
  // Everything else is a listening drill — Noir's territory.
  return 'noir';
}

// --- Intro copy ----------------------------------------------------------

export function getLessonIntro(level: CurriculumLevel): LessonIntroCopy[] {
  if (level.intro) {
    const pages = Array.isArray(level.intro) ? level.intro : [level.intro];
    // If the lesson didn't specify a mascot, fill in the brand-kit default.
    const mascot = pickMascot(level);
    return pages.map((p) => (p.mascot ? p : { ...p, mascot }));
  }
  const base = getDefaultIntroBody(level);
  return [{ ...base, mascot: pickMascot(level) }];
}

type IntroBody = Omit<LessonIntroCopy, 'mascot' | 'expression'>;

function getDefaultIntroBody(level: CurriculumLevel): IntroBody {
  if (level.type === 'acoustic') {
    switch (level.acousticKind) {
      case 'same_diff':
        return {
          idea: 'Two notes, side by side.',
          purpose: 'Hearing whether pitches match is the ground-floor ear skill — every interval, chord, and melody builds from it.',
          expectation: 'Listen to both notes. Tap same or different.',
        };
      case 'beating':
        return {
          idea: 'Two nearly-identical pitches create audible beats when they drift out of tune.',
          purpose: 'Vocalists and tuners use this exact cue to lock in pitch. Training it tightens your intonation.',
          expectation: 'Listen to the sustained pair. Tap in tune or beating.',
        };
      case 'higher_lower':
        return {
          idea: 'Pitch moves up or down — always.',
          purpose: "Hearing direction is the first half of melody. You can't track a tune without it.",
          expectation: 'Listen to the two notes. Tap higher or lower for the second one.',
        };
      case 'consonance':
        return {
          idea: 'Some intervals feel smooth; others feel rough or tense.',
          purpose: 'Consonance vs dissonance is how chord progressions create pull and release. Your ear already knows — this just names it.',
          expectation: 'Listen to the harmonic pair. Tap smooth or rough.',
        };
      case 'match_pitch':
        return {
          idea: 'Hear a note, then sing it back.',
          purpose: 'Matching pitch with your voice hard-wires the ear-to-voice loop — the single most useful musician reflex.',
          expectation: "You'll hear a note. Sing it back; any octave counts.",
        };
      case 'sing_sequence':
        return {
          idea: 'A short melodic shape, repeated and transposed up through the scale.',
          purpose: 'Singing shapes across the scale burns scale-step movement into muscle memory — the rhythm of a phrase and its melodic contour at once.',
          expectation: 'Listen, then sing each note of the shape in turn.',
        };
    }
  }

  switch (level.type) {
    case 'scale_degree':
      return {
        idea: "A scale degree is a note's position inside a key — 1, 2, 3, up to 7.",
        purpose: 'Hearing degrees in context is what lets you place any melody note relative to home.',
        expectation: "You'll hear a note after the scale plays. Pick which degree it is.",
      };
    case 'interval':
      return {
        idea: 'An interval is the distance between two notes.',
        purpose: 'Intervals are the alphabet of melody and harmony — naming them by ear unlocks everything else.',
        expectation: "You'll hear two notes. Pick the interval you heard.",
      };
    case 'triad':
      return {
        idea: 'A triad is a three-note chord — root, third, fifth.',
        purpose: 'Spotting triad quality (major, minor, diminished, augmented) is how you decode any progression in real time.',
        expectation: "You'll hear a chord. Pick its quality.",
      };
    case 'seventh_chord':
      return {
        idea: '7th chords stack a fourth voice on top of a triad.',
        purpose: 'They are the working vocabulary of jazz, R&B, and modern pop — recognizing them fast opens up real repertoire.',
        expectation: "You'll hear a chord. Pick which kind of 7th it is.",
      };
    case 'mode':
      return {
        idea: 'Modes are scales with distinct emotional fingerprints.',
        purpose: "Hearing the mode tells you the tonal flavor of a song before any words are spoken.",
        expectation: "You'll hear a scale. Pick the mode.",
      };
  }

  return {
    idea: 'A quick listening drill.',
    purpose: 'Short, regular sessions train the ear faster than long marathon ones.',
    expectation: 'Listen carefully and pick the best answer.',
  };
}
