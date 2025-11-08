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
  private droneSynth: Tone.Synth | null = null;
  private droneActive: boolean = false;
  private playbackSpeed: number = 1; // 1 = normal, 0.5 = slow, 2 = fast
  private isPlaying: boolean = false;

  constructor() {
    this.synth = this.createSynth('sine');
    // Create a separate synth for the drone with a warm pad sound
    this.droneSynth = new Tone.Synth({
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.5,
        decay: 0,
        sustain: 1,
        release: 1,
      },
      volume: -12, // Quieter than main synth
    }).toDestination();
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
      console.log('🎵 Audio context initialized');
    }
    
    // Always ensure context is running (iOS can suspend it)
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
      console.log('🎵 Audio context resumed');
    }
  }

  // Stop all currently playing sounds
  stopAll() {
    this.synth.releaseAll();
    this.isPlaying = false;
    Tone.Transport.cancel(); // Cancel all scheduled events
    console.log('🛑 Stopped all playback');
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
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
    const delay = this.getAdjustedTime(0.5);
    this.synth.triggerAttackRelease(root, '1n', now);
    this.synth.triggerAttackRelease(second, '1n', now + delay);
    
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
    const noteDelay = this.getAdjustedTime(0.3);
    notes.forEach((note, index) => {
      this.synth.triggerAttackRelease(note, '8n', now + index * noteDelay);
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
    
    if (this.isPlaying) {
      console.log('⚠️ Already playing, stopping previous playback');
      this.stopAll();
      return { notes: [], duration: 0 };
    }
    
    this.isPlaying = true;
    
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
    const noteDelay = this.getAdjustedTime(0.25);
    const now = Tone.now();
    allNotes.forEach((note, index) => {
      this.synth.triggerAttackRelease(note, '8n', now + index * noteDelay);
    });
    
    const duration = allNotes.length * noteDelay;
    
    // Reset isPlaying after duration
    setTimeout(() => {
      this.isPlaying = false;
    }, duration * 1000 + 100);
    
    return { notes: allNotes, duration };
  }

  // Tonality reference: play I-V-I progression
  async playTonicTriadReference(rootNote: string = 'C') {
    await this.initialize();
    
    if (this.isPlaying) {
      console.log('⚠️ Already playing, stopping previous playback');
      this.stopAll();
      return [];
    }
    
    this.isPlaying = true;
    
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
    
    const delay1 = this.getAdjustedTime(0.6);
    const delay2 = this.getAdjustedTime(1.2);
    this.synth.triggerAttackRelease(iChord, '4n', now);
    this.synth.triggerAttackRelease(vChord, '4n', now + delay1);
    
    // I chord again
    this.synth.triggerAttackRelease(iChord, '2n', now + delay2);
    
    // Reset isPlaying after total duration (last chord duration is '2n' = 2 beats at 120bpm = 1 second)
    const totalDuration = delay2 + 1;
    setTimeout(() => {
      this.isPlaying = false;
    }, totalDuration * 1000 + 100);
    
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

  // Play a scale degree with context (melodic or harmonic)
  async playScaleDegree(
    rootNote: string, 
    degree: number, // 0-6 for scale degrees 1-7
    context: 'major' | 'natural_minor' | 'major_triads' | 'minor_triads' | 'major_7ths' | 'minor_7ths'
  ): Promise<string[]> {
    await this.initialize();
    
    const octave = 4;
    const rootIndex = NOTES.indexOf(rootNote);
    
    // Get the scale based on context
    const scale = context === 'natural_minor' || context === 'minor_triads' || context === 'minor_7ths'
      ? MODES.aeolian // Natural minor
      : MODES.ionian; // Major
    
    const playedNotes: string[] = [];
    
    // Melodic context: play the scale degree as a single note
    if (context === 'major' || context === 'natural_minor') {
      const semitones = scale[degree];
      const noteName = this.getNoteFromSemitones(rootNote, semitones);
      const noteIndex = NOTES.indexOf(noteName);
      const currentOctave = noteIndex < rootIndex ? octave + 1 : octave;
      const note = `${noteName}${currentOctave}`;
      
      console.log(`🎵 Playing scale degree ${degree + 1} in ${context}:`, note);
      
      const now = Tone.now();
      this.synth.triggerAttackRelease(note, '1n', now);
      playedNotes.push(note);
    }
    // Harmonic context: play the triad or 7th chord built on that degree
    else {
      const degreeSemitones = scale[degree];
      const degreeNoteName = this.getNoteFromSemitones(rootNote, degreeSemitones);
      
      // Build chord from the degree
      let chordFormula: number[];
      if (context === 'major_triads' || context === 'minor_triads') {
        // Determine if this degree should be major or minor based on the scale
        const third = scale[(degree + 2) % 7];
        const thirdInterval = (third - degreeSemitones + 12) % 12;
        chordFormula = thirdInterval === 4 ? TRIADS.major : TRIADS.minor;
      } else {
        // 7th chords
        const third = scale[(degree + 2) % 7];
        const seventh = scale[(degree + 6) % 7];
        const thirdInterval = (third - degreeSemitones + 12) % 12;
        const seventhInterval = (seventh - degreeSemitones + 12) % 12;
        
        if (thirdInterval === 4 && seventhInterval === 11) {
          chordFormula = SEVENTH_CHORDS.major_7;
        } else if (thirdInterval === 3 && seventhInterval === 10) {
          chordFormula = SEVENTH_CHORDS.minor_7;
        } else if (thirdInterval === 4 && seventhInterval === 10) {
          chordFormula = SEVENTH_CHORDS.dominant_7;
        } else if (thirdInterval === 3 && seventhInterval === 9) {
          chordFormula = SEVENTH_CHORDS.diminished_7;
        } else {
          chordFormula = SEVENTH_CHORDS.half_diminished_7;
        }
      }
      
      // Build the chord notes
      const degreeRootIndex = NOTES.indexOf(degreeNoteName);
      const chordNotes = chordFormula.map(semitones => {
        const noteName = this.getNoteFromSemitones(degreeNoteName, semitones);
        const noteIndex = NOTES.indexOf(noteName);
        const currentOctave = noteIndex < degreeRootIndex ? octave + 1 : octave;
        return `${noteName}${currentOctave}`;
      });
      
      console.log(`🎹 Playing degree ${degree + 1} chord in ${context}:`, chordNotes);
      
      this.synth.triggerAttackRelease(chordNotes, '2n');
      playedNotes.push(...chordNotes);
    }
    
    return playedNotes;
  }

  // Drone control
  async toggleDrone(rootNote: string, enable: boolean) {
    await this.initialize();
    
    if (enable && !this.droneActive) {
      const droneNote = `${rootNote}3`; // Lower octave for drone
      const now = Tone.now();
      this.droneSynth?.triggerAttack(droneNote, now + 0.1); // Small delay to avoid timing conflicts
      this.droneActive = true;
      console.log(`🎶 Drone ON: ${droneNote}`);
    } else if (!enable && this.droneActive) {
      const now = Tone.now();
      this.droneSynth?.triggerRelease(now + 0.05);
      this.droneActive = false;
      console.log('🎶 Drone OFF');
    }
  }

  // Switch drone to new root note
  async switchDroneNote(newRootNote: string) {
    if (this.droneActive) {
      const now = Tone.now();
      // Release old note
      this.droneSynth?.triggerRelease(now);
      // Wait a bit then start new note
      setTimeout(() => {
        const droneNote = `${newRootNote}3`;
        this.droneSynth?.triggerAttack(droneNote, Tone.now() + 0.1);
        console.log(`🎶 Drone switched to: ${droneNote}`);
      }, 150);
    }
  }

  isDroneActive(): boolean {
    return this.droneActive;
  }

  // Playback speed control
  setPlaybackSpeed(speed: number) {
    this.playbackSpeed = Math.max(0.25, Math.min(3, speed)); // Clamp between 0.25x and 3x
    console.log(`⏱️ Playback speed: ${this.playbackSpeed}x`);
  }

  getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  // Helper to get adjusted timing based on speed
  private getAdjustedTime(baseTime: number): number {
    return baseTime / this.playbackSpeed;
  }
}

export const audioEngine = new AudioEngine();
