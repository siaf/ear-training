// Builds a public page for every ear-training lesson: site/lessons/<slug>/index.html with its
// own preview picture (card.png), plus the /lessons/ index. Shared medals and progress
// reports link here, and search engines can find a page per skill ("hear perfect fifths").
// Run via `npm run build:lessons` (part of `predeploy:site`). Needs Playwright's Chromium
// (`npx playwright install chromium`) to draw the pictures with the app's own drawing code.

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { SITE_URL, escape, head, navHeader, siteFooter } from './site-template.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'site', 'lessons');
const APP = 'https://app.fifths.io';

async function loadData() {
  const outfile = path.join(os.tmpdir(), `fifths-lesson-data-${process.pid}.mjs`);
  await build({ entryPoints: [path.join(__dirname, 'lesson-data.ts')], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error' });
  try {
    return (await import(pathToFileURL(outfile).href)).lessonPages();
  } finally {
    await fs.rm(outfile, { force: true });
  }
}

/** The app's share-picture drawing, bundled for the browser. */
async function cardScript() {
  const result = await build({
    entryPoints: [path.join(ROOT, 'src', 'lib', 'shareCards.ts')],
    bundle: true, format: 'iife', globalName: 'FifthsCards', write: false, logLevel: 'error',
  });
  return result.outputFiles[0].text;
}

async function drawCards(lessons) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html><head>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap">
      </head><body><script>${await cardScript()}</script></body></html>`, { waitUntil: 'networkidle' });
    for (const lesson of lessons) {
      const dataUrl = await page.evaluate(async (o) => {
        const c = await window.FifthsCards.lessonCard(o);
        return c.toDataURL('image/png');
      }, {
        name: lesson.name,
        lines: lesson.medalLines,
        palette: lesson.palette,
        kicker: lesson.pro ? 'ear training lesson · Pro' : 'free ear training lesson',
        note: 'ear training · fifths.io',
      });
      await fs.writeFile(path.join(OUT, lesson.slug, 'card.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
    }
    // A general picture, for app.fifths.io's link preview and the lessons index.
    const general = await page.evaluate(async () => (await window.FifthsCards.lessonCard({
      name: 'Ear training that tells you what you keep missing',
      lines: ['your ear, trained'],
      palette: 'coral',
      kicker: 'free in your browser',
      note: 'ear training · fifths.io',
    })).toDataURL('image/png'));
    await fs.writeFile(path.join(OUT, 'card.png'), Buffer.from(general.split(',')[1], 'base64'));
  } finally {
    await browser.close();
  }
}

const appLink = (lesson, content) => {
  const utm = `utm_source=fifths.io&utm_medium=lesson-page&utm_campaign=${encodeURIComponent(lesson.slug)}&utm_content=${content}`;
  // Pro lessons can't be opened by link (the app only starts free ones), so they open the path.
  return lesson.pro ? `${APP}/?${utm}` : `${APP}/?start=${encodeURIComponent(lesson.id)}&${utm}`;
};

const STYLE = `<style>
.lesson-hero { width: 100%; height: auto; border-radius: 22px; border: 2px solid var(--ink-1); box-shadow: 0 4px 0 var(--ink-1); margin: 4px 0 22px; display: block; }
.lesson-cta { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 0 0 28px; }
.lesson-cta .note { color: var(--ink-2); font-size: 15px; }
.prose .lesson-items, .lesson-items { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0 0 1em; }
.lesson-items li { background: var(--card); border: 1.5px solid var(--hairline); border-radius: 999px; padding: 6px 14px; font-size: 15px; }
.lesson-nav { display: grid; gap: 10px; margin-top: 28px; }
.lesson-index-section { margin: 34px 0 0; }
.lesson-index-section h2 { font-family: var(--disp); font-style: italic; font-size: 28px; margin: 0 0 4px; }
.lesson-index-section > p { color: var(--ink-2); margin: 0 0 12px; }
.lesson-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.lesson-list a { display: flex; justify-content: space-between; gap: 10px; align-items: center; background: var(--card); border: 2px solid var(--ink-1); box-shadow: 0 3px 0 var(--ink-1); border-radius: 16px; padding: 12px 14px; color: var(--ink-1); font-weight: 600; text-decoration: none; }
.lesson-list a:hover { transform: translateY(-1px); }
.lesson-tag { font-size: 11px; font-weight: 700; letter-spacing: 0.6px; border-radius: 999px; padding: 2px 8px; flex-shrink: 0; }
.lesson-tag.free { background: var(--mint-soft); color: var(--mint-ink); }
.lesson-tag.pro { background: var(--butter); color: var(--butter-ink); }
</style>`;

function lessonPage(lesson) {
  const summary = lesson.description.replace(/\.$/, '');
  const canonical = `${SITE_URL}/lessons/${lesson.slug}/`;
  const ogImage = `${canonical}card.png`;
  const title = `${lesson.name}: ${lesson.pro ? 'an ear training lesson' : 'a free ear training lesson'} — Fifths`;
  const description = `${summary}. ${lesson.pro ? 'Part of Fifths Pro.' : 'Practise it free in your browser with Fifths, no signup.'}`;
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: lesson.name,
      description: lesson.description,
      url: canonical,
      image: ogImage,
      learningResourceType: 'Ear training exercise',
      teaches: lesson.name,
      educationalLevel: lesson.segment.name,
      isAccessibleForFree: !lesson.pro,
      inLanguage: 'en',
      provider: { '@type': 'Organization', name: 'Fifths', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Lessons', item: `${SITE_URL}/lessons/` },
        { '@type': 'ListItem', position: 2, name: lesson.segment.name, item: `${SITE_URL}/lessons/#${lesson.segment.id}` },
        { '@type': 'ListItem', position: 3, name: lesson.name, item: canonical },
      ],
    },
  ];
  const intro = lesson.intro
    .map((step) => `<p>${escape(step.idea)} ${escape(step.purpose)}</p>\n<p>${escape(step.expectation)}</p>`)
    .join('\n');
  const items = lesson.items.length
    ? `<h2>What you'll tell apart</h2>\n<ul class="lesson-items">${lesson.items.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>`
    : '';
  const before = lesson.prerequisites.length
    ? `<p>Comes after ${lesson.prerequisites.map((p) => `<a href="/lessons/${p.slug}/">${escape(p.name)}</a>`).join(', ')}.</p>`
    : '';
  const next = lesson.next ? `<p>Next in the course: <a href="/lessons/${lesson.next.slug}/">${escape(lesson.next.name)}</a>.</p>` : '';
  const cta = lesson.pro
    ? `<a href="${appLink(lesson, 'top')}" class="btn btn-coral" data-ph-track data-ph-cta="lesson-page-pro">Open Fifths →</a>
      <span class="note">Part of Fifths Pro. The first lessons in every section are free.</span>`
    : `<a href="${appLink(lesson, 'top')}" class="btn btn-coral" data-ph-track data-ph-cta="lesson-page-start">Try this lesson free →</a>
      <span class="note">In your browser, no signup.</span>`;

  return `${head({ title, description, canonical, ogImage })}
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${STYLE}
</head>
<body>
${navHeader}
<main class="wrap article-wrap">
  <article class="article">
    <header class="article-head">
      <p class="article-meta"><a href="/lessons/">Lessons</a> · <a href="/lessons/#${lesson.segment.id}">${escape(lesson.segment.name)}</a></p>
      <h1>${escape(lesson.name)}</h1>
      <p class="article-lede">${escape(summary)}.</p>
    </header>
    <img class="lesson-hero" src="card.png" width="1200" height="630" alt="${escape(lesson.name)}: the medal you earn for mastering it">
    <div class="lesson-cta">
      ${cta}
    </div>
    <div class="prose">
      <h2>What you'll learn</h2>
      ${intro}
      ${items}
      ${before}
      ${next}
    </div>
    <aside class="article-cta">
      <p><strong>Fifths</strong> is ear training that tells you what you keep missing: short lessons in your browser, and analytics that show exactly which intervals, chords and scale degrees trip you up.</p>
      <a href="${appLink(lesson, 'bottom')}" class="btn btn-coral" data-ph-track data-ph-cta="lesson-page-bottom">${lesson.pro ? 'Open Fifths →' : 'Start this lesson →'}</a>
    </aside>
    <p class="article-back"><a href="/lessons/">← All lessons</a></p>
  </article>
</main>
${siteFooter}
</body>
</html>`;
}

function indexPage(segments) {
  const canonical = `${SITE_URL}/lessons/`;
  const title = 'Ear training lessons';
  const total = segments.reduce((n, s) => n + s.lessons.length, 0);
  const description = `All ${total} Fifths ear training lessons, from hearing higher or lower to jazz voicings: intervals, chords, scale degrees, modes, progressions and singing. Most are free in your browser.`;
  const sections = segments
    .map((s) => `  <section class="lesson-index-section" id="${s.id}">
    <h2>${escape(s.name)}</h2>
    <p>${escape(s.description)}</p>
    <ul class="lesson-list">
${s.lessons.map((l) => `      <li><a href="/lessons/${l.slug}/">${escape(l.name)} <span class="lesson-tag ${l.pro ? 'pro' : 'free'}">${l.pro ? 'PRO' : 'FREE'}</span></a></li>`).join('\n')}
    </ul>
  </section>`)
    .join('\n');
  return `${head({ title: `${title} — Fifths`, description, canonical, ogImage: `${SITE_URL}/lessons/card.png` })}
${STYLE}
</head>
<body>
${navHeader}
<main class="wrap article-wrap">
  <header class="blog-index-head">
    <span class="pill">✦ ${total} lessons</span>
    <h1>${escape(title)}</h1>
    <p class="article-lede">${escape(description)}</p>
    <a href="${APP}/?utm_source=fifths.io&utm_medium=lesson-index" class="btn btn-coral" data-ph-track data-ph-cta="lesson-index-start">Start free →</a>
  </header>
${sections}
</main>
${siteFooter}
</body>
</html>`;
}

/**
 * fifths.io/llms.txt: a plain summary for AI assistants (llmstxt.org), written from the
 * same data as the lesson pages so the course list never goes stale. The plans paragraph
 * is part of the "Free and Pro copy" check in AGENTS.md.
 */
function llmsTxt(segments) {
  const total = segments.reduce((n, s) => n + s.lessons.length, 0);
  const free = segments.reduce((n, s) => n + s.lessons.filter((l) => !l.pro).length, 0);
  return `# Fifths

> Fifths is an ear training app for musicians (web, iOS and Android). Short lessons train you to recognise intervals, chords, scale degrees, progressions and modes by ear, and to sing in tune, and its analytics show exactly which items you keep confusing so you can drill them.

- Website: ${SITE_URL}
- App (runs in the browser, no signup to start): https://app.fifths.io
- ${total} lessons, ${free} of them free. Every lesson has a page under ${SITE_URL}/lessons/

## Plans

- Free: foundations, singing, tonality, scale degrees, every interval, and major and minor chords, with 7 days of stats.
- Pro: one monthly plan at $4.99 (a launch discount on the $9.99 list price). Adds more chords (diminished, inversions and sevenths), cadences, progressions and jazz harmony, all seven modes, melodic dictation, advanced rhythm, custom drills (save your own, or drill exactly what you just missed) and your full stats history.

## How it teaches

- Hear it in a key first: most lessons play a cadence or scale to set the key, so you learn how notes and chords sound in context.
- Mixed practice and spaced review bring back what you're weakest on.
- After each lesson it shows what you mixed up ("you heard a perfect 5th, it was a perfect 4th").

## Courses

${segments.map((s) => `- [${s.name}](${SITE_URL}/lessons/#${s.id}): ${s.description} (${s.lessons.length} lessons)`).join('\n')}

## Key pages

- [All lessons](${SITE_URL}/lessons/)
- [Free tools: circle of fifths, interval ear trainer, vocal range test, note reading](${SITE_URL}/tools/)
- [Blog: research on how the ear learns](${SITE_URL}/blog/)
- [Best ear training apps compared](${SITE_URL}/blog/best-ear-training-apps/)
- [Best interval training apps](${SITE_URL}/blog/best-interval-training-apps/)
- [Fifths for jazz musicians](${SITE_URL}/jazz/)
- [Fifths for classical musicians](${SITE_URL}/classical/)
`;
}

/** A renamed lesson's old address forwards to its new page, so shared links keep working. */
function redirectPage(slug) {
  const to = `${SITE_URL}/lessons/${slug}/`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Moved</title>
<link rel="canonical" href="${to}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=/lessons/${slug}/">
</head><body><p>This lesson moved: <a href="/lessons/${slug}/">${to}</a></p></body></html>`;
}

async function main() {
  const { segments, oldSlugs } = await loadData();
  const lessons = segments.flatMap((s) => s.lessons);
  const slugs = new Set();
  for (const l of lessons) {
    if (slugs.has(l.slug)) throw new Error(`Two lessons would share the page /lessons/${l.slug}/. Rename one.`);
    slugs.add(l.slug);
  }

  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });
  for (const lesson of lessons) {
    await fs.mkdir(path.join(OUT, lesson.slug), { recursive: true });
    await fs.writeFile(path.join(OUT, lesson.slug, 'index.html'), lessonPage(lesson));
  }
  for (const [old, slug] of Object.entries(oldSlugs)) {
    await fs.mkdir(path.join(OUT, old), { recursive: true });
    await fs.writeFile(path.join(OUT, old, 'index.html'), redirectPage(slug));
  }
  await fs.writeFile(path.join(OUT, 'index.html'), indexPage(segments));
  await fs.writeFile(path.join(ROOT, 'site', 'llms.txt'), llmsTxt(segments));
  await drawCards(lessons);
  // For build-blog.mjs, which writes the sitemap.
  await fs.writeFile(path.join(OUT, 'pages.json'), JSON.stringify(['/lessons/', ...lessons.map((l) => `/lessons/${l.slug}/`)]));
  console.log(`✓ Built ${lessons.length} lesson pages with pictures → site/lessons/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
