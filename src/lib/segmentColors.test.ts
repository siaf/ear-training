import { describe, expect, it } from 'vitest';
import { playfulToken, segmentColor } from './segmentColors';

describe('segmentColor', () => {
  it('maps purple to coral (legacy purple segment is the first)', () => {
    expect(segmentColor('purple').bg).toBe('var(--coral)');
  });

  it('maps green to mint', () => {
    expect(segmentColor('green').bg).toBe('var(--mint)');
  });

  it('maps yellow to butter', () => {
    expect(segmentColor('yellow').bg).toBe('var(--butter)');
  });

  it('falls back deterministically for unknown colors based on index', () => {
    const a = segmentColor('__unknown__', 0);
    const b = segmentColor('__unknown__', 1);
    expect(a).not.toBe(b);
  });
});

describe('playfulToken', () => {
  it('returns the coral palette on request', () => {
    const p = playfulToken('coral');
    expect(p.bg).toBe('var(--coral)');
    expect(p.ink).toBe('var(--coral-ink)');
  });
});
