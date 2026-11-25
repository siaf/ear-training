// Stable and unstable notes of a key, for the "Stable or Unstable" lessons.
// Pure: no audio, so the tests can check every degree.

/** Where each unstable degree leans: to the nearest note of the home chord. 8 is the octave above 1. */
const LEANS_TO: Record<number, number> = { 2: 1, 4: 3, 6: 5, 7: 8 };

/** The degree (1–8) an unstable degree resolves to, or null for 1, 3 and 5, which already rest. */
export function resolutionDegree(degree: number): number | null {
  return LEANS_TO[degree] ?? null;
}

/** Semitones above the tonic of a degree 1–8 in a 7-note scale given as semitone steps from the tonic. */
export function degreeSemitones(degree: number, scale: readonly number[]): number {
  return degree === 8 ? 12 : scale[degree - 1];
}

/**
 * The sentence shown after a wrong stable/unstable answer: what the note was and where it
 * goes. `label` names a degree in the learner's notation (1–7 only; 8 is shown as 1).
 */
export function stabilityExplanation(degree: number, label: (d: number) => string): string {
  const target = resolutionDegree(degree);
  if (target === null) return `That was ${label(degree)}, a note of the home chord, so it rests.`;
  const dir = target > degree ? 'up' : 'down';
  return `That was ${label(degree)}. It leans ${dir} to ${label(target === 8 ? 1 : target)}.`;
}
