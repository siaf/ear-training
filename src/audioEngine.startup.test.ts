import { describe, expect, it, vi } from 'vitest';

// A stand-in for Tone whose first instrument throws, the way Tone did on a slow WebKit while
// the browser's audio context was still coming up (an assert in cancelScheduledValues).
const tone = vi.hoisted(() => ({ failuresLeft: 1, built: [] as string[], started: false }));

vi.mock('tone', () => {
  class Node {
    toDestination() { return this; }
    connect() { return this; }
    dispose() {}
    releaseAll() {}
    triggerAttackRelease() {}
    get() { return { envelope: { release: 0.5 } }; }
  }
  class PolySynth extends Node {
    constructor() {
      super();
      if (tone.failuresLeft > 0) { tone.failuresLeft--; throw new Error('Invalid argument to cancelScheduledValues: null'); }
      tone.built.push('PolySynth');
    }
  }
  class Synth extends Node {}
  class Sampler extends Node { loaded = true; }
  class Limiter extends Node {}
  return {
    PolySynth, Synth, Sampler, Limiter, FMSynth: Synth, MembraneSynth: Synth,
    getDestination: () => ({ chain() {} }),
    start: async () => { tone.started = true; },
    context: { state: 'running', resume: async () => {} },
    now: () => 0,
    Transport: { cancel() {} },
  };
});

describe('audio start-up', () => {
  it('lets the app load when Tone fails at start-up, and builds the instrument on first use', async () => {
    const { audioEngine } = await import('./audioEngine'); // used to throw here, blanking the app
    expect(tone.built).toEqual([]);
    expect(() => audioEngine.stopAll()).not.toThrow();
    audioEngine.setSynthType('triangle'); // remembered for when it's built

    await audioEngine.initialize();
    expect(tone.built).toEqual(['PolySynth']);
    expect(audioEngine.getSynthType()).toBe('triangle');
  });
});
