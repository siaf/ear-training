// Piano notes game — fifths.io/tools/piano-notes/
// Build: esbuild bundles this + theory.js + ../../_instrument-games/* into
// ../piano-notes.js (see the build:tool:piano script). React, ReactDOM and
// Tone are UMD globals.
/* global React, ReactDOM */
import { NoteGame } from '../../_instrument-games/shell.jsx';
import { usePianoAudio } from '../../_instrument-games/audio.js';
import { pcOf, pcName, midiName, heatColor, loadStore, saveStore } from '../../_instrument-games/core.js';
import { PIANO_LEVELS, keyRange, keysInRange, pianoHint, makePianoQuestion, statKeyFor } from './theory.js';

const { useState, useEffect } = React;

const PREF_KEY = 'fifths.piano-notes.prefs.v1';

function useMedia(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
  }, [query]);
  return m;
}

function usePianoCtx() {
  const wide = useMedia('(min-width: 640px)');
  const [labels, setLabelsState] = useState(() => !!loadStore(PREF_KEY).labels);
  const setLabels = (v) => { setLabelsState(v); saveStore(PREF_KEY, { labels: v }); };
  const octaves = wide ? 3 : 2;
  const { lo, hi } = keyRange(octaves);
  return { octaves, lo, hi, rangeKey: lo + '-' + hi, labels, setLabels };
}

// ---- Keyboard SVG ----------------------------------------------------------
const WW = 24;   // white key width (viewBox units)
const BW = 14.5; // black key width
const BLACK_NUDGE = { 1: -2, 3: 2, 6: -2.5, 8: 0, 10: 2.5 }; // real keyboards offset the black keys slightly

const MARK_FILL = {
  target: 'var(--ig-target)', correct: 'var(--ig-ok)', hit: 'var(--ig-ok)',
  wrong: 'var(--ig-bad)', miss: 'var(--ig-bad)', reveal: 'var(--ig-ok)',
};

export function layoutKeys(lo, hi) {
  const keys = keysInRange(lo, hi);
  let wi = 0;
  return keys.map((k) => {
    if (!k.black) { const x = wi * WW; wi += 1; return { ...k, x, w: WW }; }
    const cx = wi * WW + (BLACK_NUDGE[k.pc] || 0);
    return { ...k, x: cx - BW / 2, w: BW };
  });
}

function Keyboard({ ctx, marks, onTap, heat, compact, interactive }) {
  const keys = layoutKeys(ctx.lo, ctx.hi);
  const whites = keys.filter((k) => !k.black);
  const blacks = keys.filter((k) => k.black);
  const H = compact ? 96 : 150;
  const BH = Math.round(H * 0.62);
  const width = whites.length * WW;
  const markOf = (k) => marks && marks['k' + k.midi];
  const tap = interactive ? (k) => () => onTap(k.midi) : null;

  const whiteLabel = (k, m) => {
    if (m && m.label) return m.label;
    if (compact) return k.pc === 0 ? 'C' + (Math.floor(k.midi / 12) - 1) : pcName(k.pc);
    if (ctx.labels && k.pc === 0) return midiName(k.midi);
    return null;
  };

  return (
    <svg className={'pn-kb' + (compact ? ' pn-kb--compact' : '')} viewBox={`-1 -1 ${width + 2} ${H + 2}`}
      role={interactive ? 'group' : 'img'}
      aria-label={compact ? 'Piano keyboard coloured by your accuracy on each note' : `Piano keyboard, ${ctx.octaves} octaves from ${midiName(ctx.lo)} to ${midiName(ctx.hi)}`}>
      {whites.map((k) => {
        const m = markOf(k);
        const hc = heat ? heatColor(heat[statKeyFor(k.pc)]) : null;
        const fill = m ? MARK_FILL[m.state] : hc || 'var(--ig-white-key)';
        const label = whiteLabel(k, m);
        return (
          <g key={k.midi} data-midi={k.midi} className={'pn-key pn-key--w' + (m ? ' is-' + m.state : '')} onClick={tap && tap(k)}
            role={interactive ? 'button' : undefined} aria-label={interactive ? midiName(k.midi) : undefined}>
            <rect x={k.x} y={0} width={WW} height={H} rx={compact ? 2 : 3} fill={fill} stroke="var(--ig-key-edge)" strokeWidth="1" />
            {label && (
              <text x={k.x + WW / 2} y={H - (compact ? 7 : 11)} textAnchor="middle" className="pn-label"
                style={{ fontSize: compact ? 9 : (m && m.label ? 11 : 9.5), fontWeight: m && m.label ? 700 : 500 }}>
                {label}
              </text>
            )}
          </g>
        );
      })}
      {blacks.map((k) => {
        const m = markOf(k);
        const hc = heat ? heatColor(heat[statKeyFor(k.pc)]) : null;
        const fill = m ? MARK_FILL[m.state] : hc || 'var(--ig-black-key)';
        const light = !!(m || hc);
        const parts = m && m.label ? m.label.split('/') : null;
        return (
          <g key={k.midi} data-midi={k.midi} className={'pn-key pn-key--b' + (m ? ' is-' + m.state : '')} onClick={tap && tap(k)}
            role={interactive ? 'button' : undefined} aria-label={interactive ? pcName(k.pc) + (Math.floor(k.midi / 12) - 1) : undefined}>
            <rect x={k.x} y={0} width={BW} height={BH} rx={compact ? 1.5 : 2.5} fill={fill}
              stroke={light ? 'var(--ig-black-key)' : 'none'} strokeWidth={light ? 1.5 : 0} />
            {parts && parts.map((p, i) => (
              <text key={p} x={k.x + BW / 2} y={BH - 19 + i * 11} textAnchor="middle" className="pn-label pn-label--b">{p}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function PianoControls({ ctx }) {
  return (
    <div className="ig-controls">
      <button type="button" className={'ig-toggle' + (ctx.labels ? ' is-on' : '')} aria-pressed={ctx.labels}
        onClick={() => ctx.setLabels(!ctx.labels)}>
        {ctx.labels ? '✓ ' : ''}Show C labels
      </button>
      <span className="ig-small">{ctx.octaves} octaves shown{ctx.octaves === 2 ? ' (3 on a wider screen)' : ''}</span>
    </div>
  );
}

const def = {
  id: 'piano',
  slug: 'piano-notes',
  storeKey: 'fifths.piano-notes.v1',
  shareNoun: 'piano notes',
  shareUrl: 'fifths.io/tools/piano-notes/',
  instrumentNoun: 'keyboard',
  tasks: {
    name: { label: 'Name the key', sub: 'key lights up → tap its letter', short: 'name the key', prompt: 'Which note is the highlighted key?' },
    find: { label: 'Find the note', sub: 'note name → tap the key', short: 'find the note' },
  },
  levels: PIANO_LEVELS,
  useCtx: usePianoCtx,
  useAudio: usePianoAudio,
  makeQuestion: makePianoQuestion,
  posId: (midi) => 'k' + midi,
  midiOfPos: (midi) => midi,
  posLabel: (midi) => midiName(midi).replace('♯', '#'),
  posShort: (midi) => pcName(midi),
  statKeyOfPos: (midi) => statKeyFor(midi),
  missKeyFor: (q) => q.statKey,
  keyLabel: (k) => pcName(parseInt(k.slice(2), 10)).replace('/', ' / '),
  hint: (q) => pianoHint(q.pc),
  findMissHeadline: (q, r) => `That was ${pcName(pcOf(r.tappedPos))}. ${q.spell} is marked in green.`,
  Instrument: Keyboard,
  Controls: PianoControls,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<NoteGame def={def} />);
