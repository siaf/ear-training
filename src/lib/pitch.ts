// Pure Hz ↔ MIDI ↔ note-name utilities. No Web Audio, safe to import anywhere.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const A4_HZ = 440;
const A4_MIDI = 69;

export function hzToMidi(hz: number): number {
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - A4_MIDI) / 12);
}

/** Cents error between a detected frequency and the nearest (integer) MIDI note. Range: [-50, 50]. */
export function centsOffNearest(hz: number): number {
  const midi = hzToMidi(hz);
  return (midi - Math.round(midi)) * 100;
}

/** Cents between two frequencies (positive = first is higher). */
export function centsBetween(hzA: number, hzB: number): number {
  return 1200 * Math.log2(hzA / hzB);
}

export interface NoteLabel {
  pitchClass: string; // e.g. "C#"
  octave: number; // e.g. 4
  label: string; // e.g. "C#4"
  midi: number; // integer MIDI number
}

export function hzToNote(hz: number): NoteLabel {
  const midi = Math.round(hzToMidi(hz));
  return midiToNote(midi);
}

export function midiToNote(midi: number): NoteLabel {
  const pitchClass = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { pitchClass, octave, label: `${pitchClass}${octave}`, midi };
}

/** Parses "C4", "F#3", "Bb5" (flats normalized to sharps). */
export function noteToMidi(label: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(label.trim());
  if (!m) throw new Error(`Invalid note label: ${label}`);
  const letter = m[1].toUpperCase();
  const accidental = m[2];
  const octave = parseInt(m[3], 10);

  const letterToSemitone: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitone = letterToSemitone[letter];
  if (accidental === '#') semitone += 1;
  else if (accidental === 'b') semitone -= 1;
  return (octave + 1) * 12 + semitone;
}

export function noteToHz(label: string): number {
  return midiToHz(noteToMidi(label));
}
