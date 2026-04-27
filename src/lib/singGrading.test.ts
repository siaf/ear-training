import { describe, expect, it } from 'vitest';
import { buildSampleStream, gradeSing } from './singGrading';

describe('gradeSing — single note', () => {
  it('accepts a clean, sustained, on-pitch sing', () => {
    const samples = buildSampleStream([{ label: 'C4', durationMs: 800 }]);
    const r = gradeSing(['C4'], samples);
    expect(r.correct).toBe(true);
    expect(r.targets[0].matched).toBe(true);
    expect(Math.abs(r.targets[0].centsError!)).toBeLessThan(5);
    expect(r.targets[0].sustainMs).toBeGreaterThanOrEqual(400);
  });

  it('accepts singing within tolerance (30 cents flat)', () => {
    const samples = buildSampleStream([{ label: 'C4', centsOffset: -30, durationMs: 800 }]);
    const r = gradeSing(['C4'], samples);
    expect(r.correct).toBe(true);
    expect(r.targets[0].centsError).toBeLessThan(0);
    expect(Math.abs(r.targets[0].centsError!)).toBeLessThan(50);
  });

  it('rejects out-of-tune singing (80 cents off)', () => {
    const samples = buildSampleStream([{ label: 'C4', centsOffset: 80, durationMs: 800 }]);
    const r = gradeSing(['C4'], samples);
    expect(r.correct).toBe(false);
    expect(r.firstUnmatchedIndex).toBe(0);
  });

  it('rejects a too-short sustained note (200ms)', () => {
    const samples = buildSampleStream([{ label: 'C4', durationMs: 200 }]);
    const r = gradeSing(['C4'], samples);
    expect(r.correct).toBe(false);
  });

  it('rejects low-clarity samples', () => {
    const samples = buildSampleStream([{ label: 'C4', durationMs: 800, clarity: 0.5 }]);
    const r = gradeSing(['C4'], samples);
    expect(r.correct).toBe(false);
  });

  it('octave-agnostic matching: singing C5 matches target C4', () => {
    const samples = buildSampleStream([{ label: 'C5', durationMs: 800 }]);
    const r = gradeSing(['C4'], samples, { octaveAware: false });
    expect(r.correct).toBe(true);
  });

  it('octave-aware matching: singing C5 does NOT match target C4', () => {
    const samples = buildSampleStream([{ label: 'C5', durationMs: 800 }]);
    const r = gradeSing(['C4'], samples, { octaveAware: true });
    expect(r.correct).toBe(false);
  });
});

describe('gradeSing — sequential interval', () => {
  it('accepts C4 then E4 in order (major 3rd up)', () => {
    const samples = buildSampleStream([
      { label: 'C4', durationMs: 600 },
      { label: 'E4', durationMs: 600 },
    ]);
    const r = gradeSing(['C4', 'E4'], samples);
    expect(r.correct).toBe(true);
    expect(r.targets.every((t) => t.matched)).toBe(true);
  });

  it('requires targets in order: singing E4 first then C4 fails (second target never appears after first)', () => {
    const samples = buildSampleStream([
      { label: 'E4', durationMs: 600 },
      { label: 'C4', durationMs: 600 },
    ]);
    const r = gradeSing(['C4', 'E4'], samples);
    expect(r.correct).toBe(false);
    expect(r.targets[1].matched).toBe(false);
  });

  it('tolerates a brief pause between notes', () => {
    const samples = buildSampleStream([
      { label: 'C4', durationMs: 600 },
      { label: 'C4', durationMs: 100, clarity: 0.1 }, // brief breath
      { label: 'E4', durationMs: 600 },
    ]);
    const r = gradeSing(['C4', 'E4'], samples);
    expect(r.correct).toBe(true);
  });

  it('second note too short → first matched, second unmatched', () => {
    const samples = buildSampleStream([
      { label: 'C4', durationMs: 600 },
      { label: 'E4', durationMs: 150 },
    ]);
    const r = gradeSing(['C4', 'E4'], samples);
    expect(r.correct).toBe(false);
    expect(r.targets[0].matched).toBe(true);
    expect(r.targets[1].matched).toBe(false);
    expect(r.firstUnmatchedIndex).toBe(1);
  });

  it('wrong second note (F4 instead of E4) → second unmatched', () => {
    const samples = buildSampleStream([
      { label: 'C4', durationMs: 600 },
      { label: 'F4', durationMs: 600 },
    ]);
    const r = gradeSing(['C4', 'E4'], samples);
    expect(r.correct).toBe(false);
    expect(r.targets[0].matched).toBe(true);
    expect(r.targets[1].matched).toBe(false);
  });
});

describe('gradeSing — tuning knobs', () => {
  it('stricter toleranceCents rejects singing that was previously acceptable', () => {
    const samples = buildSampleStream([{ label: 'C4', centsOffset: 40, durationMs: 800 }]);
    expect(gradeSing(['C4'], samples, { toleranceCents: 50 }).correct).toBe(true);
    expect(gradeSing(['C4'], samples, { toleranceCents: 25 }).correct).toBe(false);
  });

  it('longer minSustainMs rejects a short-but-valid note', () => {
    const samples = buildSampleStream([{ label: 'C4', durationMs: 500 }]);
    expect(gradeSing(['C4'], samples, { minSustainMs: 400 }).correct).toBe(true);
    expect(gradeSing(['C4'], samples, { minSustainMs: 800 }).correct).toBe(false);
  });
});
