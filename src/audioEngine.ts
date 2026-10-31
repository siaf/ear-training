import * as Tone from 'tone';
import type { AcousticKind } from './types';
import { startPitchDetect, type ListenHandle, type PitchListener } from './lib/pitchDetect';

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

export type SynthType =
  | 'piano'
  | 'sine'
  | 'triangle'
  | 'square'
  | 'sawtooth'
  | 'epiano'
  | 'bells'
  | 'pluck'
  | 'guitar'
  | 'bass'
  | 'violin'
  | 'cello';

export interface SynthMeta {
  id: SynthType;
  label: string;
  category: 'keyboard' | 'synth' | 'strings' | 'plucked';
  needsSamples: boolean;
  hidden?: boolean; // Still supported by the engine but not shown in the UI picker.
}

export const SYNTH_CATALOG: SynthMeta[] = [
  { id: 'piano',    label: 'Piano',          category: 'keyboard', needsSamples: true },
  { id: 'epiano',   label: 'Electric piano', category: 'keyboard', needsSamples: false, hidden: true },
  { id: 'bells',    label: 'Bells',          category: 'synth',    needsSamples: false, hidden: true },
  { id: 'pluck',    label: 'Pluck',          category: 'synth',    needsSamples: false, hidden: true },
  { id: 'sine',     label: 'Sine',           category: 'synth',    needsSamples: false },
  { id: 'triangle', label: 'Triangle',       category: 'synth',    needsSamples: false },
  { id: 'square',   label: 'Square',         category: 'synth',    needsSamples: false },
  { id: 'sawtooth', label: 'Sawtooth',       category: 'synth',    needsSamples: false },
  { id: 'guitar',   label: 'Guitar',         category: 'plucked',  needsSamples: true },
  { id: 'bass',     label: 'Bass',           category: 'plucked',  needsSamples: true },
  { id: 'violin',   label: 'Violin',         category: 'strings',  needsSamples: true },
  { id: 'cello',    label: 'Cello',          category: 'strings',  needsSamples: true },
];

// Sample-based instrument configs. Hosted on nbrosowsky's tonejs-instruments GitHub Pages
// (public domain samples, CORS-enabled, cached by the browser after first fetch).
const INSTRUMENT_SAMPLES = 'https://nbrosowsky.github.io/tonejs-instruments/samples';

interface SamplerConfig {
  baseUrl: string;
  urls: Record<string, string>;
  release?: number;
}

const SAMPLER_CONFIGS: Partial<Record<SynthType, SamplerConfig>> = {
  piano: {
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    release: 1,
    urls: {
      A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
      A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
      A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
      A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
      A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
      A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
      A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
      A7: 'A7.mp3', C8: 'C8.mp3',
    },
  },
  guitar: {
    baseUrl: `${INSTRUMENT_SAMPLES}/guitar-acoustic/`,
    urls: {
      A2: 'A2.mp3', A3: 'A3.mp3', A4: 'A4.mp3',
      C3: 'C3.mp3', C4: 'C4.mp3', C5: 'C5.mp3',
      E2: 'E2.mp3', E3: 'E3.mp3', E4: 'E4.mp3',
      G2: 'G2.mp3', G3: 'G3.mp3', G4: 'G4.mp3',
    },
  },
  bass: {
    baseUrl: `${INSTRUMENT_SAMPLES}/bass-electric/`,
    urls: {
      A1: 'A1.mp3', A2: 'A2.mp3', A3: 'A3.mp3',
      C2: 'C2.mp3', C3: 'C3.mp3',
      E1: 'E1.mp3', E2: 'E2.mp3', E3: 'E3.mp3',
      G1: 'G1.mp3', G2: 'G2.mp3',
    },
  },
  violin: {
    baseUrl: `${INSTRUMENT_SAMPLES}/violin/`,
    urls: {
      G3: 'G3.mp3', A3: 'A3.mp3', C4: 'C4.mp3', E4: 'E4.mp3', G4: 'G4.mp3',
      A4: 'A4.mp3', C5: 'C5.mp3', E5: 'E5.mp3', G5: 'G5.mp3',
      A5: 'A5.mp3', C6: 'C6.mp3', E6: 'E6.mp3',
    },
  },
  cello: {
    baseUrl: `${INSTRUMENT_SAMPLES}/cello/`,
    urls: {
      C2: 'C2.mp3', E2: 'E2.mp3', G2: 'G2.mp3',
      A2: 'A2.mp3', C3: 'C3.mp3', E3: 'E3.mp3', G3: 'G3.mp3',
      A3: 'A3.mp3', C4: 'C4.mp3', E4: 'E4.mp3', G4: 'G4.mp3',
      A4: 'A4.mp3',
    },
  },
};

class AudioEngine {
  private synth: Tone.PolySynth | Tone.Sampler;
  private initialized: boolean = false;
  private currentSynthType: SynthType = 'sine';
  // Samplers are expensive — cache each one so we don't re-download samples.
  private samplerCache: Map<SynthType, Tone.Sampler> = new Map();
  private droneSynth: Tone.Synth | null = null;
  private droneActive: boolean = false;
  private playbackSpeed: number = 1; // 1 = normal, 0.5 = slow, 2 = fast
  private isPlaying: boolean = false;
  private acousticSynth: Tone.PolySynth | null = null;
  private feedbackSynth: Tone.PolySynth | null = null;
  private percSynth: Tone.MembraneSynth | null = null;
  private percAccentSynth: Tone.MembraneSynth | null = null;
  // Timestamp (ms, performance.now time base) after which the speakers are quiet again.
  // Used to gate mic detection so sing mode doesn't pick up our own playback.
  private playbackEndsAt: number = 0;

  private markPlayback(durationSec: number) {
    const endsAt = performance.now() + durationSec * 1000 + 200; // + 200ms tail for speaker decay
    if (endsAt > this.playbackEndsAt) this.playbackEndsAt = endsAt;
  }

  isPlaybackActive(): boolean {
    return performance.now() < this.playbackEndsAt;
  }

  constructor() {
    // Master limiter prevents clipping when multiple scale notes overlap (release tails stack).
    // -1 dB ceiling leaves a touch of headroom; brick-wall style.
    const limiter = new Tone.Limiter(-1);
    Tone.getDestination().chain(limiter);

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
    // Sample-based instruments — cache per type so we don't re-download.
    const samplerCfg = SAMPLER_CONFIGS[type];
    if (samplerCfg) {
      const cached = this.samplerCache.get(type);
      if (cached) return cached;
      const sampler = new Tone.Sampler({
        urls: samplerCfg.urls,
        baseUrl: samplerCfg.baseUrl,
        release: samplerCfg.release ?? 0.6,
      }).toDestination();
      this.samplerCache.set(type, sampler);
      return sampler;
    }

    // FM presets — mathematically generated, no download required.
    if (type === 'epiano') {
      return new Tone.PolySynth(Tone.FMSynth, {
        volume: -6,
        harmonicity: 3,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        modulation: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.8, sustain: 0.1, release: 1.2 },
        modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 0.3 },
      }).toDestination();
    }

    if (type === 'bells') {
      return new Tone.PolySynth(Tone.FMSynth, {
        volume: -10,
        harmonicity: 3.01,
        modulationIndex: 14,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 1.4 },
        modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.5 },
      }).toDestination();
    }

    if (type === 'pluck') {
      // Tone.PluckSynth is monophonic and can't wrap in PolySynth; simulate a pluck
      // with a polyphonic Synth that has a fast attack, no sustain, short release.
      return new Tone.PolySynth(Tone.Synth, {
        volume: -3,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.8 },
      }).toDestination();
    }

    // Basic oscillator synths (sine, triangle, square, sawtooth). Short release so
    // scale reference doesn't stack up into a distorted mush.
    return new Tone.PolySynth(Tone.Synth, {
      volume: -4,
      oscillator: {
        type: type as OscillatorType,
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.25,
        release: 0.55,
      },
    }).toDestination();
  }

  setSynthType(type: SynthType) {
    if (this.currentSynthType === type) return;

    // Dispose the old synth unless it's a cached sampler — we keep samplers alive
    // so samples don't re-download on every toggle.
    const prev = this.currentSynthType;
    const prevIsSampler = this.samplerCache.has(prev);
    if (!prevIsSampler && this.synth) {
      this.synth.dispose();
    }
    this.synth = this.createSynth(type);
    this.currentSynthType = type;
    console.log(`🎛 synth: ${prev} → ${type}`);
  }

  getSynthType(): SynthType {
    return this.currentSynthType;
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
    
    // Handle negative semitones correctly
    const targetIndex = ((rootIndex + semitones) % 12 + 12) % 12;
    
    return NOTES[targetIndex];
  }

  async playInterval(
    rootNote: string, 
    intervalType: keyof typeof INTERVALS,
    direction: 'ascending' | 'descending' = 'ascending',
    presentation: 'harmonic' | 'melodic' = 'melodic'
  ) {
    await this.initialize();
    
    const semitones = INTERVALS[intervalType];
    const octave = 4;
    const root = `${rootNote}${octave}`;
    
    // Calculate second note based on direction
    let secondNoteName: string;
    let secondOctave: number;
    
    if (direction === 'ascending') {
      secondNoteName = this.getNoteFromSemitones(rootNote, semitones);
      const noteIndex = NOTES.indexOf(secondNoteName);
      const rootIndex = NOTES.indexOf(rootNote);
      secondOctave = noteIndex < rootIndex ? octave + 1 : octave;
    } else {
      // Descending - go down by the interval
      secondNoteName = this.getNoteFromSemitones(rootNote, -semitones);
      const noteIndex = NOTES.indexOf(secondNoteName);
      const rootIndex = NOTES.indexOf(rootNote);
      secondOctave = noteIndex > rootIndex ? octave - 1 : octave;
    }
    
    const second = `${secondNoteName}${secondOctave}`;
    
    console.log(`🎵 Playing ${intervalType} (${direction}, ${presentation}):`, [root, second]);
    
    const now = Tone.now();
    
    if (presentation === 'harmonic') {
      // Play both notes together
      this.synth.triggerAttackRelease(root, '2n', now);
      this.synth.triggerAttackRelease(second, '2n', now);
    } else {
      // Play melodically with delay
      const delay = this.getAdjustedTime(0.5);
      if (direction === 'ascending') {
        this.synth.triggerAttackRelease(root, '1n', now);
        this.synth.triggerAttackRelease(second, '1n', now + delay);
      } else {
        this.synth.triggerAttackRelease(root, '1n', now);
        this.synth.triggerAttackRelease(second, '1n', now + delay);
      }
    }
    
    return [root, second];
  }

  async playNote(note: string, durationSec = 1): Promise<string[]> {
    await this.initialize();
    this.synth.triggerAttackRelease(note, durationSec);
    this.markPlayback(durationSec);
    return [note];
  }

  async playSequence(notes: string[], noteDurSec = 0.45, gapSec = 0.08): Promise<string[]> {
    await this.initialize();
    const now = Tone.now();
    const step = noteDurSec + gapSec;
    notes.forEach((note, i) => {
      this.synth.triggerAttackRelease(note, noteDurSec, now + i * step);
    });
    this.markPlayback(notes.length * step);
    return notes;
  }

  async startListening(onPitch: PitchListener, onDeadMic?: () => void): Promise<ListenHandle> {
    await this.initialize();
    // Share the AudioContext with Tone so iOS doesn't create a second one that quietly suspends.
    const rawCtx = (Tone.context as unknown as { rawContext: AudioContext }).rawContext;
    return startPitchDetect(rawCtx, onPitch, {
      gate: () => !this.isPlaybackActive(),
      onDeadMic,
    });
  }

  private getAcousticSynth(): Tone.PolySynth {
    if (!this.acousticSynth) {
      this.acousticSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.08, decay: 0.1, sustain: 0.9, release: 0.3 },
        volume: -6,
      }).toDestination();
    }
    return this.acousticSynth;
  }

  async playAcoustic(
    kind: Exclude<AcousticKind, 'match_pitch' | 'sing_sequence'>,
    correctAnswer: string,
    rootNote: string,
    frozenSemis?: number, // pass the pre-chosen semis to make replay deterministic
  ): Promise<{ notes: string[]; semis: number }> {
    await this.initialize();
    const synth = this.getAcousticSynth();
    const octave = 4;
    const rootLabel = `${rootNote}${octave}`;
    const rootFreq = Tone.Frequency(rootLabel).toFrequency();
    const now = Tone.now();

    const centsToRatio = (cents: number) => Math.pow(2, cents / 1200);
    const semiToRatio = (semi: number) => Math.pow(2, semi / 12);

    switch (kind) {
      case 'same_diff': {
        // Sequential. same = unison, different = 2 semitones apart.
        const semis = correctAnswer === 'same' ? 0 : 2;
        const gap = this.getAdjustedTime(0.6);
        const dur = this.getAdjustedTime(0.5);
        synth.triggerAttackRelease(rootFreq, dur, now);
        synth.triggerAttackRelease(rootFreq * semiToRatio(semis), dur, now + gap);
        return { notes: [rootLabel, `${rootLabel}${semis ? `+${semis}st` : ''}`], semis };
      }
      case 'beating': {
        // Harmonic. in_tune = perfect unison, beating = ~10 cent detune (audible slow beats).
        const cents = correctAnswer === 'in_tune' ? 0 : 10;
        const dur = this.getAdjustedTime(2.5);
        synth.triggerAttackRelease(rootFreq, dur, now);
        synth.triggerAttackRelease(rootFreq * centsToRatio(cents), dur, now);
        return { notes: [rootLabel, `${rootLabel}${cents ? `+${cents}¢` : ''}`], semis: 0 };
      }
      case 'higher_lower': {
        // Sequential, wide gap (3–9 semitones). Randomized once per question; reused on replay.
        const sign = correctAnswer === 'higher' ? 1 : -1;
        const semis = frozenSemis ?? sign * (3 + Math.floor(Math.random() * 7));
        const gap = this.getAdjustedTime(0.6);
        const dur = this.getAdjustedTime(0.5);
        synth.triggerAttackRelease(rootFreq, dur, now);
        synth.triggerAttackRelease(rootFreq * semiToRatio(semis), dur, now + gap);
        return { notes: [rootLabel, `${rootLabel}${semis > 0 ? '+' : ''}${semis}st`], semis };
      }
      case 'consonance': {
        // Harmonic. smooth = consonant interval, rough = dissonant. Frozen per question.
        const smooth = [3, 4, 7, 9, 12]; // m3, M3, P5, M6, octave
        const rough = [1, 2, 6, 11]; // m2, M2, tritone, M7
        const pool = correctAnswer === 'smooth' ? smooth : rough;
        const semis = frozenSemis ?? pool[Math.floor(Math.random() * pool.length)];
        const dur = this.getAdjustedTime(2);
        synth.triggerAttackRelease(rootFreq, dur, now);
        synth.triggerAttackRelease(rootFreq * semiToRatio(semis), dur, now);
        return { notes: [rootLabel, `${rootLabel}+${semis}st`], semis };
      }
    }
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
    this.markPlayback(duration);

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
      this.markPlayback(2); // '1n' at 120bpm ≈ 2s
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
      const droneNote = `${rootNote}4`; // Same octave as the scale root — tonal center
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
        const droneNote = `${newRootNote}4`;
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

  private getFeedbackSynth(): Tone.PolySynth {
    if (!this.feedbackSynth) {
      this.feedbackSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.2 },
        volume: -10,
      }).toDestination();
    }
    return this.feedbackSynth;
  }

  // ---------------------------------------------------------------
  // Chord helpers shared across cadence / progression / jazz playback
  // ---------------------------------------------------------------

  // Build absolute notes (e.g. ["C4","E4","G4"]) from a root pitch class + interval formula in semitones.
  // Formula values can be negative (drop-2 voicings) or > 12 (extensions, inversions). The output is
  // sorted by ascending pitch so it plays as a coherent chord.
  private buildChordNotes(rootNote: string, formula: number[], baseOctave = 4): string[] {
    const rootIndex = NOTES.indexOf(rootNote);
    if (rootIndex === -1) throw new Error(`unknown root ${rootNote}`);
    const items = formula.map((semis) => {
      const totalSemis = rootIndex + semis;
      const pcIndex = ((totalSemis % 12) + 12) % 12;
      const octave = baseOctave + Math.floor(totalSemis / 12);
      return { absSemis: totalSemis, label: `${NOTES[pcIndex]}${octave}` };
    });
    return items.sort((a, b) => a.absSemis - b.absSemis).map((x) => x.label);
  }

  // Build a triad or 7th by scale degree in a major key. Returns chord notes ready for the synth.
  private buildDegreeChord(
    keyRoot: string,
    degree: number, // 0..6
    quality: 'maj' | 'min' | 'dim' | 'aug' | 'maj7' | 'm7' | '7' | 'm7b5' | 'dim7',
    baseOctave = 4,
  ): string[] {
    const scale = MODES.ionian;
    const idx = ((degree % 7) + 7) % 7;
    const chordRoot = this.getNoteFromSemitones(keyRoot, scale[idx]);
    let formula: number[];
    switch (quality) {
      case 'maj': formula = TRIADS.major; break;
      case 'min': formula = TRIADS.minor; break;
      case 'dim': formula = TRIADS.diminished; break;
      case 'aug': formula = TRIADS.augmented; break;
      case 'maj7': formula = SEVENTH_CHORDS.major_7; break;
      case 'm7':   formula = SEVENTH_CHORDS.minor_7; break;
      case '7':    formula = SEVENTH_CHORDS.dominant_7; break;
      case 'm7b5': formula = SEVENTH_CHORDS.half_diminished_7; break;
      case 'dim7': formula = SEVENTH_CHORDS.diminished_7; break;
    }
    return this.buildChordNotes(chordRoot, formula, baseOctave);
  }

  // Play a sequence of chord-note arrays as a steady progression.
  private async playChordSequence(chords: string[][], chordDurSec = 0.7): Promise<{ notes: string[]; duration: number }> {
    await this.initialize();
    const now = Tone.now();
    const step = this.getAdjustedTime(chordDurSec);
    chords.forEach((notes, i) => {
      this.synth.triggerAttackRelease(notes, step * 0.95, now + i * step);
    });
    const duration = chords.length * step;
    this.markPlayback(duration);
    const flat = chords.flat();
    return { notes: flat, duration };
  }

  // ---------------------------------------------------------------
  // Cadences
  // ---------------------------------------------------------------

  async playCadence(
    keyRoot: string,
    cadenceType: 'authentic' | 'plagal' | 'half' | 'deceptive',
    mode: 'major' | 'minor' = 'major',
  ): Promise<string[]> {
    await this.initialize();
    // Major-key cadences. (Minor-key variant uses lowercase qualities by degree.)
    const M = mode === 'major';
    const degQuality = (deg: number, override?: 'maj' | 'min' | 'dim' | 'aug'): 'maj' | 'min' | 'dim' | 'aug' => {
      if (override) return override;
      const majQ: Array<'maj'|'min'|'dim'|'aug'> = ['maj','min','min','maj','maj','min','dim'];
      const minQ: Array<'maj'|'min'|'dim'|'aug'> = ['min','dim','maj','min','min','maj','maj'];
      return (M ? majQ : minQ)[deg];
    };

    let degrees: number[];
    let qualities: Array<'maj'|'min'|'dim'|'aug'>;
    switch (cadenceType) {
      case 'authentic':
        // I (or i) → IV → V → I  (V is always major in a real authentic cadence; in minor we raise the 7th)
        degrees = [0, 3, 4, 0];
        qualities = [degQuality(0), degQuality(3), 'maj', degQuality(0)];
        break;
      case 'plagal':
        // I → V → IV → I  (the "amen" — IV→I at the end)
        degrees = [0, 4, 3, 0];
        qualities = [degQuality(0), 'maj', degQuality(3), degQuality(0)];
        break;
      case 'half':
        // I → IV → ii → V (ends on V, unresolved)
        degrees = [0, 3, 1, 4];
        qualities = [degQuality(0), degQuality(3), degQuality(1), 'maj'];
        break;
      case 'deceptive':
        // I → IV → V → vi (V "expected to resolve to I" — it lands on vi instead)
        degrees = [0, 3, 4, 5];
        qualities = [degQuality(0), degQuality(3), 'maj', degQuality(5)];
        break;
    }
    const chords = degrees.map((d, i) => this.buildDegreeChord(keyRoot, d, qualities[i], 4));
    const { notes } = await this.playChordSequence(chords, 0.75);
    console.log(`🎼 Cadence ${cadenceType} in ${keyRoot} ${mode}`);
    return notes;
  }

  // ---------------------------------------------------------------
  // Inversions
  // ---------------------------------------------------------------

  async playInversion(
    rootNote: string,
    chordType: keyof typeof TRIADS | keyof typeof SEVENTH_CHORDS,
    position: 'root' | 'first' | 'second' | 'third',
    kind: 'triad' | 'seventh' = 'triad',
  ): Promise<string[]> {
    await this.initialize();
    const formula = (kind === 'triad' ? TRIADS[chordType as keyof typeof TRIADS] : SEVENTH_CHORDS[chordType as keyof typeof SEVENTH_CHORDS]).slice();
    if (!formula) throw new Error(`unknown chord ${chordType}`);
    const idxByName: Record<typeof position, number> = { root: 0, first: 1, second: 2, third: 3 };
    const rotateBy = idxByName[position];
    if (rotateBy >= formula.length) {
      // 'third' on a triad — fallback to root
      console.warn(`inversion ${position} not valid for ${kind}; using root`);
    }
    // Rotate: move the lowest N notes up an octave so the next note is the bass.
    const rotated = formula.slice();
    for (let i = 0; i < Math.min(rotateBy, formula.length - 1); i++) {
      const first = rotated.shift()!;
      rotated.push(first + 12);
    }
    const notes = this.buildChordNotes(rootNote, rotated, 4);
    console.log(`🎹 ${chordType} ${position}-inversion from ${rootNote}:`, notes);
    this.synth.triggerAttackRelease(notes, '2n');
    this.markPlayback(2.0);
    return notes;
  }

  // ---------------------------------------------------------------
  // Progressions (table-driven)
  // ---------------------------------------------------------------

  // Each progression chord is [degree (0..6), quality, optional semitone offset of the parent key].
  // The offset lets a single progression switch key mid-sequence (modulations).
  private static PROGRESSIONS: Record<string, Array<[number, 'maj' | 'min' | 'dim' | 'aug' | 'maj7' | 'm7' | '7' | 'm7b5', number?]>> = {
    // Pop diatonic (major key)
    'I_V_vi_IV': [[0,'maj'],[4,'maj'],[5,'min'],[3,'maj']],
    'vi_IV_I_V': [[5,'min'],[3,'maj'],[0,'maj'],[4,'maj']],
    'I_vi_IV_V': [[0,'maj'],[5,'min'],[3,'maj'],[4,'maj']],
    'I_IV_V_I': [[0,'maj'],[3,'maj'],[4,'maj'],[0,'maj']],
    // Jazz cadences
    'ii_V_I_major': [[1,'m7'],[4,'7'],[0,'maj7']],
    'ii_V_i_minor': [[1,'m7b5'],[4,'7'],[0,'m7']],
    // Secondary dominants — V/X resolves to its target within the home key
    'V_of_V':  [[0,'maj'],[1,'7'],[4,'maj'],[0,'maj']], // I → V/V (II7) → V → I
    'V_of_vi': [[0,'maj'],[2,'7'],[5,'min'],[0,'maj']], // I → V/vi (III7) → vi → I
    'V_of_ii': [[0,'maj'],[5,'7'],[1,'min'],[0,'maj']], // I → V/ii (VI7) → ii → I
    'V_of_IV': [[0,'maj'],[0,'7'],[3,'maj'],[0,'maj']], // I → V/IV (I7) → IV → I
    // Modulation cues — same opening, different ending. Listener decides if the key changed.
    'stay_in_key':       [[0,'maj'],[3,'maj'],[4,'maj'],[0,'maj']],
    'modulation_to_V':   [[0,'maj'],[3,'maj'],[4,'7',  0],[0,'maj', 7]], // pivot: V of C = I of G
    'modulation_to_vi':  [[0,'maj'],[3,'maj'],[2,'7',  0],[0,'min', 9]], // III7 → vi (acts as i in new minor key)
  };

  async playProgression(keyRoot: string, progressionId: string): Promise<string[]> {
    await this.initialize();
    const def = AudioEngine.PROGRESSIONS[progressionId];
    if (!def) throw new Error(`unknown progression ${progressionId}`);
    const chords = def.map(([deg, q, keyOffsetSemis]) => {
      const keyForChord = keyOffsetSemis ? this.getNoteFromSemitones(keyRoot, keyOffsetSemis) : keyRoot;
      return this.buildDegreeChord(keyForChord, deg, q, 4);
    });
    const { notes } = await this.playChordSequence(chords, 0.7);
    console.log(`🎶 Progression ${progressionId} in ${keyRoot}`);
    return notes;
  }

  // ---------------------------------------------------------------
  // Jazz extensions / altered dominants
  // ---------------------------------------------------------------

  // Plays a major-key cadence I → target7 → I, where target7 carries the named extension.
  // Extensions: '9'/'11'/'13' on V7; alterations: '7b9', '7s9', '7s11', '7b13'.
  async playChordExtension(
    keyRoot: string,
    target: 'I' | 'IV' | 'V' | 'ii',
    extension: '9' | '11' | '13' | '7b9' | '7s9' | '7s11' | '7b13',
  ): Promise<string[]> {
    await this.initialize();
    const targetDegree: Record<'I'|'IV'|'V'|'ii', number> = { I: 0, IV: 3, V: 4, ii: 1 };
    const baseFormula: Record<'I'|'IV'|'V'|'ii', number[]> = {
      I: SEVENTH_CHORDS.major_7,
      IV: SEVENTH_CHORDS.major_7,
      V: SEVENTH_CHORDS.dominant_7,
      ii: SEVENTH_CHORDS.minor_7,
    };
    // Extension semitones above the chord root.
    const extSemis: Record<typeof extension, number> = {
      '9': 14, '11': 17, '13': 21,
      '7b9': 13, '7s9': 15, '7s11': 18, '7b13': 20,
    };
    const scale = MODES.ionian;
    const targetChordRoot = this.getNoteFromSemitones(keyRoot, scale[targetDegree[target]]);
    const targetWithExt = this.buildChordNotes(targetChordRoot, [...baseFormula[target], extSemis[extension]], 4);
    const I = this.buildDegreeChord(keyRoot, 0, 'maj', 4);
    const { notes } = await this.playChordSequence([I, targetWithExt, I], 0.9);
    console.log(`🎷 ${target}${extension} in ${keyRoot} (cadence I → ${target}${extension} → I)`);
    return notes;
  }

  // ---------------------------------------------------------------
  // Modal interchange (borrowed chords from the parallel minor)
  // ---------------------------------------------------------------

  async playBorrowedChord(
    keyRoot: string,
    chord: 'iv' | 'bIII' | 'bVI' | 'bVII' | 'bII',
  ): Promise<string[]> {
    await this.initialize();
    // Borrowed chords measured in semitones from the major tonic.
    const map: Record<typeof chord, { semis: number; quality: 'maj' | 'min' }> = {
      iv:    { semis: 5,  quality: 'min' },  // IV becomes iv
      bIII:  { semis: 3,  quality: 'maj' },  // ♭III major
      bVI:   { semis: 8,  quality: 'maj' },  // ♭VI major
      bVII:  { semis: 10, quality: 'maj' },  // ♭VII major
      bII:   { semis: 1,  quality: 'maj' },  // Neapolitan ♭II major
    };
    const { semis, quality } = map[chord];
    const borrowedRoot = this.getNoteFromSemitones(keyRoot, semis);
    const formula = quality === 'maj' ? TRIADS.major : TRIADS.minor;
    const borrowedChord = this.buildChordNotes(borrowedRoot, formula, 4);
    const I = this.buildDegreeChord(keyRoot, 0, 'maj', 4);
    const V = this.buildDegreeChord(keyRoot, 4, 'maj', 4);
    const { notes } = await this.playChordSequence([I, borrowedChord, V, I], 0.8);
    console.log(`🌗 borrowed ${chord} in ${keyRoot}`);
    return notes;
  }

  // ---------------------------------------------------------------
  // Voicings — same chord (e.g. Cmaj7), different vertical layouts
  // ---------------------------------------------------------------

  async playVoicing(
    rootNote: string,
    chordType: 'maj7' | 'm7' | '7',
    voicing: 'closed' | 'drop2' | 'quartal' | 'upper_structure',
  ): Promise<string[]> {
    await this.initialize();
    const formula =
      chordType === 'maj7' ? SEVENTH_CHORDS.major_7
      : chordType === 'm7' ? SEVENTH_CHORDS.minor_7
      : SEVENTH_CHORDS.dominant_7;

    let voiced: number[];
    switch (voicing) {
      case 'closed':
        // Standard root-position voicing in a single octave.
        voiced = formula.slice();
        break;
      case 'drop2': {
        // Take the second-from-the-top voice and move it down an octave.
        // For a 4-note chord [r, 3, 5, 7] sorted ascending, drop2 → [5-12, r, 3, 7]
        const [a, b, c, d] = formula;
        voiced = [c - 12, a, b, d];
        break;
      }
      case 'quartal':
        // Stack of 4ths from the chord root: r, 4, 7, 10 (semitone offsets — perfect 4ths).
        // Maps to a "So What" / quartal voicing flavor for any chord type.
        voiced = [0, 5, 10, 15];
        break;
      case 'upper_structure':
        // Bass + a triad whose notes form the 9/3/13 (or appropriate upper extensions).
        // For maj7: bass + D-major-triad-equivalent above (root, +14, +18, +21) → root + 9 + #11 + 13.
        // For 7:   bass + Db-major-triad above   (root, +13, +17, +20) → root + b9 + 11 + b13 (alt sound).
        // For m7:  bass + Eb-major-triad above   (root, +15, +19, +22) → root + #9-equivalent (m9 voicing).
        voiced = chordType === '7'   ? [0, 13, 17, 20]
              : chordType === 'm7'  ? [0, 15, 19, 22]
              :                       [0, 14, 18, 21];
        break;
    }
    const notes = this.buildChordNotes(rootNote, voiced, 4);
    console.log(`🎺 ${chordType} ${voicing} from ${rootNote}:`, notes);
    this.synth.triggerAttackRelease(notes, '2n');
    this.markPlayback(2.0);
    return notes;
  }

  // ---------------------------------------------------------------
  // Rhythm playback (Batch 4)
  // ---------------------------------------------------------------

  private getPercSynth(accent = false): Tone.MembraneSynth {
    if (accent) {
      if (!this.percAccentSynth) {
        this.percAccentSynth = new Tone.MembraneSynth({
          pitchDecay: 0.04,
          octaves: 5,
          envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.08 },
          volume: -2,
        }).toDestination();
      }
      return this.percAccentSynth;
    }
    if (!this.percSynth) {
      this.percSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
        volume: -8,
      }).toDestination();
    }
    return this.percSynth;
  }

  /**
   * Play a list of rhythmic onsets (fractional beat positions, e.g. [0, 0.5, 1, 1.5]).
   * Returns the absolute end-of-pattern duration plus performance.now() onset times so
   * a grader can compare user taps against them in the same time base.
   */
  async playRhythmOnsets(
    beats: number[],
    bpm = 100,
    accentBeats: number[] = [],
  ): Promise<{ duration: number; onsetTimesMs: number[]; bpm: number }> {
    await this.initialize();
    const beatSec = 60 / bpm;
    const synth = this.getPercSynth(false);
    const accentSynth = this.getPercSynth(true);
    const now = Tone.now();
    // performance.now() at the moment Tone "now" is captured. They share a clock origin
    // but we need the offset to convert audio-time → DOM-time for the grader.
    const startMs = performance.now();
    const accentSet = new Set(accentBeats);

    const onsetTimesMs: number[] = [];
    beats.forEach((b) => {
      const t = now + b * beatSec;
      const isAccent = accentSet.has(b);
      const which = isAccent ? accentSynth : synth;
      which.triggerAttackRelease(isAccent ? 'C3' : 'C2', '32n', t);
      onsetTimesMs.push(startMs + b * beatSec * 1000);
    });

    const lastBeat = Math.max(0, ...beats);
    const duration = (lastBeat + 0.5) * beatSec; // tail
    this.markPlayback(duration);
    return { duration, onsetTimesMs, bpm };
  }

  /**
   * Play a steady metronome in the given meter for two bars. Beat 1 of each bar is accented.
   * 6/8 is grouped as two dotted-quarter beats (accent on 1 and 4) at the same beat unit.
   */
  async playMeterPattern(meter: '2/4' | '3/4' | '4/4' | '6/8' | '5/4', bpm = 100, bars = 2): Promise<{ duration: number }> {
    await this.initialize();
    const beatsPerBar: Record<typeof meter, number> = { '2/4': 2, '3/4': 3, '4/4': 4, '6/8': 6, '5/4': 5 };
    const accentEvery: Record<typeof meter, number[]> = {
      '2/4': [0],
      '3/4': [0],
      '4/4': [0, 2], // strong on 1, secondary on 3
      '6/8': [0, 3], // grouped 3+3
      '5/4': [0, 2], // grouped 3+2 — accent on 1 and 4 of 5? Use [0, 2] (3+2)
    };
    const total = beatsPerBar[meter] * bars;
    const beats: number[] = [];
    const accents: number[] = [];
    for (let bar = 0; bar < bars; bar++) {
      for (let b = 0; b < beatsPerBar[meter]; b++) {
        const pos = bar * beatsPerBar[meter] + b;
        beats.push(pos);
        if (accentEvery[meter].includes(b)) accents.push(pos);
      }
    }
    void total;
    const { duration } = await this.playRhythmOnsets(beats, bpm, accents);
    return { duration };
  }

  /**
   * Play a 1-bar pattern that exemplifies the named subdivision. 4/4, 100 bpm by default.
   *  - eighths: 8 evenly spaced ticks per bar (every 0.5 beat)
   *  - sixteenths: 16 evenly spaced (every 0.25 beat)
   *  - triplets: 12 evenly spaced (every 1/3 beat)
   *  - dotted: dotted-eighth + sixteenth pattern repeated 4 times (0, 0.75, 1, 1.75, 2, 2.75, 3, 3.75)
   * Beat 0 is accented to make the meter clear.
   */
  async playSubdivisionPattern(
    kind: 'eighths' | 'sixteenths' | 'triplets' | 'dotted',
    bpm = 100,
  ): Promise<{ duration: number }> {
    await this.initialize();
    let beats: number[];
    switch (kind) {
      case 'eighths':
        beats = Array.from({ length: 8 }, (_, i) => i * 0.5);
        break;
      case 'sixteenths':
        beats = Array.from({ length: 16 }, (_, i) => i * 0.25);
        break;
      case 'triplets':
        beats = Array.from({ length: 12 }, (_, i) => i / 3);
        break;
      case 'dotted':
        beats = [];
        for (let beat = 0; beat < 4; beat++) {
          beats.push(beat);
          beats.push(beat + 0.75);
        }
        break;
    }
    // Accent the downbeat so the listener locks the bar.
    const { duration } = await this.playRhythmOnsets(beats, bpm, [0]);
    return { duration };
  }

  async playCorrectChime() {
    await this.initialize();
    const synth = this.getFeedbackSynth();
    const now = Tone.now();
    // Short major triad arpeggio: C5 -> E5 -> G5
    synth.triggerAttackRelease('C5', 0.12, now);
    synth.triggerAttackRelease('E5', 0.12, now + 0.08);
    synth.triggerAttackRelease('G5', 0.22, now + 0.16);
  }

  async playIncorrectBuzz() {
    await this.initialize();
    const synth = this.getFeedbackSynth();
    const now = Tone.now();
    // Descending tritone — dissonant, short, dampened
    synth.triggerAttackRelease('B3', 0.18, now);
    synth.triggerAttackRelease('F3', 0.26, now + 0.08);
  }
}

export const audioEngine = new AudioEngine();
