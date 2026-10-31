// Render content/blog/*.md → site/blog/<slug>/index.html plus a /blog/ index.
// Run via `npm run build:blog`. Wired into `predeploy:site` so wrangler picks
// up the rendered HTML.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'content', 'blog');
const OUT = path.join(ROOT, 'site', 'blog');
const SITE_URL = 'https://fifths.io';

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
md.use(footnote);

const escape = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const head = ({ title, description, canonical, ogImage, articleDate }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${articleDate ? 'article' : 'website'}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
${articleDate ? `<meta property="article:published_time" content="${articleDate}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/brand/favicons/favicon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/brand/favicons/favicon-180.png">
<meta name="theme-color" content="#fff8ef">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap">
<link rel="stylesheet" href="/styles.css">
<script defer src="https://cloud.umami.is/script.js" data-website-id="8cc10640-f114-49ab-8572-036552f64527"></script>
<script defer src="/posthog.js"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-LJYKXFDR9L"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-LJYKXFDR9L');
gtag('config', 'AW-17007845333');
</script>`;

const navHeader = `<header class="nav">
  <a href="/" class="brand" aria-label="Fifths"><img src="/brand/logos/logo-horizontal-light.png" alt="Fifths" width="120" height="28"/></a>
  <nav class="nav-links">
    <a href="/blog/">Blog</a>
    <a href="/#how">How it works</a>
    <a href="/#features">Features</a>
    <a href="/#faq">FAQ</a>
  </nav>
</header>`;

const siteFooter = `<footer class="site-foot">
  <p><a href="/">Home</a> · <a href="/blog/">Blog</a> · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
  <p class="site-foot-mark">fifths.io · 2026</p>
</footer>`;

function articlePage(post) {
  const { title, description, slug, date, author = 'Fifths', tags = [], image } = post.data;
  const canonical = `${SITE_URL}/blog/${slug}/`;
  const brandLogo = `${SITE_URL}/brand/logos/logo-stacked-light.png`;
  const ogImage = image
    ? (image.startsWith('http') ? image : `${SITE_URL}${image}`)
    : brandLogo;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: typeof date === 'string' ? date : new Date(date).toISOString().slice(0, 10),
    author: { '@type': 'Organization', name: author },
    publisher: {
      '@type': 'Organization',
      name: 'Fifths',
      logo: { '@type': 'ImageObject', url: brandLogo },
    },
    mainEntityOfPage: canonical,
    image: ogImage,
    url: canonical,
  };

  const tagsHtml = tags.length
    ? `<p class="article-tags">${tags.map((t) => `<span class="tag">${escape(t)}</span>`).join(' ')}</p>`
    : '';

  // Strip the leading H1 from rendered HTML — we already render <h1> in the article header.
  const body = post.html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');

  return `${head({ title: `${title} — Fifths`, description, canonical, ogImage, articleDate: ld.datePublished })}
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
${navHeader}
<main class="wrap article-wrap">
  <article class="article">
    <header class="article-head">
      <p class="article-meta"><a href="/blog/">Science blog</a> · <time datetime="${ld.datePublished}">${fmtDate(ld.datePublished)}</time></p>
      <h1>${escape(title)}</h1>
      ${description ? `<p class="article-lede">${escape(description)}</p>` : ''}
      ${tagsHtml}
    </header>
    <div class="prose">
${body}
    </div>
    <aside class="article-cta">
      <p><strong>Want to put this into practice?</strong> Fifths is the ear training app built around the research we cite — scale-degree-first, with analytics that pinpoint exactly which intervals, scale degrees, and keys keep tripping you up.</p>
      <a href="https://app.fifths.io/?utm_source=fifths.io&utm_medium=blog&utm_campaign=${slug}" class="btn btn-coral" data-ph-track data-ph-cta="article-bottom">Try Fifths free →</a>
    </aside>
    <p class="article-back"><a href="/blog/">← Back to all articles</a></p>
  </article>
</main>
${siteFooter}
</body>
</html>`;
}

function indexPage(posts) {
  const title = 'The Fifths science blog';
  const description =
    'Research-grounded articles on how the ear actually learns music — and how to train it. Every piece cites primary sources.';
  const canonical = `${SITE_URL}/blog/`;
  const ogImage = `${SITE_URL}/brand/logos/logo-stacked-light.png`;

  const sorted = [...posts].sort((a, b) => (a.data.date < b.data.date ? 1 : -1));

  const cards = sorted
    .map(
      (p) => `      <li class="post-card">
        <a href="/blog/${p.data.slug}/">
          <p class="post-meta"><time datetime="${p.data.date}">${fmtDate(p.data.date)}</time></p>
          <h2>${escape(p.data.title)}</h2>
          ${p.data.description ? `<p>${escape(p.data.description)}</p>` : ''}
          ${
            (p.data.tags || []).length
              ? `<p class="post-tags">${p.data.tags
                  .slice(0, 4)
                  .map((t) => `<span class="tag">${escape(t)}</span>`)
                  .join(' ')}</p>`
              : ''
          }
        </a>
      </li>`,
    )
    .join('\n');

  return `${head({ title: `${title} — Fifths`, description, canonical, ogImage })}
</head>
<body>
${navHeader}
<main class="wrap article-wrap">
  <header class="blog-index-head">
    <span class="pill">✦ science blog</span>
    <h1>${escape(title)}</h1>
    <p class="article-lede">${escape(description)}</p>
  </header>
  <ul class="post-list">
${cards}
  </ul>
</main>
${siteFooter}
</body>
</html>`;
}

// Static marketing pages that aren't generated by this script but should still
// appear in the sitemap. Keep this list in sync with site/<dir>/index.html.
const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/tools/', priority: '0.85', changefreq: 'monthly' },
  { url: '/tools/circle-of-fifths/', priority: '0.9', changefreq: 'monthly' },
  { url: '/tools/vocal-range-test/', priority: '0.8', changefreq: 'monthly' },
  { url: '/tools/interval-ear-trainer/', priority: '0.8', changefreq: 'monthly' },
  { url: '/tools/note-identification/', priority: '0.8', changefreq: 'monthly' },
  { url: '/jazz/', priority: '0.8', changefreq: 'monthly' },
  { url: '/classical/', priority: '0.8', changefreq: 'monthly' },
  { url: '/transcribing/', priority: '0.8', changefreq: 'monthly' },
  { url: '/returning/', priority: '0.8', changefreq: 'monthly' },
  { url: '/blog/', priority: '0.8', changefreq: 'weekly' },
  { url: '/privacy/', priority: '0.3', changefreq: 'yearly' },
  { url: '/terms/', priority: '0.3', changefreq: 'yearly' },
];

function sitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...posts].sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
  const latestPost = sorted[0]?.data.date || today;

  const staticEntries = STATIC_PAGES.map((p) => {
    const lastmod = p.url === '/blog/' ? latestPost : today;
    return `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`;
  }).join('\n');

  const postEntries = sorted
    .map(
      (p) => `  <url>
    <loc>${SITE_URL}/blog/${p.data.slug}/</loc>
    <lastmod>${p.data.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${postEntries}
</urlset>
`;
}

function rssFeed(posts) {
  const sorted = [...posts].sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
  const latest = sorted[0]?.data.date || new Date().toISOString().slice(0, 10);
  const items = sorted
    .slice(0, 30) // cap RSS to most recent 30
    .map(
      (p) => `    <item>
      <title>${escape(p.data.title)}</title>
      <link>${SITE_URL}/blog/${p.data.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.data.slug}/</guid>
      <pubDate>${new Date(p.data.date).toUTCString()}</pubDate>
      ${p.data.description ? `<description>${escape(p.data.description)}</description>` : ''}
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Fifths science blog</title>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Research-grounded articles on how the ear actually learns music — and how to train it.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

async function ensureCleanOut() {
  await fs.mkdir(OUT, { recursive: true });
  const entries = await fs.readdir(OUT, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() || e.name === 'index.html') {
      await fs.rm(path.join(OUT, e.name), { recursive: true, force: true });
    }
  }
}

async function main() {
  const files = (await fs.readdir(SRC)).filter((f) => f.endsWith('.md'));

  // Pass 1: parse frontmatter only, build a filename → slug map for inter-post links.
  const parsedFiles = [];
  const filenameToSlug = new Map();
  for (const file of files) {
    const raw = await fs.readFile(path.join(SRC, file), 'utf8');
    const parsed = matter(raw);
    if (!parsed.data.slug || parsed.data.slug === 'index') continue;
    if (typeof parsed.data.date !== 'string') {
      parsed.data.date = new Date(parsed.data.date).toISOString().slice(0, 10);
    }
    filenameToSlug.set(file, parsed.data.slug);
    parsedFiles.push({ file, parsed });
  }

  // Pass 2: rewrite inter-post markdown links (./NN-slug.md → /blog/<slug>/) and render.
  const posts = parsedFiles.map(({ file, parsed }) => {
    const content = parsed.content.replace(
      /\]\((?:\.\/)?(\d+-[a-z0-9-]+)\.md\)/gi,
      (match, base) => {
        const slug = filenameToSlug.get(`${base}.md`);
        return slug ? `](/blog/${slug}/)` : match;
      },
    );
    return { file, data: parsed.data, html: md.render(content) };
  });

  await ensureCleanOut();

  for (const post of posts) {
    const dir = path.join(OUT, post.data.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), articlePage(post));
  }

  await fs.writeFile(path.join(OUT, 'index.html'), indexPage(posts));
  await fs.writeFile(path.join(OUT, 'feed.xml'), rssFeed(posts));
  await fs.writeFile(path.join(ROOT, 'site', 'sitemap.xml'), sitemap(posts));

  console.log(
    `✓ Built ${posts.length} blog post${posts.length === 1 ? '' : 's'} → site/blog/ (+ sitemap.xml, feed.xml)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
