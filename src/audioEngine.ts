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

export type SynthType = 'sine' | 'piano' | 'sawtooth';

class AudioEngine {
  private synth: Tone.PolySynth | Tone.Sampler;
  private initialized: boolean = false;
  private currentSynthType: SynthType = 'sine';
  private pianoSampler: Tone.Sampler | null = null;

  constructor() {
    this.synth = this.createSynth('sine');
  }

  private createSynth(type: SynthType): Tone.PolySynth | Tone.Sampler {
    if (type === 'piano') {
      // Use Salamander Grand Piano samples (free, high-quality)
      // Hosted on unpkg CDN
      if (!this.pianoSampler) {
        this.pianoSampler = new Tone.Sampler({
          urls: {
            A0: "A0.mp3",
            C1: "C1.mp3",
            "D#1": "Ds1.mp3",
            "F#1": "Fs1.mp3",
            A1: "A1.mp3",
            C2: "C2.mp3",
            "D#2": "Ds2.mp3",
            "F#2": "Fs2.mp3",
            A2: "A2.mp3",
            C3: "C3.mp3",
            "D#3": "Ds3.mp3",
            "F#3": "Fs3.mp3",
            A3: "A3.mp3",
            C4: "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            A4: "A4.mp3",
            C5: "C5.mp3",
            "D#5": "Ds5.mp3",
            "F#5": "Fs5.mp3",
            A5: "A5.mp3",
            C6: "C6.mp3",
            "D#6": "Ds6.mp3",
            "F#6": "Fs6.mp3",
            A6: "A6.mp3",
            C7: "C7.mp3",
            "D#7": "Ds7.mp3",
            "F#7": "Fs7.mp3",
            A7: "A7.mp3",
            C8: "C8.mp3"
          },
          release: 1,
          baseUrl: "https://tonejs.github.io/audio/salamander/",
        }).toDestination();
      }
      return this.pianoSampler;
    } else {
      // Simple oscillator synth (sine or sawtooth)
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: type,
        },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
      }).toDestination();
    }
  }

  setSynthType(type: SynthType) {
    if (this.currentSynthType === type) return;
    
    if (this.currentSynthType !== 'piano' && this.synth) {
      this.synth.dispose();
    }
    this.synth = this.createSynth(type);
    this.currentSynthType = type;
  }

  async initialize() {
    if (!this.initialized) {
      await Tone.start();
      this.initialized = true;
    }
  }

  private getNoteFromSemitones(rootNote: string, semitones: number): string {
    const rootIndex = NOTES.indexOf(rootNote);
    if (rootIndex === -1) return 'C';
    
    const targetIndex = (rootIndex + semitones) % 12;
    
    return NOTES[targetIndex];
  }

  async playInterval(rootNote: string, intervalType: keyof typeof INTERVALS) {
    await this.initialize();
    
    const semitones = INTERVALS[intervalType];
    const octave = 4;
    const root = `${rootNote}${octave}`;
    
    // Handle octave wrapping for the second note
    const secondNoteName = this.getNoteFromSemitones(rootNote, semitones);
    const noteIndex = NOTES.indexOf(secondNoteName);
    const rootIndex = NOTES.indexOf(rootNote);
    const secondOctave = noteIndex < rootIndex ? octave + 1 : octave;
    const second = `${secondNoteName}${secondOctave}`;
    
    console.log(`🎵 Playing ${intervalType}:`, [root, second]);
    
    const now = Tone.now();
    this.synth.triggerAttackRelease(root, '1n', now);
    this.synth.triggerAttackRelease(second, '1n', now + 0.5);
    
    return [root, second];
  }

  async playChord(rootNote: string, chordFormula: number[]) {
    await this.initialize();
    
    const octave = 4;
    const rootIndex = NOTES.indexOf(rootNote);
    
    // Build chord with proper octave handling
    const notes = chordFormula.map(semitones => {
      const noteName = this.getNoteFromSemitones(rootNote, semitones);
      const noteIndex = NOTES.indexOf(noteName);
      
      // If we've wrapped around, we're in the next octave
      const currentOctave = noteIndex < rootIndex ? octave + 1 : octave;
      return `${noteName}${currentOctave}`;
    });
    
    console.log(`🎹 Playing chord from ${rootNote}:`, notes);
    
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
    const octave = 4;
    
    // Build scale with proper octave handling
    const notes = scale.map(semitones => {
      const noteName = this.getNoteFromSemitones(rootNote, semitones);
      const noteIndex = NOTES.indexOf(noteName);
      const rootIndex = NOTES.indexOf(rootNote);
      
      // If we've wrapped around (e.g., from B to C), we're in the next octave
      const currentOctave = noteIndex < rootIndex ? octave + 1 : octave;
      return `${noteName}${currentOctave}`;
    });
    
    console.log(`🎼 Playing ${modeType} mode from ${rootNote}:`, notes);
    
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

  // Tonality reference: play major scale up and down
  async playMajorScaleReference(rootNote: string = 'C', octave: number = 4): Promise<{ notes: string[]; duration: number }> {
    await this.initialize();
    
    const scale = MODES.ionian; // Major scale
    
    // Build ascending scale with proper octave handling
    const notesUp = scale.map(semitones => {
      const noteName = this.getNoteFromSemitones(rootNote, semitones);
      const noteIndex = NOTES.indexOf(noteName);
      const rootIndex = NOTES.indexOf(rootNote);
      
      // If we've wrapped around (e.g., from B to C), we're in the next octave
      const currentOctave = noteIndex < rootIndex ? octave + 1 : octave;
      return `${noteName}${currentOctave}`;
    });
    
    // Add octave at the top
    const octaveNote = `${rootNote}${octave + 1}`;
    const fullScaleUp = [...notesUp, octaveNote];
    
    // Create descending scale (reverse the ascending scale, skip the duplicate root at top)
    const notesDown = fullScaleUp.slice(0, -1).reverse();
    const allNotes = [...fullScaleUp, ...notesDown];
    
    console.log(`🎹 Playing ${rootNote} Major Scale (up & down):`, allNotes);
    
    // Play scale ascending and descending
    const noteDelay = 0.25;
    const now = Tone.now();
    allNotes.forEach((note, index) => {
      this.synth.triggerAttackRelease(note, '8n', now + index * noteDelay);
    });
    
    const duration = allNotes.length * noteDelay;
    
    return { notes: allNotes, duration };
  }

  // Tonality reference: play I-V-I progression
  async playTonicTriadReference(rootNote: string = 'C') {
    await this.initialize();
    
    const now = Tone.now();
    const octave = 4;
    const rootIndex = NOTES.indexOf(rootNote);
    
    // I chord (tonic)
    const iChord = TRIADS.major.map(semitones => {
      const noteName = this.getNoteFromSemitones(rootNote, semitones);
      const noteIndex = NOTES.indexOf(noteName);
      const currentOctave = noteIndex < rootIndex ? octave + 1 : octave;
      return `${noteName}${currentOctave}`;
    });
    
    // V chord (dominant) - root is 7 semitones up
    const vRootNote = this.getNoteFromSemitones(rootNote, 7);
    const vRootIndex = NOTES.indexOf(vRootNote);
    const vChord = TRIADS.major.map(semitones => {
      const noteName = this.getNoteFromSemitones(vRootNote, semitones);
      const noteIndex = NOTES.indexOf(noteName);
      const currentOctave = noteIndex < vRootIndex ? octave + 1 : octave;
      return `${noteName}${currentOctave}`;
    });
    
    console.log(`🎵 Playing ${rootNote} I-V-I progression:`, { I: iChord, V: vChord });
    
    this.synth.triggerAttackRelease(iChord, '4n', now);
    this.synth.triggerAttackRelease(vChord, '4n', now + 0.6);
    
    // I chord again
    this.synth.triggerAttackRelease(iChord, '2n', now + 1.2);
    
    return [...iChord, ...vChord, ...iChord];
  }

  // Get notes that are diatonic to the major scale from a root
  getDiatonicNotes(rootNote: string): string[] {
    const scale = MODES.ionian;
    return scale.map(semitones => 
      this.getNoteFromSemitones(rootNote, semitones)
    );
  }

  // Get scale degree (0-6) for a note in a given key
  getScaleDegree(rootNote: string, targetNote: string): number | null {
    const rootIndex = NOTES.indexOf(rootNote);
    const targetIndex = NOTES.indexOf(targetNote);
    if (rootIndex === -1 || targetIndex === -1) return null;
    
    const interval = (targetIndex - rootIndex + 12) % 12;
    const scale = MODES.ionian;
    
    return scale.indexOf(interval);
  }
}

export const audioEngine = new AudioEngine();
