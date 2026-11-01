// Shared guitar neck for the fretboard games (guitar-fretboard-notes,
// guitar-fretboard-intervals): the interactive SVG neck, its view prefs and
// the flip / left-handed controls. React is a UMD global.
/* global React */
import { heatColor, loadStore, saveStore } from '../../_instrument-games/core.js';
import { STRING_NAMES, FRETS, INLAYS, posKey } from './theory.js';

const { useState, useEffect, useRef } = React;

// Tab convention: capital E for the low string, lowercase e for the high one.
const STR_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];
// Both fretboard games share one set of view prefs.
const PREF_KEY = 'fifths.guitar-fretboard-notes.prefs.v1';

export function useFretCtx() {
  const [prefs, setPrefs] = useState(() => Object.assign({ flip: false, lefty: false }, loadStore(PREF_KEY)));
  const set = (patch) => setPrefs((p) => { const n = { ...p, ...patch }; saveStore(PREF_KEY, n); return n; });
  // On phones the neck is compressed sideways so the open strings to fret 7
  // fit on screen; frets 8–12 are a short swipe away inside the neck.
  const narrowQ = '(max-width: 639px)';
  const [narrow, setNarrow] = useState(() => !!(window.matchMedia && window.matchMedia(narrowQ).matches));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(narrowQ);
    const on = () => setNarrow(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
  }, []);
  return { flip: !!prefs.flip, lefty: !!prefs.lefty, narrow, set, rangeKey: 'neck' };
}

// ---- Neck geometry (viewBox units; the interactive neck renders 1 unit = 1px)
const NUT = 40;            // open-string column width
const ROW = 38;            // string spacing
const TOP = 20;            // y of the first string row
const NECK_H = TOP + ROW * 5 + 20;
const FOOT = 22;           // fret-number row
const H = NECK_H + FOOT;
const FRET_X = (() => {    // frets get gently narrower up the neck, like a real guitar
  const xs = [NUT];
  for (let i = 1; i <= FRETS; i++) xs.push(xs[i - 1] + 56 * Math.pow(0.965, i - 1));
  return xs;
})();
export const NECK_W = Math.ceil(FRET_X[FRETS] + 8);

const fretCenter = (f) => (f === 0 ? NUT / 2 : (FRET_X[f - 1] + FRET_X[f]) / 2);
const fretWidth = (f) => (f === 0 ? NUT : FRET_X[f] - FRET_X[f - 1]);

function geom(ctx, compact) {
  const sx = ctx.narrow && !compact ? 0.74 : 1;
  const W = Math.ceil(NECK_W * sx);
  const X = (x) => (ctx.lefty ? W - x * sx : x * sx);
  const rowOf = (s) => (ctx.flip ? s : 5 - s);           // default: low E at the bottom
  const Y = (s) => TOP + rowOf(s) * ROW;
  return { X, Y, rowOf, sx, W };
}

const MARK_FILL = {
  target: 'var(--ig-target)', correct: 'var(--ig-ok)', hit: 'var(--ig-ok)',
  wrong: 'var(--ig-bad)', miss: 'var(--ig-bad)', reveal: 'var(--ig-reveal)',
  root: 'var(--ig-root)',
};

export function Neck({ ctx, q, marks, onTap, heat, compact, interactive, dimInactive }) {
  const { X, Y, sx, W } = geom(ctx, compact);
  const active = (s) => !dimInactive || !q || !q.strings || q.strings.indexOf(s) >= 0;
  const scroller = useRef(null);
  const [overflow, setOverflow] = useState(false);

  // Keep the asked position in view on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 2);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [ctx.narrow, compact]);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !q || el.scrollWidth <= el.clientWidth + 2) return;
    let left = 0;
    // A question can name the fret to centre on (the interval game's root).
    const focusF = q.focusF != null ? q.focusF : q.task === 'name' ? q.pos.f : null;
    if (focusF != null) left = X(fretCenter(focusF)) - el.clientWidth / 2;
    else left = ctx.lefty ? el.scrollWidth : 0;
    try { el.scrollTo({ left, behavior: 'smooth' }); } catch (_) { el.scrollLeft = left; }
  }, [q, ctx.lefty, ctx.narrow]); // eslint-disable-line react-hooks/exhaustive-deps

  const midY = TOP + ROW * 2.5;
  const x0 = X(NUT), x1 = X(FRET_X[FRETS]);
  const board = (
    <>
      <rect x={Math.min(x0, x1)} y={TOP - 14} width={Math.abs(x1 - x0)} height={ROW * 5 + 28} rx="3" fill="var(--ig-wood)" />
      {INLAYS.map((f) => (f === 12
        ? [1.5, 3.5].map((r) => <circle key={'i12' + r} cx={X(fretCenter(12))} cy={TOP + ROW * r} r="5.5" fill="var(--ig-inlay)" />)
        : <circle key={'i' + f} cx={X(fretCenter(f))} cy={midY} r="5.5" fill="var(--ig-inlay)" />))}
      {FRET_X.map((x, i) => (
        <line key={'f' + i} x1={X(x)} x2={X(x)} y1={TOP - 14} y2={TOP + ROW * 5 + 14}
          stroke={i === 0 ? 'var(--ig-nut)' : 'var(--ig-fret)'} strokeWidth={i === 0 ? 6 : 2} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <line key={'s' + s} x1={X(4)} x2={X(FRET_X[FRETS] + 4)} y1={Y(s)} y2={Y(s)}
          stroke="var(--ig-string)" strokeWidth={2.8 - s * 0.36} opacity={active(s) ? 1 : 0.28} />
      ))}
      {Array.from({ length: FRETS + 1 }, (_, f) => (
        <text key={'n' + f} x={X(fretCenter(f))} y={NECK_H + 13} textAnchor="middle"
          className={'gf-fretnum' + (INLAYS.indexOf(f) >= 0 ? ' is-inlay' : '')}>{f === 0 ? 'open' : f}</text>
      ))}
    </>
  );

  const dots = [];
  const cells = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= FRETS; f++) {
      const id = posKey(s, f);
      const cx = X(fretCenter(f));
      const cy = Y(s);
      const m = marks && marks[id];
      if (m) {
        const parts = m.label ? m.label.split('/') : [];
        dots.push(
          <g key={'d' + id} className={'gf-dot is-' + m.state} data-pos={id}>
            <circle cx={cx} cy={cy} r={13.5} fill={MARK_FILL[m.state]} stroke="var(--ig-dot-edge)" strokeWidth="1.5" />
            {parts.length === 1 && <text x={cx} y={cy + 4} textAnchor="middle" className="gf-dotlabel">{parts[0]}</text>}
            {parts.length === 2 && parts.map((p, i) => (
              <text key={p} x={cx} y={cy - 1.5 + i * 9} textAnchor="middle" className="gf-dotlabel gf-dotlabel--sm">{p}</text>
            ))}
          </g>,
        );
      } else if (heat) {
        const hc = heatColor(heat[id]);
        if (hc) dots.push(<circle key={'h' + id} cx={cx} cy={cy} r={10} fill={hc} stroke="var(--ig-dot-edge)" strokeWidth="1" />);
      }
      if (interactive && active(s)) {
        const w = fretWidth(f) * sx;
        cells.push(
          <rect key={'c' + id} className="gf-cell" data-pos={id} x={X(fretCenter(f)) - w / 2} y={cy - ROW / 2} width={w} height={ROW}
            fill="transparent" onClick={() => onTap({ s, f })} role="button"
            aria-label={`${STRING_NAMES[s]} string, ${f === 0 ? 'open' : 'fret ' + f}`} />,
        );
      }
    }
  }

  const neckSvg = (
    <svg className={'gf-neck' + (compact ? ' gf-neck--compact' : '')}
      viewBox={compact ? `${ctx.lefty ? -4 : -26} 0 ${NECK_W + 30} ${H}` : `0 0 ${W} ${H}`}
      width={compact ? undefined : W} height={compact ? undefined : H}
      style={compact ? undefined : { width: W + 'px', height: H + 'px', maxWidth: 'none' }}
      role={interactive ? 'group' : 'img'}
      aria-label={compact ? 'Guitar fretboard coloured by your accuracy at each position'
        : `Guitar neck, frets 0 to 12, standard tuning, ${ctx.flip ? 'low E string at the top' : 'low E string at the bottom'}`}>
      {compact && [0, 1, 2, 3, 4, 5].map((s) => (
        <text key={'l' + s} x={ctx.lefty ? NECK_W + 12 : -14} y={Y(s) + 4} textAnchor="middle" className="gf-strlabel">{STR_LABELS[s]}</text>
      ))}
      {board}
      {dots}
      {cells}
    </svg>
  );

  if (compact) return neckSvg;

  const labels = (
    <svg className="gf-labels" width="26" height={H} viewBox={`0 0 26 ${H}`} aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <text key={s} x="13" y={Y(s) + 4.5} textAnchor="middle" className="gf-strlabel" opacity={active(s) ? 1 : 0.35}>
          {STR_LABELS[s]}
        </text>
      ))}
    </svg>
  );

  return (
    <div className={'gf-wrap' + (ctx.lefty ? ' is-lefty' : '')}>
      {!ctx.lefty && labels}
      <div className="gf-scroll" ref={scroller}>{neckSvg}</div>
      {ctx.lefty && labels}
      {overflow && <p className="gf-swipe">Swipe the neck to see all 12 frets</p>}
    </div>
  );
}

export function FretControls({ ctx }) {
  return (
    <div className="ig-controls">
      <span className="ig-small gf-orient">
        {ctx.flip ? 'Flipped: low E string on top, as the guitar faces you.' : 'Low E string at the bottom: the view looking down at the neck as you play, and the same as tab.'}
      </span>
      <button type="button" className={'ig-toggle' + (ctx.flip ? ' is-on' : '')} aria-pressed={ctx.flip}
        onClick={() => ctx.set({ flip: !ctx.flip })}>{ctx.flip ? '✓ ' : ''}Flip strings</button>
      <button type="button" className={'ig-toggle' + (ctx.lefty ? ' is-on' : '')} aria-pressed={ctx.lefty}
        onClick={() => ctx.set({ lefty: !ctx.lefty })}>{ctx.lefty ? '✓ ' : ''}Left-handed</button>
    </div>
  );
}
