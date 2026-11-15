import { describe, expect, it } from 'vitest';
import { lessonsInPath } from '../curriculum';
import { buildVisualQuestion } from '../notation/questions';
import { gradeTapsSteady } from '../lib/rhythmGrader';
import { barTicks, countsOf, describe as say, onsets, parseRhythm, parseTime, rhythmTicks, starts, T44, T68 } from './model';

const rng = (() => {
  let a = 7;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
})();

describe('rhythm notation', () => {
  it('reads values, dots, rests, ties and triplets', () => {
    expect(parseRhythm('q. e h').map((n) => n.t)).toEqual([18, 6, 24]);
    expect(parseRhythm('qr er')).toEqual([{ t: 12, rest: true }, { t: 6, rest: true }]);
    expect(parseRhythm('q~e e')).toEqual([{ t: 12, tie: true }, { t: 6 }, { t: 6 }]);
    expect(rhythmTicks(parseRhythm('t t t'))).toBe(12);
  });

  it('starts a note only where a sound starts: not on rests, not at the far end of a tie', () => {
    expect(onsets(parseRhythm('q~e e q q'), T44)).toEqual([0, 1.5, 2, 3]);
    expect(onsets(parseRhythm('er e q h'), T44)).toEqual([0.5, 1, 2]);
    expect(onsets(parseRhythm('q e q e'), T68)).toEqual([0, 2 / 3, 1, 5 / 3]); // in dotted-quarter beats
  });

  it('counts eighths, sixteenths, triplets and 6/8', () => {
    expect(countsOf(parseRhythm('q e e q. e'), T44)).toEqual(['1', '2', '2&', '3', '4&']);
    expect(countsOf(parseRhythm('e s s s s e'), parseTime('2/4'))).toEqual(['1', '1&', '1a', '2', '2e', '2&']);
    expect(countsOf(parseRhythm('t t t q'), parseTime('2/4'))).toEqual(['1', '1trip', '1let', '2']);
    expect(countsOf(parseRhythm('q e q e'), T68)).toEqual(['1', '3', '4', '6']);
  });

  it('describes a rhythm in words', () => {
    expect(say(parseRhythm('q e e h'))).toBe('quarter, two eighths, half');
  });
});

describe('Rhythm path lessons', () => {
  const lessons = lessonsInPath('rhythm');

  it('fills every bar exactly', () => {
    for (const l of lessons) for (const src of l.rhythmPool ?? []) {
      expect(rhythmTicks(parseRhythm(src)), `${l.id}: ${src}`).toBe(barTicks(parseTime(l.rhythmTime ?? '4/4')));
    }
  });

  it('marks a note on the count it asks about', () => {
    for (const l of lessons.filter((x) => x.visualKind === 'rhythm_count')) {
      for (const item of l.items) for (let k = 0; k < 15; k++) {
        const q = buildVisualQuestion(l, item, rng);
        const r = q.visual.rhythm!;
        const at = countsOf(r.notes, r.time)[r.mark!];
        expect(at, `${l.id} ${item}`).toBe(item.replace('ct_', ''));
        expect(r.notes[r.mark!].rest).toBeFalsy();
      }
    }
  });

  it('offers three different-sounding rhythms, one of them the one played', () => {
    for (const l of lessons.filter((x) => x.visualKind === 'rhythm_hear')) {
      const ts = parseTime(l.rhythmTime ?? '4/4');
      for (const item of l.items) for (let k = 0; k < 10; k++) {
        const q = buildVisualQuestion(l, item, rng);
        const choices = q.visual.choices!;
        expect(choices).toHaveLength(3);
        const sounds = choices.map((c) => onsets(c.rhythm!.notes, ts).join(','));
        expect(new Set(sounds).size, `${l.id} ${item}`).toBe(3);
        const right = choices.find((c) => c.key === q.correctAnswer)!;
        expect(onsets(right.rhythm!.notes, ts)).toEqual(q.visual.rhythmPlay!.onsets);
      }
    }
  });

  it('never plays a rhythm before the learner taps it', () => {
    for (const l of lessons.filter((x) => x.visualKind === 'rhythm_tap')) {
      for (const item of l.items) {
        const q = buildVisualQuestion(l, item, rng);
        expect(q.responseMode).toBe('tap_rhythm');
        expect(q.visual.listen).toBeFalsy();
        // A tap can't reach the next note: the window is under half the smallest gap.
        const t = q.visual.tapRhythm!;
        const beatMs = 60000 / t.bpm;
        const gaps = t.onsets.slice(1).map((o, i) => (o - t.onsets[i]) * beatMs);
        for (const g of gaps) expect(t.toleranceMs).toBeLessThan(g / 2);
        expect(starts(q.visual.rhythm!.notes)).toHaveLength(q.visual.rhythm!.notes.length);
      }
    }
  });
});

describe('tap grading', () => {
  const targets = [0, 500, 750, 1000, 1500];

  it('passes taps that are steadily late, as from a slow screen or Bluetooth', () => {
    const r = gradeTapsSteady(targets.map((t) => t + 90), targets, 60);
    expect(r.hits.every(Boolean)).toBe(true);
    expect(r.shiftMs).toBe(90);
  });

  it('fails uneven taps even after the best shift', () => {
    const uneven = [0, 560, 700, 1090, 1500];
    const r = gradeTapsSteady(uneven, targets, 40);
    expect(r.hits.every(Boolean)).toBe(false);
  });

  it('counts a missing note and an extra tap', () => {
    const r = gradeTapsSteady([0, 500, 1000, 1200, 1500], targets, 60);
    expect(r.hits.filter((h) => !h)).toHaveLength(1);
    expect(r.extraTaps).toHaveLength(1);
  });
});
