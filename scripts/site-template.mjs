// The parts every generated fifths.io page shares: the <head>, the nav and the footer.
// Used by build-blog.mjs and build-lessons.mjs.

export const SITE_URL = 'https://fifths.io';

export const escape = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const head = ({ title, description, canonical, ogImage, articleDate, modifiedDate }) => `<!DOCTYPE html>
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
${modifiedDate ? `<meta property="article:modified_time" content="${modifiedDate}">` : ''}
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

export const navHeader = `<header class="nav">
  <a href="/" class="brand" aria-label="Fifths"><img src="/brand/logos/logo-horizontal-light.png" alt="Fifths" width="120" height="28"/></a>
  <nav class="nav-links">
    <a href="/lessons/">Lessons</a>
    <a href="/blog/">Blog</a>
    <a href="/#how">How it works</a>
    <a href="/#features">Features</a>
    <a href="/#faq">FAQ</a>
  </nav>
</header>`;

export const siteFooter = `<footer class="site-foot">
  <p><a href="/">Home</a> · <a href="/lessons/">Lessons</a> · <a href="/blog/">Blog</a> · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
  <p class="site-foot-mark">fifths.io · 2026</p>
</footer>`;
