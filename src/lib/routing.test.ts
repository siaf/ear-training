import { describe, expect, it } from 'vitest';
import { parseRouteFromUrl } from './routing';

describe('parseRouteFromUrl', () => {
  function setPath(pathname: string) {
    window.history.replaceState({}, '', pathname);
  }

  it('returns fallback when the pathname is the base', () => {
    setPath('/');
    expect(parseRouteFromUrl('path')).toBe('path');
  });

  it('parses a known route from the pathname', () => {
    setPath('/practice');
    expect(parseRouteFromUrl('path')).toBe('practice');
  });

  it('parses stats', () => {
    setPath('/stats');
    expect(parseRouteFromUrl('path')).toBe('stats');
  });

  it('returns fallback for unknown routes', () => {
    setPath('/nope');
    expect(parseRouteFromUrl('path')).toBe('path');
  });
});
