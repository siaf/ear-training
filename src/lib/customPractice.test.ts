import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../curriculum';
import { filterDiatonicItems } from '../scaleContext';
import {
  CUSTOM_GROUPS,
  STARTER_DRILLS,
  autoName,
  buildCustomQueue,
  canStart,
  drillName,
  loadDrills,
  saveDrills,
  sourceLevelFor,
  suggestDrills,
  variantSummary,
} from './customPractice';
import type { PersistedSession } from './sessionStore';

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

describe('custom practice', () => {
  it('only offers items a source lesson can really ask', () => {
    for (const group of CUSTOM_GROUPS) {
      for (const item of group.items) {
        const levelIds = group.variants.map((v) => sourceLevelFor(v, item));
        expect(levelIds.every(Boolean), `${group.id}: ${item}`).toBe(true);
        for (const id of levelIds) {
          const level = CURRICULUM.find((l) => l.id === id)!;
          if (['interval', 'triad', 'seventh_chord'].includes(level.type)) {
            // Chord and interval questions are drawn from the key, so the item must occur in it.
            expect(filterDiatonicItems([item], level.type, 'C', level.scaleDegrees).length, `${group.id}: ${item}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('needs at least two items and a variant', () => {
    expect(canStart({ groupId: 'intervals', variantIds: ['up'], items: ['minor_6th'], length: 10 })).toBe(false);
    expect(canStart({ groupId: 'intervals', variantIds: [], items: ['minor_6th', 'major_6th'], length: 10 })).toBe(false);
    expect(canStart({ groupId: 'intervals', variantIds: ['up'], items: ['minor_6th', 'major_6th'], length: 10 })).toBe(true);
  });

  it('asks only the chosen items, evenly, never twice in a row, through the chosen variants', () => {
    const queue = buildCustomQueue(
      { groupId: 'intervals', variantIds: ['down'], items: ['minor_6th', 'major_6th', 'major_7th'], length: 20 },
      seeded(7),
    );
    expect(queue).toHaveLength(20);
    expect(new Set(queue.map((q) => q.levelId))).toEqual(new Set(['int_all_melodic_desc']));
    const counts = new Map<string, number>();
    queue.forEach((q) => counts.set(q.item, (counts.get(q.item) ?? 0) + 1));
    expect([...counts.keys()].sort()).toEqual(['major_6th', 'major_7th', 'minor_6th']);
    for (const n of counts.values()) expect(n).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < queue.length; i++) expect(queue[i].item).not.toBe(queue[i - 1].item);
  });

  it('routes each progression to the lesson that has it', () => {
    const queue = buildCustomQueue(
      { groupId: 'progressions', variantIds: ['all'], items: ['deceptive', 'ii_V_I_major'], length: 10 },
      seeded(3),
    );
    for (const q of queue) {
      expect(q.levelId).toBe(q.item === 'deceptive' ? 'cad_full' : 'prog_jazz_cadence');
    }
  });

  it('mixes triads and sevenths in one chords drill, each asked by its own lesson', () => {
    const queue = buildCustomQueue(
      { groupId: 'chords', variantIds: ['all'], items: ['major', 'dominant_7'], length: 10 },
      seeded(5),
    );
    expect(queue).toHaveLength(10);
    for (const q of queue) expect(q.levelId).toBe(q.item === 'major' ? 'level_6' : 'level_8');
  });
});

describe('drill names', () => {
  it('reads like the drill: short labels joined by vs, or a count once there are many', () => {
    expect(autoName({ groupId: 'intervals', variantIds: ['up'], items: ['major_6th', 'perfect_5th', 'minor_6th'], length: 10 })).toBe('P5 vs m6 vs M6');
    expect(autoName({ groupId: 'chords', variantIds: ['all'], items: ['dominant_7', 'major'], length: 10 })).toBe('maj vs 7');
    expect(autoName({ groupId: 'intervals', variantIds: ['up'], items: ['minor_2nd', 'major_2nd', 'minor_3rd', 'major_3rd', 'octave'], length: 10 })).toBe('m2, M2, m3 +2');
    expect(autoName({ groupId: 'scale_degrees', variantIds: ['major'], items: ['4', '7'], length: 10 })).toBe('Degrees 4 vs 7');
  });

  it('uses the learner’s own name when they gave one', () => {
    const drill = { id: 'd', name: '  Sixths  ', createdAt: 0, groupId: 'intervals', variantIds: ['up'], items: ['minor_6th', 'major_6th'], length: 10 };
    expect(drillName(drill)).toBe('Sixths');
    expect(drillName({ ...drill, name: ' ' })).toBe('m6 vs M6');
  });

  it('says how the drill is played', () => {
    expect(variantSummary({ groupId: 'intervals', variantIds: ['up', 'down'], items: [], length: 10 })).toBe('Up and down');
    expect(variantSummary({ groupId: 'scale_degrees', variantIds: ['minor'], items: [], length: 10 })).toBe('Minor key');
    expect(variantSummary({ groupId: 'chords', variantIds: ['all'], items: [], length: 10 })).toBe('');
  });
});

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

describe('saved drills', () => {
  it('keeps the one selection the old builder remembered, moving triads into chords', () => {
    const storage = memoryStorage({
      'fifths.custom_practice.v1': JSON.stringify({ groupId: 'triads', variantIds: ['all'], items: ['major', 'minor'], length: 20 }),
    });
    const drills = loadDrills(storage);
    expect(drills).toHaveLength(1);
    expect(drills[0]).toMatchObject({ groupId: 'chords', items: ['major', 'minor'], length: 20, name: '' });
    // Saved, so it isn't migrated again (and deleting it sticks).
    expect(JSON.parse(storage.data['fifths.custom_drills.v1'])).toHaveLength(1);
    saveDrills([], storage);
    expect(loadDrills(storage)).toEqual([]);
  });

  it('drops items and topics the app no longer offers instead of breaking', () => {
    const storage = memoryStorage({
      'fifths.custom_drills.v1': JSON.stringify([
        { id: 'a', name: '', groupId: 'intervals', variantIds: ['sideways'], items: ['minor_6th', 'major_9th'], length: 7, createdAt: 1 },
        { id: 'b', name: '', groupId: 'gone', variantIds: [], items: [], length: 10, createdAt: 1 },
      ]),
    });
    expect(loadDrills(storage)).toEqual([
      { id: 'a', name: '', groupId: 'intervals', variantIds: ['harmonic'], items: ['minor_6th'], length: 10, createdAt: 1, lastPlayedAt: undefined, lastScore: undefined },
    ]);
  });
});

describe('suggested drills', () => {
  const NOW = Date.UTC(2026, 10, 12);
  const session = (daysAgo: number, confusions: { mistook: string; actuallyWas: string; count: number }[]) =>
    ({ endedAt: NOW - daysAgo * 86_400_000, confusions }) as unknown as PersistedSession;

  it('turns pairs the learner keeps confusing into drills, played the way they missed them', () => {
    const sessions = [
      session(2, [{ mistook: 'Minor 6th ↓→', actuallyWas: 'Perfect 5th ↓→', count: 2 }]),
      session(5, [
        { mistook: 'Perfect 5th ↓→', actuallyWas: 'Minor 6th ↓→', count: 1 },
        { mistook: 'Dominant 7', actuallyWas: 'Major 7', count: 1 },
      ]),
      session(60, [{ mistook: 'Dorian', actuallyWas: 'Aeolian', count: 9 }]), // too long ago
    ];
    expect(suggestDrills(sessions, [], { now: NOW })).toEqual([
      { selection: { groupId: 'intervals', variantIds: ['down'], items: ['perfect_5th', 'minor_6th'], length: 10 }, count: 3 },
    ]);
  });

  it('leaves out pairs a saved drill already covers', () => {
    const sessions = [session(1, [{ mistook: 'Major 6th ↑♫', actuallyWas: 'Minor 6th ↑♫', count: 4 }])];
    expect(suggestDrills(sessions, [], { now: NOW })[0].selection.variantIds).toEqual(['harmonic']);
    const saved = [{ groupId: 'intervals', variantIds: ['up'], items: ['minor_6th', 'major_6th', 'octave'], length: 10 }];
    expect(suggestDrills(sessions, saved, { now: NOW })).toEqual([]);
  });

  it('offers starter drills that can all run', () => {
    for (const s of STARTER_DRILLS) expect(canStart(s)).toBe(true);
  });
});
