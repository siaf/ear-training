import { describe, expect, it } from 'vitest';
import { CURRICULUM, getDisplayName, lessonsInPath } from '../curriculum';
import type { LessonIntroCopy } from '../types';
import type { CurriculumLevel } from '../types';
import { buildVisualQuestion, fretHint, groupByAnswer } from './questions';
import type { StaffSpec } from './prompt';
import { DEGREE_LABEL, DEGREE_SEMIS, SHAPES, anchorFrets, lowestRoot, noteReason, placeNote } from './shapes';
import { CLEFS, intervalBetween, midiOf, noteAtPosition, parsePos, signaturePositions, triadQuality, fretMidi, type ClefId, type Note } from './theory';

const LETTERS_OF = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

// Deterministic randomness so a failure can be reproduced.
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every lesson built by buildVisualQuestion, in every course.
const visualLessons = CURRICULUM.filter((l) => l.type === 'reading' || l.type === 'fretboard');
const ACC = { sharp: 1, flat: -1, natural: 0, dsharp: 2, dflat: -2 } as const;

/** The notes a staff shows, read back the way a learner would (key signature included). */
function readStaff(staff: StaffSpec): Note[] {
  const clef = staff.clef as ClefId;
  const sigLetters = new Set(signaturePositions(staff.keySig ?? 0, clef).map((p) => noteAtPosition(p, clef).letter));
  return staff.notes.map((sn) => {
    const base = noteAtPosition(sn.p, clef);
    const keyAcc = sigLetters.has(base.letter) ? Math.sign(staff.keySig ?? 0) : 0;
    return { ...base, acc: sn.acc ? ACC[sn.acc] : keyAcc };
  });
}

/** Whether three pitch classes make this triad quality from one of them. */
function pcsMake(midis: number[], quality: string): boolean {
  const pcs = new Set(midis.map((m) => m % 12));
  const shape: Record<string, number[]> = { major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8] };
  return [...pcs].some((r) => pcs.size === 3 && shape[quality].every((d) => pcs.has((r + d) % 12)));
}

const toneMidi = (t: string) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(t)!;
  return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(m[1]) + 12 * (+m[2] + 1);
};

describe('every Read Music and Guitar question', () => {
  it('has lessons on both paths', () => {
    expect(lessonsInPath('read').length).toBeGreaterThan(30);
    expect(lessonsInPath('guitar').length).toBeGreaterThan(20);
  });

  for (const level of visualLessons) {
    it(`${level.id}: every item makes a sound, answerable question`, () => {
      const rng = seeded(level.id.length * 7919);
      for (const item of level.items) {
        for (let round = 0; round < 25; round++) {
          const q = buildVisualQuestion(level, item, rng);
          const v = q.visual;
          const options = v.choices?.map((c) => c.key) ?? (level.itemGroups ? Object.keys(level.itemGroups) : level.items);
          expect(v.prompt.length).toBeGreaterThan(5);
          expect(v.explain).not.toMatch(/undefined|NaN|\[object/);
          expect(v.explain.length).toBeGreaterThan(20);
          // Something to hear: notes, or a rhythm (a rest on its own is silence).
          // History quiz questions are read, not heard.
          const quiet = level.visualKind === 'hx_quiz' || level.visualKind === 'hx_era' || !!v.rhythm?.notes.every((n) => n.rest);
          expect(v.sound.length > 0 || !!v.rhythmPlay || !!v.passage || quiet).toBe(true);
          for (const t of v.sound) expect(t).toMatch(/^[A-G]#?-?\d$/);

          if (q.responseMode === 'tap_rhythm') {
            expect(v.tapRhythm!.onsets.length).toBeGreaterThan(0);
          } else if (v.choices) {
            expect(options).toContain(q.correctAnswer);
          } else if (q.responseMode === 'select') {
            // The right answer is one of the buttons, and the item is filed under it.
            expect(options).toContain(q.correctAnswer);
            if (level.itemGroups) expect(level.itemGroups[q.correctAnswer]).toContain(item);
            else expect(q.correctAnswer).toBe(item);
          } else {
            expect(v.tap).toBeDefined();
            expect(v.tap!.accept.length).toBeGreaterThan(0);
            if (v.tap!.target === 'staff') {
              const t = v.tap!;
              for (const p of t.accept) expect(p >= t.range[0] && p <= t.range[1]).toBe(true);
            } else {
              for (const k of v.tap!.accept) expect(() => parsePos(k)).not.toThrow();
            }
          }

          for (const staff of v.staves ?? []) {
            for (const sn of staff.notes) expect(sn.p >= -8 && sn.p <= 16, `${level.id} ${item}: p=${sn.p}`).toBe(true);
          }
          for (const m of v.fretboard?.marks ?? []) expect(m.f >= 0 && m.f <= 12 && m.s >= 0 && m.s <= 5).toBe(true);
        }
      }
    });
  }

  it('shows the interval it asks about', () => {
    const rng = seeded(1);
    for (const level of visualLessons.filter((l) => l.visualKind === 'staff_interval')) {
      for (const item of level.items) for (let i = 0; i < 40; i++) {
        const staff = buildVisualQuestion(level, item, rng).visual.staves![0];
        const [a, b] = readStaff(staff);
        expect(intervalBetween(a, b), `${level.id}: ${JSON.stringify(staff.notes)}`).toBe(item);
      }
    }
  });

  it('shows the chord quality it asks about, read off the staff or the score', () => {
    const rng = seeded(2);
    for (const level of visualLessons.filter((l) => l.visualKind === 'staff_triad' || l.visualKind === 'score_chord')) {
      for (const item of level.items) for (let i = 0; i < 40; i++) {
        const q = buildVisualQuestion(level, item, rng);
        expect(pcsMake(q.visual.sound.map(toneMidi), item), `${level.id} ${item}`).toBe(true);
        if (level.visualKind === 'staff_triad') {
          // Restack in 3rds: sort by letter from the root the staff marks.
          const notes = readStaff(q.visual.staves![0]);
          const rootIdx = q.visual.staves![0].notes.findIndex((n) => n.root);
          const root = notes[rootIdx];
          const stack = [...notes].sort((x, y) => ((x.letter - root.letter + 7) % 7) - ((y.letter - root.letter + 7) % 7));
          const lifted = stack.map((nt, k) => (k === 0 ? nt : { ...nt, octave: nt.octave + (midiOf(nt) < midiOf(stack[0]) ? 1 : 0) }));
          expect(triadQuality(lifted)).toBe(item);
        }
      }
    }
  });

  it('shows the note under the key signature that it asks for', () => {
    const rng = seeded(3);
    for (const level of visualLessons.filter((l) => l.visualKind === 'note_in_key' || l.visualKind === 'staff_note')) {
      for (const item of level.items) {
        const q = buildVisualQuestion(level, item, rng);
        const staff = q.visual.staves!.find((s) => s.notes.length)!;
        const [note] = readStaff(staff);
        expect(getDisplayName(q.correctAnswer)).toBe(getDisplayName(`${'CDEFGAB'[note.letter]}${{ [-1]: 'b', 0: '', 1: '#' }[note.acc]}`));
      }
    }
  });

  it('shows guitar chords whose notes make the quality asked for', () => {
    const rng = seeded(4);
    for (const level of visualLessons.filter((l) => l.visualKind === 'fret_triad')) {
      for (const item of level.items) for (let i = 0; i < 60; i++) {
        const q = buildVisualQuestion(level, item, rng);
        const marks = q.visual.fretboard!.marks;
        expect(marks).toHaveLength(3);
        expect(new Set(marks.map((m) => m.s)).size).toBe(3);
        expect(pcsMake(marks.map((m) => fretMidi(m)), item)).toBe(true);
        const fs = marks.map((m) => m.f);
        expect(Math.max(...fs) - Math.min(...fs)).toBeLessThanOrEqual(4);
      }
    }
  });

  it('puts the 4th one string up and the 5th one string down, a fret along across G and B', () => {
    const rng = seeded(6);
    let shifted = 0;
    for (const level of visualLessons.filter((l) => l.visualKind === 'fret_across')) {
      for (const item of level.items) {
        const q = buildVisualQuestion(level, item, rng);
        const marks = q.visual.fretboard!.marks;
        const root = marks.find((m) => m.kind === 'root')!;
        const dot = marks.find((m) => m.kind === 'target')!;
        const up = item.endsWith(':p4');
        expect(dot.s - root.s).toBe(up ? 1 : -1);
        expect(fretMidi(dot) - fretMidi(root)).toBe(up ? 5 : -5); // a 4th up, or a 4th down (the 5th, an octave lower)
        const acrossGB = Math.min(dot.s, root.s) === 3;
        expect(dot.f - root.f).toBe(acrossGB ? (up ? 1 : -1) : 0);
        if (acrossGB) shifted++;
        // The answer is the dot's note, and the root's label is the root's note.
        expect(getDisplayName(q.correctAnswer)).toContain(LETTERS_OF[fretMidi(dot) % 12]);
        expect(root.label).toBe(LETTERS_OF[fretMidi(root) % 12]);
      }
    }
    expect(shifted).toBeGreaterThan(5); // the bend is practised, not just mentioned
  });

  it('puts the interval dot the right number of half steps from the root', () => {
    const rng = seeded(5);
    const semis: Record<string, number> = { minor_2nd: 1, major_2nd: 2, minor_3rd: 3, major_3rd: 4, perfect_4th: 5, tritone: 6, perfect_5th: 7, minor_6th: 8, major_6th: 9, minor_7th: 10, major_7th: 11, octave: 12 };
    for (const level of visualLessons.filter((l) => l.visualKind === 'fret_interval')) {
      for (const item of level.items) for (let i = 0; i < 30; i++) {
        const marks = buildVisualQuestion(level, item, rng).visual.fretboard!.marks;
        const root = marks.find((m) => m.kind === 'root')!;
        const dot = marks.find((m) => m.kind === 'dot')!;
        expect(fretMidi(dot) - fretMidi(root)).toBe(semis[item]);
        expect((level.fretRootStrings ?? [0, 1]).includes(root.s)).toBe(true);
      }
    }
  });

  it('labels every answer and item in words, not raw ids', () => {
    for (const level of visualLessons) {
      for (const key of [...level.items, ...Object.keys(level.itemGroups ?? {})]) {
        const label = getDisplayName(key);
        expect(label, `${level.id}: ${key}`).not.toMatch(/_|^s\df|:/);
      }
    }
  });
});

describe('answer groups', () => {
  it('orders note chips C to B', () => {
    const groups = groupByAnswer('staff_note', ['treble:G4', 'treble:C4', 'treble:E4', 'treble:F#4', 'treble:Bb4']);
    expect(Object.keys(groups)).toEqual(['C', 'E', 'F#', 'G', 'Bb']);
  });

  it('keeps every lesson to a set of buttons that fits on a phone', () => {
    const tooMany = CURRICULUM.filter((l: CurriculumLevel) => (l.type === 'reading' || l.type === 'fretboard') && l.visualKind && !l.visualKind.includes('find') && l.visualKind !== 'fret_octave' && l.visualKind !== 'staff_compare' && l.visualKind !== 'staff_to_fret' && l.visualKind !== 'rhythm_hear' && l.visualKind !== 'rhythm_tap')
      .filter((l) => Object.keys(l.itemGroups ?? {}).length > 12 || (!l.itemGroups && l.items.length > 12));
    expect(tooMany.map((l) => l.id)).toEqual([]);
  });

  it('has a clef for every clef the lessons use', () => {
    for (const level of visualLessons) for (const c of level.clefs ?? []) expect(CLEFS[c]).toBeDefined();
  });
});

describe('guitar explanations', () => {
  it('points out the G string, where fret 4 (not 5) matches the next string', () => {
    expect(fretHint({ s: 3, f: 5 })).toMatch(/fret 4 \(not 5\)/);
    expect(fretHint({ s: 3, f: 4 })).toMatch(/fret 4 \(not 5\)/);
    expect(fretHint({ s: 2, f: 5 })).not.toMatch(/not 5/); // fret 5 is right on the D string
  });

  it('teaches the G string landmark in the landmark lesson', () => {
    const level = CURRICULUM.find((l) => l.id === 'gt_landmark_frets')!;
    expect(level.items).toContain('s3f4');
  });
});

describe('chord and scale shapes', () => {
  const mod12 = (n: number) => ((n % 12) + 12) % 12;

  it('puts every degree at the right pitch from the root, at every fret the shape fits', () => {
    for (const shape of Object.values(SHAPES)) {
      const anchors = anchorFrets(shape);
      expect(anchors.length, shape.id).toBeGreaterThan(4);
      for (const a of anchors) {
        const root = fretMidi(placeNote(lowestRoot(shape), a, shape.neck));
        for (const x of shape.notes) {
          const p = placeNote(x, a, shape.neck);
          expect(p.f >= 0 && p.f <= 12).toBe(true);
          expect(mod12(fretMidi(p) - root), `${shape.id} s${x.s} +${x.df}`).toBe(DEGREE_SEMIS[x.deg]);
        }
      }
      // No two notes on one spot.
      expect(new Set(shape.notes.map((x) => `${x.s}:${x.df}`)).size).toBe(shape.notes.length);
    }
  });

  it('explains each note with a move whose interval is right', () => {
    const SIZE: Record<string, number> = {
      'a half step': 1, 'a whole step': 2, 'a minor 3rd': 3, 'a major 3rd': 4, 'a 4th': 5, 'a tritone': 6, 'a 5th': 7,
      'a minor 6th': 8, 'a major 6th': 9, 'a minor 7th': 10, 'a major 7th': 11, 'an octave': 12, 'two octaves': 24,
    };
    for (const shape of Object.values(SHAPES)) for (const x of shape.notes) {
      const why = noteReason(shape, x, 5);
      expect(why, `${shape.id} ${x.deg}`).toMatch(/so it's the/);
      const m = /: (.+?) (above|below), so it's the/.exec(why)!;
      expect(m, why).not.toBeNull();
      expect(m[1] in SIZE, why).toBe(true);
      // The interval named is the one from the reference note to this one.
      const deg = SIZE[m[1]] * (m[2] === 'above' ? 1 : -1);
      const refDeg = mod12(DEGREE_SEMIS[x.deg] - deg);
      expect(Object.values(DEGREE_SEMIS)).toContain(refDeg);
    }
  });

  it('asks about the degree it says, and hides the note a find question asks for', () => {
    const rng = seeded(7);
    for (const level of visualLessons.filter((l) => l.visualKind === 'fret_shape_tone' || l.visualKind === 'fret_shape_find')) {
      for (const item of level.items) for (let i = 0; i < 10; i++) {
        const [id, deg] = item.split(':');
        const q = buildVisualQuestion(level, item, rng);
        const marks = q.visual.fretboard!.marks;
        const root = marks.find((m) => m.kind === 'root');
        if (level.visualKind === 'fret_shape_tone') {
          expect(marks).toHaveLength(SHAPES[id].notes.length);
          const target = marks.find((m) => m.kind === 'target')!;
          expect(target.after).toBe(DEGREE_LABEL[deg as keyof typeof DEGREE_LABEL]);
          expect(mod12(fretMidi(target) - fretMidi(root!))).toBe(DEGREE_SEMIS[deg as keyof typeof DEGREE_SEMIS]);
          // Only the lowest root is named while asking.
          expect(marks.filter((m) => m.label).length).toBeLessThanOrEqual(1);
        } else {
          const shownDegs = new Set(marks.map((m) => m.label));
          expect(shownDegs.has(DEGREE_LABEL[deg as keyof typeof DEGREE_LABEL])).toBe(false);
          const ref = q.visual.reveal!.fretMarks![0];
          const pc = mod12(fretMidi(ref));
          for (const k of q.visual.tap!.target === 'fret' ? q.visual.tap!.accept : []) expect(mod12(fretMidi(parsePos(k)))).toBe(pc);
        }
      }
    }
  });

  it('draws every guitar intro picture with the notes its labels name', () => {
    const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const DEG_BY_LABEL = Object.fromEntries(Object.entries(DEGREE_LABEL).map(([d, l]) => [l, DEGREE_SEMIS[d as keyof typeof DEGREE_SEMIS]]));
    const EVEN = [40, 45, 50, 55, 60, 65];
    let checked = 0;
    for (const level of lessonsInPath('guitar')) {
      const pages = ([] as LessonIntroCopy[]).concat(level.intro ?? []);
      for (const page of pages) {
        const fig = page.figure;
        if (!fig) continue;
        const midi = (d: { s: number; f: number }) => (fig.stringNames ? EVEN[d.s] + d.f : fretMidi(fig.bass ? { ...d, n: 'bass' } : d));
        const root = fig.neck.find((d) => d.root);
        for (const d of fig.neck) {
          const m = /^([A-G])(♯|♭)?$/.exec(d.label);
          if (m) expect(mod12(midi(d)), `${level.id} ${d.label}`).toBe(mod12(NOTE_PC[m[1]] + (m[2] === '♯' ? 1 : m[2] === '♭' ? -1 : 0)));
          else {
            expect(root, `${level.id}: degree labels need a root`).toBeDefined();
            expect(mod12(midi(d) - midi(root!)), `${level.id} s${d.s}f${d.f} ${d.label}`).toBe(DEG_BY_LABEL[d.label]);
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(60);
  });
});
