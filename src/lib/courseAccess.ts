import type { PathId } from '../types';
import { pathOfLevel } from '../curriculum';

/**
 * Courses everyone can open. The others show in the course switcher as "coming soon", and
 * their lessons can't be started, except by the owner's signed-in account (see owner.ts)
 * and in local dev. To release a course, add it here.
 */
export const RELEASED_PATHS: readonly PathId[] = ['ear'];

/**
 * Local dev previews every course, so they can be built and tested. The browser tests'
 * accounts server turns this off (VITE_COURSE_PREVIEW=off) to check what learners see.
 */
export const DEV_COURSE_PREVIEW = Boolean(import.meta.env.DEV) && import.meta.env.VITE_COURSE_PREVIEW !== 'off';

export function isPathOpen(path: PathId, preview: boolean): boolean {
  return preview || RELEASED_PATHS.includes(path);
}

export function isLevelOpen(levelId: string, preview: boolean): boolean {
  return isPathOpen(pathOfLevel(levelId), preview);
}
