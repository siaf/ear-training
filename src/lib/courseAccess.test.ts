import { describe, expect, it } from 'vitest';
import { PATHS, lessonsInPath } from '../curriculum';
import { RELEASED_PATHS, isLevelOpen, isPathOpen } from './courseAccess';

describe('course access', () => {
  it('opens only released courses to learners, and every course to a preview', () => {
    for (const p of PATHS) {
      expect(isPathOpen(p.id, false), p.id).toBe(RELEASED_PATHS.includes(p.id));
      expect(isPathOpen(p.id, true), p.id).toBe(true);
    }
  });

  it('keeps ear training open, and the courses still being built closed', () => {
    expect(isLevelOpen(lessonsInPath('ear')[0].id, false)).toBe(true);
    for (const path of ['read', 'guitar', 'rhythm', 'theory', 'history'] as const) {
      expect(isLevelOpen(lessonsInPath(path)[0].id, false), path).toBe(false);
      expect(isLevelOpen(lessonsInPath(path)[0].id, true), path).toBe(true);
    }
  });
});
