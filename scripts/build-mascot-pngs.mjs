// Renders the mascot PNGs in public/brand/mascots/<key>/ from the drawings in src/mascots/,
// so the pictures (share cards, lesson preview images, the brand page, emails) match the
// animated mascots in the app. Run: npm run build:mascots (needs Playwright's Chromium).
//
//   portrait.png         the full body, neutral face
//   <expression>.png     the bust (head and shoulders) with that face, 512×512
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src/mascots');
const out = path.join(root, 'public/brand/mascots');
const MASCOTS = ['fable', 'noir', 'major', 'pulse'];
const EXPRESSIONS = ['content', 'curious', 'excited', 'happy', 'laugh', 'listening'];
const PORTRAIT_SIZE = 400;
const EXPRESSION_SIZE = 512;

const css = readFileSync(path.join(src, 'mascot.css'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const key of MASCOTS) {
  const def = JSON.parse(readFileSync(path.join(src, `${key}.json`), 'utf8'));
  const svg = readFileSync(path.join(src, `${key}.svg`), 'utf8');
  await page.setContent(`<!doctype html><html><head><style>
    html, body { margin: 0; background: transparent; } svg { display: block; overflow: hidden; }
    ${css}</style></head><body>${svg}</body></html>`);

  const shots = [
    { file: 'portrait.png', face: 'neutral', view: 'full', size: PORTRAIT_SIZE },
    ...EXPRESSIONS.map((e) => ({ file: `${e}.png`, face: e, view: 'bust', size: EXPRESSION_SIZE })),
  ];
  for (const { file, face, view, size } of shots) {
    const f = def.faces[face];
    if (!f) throw new Error(`${key} has no "${face}" face`);
    await page.evaluate(({ f, view, viewBox, size }) => {
      const el = document.querySelector('svg');
      el.setAttribute('viewBox', viewBox);
      el.setAttribute('data-view', view);
      el.setAttribute('data-eyes', f.eyes);
      el.setAttribute('data-mouth', f.mouth);
      el.setAttribute('data-blush', f.blush || 'off');
      el.setAttribute('data-fx', f.fx || 'none');
      for (const [k, v] of Object.entries(f.extra || {})) el.setAttribute(`data-${k}`, v);
      el.style.width = el.style.height = `${size}px`;
    }, { f, view, viewBox: def.viewBox[view], size });
    await page.waitForTimeout(400); // the blush fades in
    await page.locator('svg').screenshot({ path: path.join(out, key, file), omitBackground: true });
  }
  console.log(`${key}: ${shots.length} pictures`);
}
await browser.close();
