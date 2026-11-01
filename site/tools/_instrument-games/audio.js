// Audio hooks for the instrument games. Tone is a UMD global. Nothing is
// created until the first user gesture calls unlock()/play() (iOS-safe).
/* global React, Tone */
import { midiToFreq } from './core.js';
import { toneSampler } from '../_shared/samples.js';

const { useRef, useCallback, useMemo } = React;

function hasTone() { return typeof Tone !== 'undefined' && Tone && typeof Tone.start === 'function'; }

// Piano: a soft PolySynth plays immediately; the self-hosted Steinway grand
// piano samples load in the background after the first tap and take over once
// ready. If they fail, the synth keeps working.

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
        s.sampler = toneSampler('piano', {
          release: 1.2, onload: () => { s.ready = true; }, onerror: () => { s.ready = false; },
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

// Guitar: steel-string acoustic samples at the real sounding pitch of each
// string/fret. A Karplus-Strong PluckSynth covers the first second or so
// while the samples load, and stays on if they fail.
export function useGuitarAudio() {
  const r = useRef({ voices: null, i: 0, starting: null, sampler: null, ready: false });
  const ensure = useCallback(() => {
    const s = r.current;
    if (!hasTone()) return null;
    if (!s.starting) {
      s.starting = Tone.start();
      const limiter = new Tone.Limiter(-1).toDestination();
      const filter = new Tone.Filter(3200, 'lowpass').connect(limiter);
      // Two alternating voices so a new pluck doesn't choke the last one.
      s.voices = [0, 1].map(() => new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3600, resonance: 0.97, release: 1, volume: 2 }).connect(filter));
      try {
        s.sampler = toneSampler('guitar', {
          release: 0.8, onload: () => { s.ready = true; }, onerror: () => { s.ready = false; },
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
        if (s.ready && s.sampler) { s.sampler.triggerAttackRelease(midiToFreq(midi), 1.6, t); return; }
        const v = s.voices[s.i++ % s.voices.length];
        v.triggerAttackRelease(midiToFreq(midi), 1.2, t);
      };
      if (Tone.context.state === 'running') go(); else p.then(go).catch(() => {});
    } catch (_) { /* ignore */ }
  }, [ensure]);
  return useMemo(() => ({ play, unlock: () => { try { ensure(); } catch (_) { /* ignore */ } } }), [play, ensure]);
}
