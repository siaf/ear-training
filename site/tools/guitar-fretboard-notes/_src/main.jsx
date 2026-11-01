// Guitar fretboard notes game — fifths.io/tools/guitar-fretboard-notes/
// Build: esbuild bundles this + theory.js + ../../_instrument-games/* into
// ../guitar-fretboard-notes.js (see the build:tool:fretboard script).
// React, ReactDOM and Tone are UMD globals.
/* global React, ReactDOM */
import { NoteGame } from '../../_instrument-games/shell.jsx';
import { useGuitarAudio } from '../../_instrument-games/audio.js';
import { pcName } from '../../_instrument-games/core.js';
import {
  FRET_LEVELS, STRING_NAMES, fretMidi, fretPc, posKey, parsePosKey,
  positionLabel, guitarHint, makeFretQuestion,
} from './theory.js';
import { Neck, FretControls, useFretCtx } from './neck.jsx';

const list = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1]);

const def = {
  id: 'fretboard',
  slug: 'guitar-fretboard-notes',
  storeKey: 'fifths.guitar-fretboard-notes.v1',
  shareNoun: 'fretboard notes',
  shareUrl: 'fifths.io/tools/guitar-fretboard-notes/',
  instrumentNoun: 'fretboard',
  tasks: {
    name: { label: 'Name the note', sub: 'dot on the neck → tap its letter', short: 'name the note', prompt: 'Which note is the dot?' },
    find: { label: 'Find them all', sub: 'note name → tap every spot', short: 'find them all' },
  },
  levels: FRET_LEVELS,
  useCtx: useFretCtx,
  useAudio: useGuitarAudio,
  makeQuestion: makeFretQuestion,
  posId: (p) => posKey(p.s, p.f),
  midiOfPos: (p) => fretMidi(p.s, p.f),
  posLabel: (p) => `${STRING_NAMES[p.s]}:${p.f}`,
  posShort: (p) => pcName(fretPc(p.s, p.f)),
  statKeyOfPos: (p) => posKey(p.s, p.f),
  isActive: (q, p) => !q.strings || q.strings.indexOf(p.s) >= 0,
  // A wrong tap counts against the nearest target on the same string.
  missKeyFor: (q, p) => {
    const same = q.targets.filter((t) => t.s === p.s).sort((a, b) => Math.abs(a.f - p.f) - Math.abs(b.f - p.f));
    const t = same[0] || q.targets[0];
    return posKey(t.s, t.f);
  },
  keyLabel: (k) => { const p = parsePosKey(k); return p ? positionLabel(p.s, p.f) : k; },
  hint: (q) => {
    if (q.task === 'name') return guitarHint(q.pos.s, q.pos.f);
    const t = q.targets[0];
    return `Every note appears once between the open string and fret 11, then again at fret 12 and up. ${guitarHint(t.s, t.f)}`;
  },
  findMissHeadline: (q, r) => {
    if (r.hits === r.total) return `All ${r.total} found, with a miss on the way.`;
    const where = q.targets.map((t) => `${STRING_NAMES[t.s]} string ${t.f === 0 ? 'open' : 'fret ' + t.f}`);
    return `${q.spell} is at: ${list(where)}.`;
  },
  Instrument: Neck,
  Controls: FretControls,
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<NoteGame def={def} />);
