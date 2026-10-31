// SVG staff renderer shared by the note games (live, via innerHTML) and by the
// static note charts on each page (generated once with node and pasted in).
// Pure string output, no DOM.
//
// Units: one staff space = 10. For a staff whose bottom line sits at y = base,
// staff position p (0 = bottom line, 8 = top line) is at y = base - 5p.
// Single staff: base 40 (top line y 0). Grand staff: treble base 40, bass base 140.
// Clef glyphs are hand-drawn from the original note-identification tool, plus a
// C clef drawn for alto / tenor.
import { CLEFS, ledgerLines, noteAtPosition } from './theory.js';

export const yFor = (p, base) => base - p * 5;
export const GRAND_BASE = { treble: 40, bass: 140 };

const f = (n) => Math.round(n * 100) / 100;

function trebleClef(x, base, color) {
  // The spiral curls around the G line (p 2).
  return `<g transform="translate(${x} ${base - 40})" fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">` +
    '<path stroke-width="2.3" d="M 17.5 47 L 15.2 -6 C 14.8 -15, 22.5 -19, 22.8 -10 C 23 -2, 7 10, 6.5 27 C 6 39, 22 43, 25 33 C 27.5 25, 21 20.5, 15.5 22.5 C 10.5 24.5, 11 32, 16.5 33"/>' +
    '<path stroke-width="2.1" d="M 17.5 47 C 18 53.5, 11.5 55, 9.5 51.5"/>' +
    `<circle cx="10.5" cy="50.5" r="2.8" fill="${color}" stroke="none"/></g>`;
}

function bassClef(x, base, color) {
  // Head and the two dots straddle the F line (p 6).
  return `<g transform="translate(${x} ${base - 40})" fill="${color}" stroke="${color}" stroke-linecap="round">` +
    '<circle cx="9" cy="10" r="3.4" stroke="none"/>' +
    '<path fill="none" stroke-width="2.4" d="M 6.2 9 C 6 1.5, 21 -1.5, 23.5 8 C 26 18, 17 30, 5 37"/>' +
    '<circle cx="29.5" cy="5" r="1.7" stroke="none"/><circle cx="29.5" cy="15" r="1.7" stroke="none"/></g>';
}

// C clef: thick + thin bar, two lobes that meet in a point on the C line.
// cy = y of the line that is middle C (alto: middle line, tenor: 4th line).
function cClef(x, cy, color) {
  const lobe = '<path d="M 9.6 0 L 12.6 -3.6 C 14.6 -1.6, 18 -2.2, 20.6 -4.6 C 24.6 -8.4, 24.2 -16.6, 19.6 -19 C 16.6 -20.6, 13.4 -19.6, 12.6 -17.4" fill="none" stroke-width="2.6"/>' +
    '<circle cx="14.4" cy="-15.6" r="2.7" stroke="none"/>';
  return `<g transform="translate(${x} ${cy})" fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">` +
    '<rect x="1.5" y="-20" width="4.6" height="40" stroke="none"/>' +
    '<rect x="8.1" y="-20" width="1.6" height="40" stroke="none"/>' +
    lobe + `<g transform="scale(1 -1)">${lobe}</g></g>`;
}

export function clefGlyph(clef, x, base, color) {
  if (clef === 'treble') return trebleClef(x, base, color);
  if (clef === 'bass') return bassClef(x, base, color);
  return cClef(x, yFor(CLEFS[clef].refP, base), color); // alto p4, tenor p6
}

function sharp(cx, cy, color) {
  return `<g stroke="${color}" stroke-linecap="round">` +
    `<line x1="${f(cx - 2)}" y1="${f(cy - 8)}" x2="${f(cx - 2)}" y2="${f(cy + 7)}" stroke-width="1.3"/>` +
    `<line x1="${f(cx + 2)}" y1="${f(cy - 7)}" x2="${f(cx + 2)}" y2="${f(cy + 8)}" stroke-width="1.3"/>` +
    `<line x1="${f(cx - 4.5)}" y1="${f(cy - 1.4)}" x2="${f(cx + 4.5)}" y2="${f(cy - 3.6)}" stroke-width="2.6"/>` +
    `<line x1="${f(cx - 4.5)}" y1="${f(cy + 3.6)}" x2="${f(cx + 4.5)}" y2="${f(cy + 1.4)}" stroke-width="2.6"/></g>`;
}

function flat(cx, cy, color) {
  const x = cx - 2.5;
  return `<g stroke="${color}" stroke-linecap="round" stroke-linejoin="round">` +
    `<line x1="${f(x)}" y1="${f(cy - 12)}" x2="${f(x)}" y2="${f(cy + 4)}" stroke-width="1.4"/>` +
    `<path d="M ${f(x)} ${f(cy + 4)} C ${f(x + 8)} ${f(cy - 1)}, ${f(x + 7)} ${f(cy - 6.5)}, ${f(x)} ${f(cy - 1.5)}" fill="none" stroke-width="2"/></g>`;
}

function staffLines(x1, x2, base, color) {
  let s = '';
  for (const lp of [0, 2, 4, 6, 8]) s += `<line x1="${x1}" y1="${yFor(lp, base)}" x2="${x2}" y2="${yFor(lp, base)}" stroke="${color}" stroke-width="1"/>`;
  return s;
}

function esc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// A note: { clef, p, acc, x, color, head: 'quarter' | 'whole', label, labelColor,
//           side: true (label pill to the right) , cls, pulse, base }
function noteSvg(n, base, opts) {
  const x = n.x;
  const cy = yFor(n.p, base);
  const color = n.color || opts.ink;
  let s = `<g${n.cls ? ` class="${n.cls}"` : ''}>`;
  for (const lp of ledgerLines(n.p)) {
    s += `<line x1="${f(x - 11)}" y1="${yFor(lp, base)}" x2="${f(x + 11)}" y2="${yFor(lp, base)}" stroke="${opts.ledger}" stroke-width="1.2"/>`;
  }
  if (n.acc === 1) s += sharp(x - 16, cy, color);
  if (n.acc === -1) s += flat(x - 15, cy, color);
  if (n.pulse) s += `<circle class="ng-pulse" cx="${x}" cy="${cy}" r="8" fill="none" stroke="${color}" stroke-width="2"/>`;
  if (n.head === 'whole') {
    s += `<ellipse cx="${x}" cy="${cy}" rx="6.8" ry="4.6" fill="${color}"${n.stroke ? ` stroke="${n.stroke}" stroke-width="0.8"` : ''}/>` +
      `<ellipse cx="${x}" cy="${cy}" rx="3.1" ry="2.2" fill="${opts.paper}" transform="rotate(-55 ${x} ${cy})"/>`;
  } else {
    s += `<ellipse cx="${x}" cy="${cy}" rx="6" ry="4.3" fill="${color}" transform="rotate(-20 ${x} ${cy})"/>`;
    const up = n.p < 4;
    s += up
      ? `<line x1="${f(x + 5.5)}" y1="${f(cy - 1)}" x2="${f(x + 5.5)}" y2="${f(cy - 35)}" stroke="${color}" stroke-width="1.4"/>`
      : `<line x1="${f(x - 5.5)}" y1="${f(cy + 1)}" x2="${f(x - 5.5)}" y2="${f(cy + 35)}" stroke="${color}" stroke-width="1.4"/>`;
  }
  if (n.label && n.side) {
    const w = 8 + String(n.label).length * 7;
    const lx = x + 14;
    s += `<g class="ng-tag"><rect x="${f(lx)}" y="${f(cy - 8)}" width="${w}" height="16" rx="8" fill="${n.labelColor || color}"/>` +
      `<text x="${f(lx + w / 2)}" y="${f(cy + 4)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${n.labelText || '#fff'}" font-family="Outfit, system-ui, sans-serif">${esc(n.label)}</text></g>`;
  }
  s += '</g>';
  return s;
}

// opts: { layout: 'single' | 'grand', clef, notes, width, vbTop, vbBottom,
//         labelsY: { treble, bass, single } for labels under notes, aria, className,
//         ink, line, ledger, paper }
export function renderScore(opts) {
  const o = Object.assign({
    layout: 'single', width: 180, ink: 'var(--ink-1)', line: 'var(--ink-3)', ledger: 'var(--ink-2)',
    paper: 'var(--card)', notes: [], className: '', aria: 'Music staff',
  }, opts);
  const grand = o.layout === 'grand';
  const vbTop = o.vbTop != null ? o.vbTop : -38;
  const vbBottom = o.vbBottom != null ? o.vbBottom : (grand ? 178 : 78);
  const x0 = grand ? 16 : 2;
  const x2 = o.width - 2;
  let s = `<svg class="${o.className}" viewBox="0 ${vbTop} ${o.width} ${vbBottom - vbTop}" role="img" aria-label="${esc(o.aria)}" xmlns="http://www.w3.org/2000/svg">`;
  const staves = grand ? [['treble', 40], ['bass', 140]] : [[o.clef, 40]];
  for (const [clef, base] of staves) {
    s += staffLines(x0, x2, base, o.line);
    s += clefGlyph(clef, x0 + 1, base, o.ink);
  }
  if (grand) {
    s += `<line x1="${x0}" y1="0" x2="${x0}" y2="140" stroke="${o.line}" stroke-width="1.2"/>`;
    s += `<path d="M 12.5 -1 C 4.5 8, 10 42, 7.5 58 C 6.8 64, 5 68, 2.5 70 C 5 72, 6.8 76, 7.5 82 C 10 98, 4.5 132, 12.5 141 C 7.5 130, 12.5 100, 10 82 C 9.4 77, 8 73, 5.5 70 C 8 67, 9.4 63, 10 58 C 12.5 40, 7.5 10, 12.5 -1 Z" fill="${o.ink}"/>`;
  } else {
    s += `<line x1="${x0}" y1="0" x2="${x0}" y2="40" stroke="${o.line}" stroke-width="1"/>`;
  }
  for (const n of o.notes) {
    const base = grand ? GRAND_BASE[n.clef] : 40;
    s += noteSvg(n, base, o);
    if (n.label && !n.side && o.labelsY != null) {
      const ly = typeof o.labelsY === 'number' ? o.labelsY : o.labelsY[n.clef];
      s += `<text x="${n.x}" y="${ly}" text-anchor="middle" font-size="${n.labelSize || 10}" font-weight="${n.labelWeight || 600}" fill="${n.labelColor || o.ink}" font-family="Outfit, system-ui, sans-serif">${esc(n.label)}</text>`;
    }
  }
  s += '</svg>';
  return s;
}

// Convenience for charts: label for a position.
export function posLabel(clef, p, withOctave = true) {
  const n = noteAtPosition(p, clef);
  return 'CDEFGAB'[n.letter] + (withOctave ? n.octave : '');
}
