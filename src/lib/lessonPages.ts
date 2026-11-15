// Every ear-training lesson has a public page on fifths.io (built by scripts/build-lessons.mjs),
// so a shared medal or progress report links somewhere a newcomer can try that lesson.
// A page's address comes from the lesson's name; renaming a lesson moves its page, so put
// the old slug in OLD_SLUGS to keep shared links working.

import type { CurriculumLevel } from '../types';

export const SITE_URL = 'https://fifths.io';

export function lessonSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Old slug → current lesson id, for lessons renamed after their page went live. */
export const OLD_SLUGS: Record<string, string> = {};

export function lessonPagePath(level: Pick<CurriculumLevel, 'name'>): string {
  return `/lessons/${lessonSlug(level.name)}/`;
}

/** The lesson's page, tagged with where the visitor came from. */
export function lessonPageUrl(level: Pick<CurriculumLevel, 'name'>, utm?: { source: string; medium: string; campaign: string }): string {
  const url = `${SITE_URL}${lessonPagePath(level)}`;
  if (!utm) return url;
  return `${url}?utm_source=${encodeURIComponent(utm.source)}&utm_medium=${encodeURIComponent(utm.medium)}&utm_campaign=${encodeURIComponent(utm.campaign)}`;
}
