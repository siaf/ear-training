// Guitar fretboard intervals game — fifths.io/tools/guitar-fretboard-intervals/
// Build: esbuild bundles this + theory.js + the shared neck and shell into
// ../guitar-fretboard-intervals.js (see the build:tool:fretintervals script).
// React, ReactDOM and Tone are UMD globals.
/* global React, ReactDOM */
import { NoteGame } from '../../_instrument-games/shell.jsx';
import { useGuitarAudio } from '../../_instrument-games/audio.js';
import { heatColor } from '../../_instrument-games/core.js';
import { STRING_NAMES, fretMidi } from '../../guitar-fretboard-notes/_src/theory.js';
import { Neck, FretControls, useFretCtx } from '../../guitar-fretboard-notes/_src/neck.jsx';
import {
  INTERVALS, IV, IV_LEVELS, ivLabel, posKey, intervalHint, describeShape, shapeTargets, makeIntervalQuestion,
} from './theory.js';

// Interval of a tapped spot relative to the root, for labelling misses.
function relLabel(q, p) {
  const d = fretMidi(p.s, p.f) - q.rootMidi;
  if (d === 0) return 'R';
  const iv = INTERVALS.find((x) => x.semis === Math.abs(d));
  if (!iv) return Math.abs(d) > 12 ? '8va+' : '?';
  return d < 0 ? '−' + iv.key : iv.key;
}

function IntervalStats({ stats }) {
  return (
    <>
      <p className="ig-small">Every answer you give is saved on this device. Bars show your accuracy per interval.</p>
      <ul className="ig-ivbars">
        {INTERVALS.map((iv) => {
          const s = stats[iv.key];
          const a = s && s.n ? s.ok / s.n : null;
          return (
            <li key={iv.key}>
              <span><strong>{iv.key}</strong> {iv.name}</span>
              <span className="ig-ivbar"><i style={{ width: a == null ? 0 : Math.max(4, a * 100) + '%', background: heatColor(s) || 'transparent' }} /></span>
              <small>{a == null ? '—' : `${Math.round(a * 100)}% · ${s.n}`}</small>
            </li>
          );
        })}
      </ul>
    </>
  );
}

const def = {
  id: 'fretboard-intervals',
  slug: 'guitar-fretboard-intervals',
  storeKey: 'fifths.guitar-fretboard-intervals.v1',
  shareNoun: 'fretboard intervals',
  shareUrl: 'fifths.io/tools/guitar-fretboard-intervals/',
  instrumentNoun: 'fretboard',
  weakNoun: 'interval',
  appHeadline: 'Seeing the shape is half of it — Fifths trains your ear to hear intervals.',
  tasks: {
    name: { label: 'Name the interval', sub: 'root + dot → tap the interval', short: 'name the interval', prompt: 'What interval is the dot above the root (R)?' },
    find: { label: 'Find the interval', sub: 'interval name → tap where it is', short: 'find the interval' },
  },
  levels: IV_LEVELS,
  useCtx: useFretCtx,
  useAudio: useGuitarAudio,
  makeQuestion: makeIntervalQuestion,
  choices: (q, level) => IV_LEVELS[level].ivs.map((k) => ({ key: k, label: k, sub: IV[k].name })),
  // Root first, then the interval note, so you hear it as well as see it.
  playAnswer: (audio, q) => {
    audio.play(q.rootMidi);
    setTimeout(() => audio.play(q.midi), 420);
  },
  playTap: (audio, q, p) => {
    audio.play(q.rootMidi);
    setTimeout(() => audio.play(fretMidi(p.s, p.f)), 260);
  },
  baseMarks: (q) => ({ [posKey(q.root.s, q.root.f)]: { state: 'root', label: 'R' } }),
  posId: (p) => posKey(p.s, p.f),
  midiOfPos: (p) => fretMidi(p.s, p.f),
  posLabel: (p) => `${STRING_NAMES[p.s]}:${p.f}`,
  posShort: (p, q) => (q ? relLabel(q, p) : ''),
  statKeyOfPos: (p, q) => q.statKey,
  missKeyFor: (q) => q.statKey,
  keyLabel: (k) => ivLabel(k),
  hint: (q) => intervalHint(q),
  // Name the in-hand shapes; the reveal dots also show the same pitch further away.
  findMissHeadline: (q) => {
    const where = shapeTargets(q.root, IV[q.statKey].semis).map((t) => describeShape(q.root, t));
    return `From this root, the ${IV[q.statKey].name} (${q.statKey}) is ${where.join(', or ')}.`;
  },
  listenLabel: '▶ Hear it',
  kbdText: (task) => (task === 'name' ? 'Keyboard: 1–9, 0, - and = pick the buttons in order. Enter for next.' : 'Tap the neck to answer. Any spot with the right pitch counts.'),
  StatsView: IntervalStats,
  Instrument: Neck,
  Controls: FretControls,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<NoteGame def={def} />);
