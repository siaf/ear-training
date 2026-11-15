// What scripts/build-lessons.mjs needs from the app, bundled by esbuild so the public lesson
// pages always match the app: names, intros, order, free or Pro, and the medal's look.

import { CURRICULUM, TEACHING_ORDER, getDisplayName, isProLesson, lessonsInPath, segmentsInPath } from '../src/curriculum';
import { getLessonIntro } from '../src/lib/lessonIntro';
import { medalLabel } from '../src/lib/medalLabel';
import { lessonSlug, OLD_SLUGS } from '../src/lib/lessonPages';
import { mascotForPalette, segmentPaletteName } from '../src/lib/segmentColors';

export interface LessonPageData {
  id: string;
  name: string;
  slug: string;
  description: string;
  pro: boolean;
  palette: string;
  mascot: string;
  medalLines: string[];
  intro: { idea: string; purpose: string; expectation: string }[];
  /** What the lesson asks the learner to tell apart, when the names read well. */
  items: string[];
  prerequisites: { name: string; slug: string }[];
  next: { name: string; slug: string } | null;
  segment: { id: string; name: string; description: string };
}

const readable = (name: string) => Boolean(name) && !/[_:]/.test(name);

export function lessonPages(): { segments: { id: string; name: string; description: string; lessons: LessonPageData[] }[]; oldSlugs: Record<string, string> } {
  // Ear training only for now. The other courses (Read Music, Guitar & Bass, Rhythm, Theory,
  // History) share CURRICULUM but don't have pages yet, and some of their names repeat
  // across courses ("All Four Triads"), so they'd need course-specific slugs first.
  const byId = new Map(lessonsInPath('ear').map((l) => [l.id, l]));
  const link = (id: string) => {
    const l = byId.get(id);
    return l ? { name: l.name, slug: lessonSlug(l.name) } : null;
  };
  const segments = segmentsInPath('ear').map((segment) => ({
    id: segment.id,
    name: segment.name,
    description: segment.description,
    lessons: segment.levels.map((level): LessonPageData => {
      const idx = CURRICULUM.findIndex((l) => l.id === level.id);
      const order = TEACHING_ORDER.indexOf(level.id);
      const nextId = order >= 0 ? TEACHING_ORDER.slice(order + 1).find((id) => byId.has(id)) : undefined;
      const items = [...new Set(level.items.map((i) => getDisplayName(i)))];
      return {
        id: level.id,
        name: level.name,
        slug: lessonSlug(level.name),
        description: level.description,
        pro: isProLesson(level),
        palette: segmentPaletteName(level.segmentId ?? 'purple', idx),
        mascot: mascotForPalette(segmentPaletteName(level.segmentId ?? 'purple', idx)),
        medalLines: medalLabel(level.name),
        intro: getLessonIntro(level).map(({ idea, purpose, expectation }) => ({ idea, purpose, expectation })),
        items: items.length >= 2 && items.every(readable) ? items : [],
        prerequisites: (level.prerequisites ?? []).map(link).filter((x): x is { name: string; slug: string } => Boolean(x)),
        next: nextId ? link(nextId) : null,
        segment: { id: segment.id, name: segment.name, description: segment.description },
      };
    }),
  }));
  const oldSlugs = Object.fromEntries(
    Object.entries(OLD_SLUGS).map(([old, id]) => [old, link(id)?.slug]).filter(([, slug]) => slug),
  ) as Record<string, string>;
  return { segments, oldSlugs };
}
