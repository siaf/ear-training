// Helper functions for working with diatonic (in-scale) content

// Major scale intervals (semitones)
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

// Diatonic triads in major scale (scale degrees)
// I, ii, iii, IV, V, vi, vii°
const DIATONIC_TRIADS = [
  { degree: 0, type: 'major' as const },      // I
  { degree: 1, type: 'minor' as const },      // ii
  { degree: 2, type: 'minor' as const },      // iii
  { degree: 3, type: 'major' as const },      // IV
  { degree: 4, type: 'major' as const },      // V
  { degree: 5, type: 'minor' as const },      // vi
  { degree: 6, type: 'diminished' as const }, // vii°
];

// Diatonic seventh chords in major scale
const DIATONIC_SEVENTHS = [
  { degree: 0, type: 'major_7' as const },           // Imaj7
  { degree: 1, type: 'minor_7' as const },           // ii7
  { degree: 2, type: 'minor_7' as const },           // iii7
  { degree: 3, type: 'major_7' as const },           // IVmaj7
  { degree: 4, type: 'dominant_7' as const },        // V7
  { degree: 5, type: 'minor_7' as const },           // vi7
  { degree: 6, type: 'half_diminished_7' as const }, // viiø7
];

// Get all diatonic intervals within a major scale
export function getDiatonicIntervals(): string[] {
  // All intervals that occur between scale degrees
  return [
    'major_2nd',   // 1-2, 2-3, 4-5, 5-6, 6-7
    'minor_2nd',   // 3-4, 7-8
    'minor_3rd',   // 2-4, 3-5, 6-8, 7-9
    'major_3rd',   // 1-3, 4-6, 5-7
    'perfect_4th', // 1-4, 2-5, 3-6, 5-8, 6-9
    'perfect_5th', // 1-5, 2-6, 3-7, 4-8
    'major_6th',   // 1-6, 2-7, 4-9
    'minor_6th',   // 3-8, 6-11
    'major_7th',   // 1-7, 4-11
    'minor_7th',   // 2-8, 5-12
    'octave',      // 1-8
  ];
}

// Get diatonic triads for a given root note
export function getDiatonicTriads(rootNote: string): Array<{ root: string; type: string }> {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = notes.indexOf(rootNote);
  
  return DIATONIC_TRIADS.map(({ degree, type }) => {
    const semitones = MAJOR_SCALE[degree];
    const noteIndex = (rootIndex + semitones) % 12;
    return {
      root: notes[noteIndex],
      type,
    };
  });
}

// Get diatonic seventh chords for a given root note
export function getDiatonicSevenths(rootNote: string): Array<{ root: string; type: string }> {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = notes.indexOf(rootNote);
  
  return DIATONIC_SEVENTHS.map(({ degree, type }) => {
    const semitones = MAJOR_SCALE[degree];
    const noteIndex = (rootIndex + semitones) % 12;
    return {
      root: notes[noteIndex],
      type,
    };
  });
}

// Filter items to only include diatonic ones
export function filterDiatonicItems(
  items: string[],
  questionType: string,
  scaleRoot: string,
  scaleDegrees?: number[]
): Array<{ root: string; type: string }> {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = notes.indexOf(scaleRoot);
  const scaleNotes = MAJOR_SCALE.map(semitones => notes[(rootIndex + semitones) % 12]);
  
  // Determine which scale degrees to use
  const allowedDegrees = scaleDegrees || [0, 1, 2, 3, 4, 5, 6]; // All degrees if not specified
  const allowedRoots = allowedDegrees.map(degree => scaleNotes[degree]);
  
  if (questionType === 'interval') {
    // For intervals, we can use any root note in the scale with diatonic intervals
    const diatonicIntervals = getDiatonicIntervals();
    const validIntervals = items.filter(item => diatonicIntervals.includes(item));
    
    return validIntervals.map(type => ({
      root: allowedRoots[Math.floor(Math.random() * allowedRoots.length)],
      type,
    }));
  } else if (questionType === 'triad') {
    const diatonicTriads = getDiatonicTriads(scaleRoot);
    // Filter by both type and scale degree
    return diatonicTriads.filter((chord, index) => 
      items.includes(chord.type) && allowedDegrees.includes(index)
    );
  } else if (questionType === 'seventh_chord') {
    const diatonicSevenths = getDiatonicSevenths(scaleRoot);
    // Filter by both type and scale degree
    return diatonicSevenths.filter((chord, index) => 
      items.includes(chord.type) && allowedDegrees.includes(index)
    );
  }
  
  // For modes, return as-is (modes are inherently about the scale)
  return items.map(type => ({ root: scaleRoot, type }));
}
