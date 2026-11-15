// The Read Music path: from the treble and bass staff to a full orchestral score.
//
// The order follows how readers actually get fluent: one clef by landmarks, then by
// lines and spaces, then the whole staff and ledger lines; the second clef the same way;
// then what a clef *is* (a letter on a line), so every other clef is the same idea moved.
// Shapes come without a clef, because a 3rd or a root-position chord looks the same in
// every clef. Quality (major, minor) needs real notes, so it comes after, on the staff.
// Last come alto and tenor clef, transposing instruments, and reading a score.
//
// Lesson ids are permanent (progress is stored by id). See AGENTS.md.

import type { CurriculumLevel, CurriculumSegment, TriadType } from './types';
import type { VisualKind } from './notation/prompt';
import { groupByAnswer } from './notation/questions';
import { noteAscii, noteAtPosition, type ClefId } from './notation/theory';

const at = (clef: ClefId, notes: string[]) => notes.map((n) => `${clef}:${n}`);
/** Natural notes from staff position `from` to `to` (inclusive) in a clef. */
const span = (clef: ClefId, from: number, to: number) => {
  const out: string[] = [];
  for (let p = from; p <= to; p++) out.push(`${clef}:${noteAscii(noteAtPosition(p, clef))}`);
  return out;
};

type Lesson = Omit<CurriculumLevel, 'segmentId' | 'type' | 'unlockRequirement'> & { unlockRequirement?: number };

/** Note-naming lessons answer with the letter, so their items are grouped under it. */
function lesson(segmentId: string, kind: VisualKind, l: Lesson): CurriculumLevel {
  const grouped = ['clef_sign', 'staff_note', 'note_in_key', 'transpose'].includes(kind);
  return {
    unlockRequirement: 80,
    ...l,
    type: 'reading',
    visualKind: kind,
    segmentId,
    ...(grouped ? { itemGroups: groupByAnswer(kind, l.items) } : {}),
  };
}

const ALL_TRIADS: TriadType[] = ['major', 'minor', 'diminished', 'augmented'];

// ---------------------------------------------------------------------------

const treble: CurriculumSegment = {
  id: 'read_treble',
  pathId: 'read',
  name: 'Treble Clef',
  description: 'The staff for violin, flute, voice and the right hand',
  icon: '🎼',
  color: 'blue',
  levels: [
    lesson('read_treble', 'staff_note', {
      id: 'rd_tr_landmarks',
      name: 'Treble Landmarks',
      description: 'G, middle C and the C above it: notes to read everything else from',
      items: at('treble', ['G4', 'C4', 'C5', 'E4', 'F5']),
      maxQuestions: 10,
      intro: [
        {
          idea: 'Reading notes starts with a few you know on sight.',
          purpose: "Fluent readers don't spell out every note from the bottom line. They know a handful of landmarks and read the rest as a step or two away.",
          expectation: "You'll see one note at a time. Name it.",
          mascot: 'major',
        },
        {
          idea: 'The treble clef is a curly G. Its curl wraps the second line: that line is G.',
          purpose: 'Middle C sits on one ledger line below the staff. The C an octave up is in the third space. Those three anchor the whole staff.',
          expectation: 'Find the curl, find middle C, and count from there.',
        },
      ],
    }),
    lesson('read_treble', 'staff_note', {
      id: 'rd_tr_lines',
      name: 'Treble Lines',
      description: 'E G B D F, bottom to top',
      items: at('treble', ['E4', 'G4', 'B4', 'D5', 'F5']),
      maxQuestions: 10,
      prerequisites: ['rd_tr_landmarks'],
      intro: {
        idea: 'The five lines, bottom to top: E G B D F. Every Good Boy Does Fine.',
        purpose: 'Lines and spaces alternate letters, so knowing the lines gives you half the staff at a glance.',
        expectation: 'Every note is on a line. Name it.',
      },
    }),
    lesson('read_treble', 'staff_note', {
      id: 'rd_tr_spaces',
      name: 'Treble Spaces',
      description: 'F A C E, bottom to top',
      items: at('treble', ['F4', 'A4', 'C5', 'E5']),
      maxQuestions: 10,
      prerequisites: ['rd_tr_lines'],
      intro: {
        idea: 'The four spaces, bottom to top, spell FACE.',
        purpose: 'With the lines and spaces both known, every note inside the staff is one look away.',
        expectation: 'Every note is in a space. Name it.',
      },
    }),
    lesson('read_treble', 'staff_note', {
      id: 'rd_tr_staff',
      name: 'The Whole Treble Staff',
      description: 'Lines and spaces mixed, D4 to G5',
      items: span('treble', -1, 9),
      prerequisites: ['rd_tr_spaces'],
    }),
    lesson('read_treble', 'staff_note', {
      id: 'rd_tr_ledger',
      name: 'Treble Ledger Lines',
      description: 'Above and below the staff, A3 to C6',
      items: [...span('treble', -4, -1), ...span('treble', 9, 12), ...at('treble', ['E4', 'G4', 'C5', 'F5'])],
      prerequisites: ['rd_tr_staff'],
      intro: {
        idea: 'Ledger lines extend the staff: short lines for notes above or below it.',
        purpose: 'Count them like the staff itself, one letter per line or space. Middle C has one ledger line below; A5 has one above.',
        expectation: 'Notes just off the staff. Count out from the nearest edge.',
      },
    }),
    lesson('read_treble', 'staff_find', {
      id: 'rd_tr_write',
      name: 'Write It: Treble',
      description: 'Put a named note on the staff',
      items: span('treble', -2, 10),
      maxQuestions: 10,
      prerequisites: ['rd_tr_staff'],
      intro: {
        idea: 'Now the other way round: a note name, and you put it on the staff.',
        purpose: "Writing a note makes you find its place rather than recognise it, which fixes it in memory faster than reading alone.",
        expectation: 'Tap the staff to place the note, nudge it with the arrows if you need to, then check.',
      },
    }),
  ],
};

const bass: CurriculumSegment = {
  id: 'read_bass',
  pathId: 'read',
  name: 'Bass Clef',
  description: 'The staff for cello, bass, bassoon and the left hand',
  icon: '🎼',
  color: 'purple',
  levels: [
    lesson('read_bass', 'staff_note', {
      id: 'rd_bs_landmarks',
      name: 'Bass Landmarks',
      description: 'F, middle C and the C below it',
      items: at('bass', ['F3', 'C4', 'C3', 'G2', 'A3']),
      maxQuestions: 10,
      intro: [
        {
          idea: 'The bass clef is an old letter F. Its two dots sit either side of the fourth line: that line is F.',
          purpose: 'Middle C is one ledger line above the bass staff, the mirror of where it sits under the treble staff. The C below it is in the second space.',
          expectation: 'Find the dots, find middle C, and count from there.',
          mascot: 'noir',
        },
      ],
    }),
    lesson('read_bass', 'staff_note', {
      id: 'rd_bs_lines',
      name: 'Bass Lines',
      description: 'G B D F A, bottom to top',
      items: at('bass', ['G2', 'B2', 'D3', 'F3', 'A3']),
      maxQuestions: 10,
      prerequisites: ['rd_bs_landmarks'],
      intro: {
        idea: 'The five lines, bottom to top: G B D F A. Good Boys Do Fine Always.',
        purpose: "Bass lines aren't the treble lines. Learn them on their own terms, not by shifting the treble names.",
        expectation: 'Every note is on a line. Name it.',
      },
    }),
    lesson('read_bass', 'staff_note', {
      id: 'rd_bs_spaces',
      name: 'Bass Spaces',
      description: 'A C E G, bottom to top',
      items: at('bass', ['A2', 'C3', 'E3', 'G3']),
      maxQuestions: 10,
      prerequisites: ['rd_bs_lines'],
      intro: {
        idea: 'The four spaces, bottom to top: A C E G. All Cows Eat Grass.',
        purpose: 'With lines and spaces both known, the bass staff reads at a glance.',
        expectation: 'Every note is in a space. Name it.',
      },
    }),
    lesson('read_bass', 'staff_note', {
      id: 'rd_bs_staff',
      name: 'The Whole Bass Staff',
      description: 'Lines and spaces mixed, F2 to B3',
      items: span('bass', -1, 9),
      prerequisites: ['rd_bs_spaces'],
    }),
    lesson('read_bass', 'staff_note', {
      id: 'rd_bs_ledger',
      name: 'Bass Ledger Lines',
      description: 'Above and below the staff, C2 to E4',
      items: [...span('bass', -4, -1), ...span('bass', 9, 12), ...at('bass', ['G2', 'C3', 'F3', 'A3'])],
      prerequisites: ['rd_bs_staff'],
    }),
    lesson('read_bass', 'staff_find', {
      id: 'rd_bs_write',
      name: 'Write It: Bass',
      description: 'Put a named note on the staff',
      items: span('bass', -2, 10),
      maxQuestions: 10,
      prerequisites: ['rd_bs_staff'],
    }),
  ],
};

const clefs: CurriculumSegment = {
  id: 'read_clefs',
  pathId: 'read',
  name: 'How Clefs Work',
  description: 'G, F and C clefs: one idea, three letters',
  icon: '🔑',
  color: 'amber',
  levels: [
    lesson('read_clefs', 'clef_sign', {
      id: 'rd_clef_signs',
      name: 'G, F and C Clefs',
      description: 'Each clef is a letter that names one line',
      items: ['treble', 'bass', 'alto', 'tenor'],
      maxQuestions: 8,
      prerequisites: ['rd_tr_landmarks', 'rd_bs_landmarks'],
      intro: [
        {
          idea: 'A clef is just a letter drawn on a line. It tells you that line\'s name.',
          purpose: 'The treble clef is a G and makes its line G4. The bass clef is an F and makes its line F3. The C clef points at middle C. Every other note is counted from that one line.',
          expectation: "You'll see a clef with no notes. Which letter is it marking?",
          mascot: 'major',
        },
        {
          idea: 'G4, middle C and F3 are neighbours: F3 is a 5th below middle C, G4 a 5th above.',
          purpose: "That's why the clefs fit together. The treble and bass staves are one big staff, split at middle C, and the C clef sits right on the split.",
          expectation: 'Spot the letter in each clef.',
        },
      ],
    }),
    lesson('read_clefs', 'staff_find', {
      id: 'rd_middle_c',
      name: 'Middle C in Every Clef',
      description: 'The note all the clefs share',
      items: ['treble:C4', 'bass:C4', 'alto:C4', 'tenor:C4'],
      maxQuestions: 8,
      prerequisites: ['rd_clef_signs'],
      intro: {
        idea: 'Middle C is the hinge: one ledger line below the treble staff, one above the bass staff, and wherever a C clef points.',
        purpose: 'Find middle C in any clef and you can count to every other note from it.',
        expectation: 'Tap where middle C goes in each clef.',
      },
    }),
    lesson('read_clefs', 'staff_compare', {
      id: 'rd_same_pitch',
      name: 'Same Pitch, Two Clefs',
      description: 'Move a note between treble and bass',
      items: [
        'treble>bass:C4', 'bass>treble:C4', 'treble>bass:E4', 'bass>treble:A3',
        'treble>bass:D4', 'bass>treble:B3', 'treble>bass:G4', 'bass>treble:F3',
      ],
      maxQuestions: 8,
      prerequisites: ['rd_middle_c'],
      intro: {
        idea: 'One sound can be written in more than one clef.',
        purpose: "Pianists, cellists and arrangers move between clefs constantly. Seeing the same pitch in both is what makes the grand staff one staff in your head.",
        expectation: 'A note in one clef. Tap where the same pitch goes in the other.',
      },
    }),
    lesson('read_clefs', 'staff_note', {
      id: 'rd_moving_c',
      name: 'The Movable C Clef',
      description: 'The C clef on any line: count from middle C',
      items: [
        ...at('soprano', ['C4', 'E4', 'G4', 'A3']),
        ...at('mezzo', ['C4', 'D4', 'F4', 'A3']),
        ...at('alto', ['C4', 'B3', 'E4', 'A3']),
        ...at('tenor', ['C4', 'D4', 'A3', 'F3']),
        ...at('baritone', ['C4', 'A3', 'B3', 'F3']),
      ],
      prerequisites: ['rd_middle_c'],
      intro: {
        idea: 'The C clef can sit on any of the five lines. Wherever it points, that line is middle C.',
        purpose: "This is the clef idea in its purest form. Old scores used all five positions; viola (middle line) and tenor parts (fourth line) still do.",
        expectation: 'Find the line the C clef points at, call it middle C, and count to the note.',
      },
    }),
  ],
};

const shapes: CurriculumSegment = {
  id: 'read_shapes',
  pathId: 'read',
  name: 'Shapes in Any Clef',
  description: 'Intervals and chords you can see without naming a note',
  icon: '👁',
  color: 'green',
  levels: [
    lesson('read_shapes', 'shape_interval', {
      id: 'rd_shape_steps',
      name: 'Steps and Skips',
      description: '2nds and 3rds by shape alone',
      items: ['size_2', 'size_3'],
      intervalPresentation: 'melodic',
      maxQuestions: 10,
      prerequisites: ['rd_tr_lines'],
      intro: [
        {
          idea: 'There is no clef here on purpose. You can read the distance between notes without knowing their names.',
          purpose: 'A step (2nd) goes line to the next space. A skip (3rd) goes line to the next line, or space to the next space. That is true in every clef, on every instrument.',
          expectation: 'Two notes, no clef. Is it a step or a skip?',
          mascot: 'pulse',
        },
      ],
    }),
    lesson('read_shapes', 'shape_interval', {
      id: 'rd_shape_to_5th',
      name: 'Shapes up to a 5th',
      description: '2nd, 3rd, 4th, 5th',
      items: ['size_2', 'size_3', 'size_4', 'size_5'],
      prerequisites: ['rd_shape_steps'],
      intro: {
        idea: 'Odd intervals stay on one kind: line, line or space, space. Even ones switch: line to space.',
        purpose: 'A 3rd skips nothing in between of its own kind; a 5th skips one line (or space). Checking line-or-space first halves your options before you count.',
        expectation: 'Name the size of each interval, by shape.',
      },
    }),
    lesson('read_shapes', 'shape_interval', {
      id: 'rd_shape_all',
      name: 'Every Interval Shape',
      description: '2nd to the octave, side by side and stacked',
      items: ['size_2', 'size_3', 'size_4', 'size_5', 'size_6', 'size_7', 'size_8'],
      prerequisites: ['rd_shape_to_5th'],
      intro: {
        idea: 'Stacked notes (played together) show the same distances as notes side by side.',
        purpose: 'Chords are stacks of intervals. Reading stacked shapes quickly is the first step to reading chords.',
        expectation: 'Side by side or stacked: name the size.',
      },
    }),
    lesson('read_shapes', 'shape_triad', {
      id: 'rd_shape_chords',
      name: 'Chord Shapes',
      description: 'Root position or an inversion, at a glance',
      items: ['root', 'first', 'second'],
      prerequisites: ['rd_shape_all'],
      intro: {
        idea: 'A chord in root position looks like a snowman: three notes all on lines, or all on spaces.',
        purpose: 'An inversion breaks the snowman: one gap is a 4th. The note above the gap is always the root. You can find the root of a chord without naming a single note.',
        expectation: 'Three stacked notes, no clef. Root position, first or second inversion?',
      },
    }),
  ],
};

const grand: CurriculumSegment = {
  id: 'read_grand',
  pathId: 'read',
  name: 'The Grand Staff',
  description: 'Treble and bass together, as piano music is written',
  icon: '🎹',
  color: 'pink',
  levels: [
    lesson('read_grand', 'staff_note', {
      id: 'rd_gr_landmarks',
      name: 'Grand Staff Landmarks',
      description: 'Middle C, treble G, bass F and the Cs either side',
      items: [...at('treble', ['C4', 'G4', 'C5']), ...at('bass', ['C4', 'F3', 'C3'])],
      grandStaff: true,
      maxQuestions: 12,
      prerequisites: ['rd_tr_staff', 'rd_bs_staff'],
      intro: {
        idea: 'The grand staff is the treble and bass staves joined by a brace, with middle C between them.',
        purpose: 'Middle C can be written on either staff: a ledger line below the treble or above the bass. Same note, same key on the piano.',
        expectation: 'Notes on both staves. Name each.',
        mascot: 'major',
      },
    }),
    lesson('read_grand', 'staff_note', {
      id: 'rd_gr_notes',
      name: 'Both Staves',
      description: 'F2 to B3 and D4 to G5, mixed',
      items: [...span('treble', -1, 9), ...span('bass', -1, 9)],
      grandStaff: true,
      prerequisites: ['rd_gr_landmarks'],
    }),
    lesson('read_grand', 'staff_note', {
      id: 'rd_gr_between',
      name: 'Between the Staves',
      description: 'A3 to E4, written on either staff',
      items: [...at('treble', ['A3', 'B3', 'C4', 'D4']), ...at('bass', ['B3', 'C4', 'D4', 'E4'])],
      grandStaff: true,
      prerequisites: ['rd_gr_notes'],
      intro: {
        idea: 'The notes around middle C live between the staves, on ledger lines.',
        purpose: "They're the hardest to read and the most played. The same B3 can hang below the treble or sit above the bass.",
        expectation: 'Ledger notes from either staff. Count from middle C.',
      },
    }),
    lesson('read_grand', 'staff_find', {
      id: 'rd_gr_write',
      name: 'Write It: Grand Staff',
      description: 'Place notes on either staff',
      items: [...at('treble', ['C4', 'E4', 'A4', 'D5', 'G5']), ...at('bass', ['C4', 'A3', 'E3', 'B2', 'F2'])],
      grandStaff: true,
      maxQuestions: 10,
      prerequisites: ['rd_gr_notes'],
    }),
  ],
};

const harmony: CurriculumSegment = {
  id: 'read_harmony',
  pathId: 'read',
  name: 'Intervals & Chords on the Staff',
  description: 'Size from the shape, quality from the notes',
  icon: '🧱',
  color: 'teal',
  levels: [
    lesson('read_harmony', 'staff_interval', {
      id: 'rd_int_thirds',
      name: 'Major or Minor 3rd',
      description: 'Same shape, two qualities',
      items: ['minor_3rd', 'major_3rd'],
      clefs: ['treble'],
      maxQuestions: 10,
      prerequisites: ['rd_shape_all', 'rd_tr_staff'],
      intro: [
        {
          idea: 'Every 3rd looks the same: line to line, or space to space. The shape gives you the size.',
          purpose: 'Whether it is major or minor depends on which notes they are. C–E is major (4 half steps), D–F is minor (3). So now the clef matters.',
          expectation: 'Read the two notes, then decide: major or minor 3rd.',
          mascot: 'noir',
        },
        {
          idea: 'Among the natural notes, three 3rds are major: C–E, F–A and G–B. The other four are minor.',
          purpose: 'Learn those three and you can name any natural 3rd on sight, in any clef.',
          expectation: 'Name each 3rd.',
        },
      ],
    }),
    lesson('read_harmony', 'staff_interval', {
      id: 'rd_int_4ths_5ths',
      name: '4ths, 5ths and the Tritone',
      description: 'Perfect, except for F and B',
      items: ['perfect_4th', 'perfect_5th', 'tritone'],
      clefs: ['treble', 'bass'],
      prerequisites: ['rd_int_thirds', 'rd_bs_staff'],
      intro: {
        idea: 'Natural 4ths and 5ths are all perfect, except the pair F and B.',
        purpose: 'F up to B (a 4th) and B up to F (a 5th) are both the tritone, six half steps. Spot F and B and you have it.',
        expectation: 'Two notes, treble or bass. Perfect 4th, perfect 5th or tritone?',
      },
    }),
    lesson('read_harmony', 'staff_interval', {
      id: 'rd_int_2nds_6ths',
      name: '2nds and 6ths',
      description: 'Major and minor',
      items: ['minor_2nd', 'major_2nd', 'minor_6th', 'major_6th'],
      clefs: ['treble', 'bass'],
      prerequisites: ['rd_int_4ths_5ths'],
    }),
    lesson('read_harmony', 'staff_interval', {
      id: 'rd_int_7ths',
      name: '7ths and Octaves',
      description: 'One short of the octave, and the octave',
      items: ['minor_7th', 'major_7th', 'octave'],
      clefs: ['treble', 'bass'],
      prerequisites: ['rd_int_2nds_6ths'],
    }),
    lesson('read_harmony', 'staff_interval', {
      id: 'rd_int_all',
      name: 'Every Interval, with Accidentals',
      description: 'All twelve, sharps and flats included',
      items: ['minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd', 'perfect_4th', 'tritone', 'perfect_5th', 'minor_6th', 'major_6th', 'minor_7th', 'major_7th', 'octave'],
      clefs: ['treble', 'bass'],
      allowAccidentals: true,
      unlockRequirement: 75,
      prerequisites: ['rd_int_7ths'],
      intro: {
        idea: 'Accidentals change the quality, never the size.',
        purpose: 'Read the shape for the size, name the interval on the naturals, then adjust: a sharp on top widens it, a sharp on the bottom narrows it.',
        expectation: 'Any interval, with sharps and flats.',
      },
    }),
    lesson('read_harmony', 'staff_triad', {
      id: 'rd_triads',
      name: 'Major, Minor, Diminished',
      description: 'Triad quality from the notes',
      items: ['major', 'minor', 'diminished'],
      clefs: ['treble', 'bass'],
      prerequisites: ['rd_int_thirds', 'rd_shape_chords'],
      intro: {
        idea: 'A triad is two 3rds stacked: root, 3rd, 5th.',
        purpose: 'Major is a major 3rd with a minor 3rd on top; minor is the reverse; diminished is two minor 3rds. With naturals: C, F and G are major; D, E and A minor; B diminished.',
        expectation: 'A snowman chord. Major, minor or diminished?',
      },
    }),
    lesson('read_harmony', 'staff_triad', {
      id: 'rd_triads_all',
      name: 'All Four Triads',
      description: 'Augmented too, with accidentals',
      items: ALL_TRIADS,
      clefs: ['treble', 'bass'],
      allowAccidentals: true,
      prerequisites: ['rd_triads'],
    }),
    lesson('read_harmony', 'staff_triad', {
      id: 'rd_triads_inverted',
      name: 'Inverted Triads',
      description: 'Restack to find the root, then the quality',
      items: ['major', 'minor', 'diminished'],
      clefs: ['treble', 'bass'],
      inversions: true,
      prerequisites: ['rd_triads'],
    }),
    lesson('read_harmony', 'chord_root', {
      id: 'rd_chord_root',
      name: 'Find the Root',
      description: 'Name the root of any chord in C major',
      items: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      clefs: ['treble', 'bass'],
      prerequisites: ['rd_triads_inverted'],
      intro: {
        idea: 'Every chord here comes from the key of C, in any inversion.',
        purpose: 'Find the gap (the 4th): the note above it is the root. No gap means root position and the bottom note is the root.',
        expectation: 'Name the root of each chord.',
      },
    }),
  ],
};

const keys: CurriculumSegment = {
  id: 'read_keys',
  pathId: 'read',
  name: 'Key Signatures',
  description: 'The sharps and flats at the start of each line',
  icon: '♯',
  color: 'orange',
  levels: [
    lesson('read_keys', 'key_signature', {
      id: 'rd_key_sharps',
      name: 'Sharp Keys',
      description: 'G, D, A, E, B and F♯ major',
      items: ['key_G', 'key_D', 'key_A', 'key_E', 'key_B', 'key_F#'],
      clefs: ['treble', 'bass'],
      prerequisites: ['rd_tr_staff', 'rd_bs_staff'],
      intro: {
        idea: 'Sharps are always added in the same order: F C G D A E B.',
        purpose: 'The last sharp is the 7th note of the key, so the key is a half step above it. Three sharps (F♯ C♯ G♯): a half step above G♯ is A major.',
        expectation: 'A key signature. Which major key?',
        mascot: 'major',
      },
    }),
    lesson('read_keys', 'key_signature', {
      id: 'rd_key_flats',
      name: 'Flat Keys',
      description: 'F, B♭, E♭, A♭, D♭ and G♭ major',
      items: ['key_F', 'key_Bb', 'key_Eb', 'key_Ab', 'key_Db', 'key_Gb'],
      clefs: ['treble', 'bass'],
      prerequisites: ['rd_key_sharps'],
      intro: {
        idea: 'Flats come in the reverse order: B E A D G C F.',
        purpose: 'The second-to-last flat names the key: B♭ E♭ A♭ is E♭ major. One flat is the exception to learn by heart: F major.',
        expectation: 'A key signature. Which major key?',
      },
    }),
    lesson('read_keys', 'note_in_key', {
      id: 'rd_key_reading',
      name: 'Reading in a Key',
      description: 'The signature changes notes all through the piece',
      items: [
        'treble:F5@G', 'treble:F4@G', 'treble:C5@G',
        'treble:B4@F', 'treble:E5@F', 'treble:A4@F',
        'treble:F4@D', 'treble:C5@D', 'treble:D5@D',
        'treble:B4@Bb', 'treble:E4@Bb', 'treble:G4@Bb',
      ],
      prerequisites: ['rd_key_flats'],
      intro: {
        idea: 'A sharp or flat in the key signature applies to that letter everywhere, in every octave.',
        purpose: "Forgetting the signature is the most common reading mistake. Here the note shows no accidental, but the key gives it one.",
        expectation: 'Name the note as it sounds in the key.',
      },
    }),
  ],
};

const cClefs: CurriculumSegment = {
  id: 'read_c_clefs',
  pathId: 'read',
  name: 'Alto & Tenor Clef',
  description: 'The C clefs used by viola, cello, bassoon and trombone',
  icon: '🎻',
  color: 'indigo',
  levels: [
    lesson('read_c_clefs', 'staff_note', {
      id: 'rd_alto_landmarks',
      name: 'Alto Landmarks',
      description: 'Middle C on the middle line',
      items: at('alto', ['C4', 'F3', 'G4', 'C3', 'E4']),
      maxQuestions: 10,
      prerequisites: ['rd_moving_c'],
      intro: {
        idea: 'In alto clef, the C clef points at the middle line: middle C sits right in the centre of the staff.',
        purpose: "It's the viola's clef. The viola's lowest string, C3, hangs just below the staff, below one ledger line.",
        expectation: 'Name each note, counting from middle C.',
        mascot: 'noir',
      },
    }),
    lesson('read_c_clefs', 'staff_note', {
      id: 'rd_alto_staff',
      name: 'The Whole Alto Staff',
      description: 'E3 to A4',
      items: span('alto', -1, 9),
      prerequisites: ['rd_alto_landmarks'],
    }),
    lesson('read_c_clefs', 'staff_note', {
      id: 'rd_tenor_landmarks',
      name: 'Tenor Landmarks',
      description: 'Middle C on the fourth line',
      items: at('tenor', ['C4', 'D3', 'E4', 'A3', 'C3']),
      maxQuestions: 10,
      prerequisites: ['rd_alto_staff'],
      intro: {
        idea: 'Tenor clef is the same C clef, one line higher: middle C is on the fourth line.',
        purpose: 'Cellos, bassoons and trombones switch to it for high passages, so they avoid a forest of ledger lines.',
        expectation: 'Name each note, counting from middle C.',
      },
    }),
    lesson('read_c_clefs', 'staff_note', {
      id: 'rd_tenor_staff',
      name: 'The Whole Tenor Staff',
      description: 'C3 to F4',
      items: span('tenor', -1, 9),
      prerequisites: ['rd_tenor_landmarks'],
    }),
    lesson('read_c_clefs', 'staff_note', {
      id: 'rd_four_clefs',
      name: 'Four Clefs Mixed',
      description: 'Treble, bass, alto and tenor, changing every note',
      items: [...span('treble', 0, 8), ...span('bass', 0, 8), ...span('alto', 0, 8), ...span('tenor', 0, 8)],
      unlockRequirement: 75,
      prerequisites: ['rd_tenor_staff', 'rd_tr_staff', 'rd_bs_staff'],
      intro: {
        idea: 'Score readers switch clefs every line. Check the clef first, every time.',
        purpose: 'This is the skill conductors and arrangers rely on: the same spot on the staff means a different note in each clef.',
        expectation: 'The clef changes from note to note. Read the clef, then the note.',
      },
    }),
  ],
};

const score: CurriculumSegment = {
  id: 'read_score',
  pathId: 'read',
  name: 'Reading a Score',
  description: 'Transposing instruments, then the whole orchestra',
  icon: '🎺',
  color: 'rose',
  levels: [
    lesson('read_score', 'transpose', {
      id: 'rd_transpose_bb',
      name: 'Instruments in B♭',
      description: 'Clarinet and trumpet sound a step lower',
      items: [
        ...['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B4'].map((n) => `bb_clarinet:${n}`),
        ...['C5', 'D5', 'E5', 'G5'].map((n) => `bb_trumpet:${n}`),
      ],
      prerequisites: ['rd_key_flats', 'rd_tr_ledger'],
      intro: [
        {
          idea: 'Some instruments are written higher than they sound. A clarinet in B♭ plays a written C and you hear B♭.',
          purpose: "It lets a player switch between sizes of clarinet (or saxophone, or trumpet) with the same fingerings. The score reader does the translating.",
          expectation: 'A written note for a B♭ instrument. Which note sounds?',
          mascot: 'pulse',
        },
      ],
    }),
    lesson('read_score', 'transpose', {
      id: 'rd_transpose_f_eb',
      name: 'Horn in F, Sax in E♭',
      description: 'A 5th lower, and a 6th lower',
      items: [
        ...['C5', 'D5', 'E5', 'F5', 'G4', 'A4'].map((n) => `f_horn:${n}`),
        ...['C5', 'D5', 'E5', 'G4', 'A4', 'B4'].map((n) => `eb_alto_sax:${n}`),
      ],
      prerequisites: ['rd_transpose_bb'],
      intro: {
        idea: 'The horn in F sounds a perfect 5th below written. The alto sax in E♭ sounds a major 6th below.',
        purpose: 'A written C is F on the horn and E♭ on the alto sax. Each family has one distance to learn.',
        expectation: 'Which note sounds?',
      },
    }),
    lesson('read_score', 'score_chord', {
      id: 'rd_score_quartet',
      name: 'String Quartet',
      description: 'Two violins, viola and cello: name the chord',
      items: ['major', 'minor', 'diminished'],
      ensemble: 'quartet',
      maxQuestions: 10,
      prerequisites: ['rd_alto_staff', 'rd_triads'],
      intro: {
        idea: 'A score stacks every part on its own staff. The chord is spread across all of them.',
        purpose: 'Read each staff in its own clef, gather the letters, and stack them in 3rds. The cello usually has the root.',
        expectation: 'One chord across the quartet. Major, minor or diminished?',
        mascot: 'major',
      },
    }),
    lesson('read_score', 'score_chord', {
      id: 'rd_score_orchestra',
      name: 'Woodwinds and Strings',
      description: 'Six parts in three clefs',
      items: ['major', 'minor', 'diminished'],
      ensemble: 'orchestra',
      maxQuestions: 10,
      prerequisites: ['rd_score_quartet'],
      intro: {
        idea: 'Orchestral scores list instruments by family, not by pitch: woodwinds on top, strings at the bottom.',
        purpose: "So the bassoon's low note sits above the violin on the page. Find the lowest sounding part (here cello or bassoon) for the root.",
        expectation: 'One chord across six parts. Name its quality.',
      },
    }),
    lesson('read_score', 'score_chord', {
      id: 'rd_score_transposed',
      name: 'The Full Score',
      description: 'With clarinet in B♭ and horn in F as written',
      items: ['major', 'minor', 'diminished'],
      ensemble: 'orchestra_transposed',
      maxQuestions: 10,
      unlockRequirement: 70,
      prerequisites: ['rd_score_orchestra', 'rd_transpose_f_eb'],
      intro: {
        idea: 'In a real score the clarinet and horn parts are written transposed.',
        purpose: "Read them as they sound: the clarinet a step lower, the horn a 5th lower. Then gather the chord as before. This is how conductors read.",
        expectation: 'One chord, transposing parts included. Name its quality.',
      },
    }),
  ],
};

export const READ_SEGMENTS: CurriculumSegment[] = [treble, bass, clefs, shapes, grand, harmony, keys, cClefs, score];

/** What "continue" walks through on the Read Music path. Every Read lesson, each after its prerequisites. */
export const READ_TEACHING_ORDER: string[] = [
  'rd_tr_landmarks', 'rd_tr_lines', 'rd_tr_spaces', 'rd_tr_staff',
  'rd_shape_steps',
  'rd_bs_landmarks', 'rd_bs_lines', 'rd_bs_spaces', 'rd_bs_staff',
  'rd_clef_signs', 'rd_middle_c', 'rd_same_pitch',
  'rd_tr_write', 'rd_tr_ledger', 'rd_shape_to_5th',
  'rd_bs_write', 'rd_bs_ledger', 'rd_shape_all',
  'rd_gr_landmarks', 'rd_gr_notes', 'rd_gr_between', 'rd_gr_write',
  'rd_shape_chords', 'rd_int_thirds', 'rd_int_4ths_5ths', 'rd_triads',
  'rd_key_sharps', 'rd_key_flats', 'rd_key_reading',
  'rd_int_2nds_6ths', 'rd_int_7ths', 'rd_triads_inverted', 'rd_chord_root',
  'rd_moving_c', 'rd_alto_landmarks', 'rd_alto_staff', 'rd_tenor_landmarks', 'rd_tenor_staff',
  'rd_int_all', 'rd_triads_all', 'rd_four_clefs',
  'rd_transpose_bb', 'rd_transpose_f_eb',
  'rd_score_quartet', 'rd_score_orchestra', 'rd_score_transposed',
];
