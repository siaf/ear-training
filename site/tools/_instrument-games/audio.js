// Audio hooks for the instrument games. Tone is a UMD global. Nothing is
// created until the first user gesture calls unlock()/play() (iOS-safe).
/* global React, Tone */
import { midiToFreq } from './core.js';

const { useRef, useCallback, useMemo } = React;

function hasTone() { return typeof Tone !== 'undefined' && Tone && typeof Tone.start === 'function'; }

// Piano: a soft PolySynth plays immediately; Salamander grand piano samples
// (7 files, every 6 semitones, ~70 KB each) load in the background after the
// first tap and take over once ready. If they fail, the synth keeps working.
const SALAMANDER = 'https://tonejs.github.io/audio/salamander/';
const PIANO_URLS = { C3: 'C3.mp3', 'F#3': 'Fs3.mp3', C4: 'C4.mp3', 'F#4': 'Fs4.mp3', C5: 'C5.mp3', 'F#5': 'Fs5.mp3', C6: 'C6.mp3' };

export function usePianoAudio() {
  const r = useRef({ synth: null, sampler: null, ready: false, starting: null });
  const ensure = useCallback(() => {
    const s = r.current;
    if (!hasTone()) return null;
    if (!s.starting) {
      s.starting = Tone.start(); // first call happens inside a user gesture
      const limiter = new Tone.Limiter(-1).toDestination();
      s.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.5, sustain: 0.15, release: 1.1 },
        volume: -8,
      }).connect(limiter);
      try {
        s.sampler = new Tone.Sampler({
          urls: PIANO_URLS, baseUrl: SALAMANDER, release: 1.2, volume: -2,
          onload: () => { s.ready = true; },
          onerror: () => { s.ready = false; },
        }).connect(limiter);
      } catch (_) { s.sampler = null; }
    }
    return s.starting;
  }, []);
  const play = useCallback((midi) => {
    try {
      const p = ensure();
      if (!p) return;
      const s = r.current;
      const go = () => {
        const t = Tone.now() + 0.01;
        if (s.ready && s.sampler) s.sampler.triggerAttackRelease(Tone.Frequency(midi, 'midi').toNote(), 1.4, t);
        else { s.synth.releaseAll(); s.synth.triggerAttackRelease(midiToFreq(midi), 0.9, t); }
      };
      if (Tone.context.state === 'running') go(); else p.then(go).catch(() => {});
    } catch (_) { /* audio unavailable — the game still works */ }
  }, [ensure]);
  return useMemo(() => ({ play, unlock: () => { try { ensure(); } catch (_) { /* ignore */ } } }), [play, ensure]);
}

// Guitar: Karplus-Strong PluckSynth through a gentle low-pass, at the real
// sounding pitch of each string/fret.
export function useGuitarAudio() {
  const r = useRef({ voices: null, i: 0, starting: null });
  const ensure = useCallback(() => {
    const s = r.current;
    if (!hasTone()) return null;
    if (!s.starting) {
      s.starting = Tone.start();
      const limiter = new Tone.Limiter(-1).toDestination();
      const filter = new Tone.Filter(3200, 'lowpass').connect(limiter);
      // Two alternating voices so a new pluck doesn't choke the last one.
      s.voices = [0, 1].map(() => new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3600, resonance: 0.97, release: 1, volume: 2 }).connect(filter));
    }
    return s.starting;
  }, []);
  const play = useCallback((midi) => {
    try {
      const p = ensure();
      if (!p) return;
      const s = r.current;
      const go = () => {
        const v = s.voices[s.i++ % s.voices.length];
        v.triggerAttackRelease(midiToFreq(midi), 1.2, Tone.now() + 0.01);
      };
      if (Tone.context.state === 'running') go(); else p.then(go).catch(() => {});
    } catch (_) { /* ignore */ }
  }, [ensure]);
  return useMemo(() => ({ play, unlock: () => { try { ensure(); } catch (_) { /* ignore */ } } }), [play, ensure]);
}
