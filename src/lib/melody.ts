// Melodic dictation: short melodies in a key that the learner writes down as scale
// degrees. A melody is a list of scale steps from the tonic (0 = 1, 4 = 5, 7 = the 1 an
// octave up, -1 = the 7 below), so it can cross the octave while the answer stays a
// degree from 1 to 7. Hearing 7 resolve up to 1 is the whole point of the leading tone.

export interface MelodyRules {
  length: number;
  /** Lowest and highest scale step the melody may use. */
  range: [number, number];
  /** Largest move between neighbouring notes, in scale steps (1 = step, 2 = third, 4 = fifth). */
  maxLeap: number;
  /** Scale steps (mod 7) the melody may start and end on. Usually the stable notes 1, 3 and 5. */
  startDegrees: number[];
  endDegrees: number[];
}

/** Degree 1 to 7 for a scale step, folding octaves: -1 is 7, 7 is 1. */
export function degreeOf(step: number): string {
  return String((((step % 7) + 7) % 7) + 1);
}

export function encodeMelody(degrees: string[]): string {
  return degrees.join('-');
}

export function decodeMelody(answer: string): string[] {
  return answer ? answer.split('-') : [];
}

/** Which notes of an answer match the target, position by position. */
export function gradeMelody(answer: string, target: string): boolean[] {
  const a = decodeMelody(answer);
  return decodeMelody(target).map((d, i) => a[i] === d);
}

/**
 * A random melody that follows the rules: starts and ends on an allowed degree, never
 * repeats a note, and never leaps further than `maxLeap`. Returns scale steps.
 */
export function makeMelody(rules: MelodyRules, random: () => number = Math.random): number[] {
  const [lo, hi] = rules.range;
  const steps: number[] = [];
  for (let s = lo; s <= hi; s++) steps.push(s);
  const fits = (s: number, allowed: number[]) => allowed.includes((((s % 7) + 7) % 7) + 1);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(random() * xs.length)];

  for (let attempt = 0; attempt < 500; attempt++) {
    const starts = steps.filter((s) => fits(s, rules.startDegrees));
    const melody = [pick(starts)];
    while (melody.length < rules.length) {
      const prev = melody[melody.length - 1];
      const last = melody.length === rules.length - 1;
      const next = steps.filter(
        (s) => s !== prev && Math.abs(s - prev) <= rules.maxLeap && (!last || fits(s, rules.endDegrees)),
      );
      if (next.length === 0) break;
      // Steps are commoner than leaps in real melodies, so favour them two to one.
      const weighted = next.flatMap((s) => (Math.abs(s - prev) === 1 ? [s, s] : [s]));
      melody.push(pick(weighted));
    }
    if (melody.length === rules.length) return melody;
  }
  // The rules allow no melody; fall back to a scale fragment from the tonic.
  return Array.from({ length: rules.length }, (_, i) => Math.min(hi, lo + i));
}
