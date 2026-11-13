import { describe, expect, it } from 'vitest';
import { HUM_HOLD_MS, createHumTracker, rangeForHum } from './voiceCheck';

/** Feed a tracker a pitch (or silence) every 20ms for `ms`, from time `t`. */
function feed(tracker: ReturnType<typeof createHumTracker>, hz: number | null, ms: number, t: number) {
  let last = { progress: 0, doneHz: null as number | null };
  for (let at = t; at < t + ms; at += 20) last = tracker.push(hz, at);
  return last;
}

describe('createHumTracker', () => {
  it('finishes once one note has been held long enough, with its pitch', () => {
    const tracker = createHumTracker();
    expect(feed(tracker, 130, HUM_HOLD_MS - 100, 0).doneHz).toBeNull();
    const done = feed(tracker, 131, 200, HUM_HOLD_MS - 100);
    expect(done.doneHz).toBeGreaterThan(129);
    expect(done.doneHz).toBeLessThan(132);
  });

  it('starts over when the note changes or the hum stops', () => {
    const tracker = createHumTracker();
    feed(tracker, 220, 1000, 0);
    // A fifth higher is a different note: the hold restarts.
    expect(feed(tracker, 330, 600, 1000)).toMatchObject({ doneHz: null });
    // A breath longer than a moment ends it too.
    feed(tracker, null, 400, 1600);
    expect(feed(tracker, 330, 1000, 2000)).toMatchObject({ doneHz: null });
  });

  it('ignores a short dropout in the middle of a hum', () => {
    const tracker = createHumTracker();
    feed(tracker, 200, 800, 0);
    feed(tracker, null, 100, 800);
    expect(feed(tracker, 200, 700, 900).doneHz).not.toBeNull();
  });
});

describe('rangeForHum', () => {
  it('maps a hum to the voice range the lessons pitch notes for', () => {
    expect(rangeForHum(110)).toBe('lower'); // A2, a typical low male hum
    expect(rangeForHum(196)).toBe('mixed'); // G3
    expect(rangeForHum(294)).toBe('higher'); // D4
  });
});
