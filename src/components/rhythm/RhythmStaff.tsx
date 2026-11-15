// Rhythm notation on a one-line staff: note heads, stems, beams, flags, rests, dots, ties,
// triplet 3s, a time signature and barlines. Notes are spaced by time, so a half note
// takes the room of two quarters and the beat can be seen. Stems point up and ties curve
// below. Notes can be marked (the note a question asks about), coloured after a tap
// (hit or missed), and given a count underneath.

import type { ReactElement } from 'react';
import { Q, barTicks, beatTicks, starts, type RNote, type TimeSig } from '../../rhythm/model';

export type NoteMark = 'ask' | 'ok' | 'bad' | 'reveal';

interface Props {
  notes: RNote[];
  time: TimeSig;
  /** Show the time signature at the start. */
  showTime?: boolean;
  /** Per note: a highlight behind it. */
  marks?: Array<NoteMark | undefined>;
  /** Per note: text under it (counts). */
  counts?: Array<string | undefined>;
  /** No bar: just the notes, centred (for "how long is this note?"). */
  free?: boolean;
  /** Leave out the space under the line for counts. */
  compact?: boolean;
  ariaLabel: string;
  /** Pixel width cap. */
  maxWidth?: number;
}

const W = 360;
const L = 56; // the staff line
const STEM = 30;
const HEAD_RX = 6.4;
const HEAD_RY = 4.6;

const MARK_FILL: Record<NoteMark, string> = { ask: 'var(--lav)', ok: 'var(--mint)', bad: 'var(--coral-soft)', reveal: 'var(--mint)' };

export default function RhythmStaff({ notes, time, showTime = true, marks, counts, free, compact, ariaLabel, maxWidth = 560 }: Props) {
  const H = compact ? L + 22 : L + 44;
  const left = free ? 0 : showTime ? 42 : 14;
  const right = 14;
  const total = free ? notes.reduce((a, n) => a + n.t, 0) : Math.max(barTicks(time), notes.reduce((a, n) => a + n.t, 0));
  const st = starts(notes);
  // Each note sits at the start of its time slot, nudged in a little so the first isn't on the time signature.
  const inner = W - left - right;
  // Spacing: longer notes get more room, but not in proportion (a half note isn't eight
  // sixteenths wide), as in printed music. Short notes stay readable on a phone.
  const usable = inner - 18;
  const weights = notes.map((n) => 10 + 30 * Math.sqrt(n.t / Q));
  const spare = Math.max(0, total - notes.reduce((a, n) => a + n.t, 0)); // an unfilled bar keeps its empty end
  const sumW = weights.reduce((a, w) => a + w, 0) + (spare ? 10 + 30 * Math.sqrt(spare / Q) : 0);
  const xs: number[] = [];
  weights.reduce((acc, w, i) => ((xs[i] = left + 12 + (acc / sumW) * usable), acc + w), 0);
  const x = (i: number) => (free ? W / 2 + (i - (notes.length - 1) / 2) * 44 : xs[i]);
  /** Where a moment in the bar falls, between the notes either side of it. */
  const timeX = (tick: number) => {
    for (let i = 0; i < notes.length; i++) {
      if (tick < st[i] + notes[i].t) return xs[i] + ((tick - st[i]) / notes[i].t) * (weights[i] / sumW) * usable;
    }
    return left + 12 + usable;
  };
  const isWholeBarRest = notes.length === 1 && notes[0].rest && !free;

  // Beam groups: neighbouring sounding notes shorter than a quarter, within one beat.
  const bt = beatTicks(time);
  const groupOf: number[] = notes.map(() => -1);
  let g = 0;
  for (let i = 0; i < notes.length; ) {
    const beamable = (k: number) => !notes[k].rest && notes[k].t < Q;
    if (!beamable(i)) { i++; continue; }
    let j = i + 1;
    while (j < notes.length && beamable(j) && Math.floor(st[j] / bt) === Math.floor(st[i] / bt)) j++;
    if (j - i >= 2) {
      for (let k = i; k < j; k++) groupOf[k] = g;
      g++;
    }
    i = j;
  }
  const groups: number[][] = Array.from({ length: g }, (_, k) => notes.map((_, i) => i).filter((i) => groupOf[i] === k));

  const ink = 'var(--ink-1)';
  const stemX = (i: number) => x(i) + HEAD_RX - 0.9;
  const top = L - STEM;

  const out: ReactElement[] = [];

  if (free) out.push(<line key="line" x1={W / 2 - 60} x2={W / 2 + 60} y1={L} y2={L} stroke="var(--ink-4)" strokeWidth={1.4} />);
  // The staff line, time signature and barlines.
  if (!free) {
    out.push(<line key="line" x1={6} x2={W - 6} y1={L} y2={L} stroke="var(--ink-3)" strokeWidth={1.4} />);
    if (showTime) {
      out.push(
        <g key="ts" fontFamily="var(--disp), Georgia, serif" fontWeight={800} fontSize={21} fill={ink} textAnchor="middle">
          <text x={22} y={L - 3}>{time.beats}</text>
          <text x={22} y={L + 17}>{time.unit}</text>
        </g>,
      );
    }
    out.push(<line key="bar-end" x1={W - 8} x2={W - 8} y1={L - 14} y2={L + 14} stroke={ink} strokeWidth={1.6} />);
    // Faint beat ticks above the line help the eye find the beat.
    for (let b = 0; b < total / bt; b++) {
      const bx = timeX(b * bt);
      out.push(<line key={`beat${b}`} x1={bx} x2={bx} y1={L + 9} y2={L + 13} stroke="var(--ink-4)" strokeWidth={1.4} />);
    }
  }

  notes.forEach((n, i) => {
    const cx = isWholeBarRest ? left + inner / 2 : x(i);
    const mark = marks?.[i];
    if (mark) out.push(<circle key={`m${i}`} cx={cx + (n.rest ? 0 : 0.5)} cy={n.rest ? L : L - 2} r={13} fill={MARK_FILL[mark]} data-mark={mark} />);
    const dotted = !n.trip && [9, 18, 36, 72].includes(n.t);
    const base = dotted ? n.t / 1.5 : n.trip ? Q / 2 : n.t;
    out.push(
      <g key={`n${i}`} data-note-index={i} data-start={st[i]} data-mark={mark ?? undefined}>
        {n.rest ? <Rest value={base} cx={cx} /> : <Head open={base >= 2 * Q} whole={base >= 4 * Q} cx={cx} />}
        {!n.rest && base < 4 * Q && <line x1={stemX(i)} x2={stemX(i)} y1={L - 1} y2={top} stroke={ink} strokeWidth={1.5} />}
        {!n.rest && groupOf[i] < 0 && base <= Q / 2 && <Flags count={base <= Q / 4 ? 2 : 1} x={stemX(i)} />}
        {dotted && <circle cx={cx + (n.rest ? 9 : 11)} cy={n.rest ? L - 4 : L - 3} r={1.9} fill={ink} />}
        {counts?.[i] && (
          <text x={cx} y={L + 33} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--ink-2)" fontFamily="var(--ui)">
            {counts[i]}
          </text>
        )}
      </g>,
    );
    // A tie to the next note, below the heads.
    if (n.tie && i + 1 < notes.length) {
      const x1 = cx + 3;
      const x2 = x(i + 1) - 3;
      out.push(<path key={`tie${i}`} d={`M${x1},${L + 6} Q${(x1 + x2) / 2},${L + 16} ${x2},${L + 6}`} fill="none" stroke={ink} strokeWidth={1.6} />);
    }
  });

  // Beams: one for eighths, a second for sixteenths, with a stub for a lone sixteenth.
  groups.forEach((grp, k) => {
    const x1 = stemX(grp[0]);
    const x2 = stemX(grp[grp.length - 1]);
    out.push(<rect key={`b${k}`} x={x1 - 0.75} y={top} width={x2 - x1 + 1.5} height={4.6} fill={ink} />);
    const sixteenth = (i: number) => !notes[i].trip && notes[i].t === Q / 4;
    for (let a = 0; a < grp.length; a++) {
      if (!sixteenth(grp[a])) continue;
      let b = a;
      while (b + 1 < grp.length && sixteenth(grp[b + 1])) b++;
      const sx1 = stemX(grp[a]);
      const sx2 = stemX(grp[b]);
      if (b > a) out.push(<rect key={`b${k}-${a}`} x={sx1 - 0.75} y={top + 7} width={sx2 - sx1 + 1.5} height={4.6} fill={ink} />);
      else {
        const toward = a === grp.length - 1 ? -1 : 1; // a lone sixteenth points into the group
        const sx = stemX(grp[a]);
        out.push(<rect key={`b${k}-${a}`} x={toward < 0 ? sx - 9 : sx - 0.75} y={top + 7} width={9.75} height={4.6} fill={ink} />);
      }
      a = b;
    }
    if (grp.every((i) => notes[i].trip)) {
      out.push(
        <text key={`t${k}`} x={(x1 + x2) / 2} y={top - 5} textAnchor="middle" fontSize={12} fontStyle="italic" fontWeight={700} fill={ink} fontFamily="var(--disp), Georgia, serif">
          3
        </text>,
      );
    }
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ width: '100%', maxWidth, height: 'auto', display: 'block', margin: '0 auto', overflow: 'visible' }}>
      {out}
    </svg>
  );
}

function Head({ cx, open, whole }: { cx: number; open: boolean; whole: boolean }) {
  return (
    <ellipse
      cx={cx}
      cy={L}
      rx={whole ? HEAD_RX + 1.4 : HEAD_RX}
      ry={HEAD_RY}
      transform={whole ? undefined : `rotate(-22 ${cx} ${L})`}
      fill={open ? 'var(--card)' : 'var(--ink-1)'}
      stroke="var(--ink-1)"
      strokeWidth={open ? 1.9 : 1}
    />
  );
}

function Flags({ x, count }: { x: number; count: number }) {
  const top = L - STEM;
  return (
    <g fill="none" stroke="var(--ink-1)" strokeWidth={2.2} strokeLinecap="round">
      {Array.from({ length: count }, (_, k) => (
        <path key={k} d={`M${x},${top + k * 7} C${x + 4},${top + 7 + k * 7} ${x + 10},${top + 10 + k * 7} ${x + 7},${top + 19 + k * 7}`} />
      ))}
    </g>
  );
}

function Rest({ value, cx }: { value: number; cx: number }) {
  const ink = 'var(--ink-1)';
  if (value >= 4 * Q) return <rect x={cx - 7} y={L} width={14} height={5.5} fill={ink} />; // hangs from the line
  if (value >= 2 * Q) return <rect x={cx - 7} y={L - 5.5} width={14} height={5.5} fill={ink} />; // sits on the line
  if (value >= Q)
    return <path d={`M${cx - 2},${L - 13} L${cx + 4},${L - 5} L${cx - 2},${L + 1} L${cx + 4},${L + 8} C${cx - 3},${L + 4} ${cx - 4},${L + 11} ${cx + 1},${L + 14}`} fill="none" stroke={ink} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />;
  const hooks = value <= Q / 4 ? 2 : 1;
  return (
    <g>
      <line x1={cx + 4} y1={L - 8} x2={cx - 1} y2={L + 10} stroke={ink} strokeWidth={1.6} />
      {Array.from({ length: hooks }, (_, k) => (
        <g key={k}>
          <circle cx={cx - 2.5 - k * 2} cy={L - 6 + k * 7} r={2.6} fill={ink} />
          <path d={`M${cx - 2.5 - k * 2},${L - 4 + k * 7} Q${cx + 1 - k * 2},${L - 3 + k * 7} ${cx + 4 - k * 2},${L - 8 + k * 7}`} fill="none" stroke={ink} strokeWidth={1.5} />
        </g>
      ))}
    </g>
  );
}
