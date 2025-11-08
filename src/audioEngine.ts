import * as Tone from 'tone';

// Note frequencies and intervals
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Interval semitone mappings
export const INTERVALS = {
  minor_2nd: 1,
  major_2nd: 2,
  minor_3rd: 3,
  major_3rd: 4,
  perfect_4th: 5,
  tritone: 6,
  perfect_5th: 7,
  minor_6th: 8,
  major_6th: 9,
  minor_7th: 10,
  major_7th: 11,
  octave: 12,
};

// Triad chord formulas (semitones from root)
export const TRIADS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
};

// Seventh chord formulas
export const SEVENTH_CHORDS = {
  major_7: [0, 4, 7, 11],
  minor_7: [0, 3, 7, 10],
  dominant_7: [0, 4, 7, 10],
  half_diminished_7: [0, 3, 6, 10],
  diminished_7: [0, 3, 6, 9],
  minor_major_7: [0, 3, 7, 11],
  augmented_major_7: [0, 4, 8, 11],
};

// Mode formulas (whole steps and half steps from root)
export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11], // Major scale
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10], // Natural minor
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

class AudioEngine {
  private synth: Tone.PolySynth;
  private initialized: boolean = false;

  constructor() {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.3,
        release: 1,
      },
    }).toDestination();
  }

  async initialize() {
    if (!this.initialized) {
      await Tone.start();
      this.initialized = true;
    }
  }

  private getNoteFromSemitones(rootNote: string, semitones: number): string {
    const rootIndex = NOTES.indexOf(rootNote);
    if (rootIndex === -1) return 'C4';
    
    const targetIndex = (rootIndex + semitones) % 12;
    const octaveOffset = Math.floor((rootIndex + semitones) / 12);
    const octave = 4 + octaveOffset;
    
    return `${NOTES[targetIndex]}${octave}`;
  }

  async playInterval(rootNote: string, intervalType: keyof typeof INTERVALS) {
    await this.initialize();
    
    const semitones = INTERVALS[intervalType];
    const root = `${rootNote}4`;
    const second = this.getNoteFromSemitones(rootNote, semitones);
    
    const now = Tone.now();
    this.synth.triggerAttackRelease(root, '1n', now);
    this.synth.triggerAttackRelease(second, '1n', now + 0.6);
    
    return [root, second];
  }

  async playChord(rootNote: string, chordFormula: number[]) {
    await this.initialize();
    
    const notes = chordFormula.map(semitones => 
      this.getNoteFromSemitones(rootNote, semitones)
    );
    
    this.synth.triggerAttackRelease(notes, '2n');
    
    return notes;
  }

  async playTriad(rootNote: string, triadType: keyof typeof TRIADS) {
    return this.playChord(rootNote, TRIADS[triadType]);
  }

  async playSeventhChord(rootNote: string, chordType: keyof typeof SEVENTH_CHORDS) {
    return this.playChord(rootNote, SEVENTH_CHORDS[chordType]);
  }

  async playMode(rootNote: string, modeType: keyof typeof MODES) {
    await this.initialize();
    
    const scale = MODES[modeType];
    const notes = scale.map(semitones => 
      this.getNoteFromSemitones(rootNote, semitones)
    );
    
    // Play scale ascending
    const now = Tone.now();
    notes.forEach((note, index) => {
      this.synth.triggerAttackRelease(note, '8n', now + index * 0.3);
    });
    
    return notes;
  }

  getRandomRootNote(): string {
    const randomIndex = Math.floor(Math.random() * NOTES.length);
    return NOTES[randomIndex];
  }
}

export const audioEngine = new AudioEngine();
