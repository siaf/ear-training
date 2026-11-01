// Real instrument samples for the free tools, self-hosted under /audio/ (see
// scripts/build-samples.sh and site/audio/SOURCES.txt; neither set needs a
// credit). Bundled into each tool by esbuild. Tone is a UMD global where used;
// the raw player needs only Web Audio. Samples are at most a whole tone apart,
// so nothing is shifted more than a semitone.

// Steinway B (VCSL, CC0): every whole tone, C2–C7.
const PIANO_NOTES = [];
[2, 3, 4, 5, 6].forEach((o) => ['C', 'D', 'E', 'F#', 'G#', 'A#'].forEach((n) => PIANO_NOTES.push(n + o)));
PIANO_NOTES.push('C7');
// Steel-string acoustic (University of Iowa): every minor third, E2–D5.
const GUITAR_NOTES = ['E2', 'G2', 'A#2', 'C#3', 'E3', 'G3', 'A#3', 'C#4', 'E4', 'G4', 'A#4', 'C#5', 'D5'];

export const INSTRUMENTS = {
  piano: { dir: 'piano', notes: PIANO_NOTES, volume: -2 },
  guitar: { dir: 'guitar', notes: GUITAR_NOTES, volume: 0 },
};

const fileOf = (n) => n.replace('#', 's') + '.mp3';
const baseUrl = (inst) => `/audio/${INSTRUMENTS[inst].dir}/`;

const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(n) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

// Tone.Sampler for an instrument. Call inside (or after) the first user
// gesture. `onload` fires once every file has decoded; until then callers
// should fall back to their synth.
export function toneSampler(inst, opts = {}) {
  const cfg = INSTRUMENTS[inst];
  const urls = {};
  cfg.notes.forEach((n) => { urls[n] = fileOf(n); });
  return new Tone.Sampler({
    urls, baseUrl: baseUrl(inst), release: opts.release != null ? opts.release : 1, volume: cfg.volume,
    onload: opts.onload, onerror: opts.onerror,
  });
}

// Minimal sampler on a plain AudioContext, for tools that don't load Tone.
// Returns { play(midi, dur), ready() }; play() is a no-op until loaded.
export function rawSampler(ctx, inst) {
  const cfg = INSTRUMENTS[inst];
  const buffers = [];
  let loaded = false;
  const loading = Promise.all(cfg.notes.map((n) => fetch(baseUrl(inst) + fileOf(n))
    .then((r) => r.arrayBuffer())
    .then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then((buf) => { buffers.push({ midi: noteToMidi(n), buf }); })))
    .then(() => { loaded = true; })
    .catch(() => { /* offline or blocked: callers keep their synth */ });
  function play(midi, dur = 1.5) {
    if (!loaded || !buffers.length) return false;
    let best = buffers[0];
    buffers.forEach((b) => { if (Math.abs(b.midi - midi) < Math.abs(best.midi - midi)) best = b; });
    const t0 = ctx.currentTime + 0.01;
    const src = ctx.createBufferSource();
    src.buffer = best.buf;
    src.playbackRate.value = Math.pow(2, (midi - best.midi) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t0);
    g.gain.setValueAtTime(0.9, t0 + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.5);
    src.connect(g).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.6);
    return true;
  }
  return { play, ready: () => loading };
}

// Wrap an existing Tone synth so it plays the sampled instrument once loaded
// and the synth until then (or if loading fails). Same calls as a PolySynth:
// triggerAttackRelease, releaseAll, set. Set `useSamples = false` to force
// the synth (the circle of fifths lets people pick a synth voice).
export function withSamples(inst, synth, dest) {
  let ready = false;
  let sampler = null;
  try { sampler = toneSampler(inst, { onload: () => { ready = true; } }).connect(dest); } catch (_) { sampler = null; }
  const w = {
    useSamples: true,
    voice: () => (w.useSamples && ready && sampler ? sampler : synth),
    triggerAttackRelease: (notes, dur, t) => w.voice().triggerAttackRelease(notes, dur, t),
    releaseAll: () => { synth.releaseAll(); if (sampler && ready) sampler.releaseAll(); },
    set: (o) => synth.set(o),
  };
  return w;
}
