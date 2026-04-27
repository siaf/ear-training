import type { DiatonicScale } from '../types';
import { noteNameToMidi, hzToMidi } from './pitchDetect';

const SCALE_SEMIS: Record<DiatonicScale, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
};

// Convert a MIDI number back to a note name like "C4".
function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[pc]}${octave}`;
}

// Look up the semitone offset for a scale degree (1-indexed).
// Handles degrees outside 1-7 by wrapping with octave shifts: degree 8 = octave up, degree 0 = octave-step below.
function semitonesForDegree(scale: DiatonicScale, degree: number): number {
  const scaleSemis = SCALE_SEMIS[scale];
  const degIdx0 = degree - 1; // 0-indexed
  const wrapped = ((degIdx0 % 7) + 7) % 7;
  const octaveShift = Math.floor(degIdx0 / 7);
  return scaleSemis[wrapped] + 12 * octaveShift;
}

// Realize a shape (scale-step offsets from startDegree) into concrete note names in a given key.
// e.g. realizeDiatonicSequence('C', 'major', 1, [0,1,0,-1,0]) → ['C4','D4','C4','B3','C4']
export function realizeDiatonicSequence(
  keyRoot: string,
  scale: DiatonicScale,
  startDegree: number,
  shape: number[],
  baseOctave = 4,
): string[] {
  const rootMidi = noteNameToMidi(`${keyRoot}${baseOctave}`);
  return shape.map((offset) => {
    const deg = startDegree + offset;
    const semi = semitonesForDegree(scale, deg);
    return midiToNoteName(rootMidi + semi);
  });
}

// Pick the starting scale-degree for question #idx in a session.
// Cycles through degrees 1 .. (1 + 4 * transposeStep) so the phrase "climbs" per question.
export function sequenceStartDegreeForQuestion(idx: number, transposeStep: number): number {
  // Wrap after 5 cycles to keep in a sane range; 0 → 1, 1 → 1+step, etc.
  return 1 + (idx * transposeStep) % (5 * Math.max(1, transposeStep));
}

// Shared helper re-export.
export { hzToMidi };
