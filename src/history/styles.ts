// Short passages for the History path's listening lessons, generated fresh each time in a
// random key. Each one shows a textbook hallmark of a style, not a real piece: Alberti
// bass for Classical, a running bass and a repeated sequence for Baroque, and so on. They
// all play on the learner's chosen instrument, so the lessons are about texture, rhythm
// and harmony, not the sound of a harpsichord or an orchestra.

import { midiToTone } from '../notation/theory';

export interface PassageEvent {
  t: number; // beats from the start
  notes: string[];
  d: number; // beats held
}
export interface Passage {
  events: PassageEvent[];
  bpm: number;
}

export const STYLES = ['medieval', 'baroque', 'classical', 'romantic', 'impressionist', 'blues', 'minimalist'] as const;
export type Style = (typeof STYLES)[number];

export const STYLE_INFO: Record<Style, { name: string; era: string; hallmark: string }> = {
  medieval: { name: 'Medieval chant', era: 'Medieval, c. 500–1400', hallmark: 'One line moving by step in a church mode, with no steady beat. When a second voice shadows it a 5th below, that\'s organum, the first Western harmony.' },
  baroque: { name: 'Baroque', era: 'Baroque, c. 1600–1750', hallmark: 'A bass that never stops moving, and a short figure repeated a step lower each time (a sequence) round a chain of 5ths. Think Vivaldi or Bach.' },
  classical: { name: 'Classical', era: 'Classical, c. 1750–1820', hallmark: 'A broken-chord accompaniment (Alberti bass: low, high, middle, high) under a short, balanced tune in two matching halves. Think Mozart.' },
  romantic: { name: 'Romantic', era: 'Romantic, c. 1820–1900', hallmark: 'Minor key, wide sweeping arpeggios, a melody that leaps, and a tense diminished 7th chord before the cadence. Think Chopin.' },
  impressionist: { name: 'Impressionist', era: 'Early 20th century', hallmark: 'A whole-tone scale (no half steps, so no pull home) and chords sliding in parallel, held so they blur. Think Debussy.' },
  blues: { name: 'Blues', era: '20th century, from the American South', hallmark: 'Swung rhythm, dominant 7th chords, and a boogie bass walking up and down each chord, with the bluesy ♭3 and ♭7 in the tune.' },
  minimalist: { name: 'Minimalist', era: 'Late 20th century', hallmark: 'One short pattern repeated over and over, changing a little at a time over a steady pulse. Think Steve Reich or Philip Glass.' },
};

type Rng = () => number;
const pick = <T,>(a: readonly T[], rng: Rng): T => a[Math.floor(rng() * a.length)];
const tone = (m: number) => midiToTone(m);
const ev = (t: number, ms: number[], d: number): PassageEvent => ({ t, notes: ms.map(tone), d });

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
/** The note `deg` scale steps above the tonic (any integer). */
const degree = (tonic: number, scale: number[], deg: number) => tonic + 12 * Math.floor(deg / 7) + scale[((deg % 7) + 7) % 7];
const triadOn = (tonic: number, scale: number[], root: number) => [root, root + 2, root + 4].map((d) => degree(tonic, scale, d));

function medieval(rng: Rng): Passage {
  const tonic = pick([60, 62, 64], rng); // a mode on D, transposed
  const out: PassageEvent[] = [];
  let deg = 0;
  let t = 0;
  const organum = rng() < 0.5;
  const steps = 11 + Math.floor(rng() * 3);
  for (let k = 0; k < steps; k++) {
    const d = k === steps - 1 ? 3 : rng() < 0.3 ? 2 : 1;
    const m = degree(tonic, DORIAN, deg);
    out.push(ev(t, organum ? [m - 7, m] : [m], d * 0.95));
    t += d;
    const toward = k >= steps - 3 ? Math.sign(-deg) : 0;
    deg += toward || (rng() < 0.75 ? pick([-1, 1], rng) : pick([-2, 2], rng));
    deg = Math.max(-1, Math.min(5, deg));
    if (k === steps - 2) deg = 0;
  }
  return { events: out, bpm: 76 };
}

function baroque(rng: Rng): Passage {
  const minor = rng() < 0.5;
  const scale = minor ? MINOR : MAJOR;
  const tonic = pick([57, 60, 62, 55], rng) + 12;
  // A chain of 5ths: I IV vii iii vi ii V I, two chords a bar.
  const roots = [0, 3, 6, 2, 5, 1, 4, 0];
  const figure = pick([[0, 1, 2, 1], [2, 1, 0, 1], [0, 2, 1, 2]], rng); // the same shape on every chord: a sequence
  const out: PassageEvent[] = [];
  roots.forEach((r, i) => {
    const t0 = i * 2;
    const chord = triadOn(tonic, scale, r);
    // Running sixteenths in the treble, the figure twice per chord.
    for (let k = 0; k < 8; k++) out.push(ev(t0 + k * 0.25, [chord[figure[k % 4]]], 0.24));
    // A bass that leaps the octave every eighth.
    const bass = degree(tonic - 24, scale, r);
    for (let k = 0; k < 4; k++) out.push(ev(t0 + k * 0.5, [k % 2 ? bass + 12 : bass], 0.45));
  });
  out.push(ev(16, [degree(tonic, scale, 0), degree(tonic - 24, scale, 0)], 1.5));
  return { events: out, bpm: 92 };
}

function classical(rng: Rng): Passage {
  const tonic = pick([60, 62, 65, 67], rng);
  // Two-bar question ending on V, two-bar answer ending on I. Two chords a bar.
  const roots = [0, 3, 0, 4, 0, 3, 4, 0];
  const out: PassageEvent[] = [];
  let prev = degree(tonic + 12, MAJOR, 2);
  roots.forEach((r, i) => {
    const t0 = i * 2;
    const [a, b, c] = triadOn(tonic - 12, MAJOR, r);
    // Alberti bass: low, high, middle, high.
    [a, c, b, c, a, c, b, c].forEach((m, k) => out.push(ev(t0 + k * 0.25, [m], 0.24)));
    // The tune: a chord tone near the last note, held for the chord or split in two.
    const tones = triadOn(tonic + 12, MAJOR, r).flatMap((m) => [m - 12, m, m + 12]).filter((m) => m >= tonic + 7 && m <= tonic + 21);
    const near = tones.sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev));
    const end = i === 3 || i === 7;
    const target = i === 7 ? degree(tonic + 12, MAJOR, 0) : i === 3 ? degree(tonic + 12, MAJOR, 1) : near[Math.floor(rng() * Math.min(2, near.length))];
    if (!end && rng() < 0.6) {
      // Then a passing step up to the next scale note.
      const inKey = (m: number) => MAJOR.includes((((m - tonic) % 12) + 12) % 12);
      const step = inKey(target + 1) ? target + 1 : target + 2;
      out.push(ev(t0, [target], 0.95), ev(t0 + 1, [step], 0.95));
    } else out.push(ev(t0, [target], 1.9));
    prev = target;
  });
  return { events: out, bpm: 108 };
}

function romantic(rng: Rng): Passage {
  const tonic = pick([57, 60, 62, 64], rng); // minor
  // i – VI – iv – vii°7 (of i) – V7 – i
  const chords: number[][] = [
    [0, 7, 12, 15, 19],
    [-4, 3, 8, 12, 15],
    [5, 12, 17, 20, 24],
    [-1, 5, 8, 11, 14], // diminished 7th on the leading tone
    [-5, 2, 5, 11, 14], // V7: G D F B D in C minor
    [0, 7, 12, 15, 19],
  ];
  const out: PassageEvent[] = [];
  // [beat, interval above the tonic]: a 4th leap up, a sigh down, the leading tone over the dim7.
  const tune: Array<[number, number]> = [[0, 19], [2, 24], [3, 27], [5, 24], [6, 20], [8, 17], [9, 23], [11, 26], [12, 26], [13.5, 23], [15, 24]];
  chords.forEach((c, i) => {
    const t0 = i * 3;
    // A wide arpeggio from the low bass, six eighths a chord.
    [c[0] - 12, c[1] - 12, c[2] - 12, c[3] - 12, c[4] - 12, c[2] - 12].forEach((iv, k) => out.push(ev(t0 + k * 0.5, [tonic + iv - 12], 1.4)));
  });
  tune.forEach(([t, iv], k) => out.push(ev(t, [tonic + iv], k === tune.length - 1 ? 3 : (tune[k + 1][0] - t) * 0.95)));
  return { events: out, bpm: 72 };
}

function impressionist(rng: Rng): Passage {
  const base = pick([60, 62, 64, 66], rng);
  const out: PassageEvent[] = [];
  // Parallel major chords sliding by whole steps, held long so they blur.
  const slide = [0, 2, 4, 2, 0, -2, 0];
  slide.forEach((s, i) => out.push(ev(i * 2, [base - 12 + s, base - 8 + s, base - 5 + s, base - 2 + s], 2.6)));
  // A whole-tone melody drifting above.
  const wt = [0, 2, 4, 6, 8, 10, 12];
  const path = [2, 3, 4, 5, 4, 3, 4, 2, 1, 2];
  path.forEach((k, i) => out.push(ev(i * 1.4, [base + 12 + wt[k]], 1.5)));
  return { events: out, bpm: 64 };
}

function blues(rng: Rng): Passage {
  const tonic = pick([43, 45, 48], rng); // G, A or C in the bass
  const out: PassageEvent[] = [];
  const swing = (beat: number, half: 0 | 1) => beat + (half ? 2 / 3 : 0);
  const bars = [0, 5, 0, 0, 5, 5, 0, 0]; // I IV I I IV IV I I: the first eight bars of a 12-bar blues
  const walk = [0, 4, 7, 9, 10, 9, 7, 4]; // the boogie: up the chord and back
  bars.forEach((r, b) => {
    for (let k = 0; k < 8; k++) out.push(ev(swing(b * 4 + Math.floor(k / 2), (k % 2) as 0 | 1), [tonic + r + walk[k]], 0.5));
    // The chord, a dominant 7th, stabbed on 2 and 4.
    const top = tonic + 12 + r;
    [1, 3].forEach((beat) => out.push(ev(b * 4 + beat, [top + 4, top + 7, top + 10], 0.4)));
  });
  // A riff with the bluesy minor 3rd bending to the major 3rd.
  const riff = [[0, 3], [0.67, 4], [1, 7], [2, 10], [2.67, 7], [3, 3]];
  [0, 8, 16, 24].forEach((t0) => riff.forEach(([t, iv]) => out.push(ev(t0 + t, [tonic + 24 + iv], 0.4))));
  return { events: out, bpm: 104 };
}

function minimalist(rng: Rng): Passage {
  const tonic = pick([60, 62, 64, 65], rng);
  const cell = pick([[0, 2, 4, 2, 7, 4], [0, 4, 7, 4, 9, 7], [2, 4, 7, 4, 2, 0]], rng);
  const out: PassageEvent[] = [];
  let t = 0;
  for (let rep = 0; rep < 7; rep++) {
    // From the fourth time round, one extra note joins the pattern.
    const pattern = rep >= 3 ? [...cell, cell[1] + 12] : cell;
    pattern.forEach((iv) => {
      out.push(ev(t, [tonic + iv], 0.48));
      t += 0.5;
    });
  }
  for (let b = 0; b < t; b += 1) out.push(ev(b, [tonic - 12], 0.45));
  return { events: out, bpm: 126 };
}

const MAKERS: Record<Style, (rng: Rng) => Passage> = { medieval, baroque, classical, romantic, impressionist, blues, minimalist };

export const makePassage = (style: Style, rng: Rng = Math.random): Passage => MAKERS[style](rng);
