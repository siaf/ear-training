// SVG staff for the Read Music path: one staff, a grand staff, or a score of several.
// Glyphs are the hand-drawn ones from the note-reading tools (site/tools/_note-games/staff.js).
//
// Units: one staff space = 10. A staff whose bottom line sits at y = base puts position p
// at y = base - 5p. Notes are whole notes (no stems): reading drills are about where a
// note sits, and stems would only add clutter.

import { useRef, type ReactElement } from 'react';
import type { AccGlyph, StaffNote, StaffSpec } from '../../notation/prompt';
import { CLEFS, clefRefP, ledgerLines, signaturePositions, type ClefId } from '../../notation/theory';

export type NoteTone = 'ink' | 'ok' | 'bad' | 'ghost' | 'root';
export interface OverlayNote extends StaffNote {
  staff: number;
  tone: NoteTone;
}

interface Props {
  staves: StaffSpec[];
  grand?: boolean;
  score?: boolean;
  overlay?: OverlayNote[];
  /** Tint notes marked as the root (after answering). */
  showRoot?: boolean;
  labelLine?: { staff: number; p: number; text: string };
  /** Tap-to-place: the staff that takes taps, its range, and the current choice. */
  tap?: { staff: number; range: [number, number]; value: number | null; acc?: AccGlyph; onChange: (p: number) => void; disabled?: boolean };
  ariaLabel: string;
  maxHeight?: string;
}

const TONE: Record<NoteTone, string> = {
  ink: 'var(--ink-1)',
  ok: 'var(--mint-ink)',
  bad: 'var(--coral-ink)',
  ghost: 'var(--ink-3)',
  root: 'var(--sky-ink)',
};

const yFor = (p: number, base: number) => base - p * 5;

function TrebleClef({ x, base, color, eight }: { x: number; base: number; color: string; eight?: boolean }) {
  // The spiral curls round the G line (p 2).
  return (
    <g transform={`translate(${x} ${base - 40})`} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <path strokeWidth="2.3" d="M 17.5 47 L 15.2 -6 C 14.8 -15, 22.5 -19, 22.8 -10 C 23 -2, 7 10, 6.5 27 C 6 39, 22 43, 25 33 C 27.5 25, 21 20.5, 15.5 22.5 C 10.5 24.5, 11 32, 16.5 33" />
      <path strokeWidth="2.1" d="M 17.5 47 C 18 53.5, 11.5 55, 9.5 51.5" />
      <circle cx="10.5" cy="50.5" r="2.8" fill={color} stroke="none" />
      {eight && (
        <text x="13" y="66" textAnchor="middle" fontSize="11" fontWeight="700" fill={color} stroke="none" fontFamily="var(--ui)">
          8
        </text>
      )}
    </g>
  );
}

function BassClef({ x, base, color }: { x: number; base: number; color: string }) {
  // Head and the two dots straddle the F line (p 6).
  return (
    <g transform={`translate(${x} ${base - 40})`} fill={color} stroke={color} strokeLinecap="round">
      <circle cx="9" cy="10" r="3.4" stroke="none" />
      <path fill="none" strokeWidth="2.4" d="M 6.2 9 C 6 1.5, 21 -1.5, 23.5 8 C 26 18, 17 30, 5 37" />
      <circle cx="29.5" cy="5" r="1.7" stroke="none" />
      <circle cx="29.5" cy="15" r="1.7" stroke="none" />
    </g>
  );
}

const C_LOBE = 'M 9.6 0 L 12.6 -3.6 C 14.6 -1.6, 18 -2.2, 20.6 -4.6 C 24.6 -8.4, 24.2 -16.6, 19.6 -19 C 16.6 -20.6, 13.4 -19.6, 12.6 -17.4';
function CClef({ x, cy, color }: { x: number; cy: number; color: string }) {
  // Two lobes meet in a point on the middle-C line.
  return (
    <g transform={`translate(${x} ${cy})`} fill={color} stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="-20" width="4.6" height="40" stroke="none" />
      <rect x="8.1" y="-20" width="1.6" height="40" stroke="none" />
      <path d={C_LOBE} fill="none" strokeWidth="2.6" />
      <circle cx="14.4" cy="-15.6" r="2.7" stroke="none" />
      <g transform="scale(1 -1)">
        <path d={C_LOBE} fill="none" strokeWidth="2.6" />
        <circle cx="14.4" cy="-15.6" r="2.7" stroke="none" />
      </g>
    </g>
  );
}

function ClefGlyph({ clef, x, base, color }: { clef: ClefId; x: number; base: number; color: string }) {
  const c = CLEFS[clef];
  if (c.sign === 'G') return <TrebleClef x={x} base={base} color={color} eight={c.octaveBelow} />;
  if (c.sign === 'F') return <BassClef x={x} base={base} color={color} />;
  return <CClef x={x} cy={yFor(clefRefP(clef), base)} color={color} />;
}

function Accidental({ kind, cx, cy, color }: { kind: AccGlyph; cx: number; cy: number; color: string }) {
  if (kind === 'sharp' || kind === 'dsharp') {
    if (kind === 'dsharp') {
      return (
        <g stroke={color} strokeWidth="2" strokeLinecap="round">
          <line x1={cx - 3.5} y1={cy - 3.5} x2={cx + 3.5} y2={cy + 3.5} />
          <line x1={cx - 3.5} y1={cy + 3.5} x2={cx + 3.5} y2={cy - 3.5} />
        </g>
      );
    }
    return (
      <g stroke={color} strokeLinecap="round">
        <line x1={cx - 2} y1={cy - 8} x2={cx - 2} y2={cy + 7} strokeWidth="1.3" />
        <line x1={cx + 2} y1={cy - 7} x2={cx + 2} y2={cy + 8} strokeWidth="1.3" />
        <line x1={cx - 4.5} y1={cy - 1.4} x2={cx + 4.5} y2={cy - 3.6} strokeWidth="2.6" />
        <line x1={cx - 4.5} y1={cy + 3.6} x2={cx + 4.5} y2={cy + 1.4} strokeWidth="2.6" />
      </g>
    );
  }
  if (kind === 'natural') {
    return (
      <g stroke={color} strokeLinecap="round">
        <line x1={cx - 2.5} y1={cy - 9} x2={cx - 2.5} y2={cy + 4} strokeWidth="1.3" />
        <line x1={cx + 2.5} y1={cy - 4} x2={cx + 2.5} y2={cy + 9} strokeWidth="1.3" />
        <line x1={cx - 2.5} y1={cy - 1} x2={cx + 2.5} y2={cy - 3} strokeWidth="2.4" />
        <line x1={cx - 2.5} y1={cy + 4} x2={cx + 2.5} y2={cy + 2} strokeWidth="2.4" />
      </g>
    );
  }
  const flat = (fx: number) => (
    <g key={fx} stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <line x1={fx} y1={cy - 12} x2={fx} y2={cy + 4} strokeWidth="1.4" />
      <path d={`M ${fx} ${cy + 4} C ${fx + 8} ${cy - 1}, ${fx + 7} ${cy - 6.5}, ${fx} ${cy - 1.5}`} fill="none" strokeWidth="2" />
    </g>
  );
  return kind === 'dflat' ? <g>{[flat(cx - 6), flat(cx + 1)]}</g> : flat(cx - 2.5);
}

function WholeNote({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="6.8" ry="4.6" fill={color} />
      <ellipse cx={x} cy={y} rx="3.1" ry="2.2" fill="var(--card)" transform={`rotate(-55 ${x} ${y})`} />
    </g>
  );
}

// ---------------------------------------------------------------------------

const COL_W = 34;

interface Laid {
  spec: StaffSpec;
  base: number; // y of the bottom line
  top: number; // highest p drawn
  bottom: number; // lowest p drawn
}

/** Where column labels sit: below the staff and below the lowest note. */
const labelP = (spec: StaffSpec) => Math.min(-4, ...spec.notes.map((n) => n.p - 4));

export default function Staff({ staves, grand, score, overlay = [], showRoot, labelLine, tap, ariaLabel, maxHeight }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Vertical layout: each staff gets room for its notes and, if it takes taps, its range.
  const laid: Laid[] = [];
  let y = 0;
  staves.forEach((spec, i) => {
    const ps = [...spec.notes.map((n) => n.p), ...overlay.filter((o) => o.staff === i).map((o) => o.p)];
    if (tap && tap.staff === i) ps.push(tap.range[0], tap.range[1]);
    const margin = score ? 1 : 2;
    const top = Math.max(8 + margin, ...ps.map((p) => p + 2));
    // Room under the staff for labels that appear after answering, so nothing jumps.
    const labelRoom = spec.labelsAfter ? [labelP(spec) - 2] : [];
    const bottom = Math.min(-margin, ...ps.map((p) => p - 2), ...labelRoom);
    const base = y + top * 5 + (i === 0 ? 6 : 0);
    laid.push({ spec, base, top, bottom });
    y = base - bottom * 5 + (grand ? 6 : score ? 2 : 10);
  });
  const height = y + 4;

  // Horizontal layout.
  const labelW = score ? 62 : 0;
  const braceW = grand ? 16 : score ? 8 : 0;
  const x0 = labelW + braceW + 2;
  const maxSig = Math.max(0, ...staves.map((s) => Math.abs(s.keySig ?? 0)));
  const hasClef = staves.some((s) => s.clef);
  const sigX = x0 + (hasClef ? 38 : 10);
  const noteX0 = sigX + maxSig * 9 + (maxSig ? 20 : 14) + (tap ? 14 : 0);
  const cols = Math.max(1, ...staves.map((s) => Math.max(0, ...s.notes.map((n) => (n.col ?? 0) + 1))));
  const width = noteX0 + cols * COL_W + (tap ? 34 : 18);
  const x2 = width - 4;

  const noteX = (col = 0) => noteX0 + col * COL_W;

  // Turn a pointer position into a staff position on the tap staff.
  const onPointer = (e: React.PointerEvent<SVGRectElement>) => {
    if (!tap || tap.disabled) return;
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    const base = laid[tap.staff].base;
    const p = Math.round((base - local.y) / 5);
    tap.onChange(Math.max(tap.range[0], Math.min(tap.range[1], p)));
  };

  const drawNotes = (notes: Array<StaffNote & { tone: NoteTone }>, base: number) => {
    const byCol = new Map<number, Array<StaffNote & { tone: NoteTone }>>();
    for (const n of notes) byCol.set(n.col ?? 0, [...(byCol.get(n.col ?? 0) ?? []), n]);
    const out: ReactElement[] = [];
    byCol.forEach((group, col) => {
      const sorted = [...group].sort((a, b) => a.p - b.p);
      // A 2nd in one chord can't share a spot: the upper note of the pair moves right.
      const shifted: boolean[] = [];
      sorted.forEach((n, k) => {
        shifted[k] = k > 0 && n.p - sorted[k - 1].p === 1 && !shifted[k - 1];
      });
      // Accidentals close together stagger to the left, top note first.
      let accSlot = -1;
      let lastAccP = Infinity;
      for (let k = sorted.length - 1; k >= 0; k--) {
        const n = sorted[k];
        const x = noteX(col) + (shifted[k] ? 13 : 0);
        const cy = yFor(n.p, base);
        const color = TONE[n.tone];
        const key = `${col}-${n.p}-${n.tone}`;
        for (const lp of ledgerLines(n.p)) {
          out.push(<line key={`l${key}-${lp}`} x1={x - 11} y1={yFor(lp, base)} x2={x + 11} y2={yFor(lp, base)} stroke="var(--ink-2)" strokeWidth="1.2" />);
        }
        if (n.acc) {
          accSlot = lastAccP - n.p < 6 ? accSlot + 1 : 0;
          lastAccP = n.p;
          out.push(<Accidental key={`a${key}`} kind={n.acc} cx={noteX(col) - 16 - accSlot * 10} cy={cy} color={color} />);
        }
        if (n.mark) out.push(<ellipse key={`m${key}`} cx={x} cy={cy} rx={13} ry={10} fill={showRoot ? 'var(--mint)' : 'var(--lav)'} data-marked />);
        out.push(
          <g key={`n${key}`} opacity={n.tone === 'ghost' ? 0.45 : 1} data-note={n.p} data-acc={n.acc ?? ''} data-mark={n.mark ? '1' : undefined} data-tone={n.tone}>
            <WholeNote x={x} y={cy} color={color} />
          </g>,
        );
      }
    });
    return out;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      data-tap-value={tap?.value ?? undefined}
      style={{ width: '100%', maxWidth: tap ? 420 : score ? 460 : 380, maxHeight, height: 'auto', display: 'block', margin: '0 auto', touchAction: tap ? 'none' : undefined }}
    >
      {laid.map(({ spec, base, top, bottom }, i) => {
        const lineColor = 'var(--ink-3)';
        const notes = spec.notes.map((n) => ({ ...n, tone: (showRoot && n.root ? 'root' : 'ink') as NoteTone }));
        const extra = overlay.filter((o) => o.staff === i);
        const sig = spec.clef ? signaturePositions(spec.keySig ?? 0, spec.clef) : [];
        return (
          <g key={i} data-staff={i} data-clef={spec.clef ?? 'none'} data-key-sig={spec.keySig ?? 0}>
            {score && spec.label && (
              <text x={labelW - 6} y={yFor(4, base) + 4} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--ink-2)" fontFamily="var(--ui)">
                {spec.label}
              </text>
            )}
            {[0, 2, 4, 6, 8].map((lp) => (
              <line key={lp} x1={x0} y1={yFor(lp, base)} x2={x2} y2={yFor(lp, base)} stroke={lineColor} strokeWidth="1" />
            ))}
            <line x1={x0} y1={yFor(8, base)} x2={x0} y2={yFor(0, base)} stroke={lineColor} strokeWidth="1" />
            <line x1={x2} y1={yFor(8, base)} x2={x2} y2={yFor(0, base)} stroke={lineColor} strokeWidth="1" />
            {spec.clef && <ClefGlyph clef={spec.clef} x={x0 + 2} base={base} color="var(--ink-1)" />}
            {sig.map((p, k) => (
              <Accidental key={`k${k}`} kind={(spec.keySig ?? 0) > 0 ? 'sharp' : 'flat'} cx={sigX + 6 + k * 9} cy={yFor(p, base)} color="var(--ink-1)" />
            ))}
            {tap && tap.staff === i && (
              <rect
                x={noteX(0) - 30}
                y={yFor(top, base) - 3}
                width={60}
                height={(top - bottom) * 5 + 6}
                fill="var(--ink-5)"
                opacity={0.35}
                rx={8}
              />
            )}
            {drawNotes([...notes, ...extra], base)}
            {showRoot &&
              spec.labelsAfter?.map((t, c) => (
                <text key={`la${c}`} x={noteX(c)} y={yFor(labelP(spec), base) + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--mint-ink)" fontFamily="var(--ui)" data-label-after>
                  {t}
                </text>
              ))}
            {labelLine && labelLine.staff === i && (
              <g>
                <line x1={x0 + 2} y1={yFor(labelLine.p, base)} x2={x2} y2={yFor(labelLine.p, base)} stroke="var(--mint-ink)" strokeWidth="2.2" opacity={0.85} />
                <text x={x2 - 4} y={yFor(labelLine.p, base) - 4} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--mint-ink)" fontFamily="var(--ui)">
                  {labelLine.text}
                </text>
              </g>
            )}
            {tap && tap.staff === i && tap.value !== null && !extra.some((o) => o.p === tap.value) && drawNotes([{ p: tap.value, acc: tap.acc, col: 0, tone: 'ink' }], base)}
            {tap && tap.staff === i && !tap.disabled && (
              <rect
                x={x0}
                y={yFor(top, base) - 5}
                width={x2 - x0}
                height={(top - bottom) * 5 + 10}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => {
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  onPointer(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons) onPointer(e);
                }}
              />
            )}
          </g>
        );
      })}
      {grand && laid.length === 2 && (
        <g>
          <line x1={x0} y1={yFor(8, laid[0].base)} x2={x0} y2={yFor(0, laid[1].base)} stroke="var(--ink-3)" strokeWidth="1.2" />
          <Brace x={x0 - 4} y1={yFor(8, laid[0].base)} y2={yFor(0, laid[1].base)} />
        </g>
      )}
      {score && laid.length > 1 && (
        <g>
          <line x1={x0} y1={yFor(8, laid[0].base)} x2={x0} y2={yFor(0, laid[laid.length - 1].base)} stroke="var(--ink-2)" strokeWidth="1.2" />
          <line x1={x0 - 5} y1={yFor(8, laid[0].base) - 2} x2={x0 - 5} y2={yFor(0, laid[laid.length - 1].base) + 2} stroke="var(--ink-1)" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}

function Brace({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  const h = y2 - y1;
  const m = y1 + h / 2;
  return (
    <path
      d={`M ${x} ${y1} C ${x - 9} ${y1 + h * 0.08}, ${x - 2} ${m - h * 0.18}, ${x - 7} ${m} C ${x - 2} ${m + h * 0.18}, ${x - 9} ${y2 - h * 0.08}, ${x} ${y2} C ${x - 5} ${y2 - h * 0.12}, ${x + 1} ${m + h * 0.16}, ${x - 4} ${m} C ${x + 1} ${m - h * 0.16}, ${x - 5} ${y1 + h * 0.12}, ${x} ${y1} Z`}
      fill="var(--ink-1)"
    />
  );
}
