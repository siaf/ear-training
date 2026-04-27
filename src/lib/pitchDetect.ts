import { YIN, AMDF } from 'pitchfinder';

export interface PitchSample {
  hz: number | null;   // detected fundamental, null when silent or unclear
  rms: number;         // 0..1 — rough loudness, useful for "is the user singing"
  clarity: number;     // 0..1 — confidence (currently derived from rms + detection success)
  rawHz: number | null; // Raw detected hz before range filtering. Exposed for debugging.
}

export type PitchListener = (sample: PitchSample) => void;

export interface ListenHandle {
  stop: () => void;
}

// Voice range in Hz — everything outside gets rejected as noise/harmonic misdetection.
const MIN_HZ = 70;    // ~ C#2
const MAX_HZ = 1200;  // ~ D6
const MIN_RMS = 0.004; // below this, treat as silence. Low so soft/low notes still register.

export interface PitchDetectOptions {
  // When gate returns false, samples are suppressed (null hz emitted).
  // Use this to ignore playback bleed from speakers.
  gate?: () => boolean;
}

export async function startPitchDetect(
  audioContext: AudioContext,
  onPitch: PitchListener,
  options: PitchDetectOptions = {},
): Promise<ListenHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false, // let the singer's dynamics through
    },
  });

  if (audioContext.state !== 'running') {
    await audioContext.resume();
  }

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);
  // YIN is accurate when it locks; AMDF is more forgiving on voice. Try both, prefer YIN.
  const detectYin = YIN({ sampleRate: audioContext.sampleRate, threshold: 0.2 });
  const detectAmdf = AMDF({
    sampleRate: audioContext.sampleRate,
    minFrequency: MIN_HZ,
    maxFrequency: MAX_HZ,
    sensitivity: 0.1,
  });

  let running = true;
  let rafId = 0;

  const tick = () => {
    if (!running) return;

    // Speakers active? skip detection so we don't hear our own playback.
    if (options.gate && !options.gate()) {
      onPitch({ hz: null, rms: 0, clarity: 0, rawHz: null });
      rafId = requestAnimationFrame(tick);
      return;
    }

    analyser.getFloatTimeDomainData(buffer);

    let sumSq = 0;
    for (let i = 0; i < buffer.length; i++) sumSq += buffer[i] * buffer[i];
    const rms = Math.sqrt(sumSq / buffer.length);

    let hz: number | null = null;
    let rawHz: number | null = null;
    let clarity = 0;
    if (rms >= MIN_RMS) {
      // Try YIN first (more accurate), fall back to AMDF if YIN can't lock.
      const yin = detectYin(buffer);
      const amdf = (yin && yin >= MIN_HZ && yin <= MAX_HZ) ? null : detectAmdf(buffer);
      const candidate = yin && yin >= MIN_HZ && yin <= MAX_HZ ? yin : amdf;
      rawHz = yin ?? amdf ?? null;
      if (candidate && candidate >= MIN_HZ && candidate <= MAX_HZ) {
        hz = candidate;
        clarity = Math.min(1, rms * 8);
      }
    }

    onPitch({ hz, rms, clarity, rawHz });
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    stop: () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      try { source.disconnect(); } catch { /* ignore */ }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

// Convert a frequency in Hz to the nearest MIDI note + cents offset.
export function hzToMidi(hz: number): { midi: number; cents: number; noteName: string } {
  const midiFloat = 69 + 12 * Math.log2(hz / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { midi, cents, noteName: `${name}${octave}` };
}

// Parse "A4" / "F#3" into MIDI number. 69 = A4.
export function noteNameToMidi(name: string): number {
  const match = name.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const [, letter, accidental, octaveStr] = match;
  const letterMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semitones = letterMap[letter];
  if (accidental === '#') semitones += 1;
  if (accidental === 'b') semitones -= 1;
  const octave = parseInt(octaveStr, 10);
  return semitones + (octave + 1) * 12;
}

// Cents between a heard frequency and a target note (e.g. "A4"). Positive = sharp.
export function centsFromTarget(hz: number, targetNote: string): number {
  const targetMidi = noteNameToMidi(targetNote);
  const heardMidiFloat = 69 + 12 * Math.log2(hz / 440);
  return (heardMidiFloat - targetMidi) * 100;
}

// Octave-agnostic match: any octave of the target note counts.
export function centsFromTargetAnyOctave(hz: number, targetNote: string): number {
  const targetMidi = noteNameToMidi(targetNote);
  const heardMidiFloat = 69 + 12 * Math.log2(hz / 440);
  const pitchClassDiff = ((heardMidiFloat - targetMidi) % 12 + 12) % 12;
  // Wrap to [-6, 6]
  const wrapped = pitchClassDiff > 6 ? pitchClassDiff - 12 : pitchClassDiff;
  return wrapped * 100;
}
