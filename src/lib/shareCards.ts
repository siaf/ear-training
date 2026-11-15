// Share pictures, drawn on a canvas at 1200×630 (the size social sites show link previews).
// They look like the app: a chunky white card with an ink outline and offset shadow, pastel
// tiles, the logo and a mascot. A medal is a badge of honour for the learner, and the
// button under the card invites whoever sees it to try. The same drawing makes each lesson
// page's preview picture at build time (scripts/build-lessons.mjs), so a shared link and its
// picture match. Light-theme colours on purpose: a shared picture looks the same whatever
// the app's theme. No imports beyond types, so the build script can bundle this file alone;
// callers pass the image URLs (see cardArt.ts in the app).

import type { PaletteName } from './segmentColors';
import type { WeekReport } from './weekReport';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const INK = '#2a1d3a';
const INK_2 = '#54466b';
const INK_3 = '#8a7b9d';
const PAGE = '#fff8ef';
const CARD = '#ffffff';
const HAIRLINE = '#ebe1ef';

export const PALETTES: Record<PaletteName, { bg: string; ink: string; soft: string }> = {
  coral: { bg: '#ff8a6b', ink: '#c64632', soft: '#ffe1d4' },
  mint: { bg: '#b6e5cd', ink: '#2f7a5a', soft: '#d5f0e1' },
  lav: { bg: '#c8b8ff', ink: '#5b3fb3', soft: '#e4daff' },
  butter: { bg: '#ffd768', ink: '#9a6f00', soft: '#fff0c1' },
  sky: { bg: '#a8d5ff', ink: '#2867b2', soft: '#dcecff' },
};

/** Image URLs: a mascot (512×512, transparent) and the horizontal logo. */
export interface CardArt {
  mascot?: string;
  logo?: string;
}

const SERIF = '"DM Serif Display", Georgia, serif';
const SANS = 'Outfit, system-ui, sans-serif';

// The card the content sits on, and the strip under it for the logo and the button.
const PANEL = { x: 40, y: 32, w: 1120, h: 470, r: 36 };
const FOOT_Y = 530;

/** Waits for the brand fonts, so the first picture isn't drawn in a fallback font. */
async function fontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`italic 400 60px ${SERIF}`),
      document.fonts.load(`400 60px ${SERIF}`),
      document.fonts.load(`500 24px ${SANS}`),
      document.fonts.load(`600 24px ${SANS}`),
      document.fonts.load(`700 24px ${SANS}`),
    ]);
  } catch { /* draw with whatever loaded */ }
}

async function loadImage(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
    return img;
  } catch {
    return null; // the picture still works without it
  }
}

function canvas(): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = CARD_WIDTH;
  c.height = CARD_HEIGHT;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  return { c, ctx };
}

function spacing(ctx: CanvasRenderingContext2D, px: number) {
  // Not in every browser yet; without it the letters are just a little tighter.
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** The app's chunky card: ink outline and an offset ink shadow. */
function chunky(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, shadow = 8, line = 3) {
  rounded(ctx, x, y + shadow, w, h, r);
  ctx.fillStyle = INK;
  ctx.fill();
  rounded(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** A label in a rounded pill, like the app's ColorPill. Returns its width. */
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, fg: string) {
  ctx.font = `700 18px ${SANS}`;
  spacing(ctx, 2.5);
  const w = ctx.measureText(text).width + 36;
  rounded(ctx, x, y, w, 38, 19);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 18, y + 20);
  ctx.textBaseline = 'alphabetic';
  spacing(ctx, 0);
  return w;
}

/** Splits text into lines that fit `width`, at most `max` lines (the last one ellipsised). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length <= max) return lines;
  const kept = lines.slice(0, max);
  let last = kept[max - 1];
  while (ctx.measureText(`${last}…`).width > width && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
  kept[max - 1] = `${last}…`;
  return kept;
}

/** Confetti around a point, the same few colours the mastery overlay throws. */
function confetti(ctx: CanvasRenderingContext2D, cx: number, cy: number, spread: number) {
  const colors = [PALETTES.mint.bg, PALETTES.coral.bg, PALETTES.butter.bg, PALETTES.lav.bg, PALETTES.sky.bg];
  // Fixed positions, so every share of the same medal looks the same.
  const bits = [[-1.05, -0.55, 0], [-0.8, -0.95, 1], [0.2, -1.12, 2], [0.95, -0.7, 3], [1.12, 0.05, 4], [-1.15, 0.25, 2], [0.75, -1.02, 0], [-0.35, -1.15, 3]];
  bits.forEach(([dx, dy, c], i) => {
    ctx.save();
    ctx.translate(cx + dx * spread, cy + dy * spread);
    ctx.rotate((i * 37 * Math.PI) / 180);
    ctx.fillStyle = colors[c];
    if (i % 2) ctx.fillRect(-9, -5, 18, 10);
    else { ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  });
}

/** Two ribbon tails behind the medal, like an award. */
function ribbons(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, palette: { bg: string; ink: string }) {
  const tail = (dir: 1 | -1, fill: string) => {
    const x0 = cx + dir * r * 0.18;
    const x1 = cx + dir * r * 0.62;
    const top = cy + r * 0.35;
    const bottom = cy + r * 1.28;
    ctx.beginPath();
    ctx.moveTo(x0, top);
    ctx.lineTo(x1, top);
    ctx.lineTo(x1 + dir * r * 0.12, bottom);
    ctx.lineTo(x1 - dir * r * 0.12, bottom - r * 0.16); // the notch
    ctx.lineTo(x0 - dir * r * 0.02, bottom + r * 0.02);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  };
  tail(-1, palette.bg);
  tail(1, palette.ink);
}

/** The mastery medal, the same drawing as MasteryOverlay's, scaled to radius `r`. */
function medal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, palette: { bg: string; ink: string }, lines: string[]) {
  const s = r / 112;
  ctx.save();
  // An ink offset under it, like the app's chunky shapes.
  ctx.beginPath();
  ctx.arc(cx, cy + 7, r, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = palette.bg;
  ctx.fill();
  const glow = ctx.createRadialGradient(cx, cy - 24 * s, 0, cx, cy - 24 * s, 135 * s);
  glow.addColorStop(0, 'rgba(255,255,255,0.7)');
  glow.addColorStop(0.6, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.lineWidth = 6 * s;
  ctx.strokeStyle = palette.ink;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 88 * s, 0, Math.PI * 2);
  ctx.setLineDash([3 * s, 6 * s]);
  ctx.lineWidth = 2 * s;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.fillStyle = palette.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `italic 400 ${18 * s}px ${SERIF}`;
  ctx.fillText('Mastery', cx, cy - 12 * s);
  ctx.font = `400 ${26 * s}px ${SERIF}`;
  ctx.fillText('unlocked', cx, cy + 20 * s);
  const two = lines.length > 1;
  ctx.font = `500 ${(two ? 11 : 12) * s}px ${SANS}`;
  ctx.globalAlpha = 0.75;
  lines.forEach((line, i) => ctx.fillText(line, cx, cy + (two ? 44 + i * 14 : 50) * s));
  ctx.restore();
}

/** Under the card: the logo on the left, and an invitation to try on the right. */
function foot(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, cta: string) {
  if (logo) {
    const h = 66;
    ctx.drawImage(logo, 44, FOOT_Y - 4, (logo.width / logo.height) * h, h);
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `400 44px ${SERIF}`;
    ctx.fillText('Fifths', 64, FOOT_Y + 44);
  }
  ctx.font = `700 24px ${SANS}`;
  const w = ctx.measureText(cta).width + 56;
  const x = PANEL.x + PANEL.w - w;
  chunky(ctx, x, FOOT_Y + 2, w, 56, 28, PALETTES.coral.bg, 5, 3);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(cta, x + w / 2, FOOT_Y + 39);
}

/**
 * A lesson's picture: its medal on ribbons, the section's mascot cheering, and its name.
 * `kicker` is "mastered" when a learner shares their medal, "free ear training lesson" on
 * the lesson's own page; `line` speaks to whoever sees it.
 */
export async function lessonCard(opts: {
  name: string;
  lines: string[];
  palette: PaletteName;
  kicker: string;
  line: string;
  cta: string;
  /** Small chips under the text: "92% right", "Intervals". */
  facts?: string[];
  art?: CardArt;
}): Promise<HTMLCanvasElement> {
  await fontsReady();
  const [mascot, logo] = await Promise.all([loadImage(opts.art?.mascot), loadImage(opts.art?.logo)]);
  const { c, ctx } = canvas();
  const p = PALETTES[opts.palette];
  blob(ctx, 1170, 20, 150, p.soft);
  blob(ctx, 640, 640, 120, PALETTES.lav.soft); // clear of the logo, whose background is the page colour
  chunky(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r, CARD);

  // Clip to the card, so the ribbons and mascot stay inside it.
  ctx.save();
  rounded(ctx, PANEL.x + 2, PANEL.y + 2, PANEL.w - 4, PANEL.h - 4, PANEL.r - 2);
  ctx.clip();
  blob(ctx, 270, 250, 205, p.soft);
  confetti(ctx, 270, 230, 175);
  ribbons(ctx, 270, 225, 150, p);
  medal(ctx, 270, 225, 150, p, opts.lines);
  if (mascot) ctx.drawImage(mascot, 330, 262, 220, 220);
  ctx.restore();

  // The text column, centred in the card: kicker, name, line, facts.
  const x = 560;
  ctx.textAlign = 'left';
  let size = 60;
  let lines: string[] = [];
  for (; size >= 38; size -= 4) {
    ctx.font = `italic 400 ${size}px ${SERIF}`;
    lines = wrap(ctx, opts.name, 540, 3);
    if (!lines[lines.length - 1].endsWith('…')) break;
  }
  ctx.font = `500 26px ${SANS}`;
  const said = wrap(ctx, opts.line, 540, 2);
  const facts = opts.facts?.filter(Boolean) ?? [];
  const lineH = size * 1.08;
  const height = 38 + 26 + lines.length * lineH + 14 + said.length * 34 + (facts.length ? 26 + 46 : 0);
  let y = PANEL.y + (PANEL.h - height) / 2;

  pill(ctx, x, y, opts.kicker.toUpperCase(), p.soft, p.ink);
  y += 38 + 26;
  ctx.fillStyle = INK;
  ctx.font = `italic 400 ${size}px ${SERIF}`;
  lines.forEach((line, i) => ctx.fillText(line, x, y + size * 0.8 + i * lineH));
  y += lines.length * lineH + 14;
  ctx.fillStyle = INK_2;
  ctx.font = `500 26px ${SANS}`;
  said.forEach((line, i) => ctx.fillText(line, x, y + 26 + i * 34));
  y += said.length * 34 + 26;
  // Facts as chips, the badge-of-honour details.
  let fx = x;
  for (const fact of facts) {
    ctx.font = `600 20px ${SANS}`;
    const w = ctx.measureText(fact).width + 32;
    chunky(ctx, fx, y, w, 42, 21, p.soft, 3, 2);
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(fact, fx + 16, y + 28);
    fx += w + 12;
  }

  foot(ctx, logo, opts.cta);
  return c;
}

const barColor = (accuracy: number) => (accuracy >= 80 ? PALETTES.mint.bg : accuracy >= 60 ? PALETTES.butter.bg : PALETTES.coral.bg);

/** "My week": the headline improvement, a chart of the seven days, and the numbers. */
export async function weekCard(r: WeekReport, streak: number, art?: CardArt): Promise<HTMLCanvasElement> {
  await fontsReady();
  const [mascot, logo] = await Promise.all([loadImage(art?.mascot), loadImage(art?.logo)]);
  const { c, ctx } = canvas();
  blob(ctx, 1170, 20, 150, PALETTES.coral.soft);
  blob(ctx, 640, 640, 120, PALETTES.mint.soft);
  chunky(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r, CARD);

  pill(ctx, 80, 66, 'MY WEEK OF EAR TRAINING', PALETTES.coral.soft, PALETTES.coral.ink);

  // The headline: what got better.
  ctx.textAlign = 'left';
  if (r.improved) {
    ctx.fillStyle = INK;
    ctx.font = `italic 400 44px ${SERIF}`;
    ctx.fillText(wrap(ctx, r.improved.label, 600, 1)[0], 80, 160);
    ctx.font = `400 64px ${SERIF}`;
    ctx.fillText(`${r.improved.before}%`, 80, 228);
    const w = ctx.measureText(`${r.improved.before}% `).width;
    ctx.fillStyle = PALETTES.coral.ink;
    ctx.fillText(`→ ${r.improved.after}%`, 80 + w, 228);
  } else {
    ctx.fillStyle = INK;
    ctx.font = `italic 400 46px ${SERIF}`;
    const headline = r.best ? `${r.best.label}, ${r.best.accuracy}% right` : `${r.questions} questions, ${r.accuracy}% right`;
    wrap(ctx, headline, 600, 2).forEach((line, i) => ctx.fillText(line, 80, 165 + i * 52));
  }

  // The chart: one bar per day, height for accuracy, coloured like the app's stats.
  const base = 452;
  const maxH = 150;
  const slot = 86;
  r.daily.forEach((d, i) => {
    const bx = 84 + i * slot;
    const bw = 58;
    if (d.accuracy === null) {
      rounded(ctx, bx, base - 10, bw, 10, 5);
      ctx.fillStyle = HAIRLINE;
      ctx.fill();
    } else {
      const h = Math.max(18, (d.accuracy / 100) * maxH);
      rounded(ctx, bx, base - h, bw, h, 14);
      ctx.fillStyle = barColor(d.accuracy);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = INK_2;
      ctx.font = `600 17px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(`${d.accuracy}%`, bx + bw / 2, base - h - 9);
    }
    ctx.textAlign = 'center';
    ctx.font = `${d.isToday ? 700 : 600} 18px ${SANS}`;
    ctx.fillStyle = d.isToday ? PALETTES.coral.ink : INK_3;
    ctx.fillText(d.isToday ? 'today' : d.day, bx + bw / 2, base + 30);
  });

  // The right column: the mascot with a streak ribbon, then the numbers as tiles.
  const rx = 730;
  if (mascot) ctx.drawImage(mascot, rx + 100, 40, 200, 200);
  if (streak >= 2) {
    ctx.save();
    ctx.translate(rx + 34, 196);
    ctx.rotate(-0.07);
    ctx.font = `700 20px ${SANS}`;
    spacing(ctx, 1.5);
    const label = `🔥 ${streak}-DAY STREAK`;
    const w = ctx.measureText(label).width + 40;
    chunky(ctx, 0, 0, w, 46, 23, PALETTES.coral.bg, 4, 2.5);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(label, 20, 31);
    spacing(ctx, 0);
    ctx.restore();
  }
  const tiles: [string, string, string][] = [
    ['days', `${r.days}/7`, PALETTES.mint.bg],
    ['questions', `${r.questions}`, PALETTES.butter.bg],
    ['right', `${r.accuracy}%`, PALETTES.lav.bg],
    ['minutes', `${r.minutes}`, PALETTES.sky.bg],
  ];
  tiles.forEach(([label, value, bg], i) => {
    const tx = rx + (i % 2) * 196;
    const ty = 270 + Math.floor(i / 2) * 104;
    rounded(ctx, tx, ty, 180, 90, 20);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `400 40px ${SERIF}`;
    ctx.fillText(value, tx + 18, ty + 50);
    ctx.fillStyle = INK_2;
    ctx.font = `700 14px ${SANS}`;
    spacing(ctx, 1.5);
    ctx.fillText(label.toUpperCase(), tx + 18, ty + 75);
    spacing(ctx, 0);
  });

  foot(ctx, logo, 'Train your ear free  →  fifths.io');
  return c;
}

export function toPngBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the picture'))), 'image/png'));
}
