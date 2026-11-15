// Share pictures, drawn on a canvas at 1200×630 (the size social sites show link previews).
// The same drawing makes each lesson page's preview image at build time
// (scripts/build-lessons.mjs), so a shared link and its picture always match.
// Light-theme colours on purpose: a shared picture looks the same whatever the app's theme.
// No imports beyond types, so the build script can bundle this file on its own.

import type { PaletteName } from './segmentColors';
import type { WeekReport } from './weekReport';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const INK = '#2a1d3a';
const INK_2 = '#54466b';
const PAGE = '#fff8ef';
const CORAL_INK = '#c64632';

export const PALETTES: Record<PaletteName, { bg: string; ink: string; soft: string }> = {
  coral: { bg: '#ff8a6b', ink: '#c64632', soft: '#ffe1d4' },
  mint: { bg: '#b6e5cd', ink: '#2f7a5a', soft: '#d5f0e1' },
  lav: { bg: '#c8b8ff', ink: '#5b3fb3', soft: '#e4daff' },
  butter: { bg: '#ffd768', ink: '#9a6f00', soft: '#fff0c1' },
  sky: { bg: '#a8d5ff', ink: '#2867b2', soft: '#dcecff' },
};

const SERIF = '"DM Serif Display", Georgia, serif';
const SANS = 'Outfit, system-ui, sans-serif';

/** Waits for the brand fonts, so the first picture isn't drawn in a fallback font. */
async function fontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`italic 400 60px ${SERIF}`),
      document.fonts.load(`400 60px ${SERIF}`),
      document.fonts.load(`500 24px ${SANS}`),
      document.fonts.load(`600 24px ${SANS}`),
    ]);
  } catch { /* draw with whatever loaded */ }
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
  // Not in every browser yet; without it the kicker is just a little tighter.
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
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

/** The mastery medal, the same drawing as MasteryOverlay's, scaled to radius `r`. */
function medal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, palette: { bg: string; ink: string }, lines: string[]) {
  const s = r / 112;
  ctx.save();
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

function footer(ctx: CanvasRenderingContext2D, note: string) {
  ctx.textAlign = 'left';
  ctx.fillStyle = CORAL_INK;
  ctx.font = `italic 400 40px ${SERIF}`;
  ctx.fillText('Fifths', 640, 570);
  const w = ctx.measureText('Fifths').width;
  ctx.fillStyle = INK_2;
  ctx.font = `500 22px ${SANS}`;
  ctx.fillText(note, 640 + w + 18, 566);
}

/**
 * A lesson's picture: its medal, and its name. `kicker` says what it is ("mastered" when a
 * learner shares their medal, "free ear training lesson" on the lesson's own page).
 */
export async function lessonCard(opts: { name: string; lines: string[]; palette: PaletteName; kicker: string; note: string }): Promise<HTMLCanvasElement> {
  await fontsReady();
  const { c, ctx } = canvas();
  const p = PALETTES[opts.palette];
  blob(ctx, 1150, 40, 170, p.soft);
  blob(ctx, 40, 600, 120, p.soft);
  medal(ctx, 320, 315, 225, p, opts.lines);

  ctx.textAlign = 'left';
  ctx.fillStyle = p.ink;
  ctx.font = `600 22px ${SANS}`;
  spacing(ctx, 3);
  ctx.fillText(opts.kicker.toUpperCase(), 640, 170);
  spacing(ctx, 0);

  // The name, as large as fits in three lines.
  ctx.fillStyle = INK;
  let size = 64;
  let lines: string[] = [];
  for (; size >= 40; size -= 4) {
    ctx.font = `italic 400 ${size}px ${SERIF}`;
    lines = wrap(ctx, opts.name, 500, 3);
    if (!lines[lines.length - 1].endsWith('…')) break;
  }
  lines.forEach((line, i) => ctx.fillText(line, 640, 245 + i * size * 1.08));

  footer(ctx, 'ear training · fifths.io');
  return c;
}

/** The "your week" picture: the headline improvement, then the week in four numbers. */
export async function weekCard(r: WeekReport, streak: number): Promise<HTMLCanvasElement> {
  await fontsReady();
  const { c, ctx } = canvas();
  blob(ctx, 1150, 40, 170, PALETTES.coral.soft);
  blob(ctx, 60, 610, 130, PALETTES.mint.soft);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTES.coral.ink;
  ctx.font = `600 22px ${SANS}`;
  spacing(ctx, 3);
  ctx.fillText('MY WEEK OF EAR TRAINING', 80, 110);
  spacing(ctx, 0);

  ctx.fillStyle = INK;
  if (r.improved) {
    ctx.font = `italic 400 64px ${SERIF}`;
    ctx.fillText(wrap(ctx, r.improved.label, 1040, 1)[0], 80, 190);
    ctx.font = `400 84px ${SERIF}`;
    ctx.fillText(`${r.improved.before}%`, 80, 290);
    const w = ctx.measureText(`${r.improved.before}% `).width;
    ctx.fillStyle = PALETTES.coral.ink;
    ctx.fillText(`→ ${r.improved.after}%`, 80 + w, 290);
  } else {
    ctx.font = `italic 400 64px ${SERIF}`;
    const headline = r.best ? `${r.best.label}, ${r.best.accuracy}% right` : `${r.questions} questions, ${r.accuracy}% right`;
    wrap(ctx, headline, 1040, 2).forEach((line, i) => ctx.fillText(line, 80, 200 + i * 72));
  }

  const tiles: [string, string, string][] = [
    ['days', `${r.days}/7`, PALETTES.mint.bg],
    ['questions', `${r.questions}`, PALETTES.butter.bg],
    ['right', `${r.accuracy}%`, PALETTES.coral.bg],
    [streak >= 2 ? 'day streak' : 'minutes', `${streak >= 2 ? streak : r.minutes}`, PALETTES.lav.bg],
  ];
  tiles.forEach(([label, value, bg], i) => {
    const x = 80 + i * 262;
    ctx.fillStyle = bg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, 340, 240, 140, 26);
    else ctx.rect(x, 340, 240, 140);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `400 60px ${SERIF}`;
    ctx.fillText(value, x + 24, 420);
    ctx.fillStyle = INK_2;
    ctx.font = `600 20px ${SANS}`;
    spacing(ctx, 2);
    ctx.fillText(label.toUpperCase(), x + 24, 455);
    spacing(ctx, 0);
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = CORAL_INK;
  ctx.font = `italic 400 40px ${SERIF}`;
  ctx.fillText('Fifths', 80, 570);
  const w = ctx.measureText('Fifths').width;
  ctx.fillStyle = INK_2;
  ctx.font = `500 22px ${SANS}`;
  ctx.fillText('ear training · fifths.io', 80 + w + 18, 566);
  return c;
}

export function toPngBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the picture'))), 'image/png'));
}
