// Generated source: theory + circle-svg + extras + app combined.
// Edit and rebuild via:  npm run build:tool:cof
/* global React, ReactDOM, Tone */

// PostHog capture helper. No-ops if posthog snippet hasn't loaded yet —
// the snippet's stub queues calls until the SDK arrives, but we still
// guard against absence in case it's blocked (ad-blocker, opt-out).
function phCapture(event, props) {
  try {
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, props || {});
    }
  } catch (_) { /* swallow */ }
}

// ============= Theory helpers =============
(function () {
  const TONICS = [
    { name: 'Gb', pc: 6,  acc: -6, display: 'G♭' },
    { name: 'Db', pc: 1,  acc: -5, display: 'D♭' },
    { name: 'Ab', pc: 8,  acc: -4, display: 'A♭' },
    { name: 'Eb', pc: 3,  acc: -3, display: 'E♭' },
    { name: 'Bb', pc: 10, acc: -2, display: 'B♭' },
    { name: 'F',  pc: 5,  acc: -1, display: 'F'  },
    { name: 'C',  pc: 0,  acc:  0, display: 'C'  },
    { name: 'G',  pc: 7,  acc:  1, display: 'G'  },
    { name: 'D',  pc: 2,  acc:  2, display: 'D'  },
    { name: 'A',  pc: 9,  acc:  3, display: 'A'  },
    { name: 'E',  pc: 4,  acc:  4, display: 'E'  },
    { name: 'B',  pc: 11, acc:  5, display: 'B'  },
    { name: 'F#', pc: 6,  acc:  6, display: 'F♯' },
    { name: 'C#', pc: 1,  acc:  7, display: 'C♯' },
  ];

  const CIRCLE_PCS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

  const CIRCLE_LABELS = [
    { sharp: 'C',  flat: 'C'  },
    { sharp: 'G',  flat: 'G'  },
    { sharp: 'D',  flat: 'D'  },
    { sharp: 'A',  flat: 'A'  },
    { sharp: 'E',  flat: 'E'  },
    { sharp: 'B',  flat: 'C♭' },
    { sharp: 'F♯', flat: 'G♭' },
    { sharp: 'C♯', flat: 'D♭' },
    { sharp: 'G♯', flat: 'A♭' },
    { sharp: 'D♯', flat: 'E♭' },
    { sharp: 'A♯', flat: 'B♭' },
    { sharp: 'F',  flat: 'F'  },
  ];

  const MODES = {
    Lydian:     [0, 2, 4, 6, 7, 9, 11],
    Ionian:     [0, 2, 4, 5, 7, 9, 11],
    Mixolydian: [0, 2, 4, 5, 7, 9, 10],
    Dorian:     [0, 2, 3, 5, 7, 9, 10],
    Aeolian:    [0, 2, 3, 5, 7, 8, 10],
    Phrygian:   [0, 1, 3, 5, 7, 8, 10],
    Locrian:    [0, 1, 3, 5, 6, 8, 10],
  };

  const MODE_NUMERALS = {
    Lydian:     ['I',  'II',  'iii','♯iv°','V',  'vi', 'vii'],
    Ionian:     ['I',  'ii',  'iii','IV',  'V',  'vi', 'vii°'],
    Mixolydian: ['I',  'ii',  'iii°','IV',  'v',  'vi', '♭VII'],
    Dorian:     ['i',  'ii',  '♭III','IV',  'v',  'vi°','♭VII'],
    Aeolian:    ['i',  'ii°', '♭III','iv',  'v',  '♭VI','♭VII'],
    Phrygian:   ['i',  '♭II', '♭III','iv',  'v°', '♭VI','♭vii'],
    Locrian:    ['i°', '♭II', '♭iii','iv',  '♭V', '♭VI','♭vii'],
  };

  const INTERVAL_NAMES = [
    { name: 'P1',  st: 0  },
    { name: 'm2',  st: 1  },
    { name: 'M2',  st: 2  },
    { name: 'm3',  st: 3  },
    { name: 'M3',  st: 4  },
    { name: 'P4',  st: 5  },
    { name: 'd5',  st: 6  },
    { name: 'P5',  st: 7  },
    { name: 'm6',  st: 8  },
    { name: 'M6',  st: 9  },
    { name: 'm7',  st: 10 },
    { name: 'M7',  st: 11 },
  ];

  const PC_SHARP = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const PC_FLAT  = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];

  function tonicByName(name) {
    return TONICS.find(t => t.name === name) || TONICS[6];
  }

  function chordQuality(modeName, degreeIdx) {
    const intervals = MODES[modeName];
    const root = intervals[degreeIdx];
    const third = intervals[(degreeIdx + 2) % 7];
    const fifth = intervals[(degreeIdx + 4) % 7];
    const t3 = ((third - root) + 12) % 12;
    const t5 = ((fifth - root) + 12) % 12;
    if (t3 === 4 && t5 === 7) return 'major';
    if (t3 === 3 && t5 === 7) return 'minor';
    if (t3 === 3 && t5 === 6) return 'diminished';
    if (t3 === 4 && t5 === 8) return 'augmented';
    return 'minor';
  }

  function triadPCs(rootPc, quality) {
    const formulas = {
      major:      [0, 4, 7],
      minor:      [0, 3, 7],
      diminished: [0, 3, 6],
      augmented:  [0, 4, 8],
    };
    return formulas[quality].map(s => (rootPc + s) % 12);
  }

  function seventhPCs(rootPc, quality) {
    const formulas = {
      major:      [0, 4, 7, 11],
      minor:      [0, 3, 7, 10],
      diminished: [0, 3, 6, 9],
      augmented:  [0, 4, 8, 11],
    };
    return formulas[quality].map(s => (rootPc + s) % 12);
  }

  function pcToNoteName(pc, octave, prefer) {
    const arr = prefer === 'flat' ? PC_FLAT : PC_SHARP;
    return arr[pc].replace('♯', '#').replace('♭', 'b') + octave;
  }

  function circleInfo(tonicName, modeName) {
    const tonic = tonicByName(tonicName);
    const intervals = MODES[modeName];
    const numerals = MODE_NUMERALS[modeName];
    const prefer = tonic.acc < 0 ? 'flat' : 'sharp';

    const pcToDegree = new Map();
    intervals.forEach((semi, idx) => {
      const pc = (tonic.pc + semi) % 12;
      pcToDegree.set(pc, idx);
    });

    return CIRCLE_PCS.map((pc, posIdx) => {
      const labelObj = CIRCLE_LABELS[posIdx];
      const label = prefer === 'flat' ? labelObj.flat : labelObj.sharp;
      const altLabel = prefer === 'flat' ? labelObj.sharp : labelObj.flat;
      const degreeIdx = pcToDegree.has(pc) ? pcToDegree.get(pc) : null;
      const intervalSt = ((pc - tonic.pc) + 12) % 12;
      const intervalName = INTERVAL_NAMES[intervalSt].name;

      let numeral = null;
      let quality = null;
      if (degreeIdx !== null) {
        numeral = numerals[degreeIdx];
        quality = chordQuality(modeName, degreeIdx);
      } else {
        numeral = null;
        quality = 'major';
      }

      return {
        pc, posIdx, label,
        altLabel: altLabel !== label ? altLabel : null,
        degreeIdx,
        isDiatonic: degreeIdx !== null,
        numeral, quality, intervalSt, intervalName,
      };
    });
  }

  const SHARP_ORDER = ['F','C','G','D','A','E','B'];
  const FLAT_ORDER  = ['B','E','A','D','G','C','F'];

  function keySignatureFor(tonicName, modeName) {
    const fifthsFromIonian = {
      Lydian: 1, Ionian: 0, Mixolydian: -1, Dorian: -2, Aeolian: -3, Phrygian: -4, Locrian: -5,
    };
    const tonic = tonicByName(tonicName);
    const signedAcc = tonic.acc + fifthsFromIonian[modeName];
    let acc = signedAcc;
    if (acc > 7) acc -= 12;
    if (acc < -7) acc += 12;

    let kind = 'natural';
    let count = 0;
    let letters = [];
    if (acc > 0) {
      kind = 'sharp'; count = acc; letters = SHARP_ORDER.slice(0, acc);
    } else if (acc < 0) {
      kind = 'flat'; count = -acc; letters = FLAT_ORDER.slice(0, -acc);
    }
    return { kind, count, letters, acc };
  }

  function buildChordNotes(rootPc, quality, kind, baseOctave) {
    if (kind == null) kind = 'triad';
    if (baseOctave == null) baseOctave = 4;
    const pcs = kind === 'seventh' ? seventhPCs(rootPc, quality) : triadPCs(rootPc, quality);
    const notes = [];
    let prevAbs = baseOctave * 12 + pcs[0];
    notes.push(prevAbs);
    for (let i = 1; i < pcs.length; i++) {
      let abs = baseOctave * 12 + pcs[i];
      while (abs <= prevAbs) abs += 12;
      notes.push(abs);
      prevAbs = abs;
    }
    return notes.map(midi => {
      const pc = ((midi % 12) + 12) % 12;
      const oct = Math.floor(midi / 12);
      return PC_SHARP[pc].replace('♯', '#') + oct;
    });
  }

  window.Theory = {
    TONICS, CIRCLE_PCS, CIRCLE_LABELS, MODES, MODE_NUMERALS, INTERVAL_NAMES,
    PC_SHARP, PC_FLAT,
    tonicByName, chordQuality, triadPCs, seventhPCs, pcToNoteName,
    circleInfo, keySignatureFor, buildChordNotes,
  };
})();

// ============= Circle SVG =============
/* global React, ReactDOM, Tone, Theory */
// React hooks pulled in once at the bottom (Main app section).

const PALETTES = {
  pastel: {
    tonic:  { outer: '#ff8a6b', ink: '#ffffff' },
    major:  { outer: 'var(--butter)', mid: 'var(--butter-soft)', ink: 'var(--butter-ink)' },
    minor:  { outer: 'var(--lav)',    mid: 'var(--lav-soft)',    ink: 'var(--lav-ink)' },
    dim:    { outer: 'var(--sky)',    mid: 'var(--sky-soft)',    ink: 'var(--sky-ink)' },
    aug:    { outer: 'var(--mint)',   mid: 'var(--mint-soft)',   ink: 'var(--mint-ink)' },
    chrom:  { outer: 'var(--page-2)', mid: 'var(--page-3)',      ink: 'var(--ink-3)' },
  },
  vibrant: {
    tonic:  { outer: '#ff6a45', ink: '#ffffff' },
    major:  { outer: '#ffc23a', mid: '#ffe6a0', ink: '#7a5500' },
    minor:  { outer: '#a98bff', mid: '#cdbcff', ink: '#3a1f8a' },
    dim:    { outer: '#6fb4ff', mid: '#bcdaff', ink: '#0f4d99' },
    aug:    { outer: '#79d6a7', mid: '#bfe9d3', ink: '#1f6042' },
    chrom:  { outer: '#fde6c4', mid: '#f5d59a', ink: 'var(--ink-3)' },
  },
  bold: {
    tonic:  { outer: '#ee4a26', ink: '#ffffff' },
    major:  { outer: '#f0a800', mid: '#ffd768', ink: '#5e3f00' },
    minor:  { outer: '#7a5fff', mid: '#b8a4ff', ink: '#ffffff' },
    dim:    { outer: '#2c8be6', mid: '#7fbafe', ink: '#ffffff' },
    aug:    { outer: '#3fae7a', mid: '#9bd9b8', ink: '#ffffff' },
    chrom:  { outer: '#f3ead9', mid: '#ebdec0', ink: 'var(--ink-4)' },
  },
};

function CircleSVG({
  tonic, mode, view, palette = 'pastel',
  showRelativeMinor = true, highlightOnly = false,
  hovered, active, onHover, onLeave, onPlay, size = 640,
}) {
  const P = PALETTES[palette] || PALETTES.pastel;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.485;
  const rMid   = size * 0.355;
  const rInner = size * 0.245;
  const rCore  = size * 0.215;

  const info = useMemo(() => Theory.circleInfo(tonic, mode), [tonic, mode]);
  const wedgeAngle = 360 / 12;

  function polar(r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  function wedgePath(r1, r2, startDeg, endDeg) {
    const [x1a, y1a] = polar(r1, startDeg);
    const [x1b, y1b] = polar(r1, endDeg);
    const [x2b, y2b] = polar(r2, endDeg);
    const [x2a, y2a] = polar(r2, startDeg);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1a} ${y1a} A ${r1} ${r1} 0 ${large} 1 ${x1b} ${y1b} L ${x2b} ${y2b} A ${r2} ${r2} 0 ${large} 0 ${x2a} ${y2a} Z`;
  }
  function bucket(item) {
    if (!item.isDiatonic) return P.chrom;
    if (item.degreeIdx === 0) return P.tonic;
    if (item.quality === 'major') return P.major;
    if (item.quality === 'minor') return P.minor;
    if (item.quality === 'diminished') return P.dim;
    if (item.quality === 'augmented') return P.aug;
    return P.chrom;
  }
  function fillFor(item, ring) {
    const b = bucket(item);
    if (ring === 'outer') return b.outer;
    return b.mid || b.outer;
  }
  function textColorFor(item) { return bucket(item).ink; }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <filter id="cof-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="14" floodColor="rgba(42,29,58,0.14)" />
        </filter>
        <radialGradient id="cof-core-grad" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fff8ef" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={rOuter + 1} fill="none" stroke="var(--hairline)" strokeWidth="1" />

      {info.map((item, i) => {
        const startDeg = i * wedgeAngle - wedgeAngle / 2;
        const endDeg   = startDeg + wedgeAngle;
        const isHover  = hovered === i;
        const isActive = active === i;
        const [tx, ty] = polar((rOuter + rMid) / 2, i * wedgeAngle);
        const [mx, my] = polar((rMid + rInner) / 2, i * wedgeAngle);

        const showRoman = view === 'scales';
        const mainLabel = item.label;
        const subLabel = showRoman ? (item.numeral || '—') : item.intervalName;
        const subDetail = showRoman ? null : `${item.intervalSt}st`;
        const midLabel = showRoman
          ? (showRelativeMinor ? relativeMinorLabel(item) : '')
          : circleStepsFromTonic(i, info);

        return (
          <g key={i}
             onMouseEnter={() => onHover(i)}
             onMouseLeave={() => onLeave()}
             style={{ cursor: 'pointer' }}>
            <path
              d={wedgePath(rOuter, rMid, startDeg, endDeg)}
              fill={fillFor(item, 'outer')}
              stroke="var(--card)"
              strokeWidth="2"
              style={{
                transition: 'transform 140ms ease, filter 140ms ease, opacity 140ms ease',
                transformBox: 'fill-box',
                transformOrigin: 'center',
                opacity: isHover || isActive
                  ? 1
                  : (item.isDiatonic ? 1 : (highlightOnly ? 0.32 : 0.85)),
                filter: isActive ? 'brightness(1.05) saturate(1.15)' : 'none',
              }}
              onClick={(e) => {
                if (e.shiftKey || e.altKey) onPlay(i, 'seventh');
                else if (e.metaKey || e.ctrlKey) onPlay(i, 'tonic');
                else onPlay(i, 'triad');
              }}
              onContextMenu={(e) => { e.preventDefault(); onPlay(i, 'tonic'); }}
            />

            {isActive && (
              <path
                d={wedgePath(rOuter + 6, rMid - 4, startDeg, endDeg)}
                fill="none"
                stroke="var(--coral)"
                strokeWidth="2.5"
                style={{ animation: 'cof-pulse 700ms ease-out forwards', pointerEvents: 'none' }}
              />
            )}

            <text x={tx} y={ty - 6} textAnchor="middle"
                  fontFamily="var(--disp)"
                  fontWeight={600}
                  fontSize={size * 0.052}
                  fill={textColorFor(item)}
                  style={{
                    pointerEvents: 'none',
                    opacity: (item.isDiatonic || !highlightOnly) ? 1 : 0.32,
                    transition: 'opacity 160ms ease',
                  }}>
              {mainLabel}
            </text>
            <text x={tx} y={ty + 14} textAnchor="middle"
                  fontFamily="var(--ui)"
                  fontWeight={600}
                  fontSize={size * 0.022}
                  fill={textColorFor(item)}
                  style={{
                    pointerEvents: 'none',
                    letterSpacing: '0.04em',
                    opacity: (item.isDiatonic || !highlightOnly) ? 0.85 : 0.28,
                    transition: 'opacity 160ms ease',
                  }}>
              {subLabel}
              {subDetail && <tspan dx={4} fontFamily="var(--mono)" fontSize={size * 0.018} opacity={0.7}>({subDetail})</tspan>}
            </text>

            {(!showRoman || showRelativeMinor) && (
              <>
                <path
                  d={wedgePath(rMid, rInner, startDeg, endDeg)}
                  fill={fillFor(item, 'mid')}
                  stroke="var(--card)"
                  strokeWidth="2"
                  style={{
                    opacity: (item.isDiatonic || !highlightOnly) ? 0.85 : 0.28,
                    pointerEvents: 'none',
                    transition: 'opacity 160ms ease',
                  }}
                />
                <text x={mx} y={my + 4} textAnchor="middle"
                      fontFamily={showRoman ? 'var(--disp)' : 'var(--mono)'}
                      fontStyle={showRoman ? 'italic' : 'normal'}
                      fontWeight={600}
                      fontSize={size * 0.026}
                      fill={textColorFor(item)}
                      style={{
                        pointerEvents: 'none',
                        opacity: (item.isDiatonic || !highlightOnly) ? 0.85 : 0.28,
                        transition: 'opacity 160ms ease',
                      }}>
                  {midLabel}
                </text>
              </>
            )}
            {showRoman && !showRelativeMinor && (
              <path
                d={wedgePath(rMid, rInner, startDeg, endDeg)}
                fill="var(--page-2)"
                stroke="var(--card)"
                strokeWidth="2"
                style={{ opacity: 0.55, pointerEvents: 'none' }}
              />
            )}
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={rCore} fill="url(#cof-core-grad)"
              stroke="var(--hairline)" strokeWidth="1" filter="url(#cof-soft-shadow)" />

      {Array.from({ length: 12 }).map((_, i) => {
        const deg = i * wedgeAngle - wedgeAngle / 2;
        const [x1, y1] = polar(rInner + 2, deg);
        const [x2, y2] = polar(rOuter + 2, deg);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--hairline)" strokeWidth="1" />
        );
      })}
    </svg>
  );
}

function relativeMinorLabel(item) {
  const minorPc = ((item.pc - 3) + 12) % 12;
  const useFlat = item.label.includes('♭');
  return (useFlat ? Theory.PC_FLAT : Theory.PC_SHARP)[minorPc] + 'm';
}

function circleStepsFromTonic(posIdx, info) {
  const tonicPos = info.findIndex(x => x.degreeIdx === 0);
  if (tonicPos === -1) return '';
  let d = posIdx - tonicPos;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return (d > 0 ? '+' : '') + d + '♯';
}

window.CircleSVG = CircleSVG;

// ============= Sidebar / extras =============
/* global React, Theory */

function VoiceLeadingCard({ tonic, mode, info, focusedPos, onPlayChord }) {
  if (focusedPos == null) {
    return (
      <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--ui)', lineHeight: 1.55, padding: '4px 0' }}>
        Hover or click a chord on the wheel to see where it naturally resolves.
      </div>
    );
  }
  const item = info[focusedPos];
  const tonicItem = info.find(it => it.degreeIdx === 0);
  const suggestions = [];
  if (item.isDiatonic) {
    const d = item.degreeIdx;
    if (d === 4) {
      suggestions.push({ to: info.find(x => x.degreeIdx === 0), label: 'authentic', why: 'V → I — strongest cadence' });
      suggestions.push({ to: info.find(x => x.degreeIdx === 5), label: 'deceptive', why: 'V → vi — surprise resolve' });
    } else if (d === 3) {
      suggestions.push({ to: info.find(x => x.degreeIdx === 0), label: 'plagal',  why: 'IV → I — "amen" cadence' });
      suggestions.push({ to: info.find(x => x.degreeIdx === 4), label: 'subdom',  why: 'IV → V — building tension' });
    } else if (d === 1) {
      suggestions.push({ to: info.find(x => x.degreeIdx === 4), label: 'predom',  why: 'ii → V — jazz pre-dominant' });
      suggestions.push({ to: info.find(x => x.degreeIdx === 0), label: 'direct',  why: 'ii → I — gentle resolve' });
    } else if (d === 6) {
      suggestions.push({ to: info.find(x => x.degreeIdx === 0), label: 'leading', why: 'vii° → I — leading-tone pull' });
    } else if (d === 5) {
      suggestions.push({ to: info.find(x => x.degreeIdx === 1), label: 'cycle',   why: 'vi → ii — circle-of-fifths motion' });
      suggestions.push({ to: info.find(x => x.degreeIdx === 3), label: 'soft',    why: 'vi → IV — pop ballad move' });
    } else if (d === 2) {
      suggestions.push({ to: info.find(x => x.degreeIdx === 5), label: 'relative', why: 'iii → vi — descending fifths' });
      suggestions.push({ to: info.find(x => x.degreeIdx === 3), label: 'gentle',  why: 'iii → IV — modal step' });
    } else if (d === 0) {
      suggestions.push({ to: info.find(x => x.degreeIdx === 4), label: 'tonic→V', why: 'I → V — opens the phrase' });
      suggestions.push({ to: info.find(x => x.degreeIdx === 3), label: 'tonic→IV', why: 'I → IV — opens the phrase (plagal)' });
      suggestions.push({ to: info.find(x => x.degreeIdx === 5), label: 'tonic→vi', why: 'I → vi — to relative minor' });
    }
  } else {
    suggestions.push({ to: tonicItem, label: 'cycle', why: 'chromatic chords often resolve down a fifth' });
  }
  const valid = suggestions.filter(s => s.to);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--disp)', fontSize: 18, fontWeight: 600, color: 'var(--ink-1)' }}>
          {item.label}{item.quality === 'minor' ? 'm' : item.quality === 'diminished' ? '°' : item.quality === 'augmented' ? '+' : ''}
        </span>
        <span style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 13 }}>
          {item.numeral || '—'}
        </span>
      </div>
      {valid.length === 0 && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          No standard resolutions for this chord in {mode}.
        </div>
      )}
      {valid.map((s, i) => {
        const t = s.to;
        const tone = t.degreeIdx === 0 ? 'coral'
          : t.quality === 'major' ? 'butter'
          : t.quality === 'minor' ? 'lav'
          : t.quality === 'diminished' ? 'sky'
          : 'mint';
        const sym = t.label + (
          t.quality === 'minor' ? 'm' :
          t.quality === 'diminished' ? '°' :
          t.quality === 'augmented' ? '+' : ''
        );
        return (
          <button key={i}
            onClick={() => onPlayChord(t.pc, t.quality)}
            style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center',
              padding: '8px 10px', borderRadius: 10,
              background: 'var(--page-2)', border: '1px solid var(--hairline)',
              cursor: 'pointer', textAlign: 'left',
            }}>
            <span style={{
              fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--coral-ink)', background: 'var(--coral-soft)',
              padding: '2px 8px', borderRadius: 999,
            }}>{s.label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 12 }}>→</span>
              <span style={{
                fontFamily: 'var(--ui)', fontWeight: 700, fontSize: 13,
                color: `var(--${tone}-ink)`,
                background: `var(--${tone}-soft)`,
                padding: '2px 8px', borderRadius: 6,
              }}>{sym}</span>
              <span style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 11, color: 'var(--ink-3)' }}>{t.numeral}</span>
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }}>{s.why}</span>
          </button>
        );
      })}
    </div>
  );
}

const SCALE_DEGREE_LABELS = {
  Lydian:     ['1', '2', '3', '♯4', '5', '6', '7'],
  Ionian:     ['1', '2', '3', '4',  '5', '6', '7'],
  Mixolydian: ['1', '2', '3', '4',  '5', '6', '♭7'],
  Dorian:     ['1', '2', '♭3','4',  '5', '6', '♭7'],
  Aeolian:    ['1', '2', '♭3','4',  '5', '♭6','♭7'],
  Phrygian:   ['1', '♭2','♭3','4',  '5', '♭6','♭7'],
  Locrian:    ['1', '♭2','♭3','4',  '♭5','♭6','♭7'],
};

function ScaleNotesStrip({ tonic, mode, onPlayNote }) {
  const t = Theory.tonicByName(tonic);
  const intervals = Theory.MODES[mode];
  const useFlat = t.acc < 0 || (mode === 'Phrygian' || mode === 'Locrian' || mode === 'Aeolian' || mode === 'Dorian');
  const labels = SCALE_DEGREE_LABELS[mode] || ['1', '2', '3', '4', '5', '6', '7'];

  const notes = intervals.map((semi, idx) => {
    const pc = (t.pc + semi) % 12;
    const noteName = (useFlat ? Theory.PC_FLAT : Theory.PC_SHARP)[pc];
    return { pc, noteName, semi, label: labels[idx] };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)',
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        click a note to hear it
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {notes.map((n, i) => {
          const isTonic = i === 0;
          const isAltered = n.label.includes('♭') || n.label.includes('♯');
          return (
            <button key={i}
              onClick={() => onPlayNote(n.pc)}
              style={{
                padding: '8px 4px', borderRadius: 8,
                background: isTonic ? 'var(--coral)' : (isAltered ? 'var(--lav-soft)' : 'var(--page-2)'),
                color: isTonic ? '#fff' : (isAltered ? 'var(--lav-ink)' : 'var(--ink-1)'),
                border: '1px solid ' + (isTonic ? 'var(--coral)' : 'var(--hairline)'),
                fontFamily: 'var(--ui)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.8 }}>{n.label}</span>
              <span style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 14 }}>{n.noteName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PianoKeyboard({ tonic, mode, onPlayNote, lastPlayedPc = null }) {
  const t = Theory.tonicByName(tonic);
  const intervals = Theory.MODES[mode];
  const scalePcs = new Set(intervals.map(s => (t.pc + s) % 12));
  const tonicPc = t.pc;

  const NUM_OCTAVES = 2;
  const numWhiteKeys = NUM_OCTAVES * 7;
  const whiteKeys = [];
  const blackKeys = [];
  const whiteSemiMap = [0, 2, 4, 5, 7, 9, 11];
  for (let oct = 0; oct < NUM_OCTAVES; oct++) {
    for (let w = 0; w < 7; w++) {
      const semi = oct * 12 + whiteSemiMap[w];
      whiteKeys.push({ idx: oct * 7 + w, semi, pc: semi % 12, oct });
    }
  }
  const BLACK_AFTER = [0, 1, 3, 4, 5];
  for (let oct = 0; oct < NUM_OCTAVES; oct++) {
    for (const after of BLACK_AFTER) {
      const semi = oct * 12 + whiteSemiMap[after] + 1;
      blackKeys.push({ afterIdx: oct * 7 + after, semi, pc: semi % 12 });
    }
  }

  const W = 100 / numWhiteKeys;
  return (
    <div style={{
      position: 'relative', height: 130, width: '100%',
      maxWidth: 720, margin: '0 auto', userSelect: 'none',
    }}>
      {whiteKeys.map(k => {
        const inScale = scalePcs.has(k.pc);
        const isTonic = k.pc === tonicPc;
        const wasPlayed = lastPlayedPc === k.pc;
        const bg = wasPlayed ? 'var(--coral)' : isTonic ? 'var(--coral-soft)' : inScale ? 'var(--butter-soft)' : '#fff';
        const labelColor = wasPlayed ? '#fff' : isTonic ? 'var(--coral-ink)' : inScale ? 'var(--butter-ink)' : 'var(--ink-3)';
        return (
          <button key={`w${k.idx}`}
            onClick={() => onPlayNote(k.pc)}
            style={{
              position: 'absolute',
              left: `${k.idx * W}%`,
              width: `calc(${W}% - 1.5px)`,
              top: 0, bottom: 0,
              background: bg,
              border: '1px solid ' + (isTonic ? 'var(--coral)' : 'var(--hairline)'),
              borderTop: 'none',
              borderRadius: '0 0 5px 5px',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 120ms ease',
              boxShadow: isTonic ? 'inset 0 -3px 0 var(--coral)' : 'none',
            }}>
            <span style={{
              position: 'absolute', bottom: 6, left: 0, right: 0,
              textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9,
              fontWeight: isTonic ? 700 : 500,
              color: labelColor,
              letterSpacing: '0.04em',
            }}>
              {Theory.PC_SHARP[k.pc]}
            </span>
          </button>
        );
      })}
      {blackKeys.map((k, i) => {
        const inScale = scalePcs.has(k.pc);
        const isTonic = k.pc === tonicPc;
        const wasPlayed = lastPlayedPc === k.pc;
        const left = (k.afterIdx + 1) * W - (W * 0.32);
        const bg = wasPlayed ? 'var(--coral)' : isTonic ? 'var(--coral)' : inScale ? 'var(--lav-ink)' : '#2a1d3a';
        return (
          <button key={`b${i}`}
            onClick={() => onPlayNote(k.pc)}
            style={{
              position: 'absolute',
              left: `${left}%`,
              width: `${W * 0.62}%`,
              top: 0, height: 80,
              background: bg,
              border: 'none',
              borderRadius: '0 0 4px 4px',
              cursor: 'pointer',
              padding: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
              zIndex: 2,
              transition: 'background 120ms ease',
            }}>
            {inScale && (
              <span style={{
                position: 'absolute', bottom: 5, left: 0, right: 0,
                textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 8,
                color: '#fff', opacity: 0.85, letterSpacing: '0.04em',
              }}>
                {Theory.PC_FLAT[k.pc]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

window.VoiceLeadingCard = VoiceLeadingCard;
window.ScaleNotesStrip = ScaleNotesStrip;
window.PianoKeyboard = PianoKeyboard;

// ============= Main app =============
/* global React, Tone, Theory, CircleSVG, VoiceLeadingCard, ScaleNotesStrip, PianoKeyboard */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

function useAudio() {
  const synthRef = useRef(null);
  const initRef = useRef(false);
  const synthTypeRef = useRef('triangle');

  const ensure = useCallback(async () => {
    if (initRef.current) return synthRef.current;
    await Tone.start();
    const limiter = new Tone.Limiter(-1).toDestination();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: synthTypeRef.current },
      envelope: { attack: 0.01, decay: 0.18, sustain: 0.35, release: 0.85 },
      volume: -8,
    }).connect(limiter);
    synthRef.current = synth;
    initRef.current = true;
    return synth;
  }, []);

  const play = useCallback(async (notes, duration = '2n') => {
    const s = await ensure();
    s.triggerAttackRelease(notes, duration);
  }, [ensure]);

  const setSynth = useCallback((type) => {
    synthTypeRef.current = type;
    if (synthRef.current) synthRef.current.set({ oscillator: { type } });
  }, []);

  return { play, ensure, setSynth };
}

const TONIC_OPTS = ['Gb','Db','Ab','Eb','Bb','F','C','G','D','A','E','B','F#','C#'];
const MODE_OPTS = ['Lydian','Ionian','Mixolydian','Dorian','Aeolian','Phrygian','Locrian'];

const MODE_TAGLINE = {
  Lydian: 'bright · raised 4th',
  Ionian: 'major · home base',
  Mixolydian: 'dominant · flat 7',
  Dorian: 'minor · raised 6',
  Aeolian: 'natural minor',
  Phrygian: 'flat 2 · spanish flavour',
  Locrian: 'diminished · unstable',
};

function KeySignatureCard({ tonic, mode }) {
  const sig = useMemo(() => Theory.keySignatureFor(tonic, mode), [tonic, mode]);
  const tonicObj = Theory.tonicByName(tonic);

  const w = 180, staffH = 92;
  const lineGap = 11;
  const top = 12;
  const lines = [0, 1, 2, 3, 4].map(i => top + i * lineGap);
  const SHARP_POSITIONS = { F: 0.5, C: 2, G: 0, D: 1.5, A: 3, E: 1, B: 2.5 };
  const FLAT_POSITIONS  = { B: 2.5, E: 1, A: 3.5, D: 1.5, G: 4, C: 3, F: 5 };
  function yForStep(step) { return top + step * (lineGap / 2); }

  return (
    <div className="cof-keysig" style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 220,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 2,
        transform: 'translateY(-4px)',
      }}>
        <div style={{
          fontFamily: 'var(--ui)', fontSize: 11, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--ink-3)',
        }}>
          Key signature
        </div>
        <div style={{
          fontFamily: 'var(--disp)', fontSize: 52, fontWeight: 700,
          lineHeight: 1.05, color: 'var(--ink-1)', letterSpacing: '-0.02em',
          marginTop: 2,
        }}>
          {tonicObj.display}
        </div>
        <div style={{
          fontFamily: 'var(--ui)', fontSize: 13, color: 'var(--ink-2)',
          fontWeight: 500,
        }}>
          {mode}
        </div>

        <svg width={w} height={staffH} viewBox={`0 0 ${w} ${staffH}`} style={{ marginTop: 4 }}>
          {lines.map((y, i) => (
            <line key={i} x1={16} y1={y} x2={w - 10} y2={y}
                  stroke="var(--ink-3)" strokeWidth="1" />
          ))}
          <text x={10} y={top + lineGap * 4 + 14} fontFamily="var(--disp)"
                fontSize={94} fill="var(--ink-1)">{'𝄞'}</text>

          {sig.letters.map((letter, i) => {
            const pos = sig.kind === 'sharp' ? SHARP_POSITIONS[letter] : FLAT_POSITIONS[letter];
            const x = 70 + i * 13;
            const y = yForStep(pos) + 6;
            return (
              <text key={i} x={x} y={y} fontFamily="var(--disp)" fontSize={28}
                    fill="var(--coral-ink)" fontWeight={600}>
                {sig.kind === 'sharp' ? '♯' : '♭'}
              </text>
            );
          })}
          {sig.kind === 'natural' && (
            <text x={w / 2 + 14} y={top + lineGap * 2 + 6} textAnchor="middle"
                  fontFamily="var(--mono)" fontSize={12} fill="var(--ink-3)">
              no accidentals
            </text>
          )}
        </svg>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)',
        }}>
          {sig.count === 0 ? '0 accidentals' :
            `${sig.count} ${sig.kind}${sig.count > 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  );
}

function TonicPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {TONIC_OPTS.map(t => {
        const obj = Theory.tonicByName(t);
        const active = value === t;
        return (
          <button key={t} onClick={() => onChange(t)}
            style={{
              height: 36, minWidth: 42, padding: '0 12px',
              borderRadius: 18,
              fontFamily: 'var(--disp)', fontSize: 16, fontWeight: 600,
              background: active ? 'var(--ink-1)' : 'var(--card)',
              color: active ? 'var(--page)' : 'var(--ink-1)',
              border: `1.5px solid ${active ? 'var(--ink-1)' : 'var(--hairline)'}`,
              cursor: 'pointer',
              transition: 'transform 140ms ease, background 140ms ease',
              boxShadow: active ? 'var(--sh-md)' : 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
            {obj.display}
          </button>
        );
      })}
    </div>
  );
}

function CollapsibleCard({ title, summary, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="cof-card">
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
          <span className="cof-h3" style={{ margin: 0 }}>{title}</span>
          {summary && (
            <span style={{
              fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 15,
              color: 'var(--ink-1)', letterSpacing: '-0.01em',
            }}>{summary}</span>
          )}
        </span>
        <span aria-hidden style={{
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 160ms ease',
        }}>▾</span>
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </section>
  );
}

function MaybeCollapsible({ compact, title, summary, defaultOpen = false, children }) {
  if (compact) {
    return (
      <CollapsibleCard title={title} summary={summary} defaultOpen={defaultOpen}>
        {children}
      </CollapsibleCard>
    );
  }
  return (
    <section className="cof-card">
      <h3 className="cof-h3">{title}</h3>
      {children}
    </section>
  );
}

function ModePicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {MODE_OPTS.map(m => {
        const active = value === m;
        return (
          <button key={m} onClick={() => onChange(m)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
              padding: '10px 14px',
              borderRadius: 14,
              fontFamily: 'var(--ui)',
              background: active ? 'var(--coral-soft)' : 'transparent',
              color: active ? 'var(--coral-ink)' : 'var(--ink-1)',
              border: `1.5px solid ${active ? 'var(--coral)' : 'transparent'}`,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 140ms ease',
            }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{m}</span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10.5,
              color: active ? 'var(--coral-ink)' : 'var(--ink-3)',
              opacity: 0.8,
              letterSpacing: '0.02em',
            }}>
              {MODE_TAGLINE[m]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function relatedKeys(tonicName, modeName) {
  const t = Theory.tonicByName(tonicName);
  if (!t) return [];
  const isMajor = ['Ionian', 'Lydian', 'Mixolydian'].includes(modeName);
  function findName(pc, preferFlat) {
    const candidates = TONIC_OPTS.filter(n => Theory.tonicByName(n).pc === pc);
    if (preferFlat) return candidates.find(n => n.includes('b')) || candidates[0];
    return candidates.find(n => !n.includes('b')) || candidates[0];
  }
  const preferFlat = t.acc < 0;
  if (isMajor) {
    return [
      { tonic: findName((t.pc + 7) % 12, preferFlat),  mode: 'Ionian',  rel: 'V',  why: 'dominant key (+1 sharp)' },
      { tonic: findName((t.pc + 5) % 12, preferFlat),  mode: 'Ionian',  rel: 'IV', why: 'subdominant key (+1 flat)' },
      { tonic: findName((t.pc + 9) % 12, preferFlat),  mode: 'Aeolian', rel: 'vi', why: 'relative minor' },
      { tonic: findName((t.pc + 4) % 12, preferFlat),  mode: 'Aeolian', rel: 'iii', why: 'mediant minor' },
      { tonic: findName((t.pc + 2) % 12, preferFlat),  mode: 'Aeolian', rel: 'ii', why: 'supertonic minor' },
      { tonic: tonicName,                              mode: 'Aeolian', rel: 'i',  why: 'parallel minor' },
    ];
  }
  return [
    { tonic: findName((t.pc + 3) % 12, preferFlat),    mode: 'Ionian',  rel: '♭III', why: 'relative major' },
    { tonic: findName((t.pc + 7) % 12, preferFlat),    mode: 'Aeolian', rel: 'v',   why: 'dominant minor' },
    { tonic: findName((t.pc + 5) % 12, preferFlat),    mode: 'Aeolian', rel: 'iv',  why: 'subdominant minor' },
    { tonic: findName((t.pc + 8) % 12, preferFlat),    mode: 'Ionian',  rel: '♭VI',  why: 'submediant major' },
    { tonic: findName((t.pc + 10) % 12, preferFlat),   mode: 'Ionian',  rel: '♭VII', why: 'subtonic major' },
    { tonic: tonicName,                                mode: 'Ionian',  rel: 'I',   why: 'parallel major' },
  ];
}

function borrowedChords(tonicName, modeName) {
  const t = Theory.tonicByName(tonicName);
  if (!t) return [];
  const isMajor = ['Ionian', 'Lydian', 'Mixolydian'].includes(modeName);
  if (isMajor) {
    return [
      { name: 'V/V',     pc: (t.pc + 2) % 12, quality: 'major', why: 'dominant of dominant — leads to V' },
      { name: 'V/vi',    pc: (t.pc + 4) % 12, quality: 'major', why: 'tonicizes the relative minor' },
      { name: 'V/IV',    pc: (t.pc + 0) % 12, quality: 'major', why: 'I7 → IV (turnaround dominant)' },
      { name: '♭VII', pc: (t.pc + 10) % 12, quality: 'major', why: 'mixolydian colour · rock cadence' },
      { name: 'iv',      pc: (t.pc + 5) % 12, quality: 'minor', why: 'modal interchange — sad subdominant' },
      { name: '♭VI', pc: (t.pc + 8) % 12, quality: 'major', why: 'borrowed from parallel minor' },
      { name: '♭II (Neap.)', pc: (t.pc + 1) % 12, quality: 'major', why: 'Neapolitan — dramatic pre-dominant' },
    ];
  }
  return [
    { name: 'V (major)', pc: (t.pc + 7) % 12, quality: 'major', why: 'raised leading tone (harmonic minor)' },
    { name: 'V/♭III', pc: (t.pc + 10) % 12, quality: 'major', why: 'tonicizes relative major' },
    { name: 'V/iv',     pc: (t.pc + 0) % 12, quality: 'major', why: 'i7 → iv' },
    { name: '♭II (Neap.)', pc: (t.pc + 1) % 12, quality: 'major', why: 'Neapolitan — dark pre-dominant' },
    { name: 'IV (major)', pc: (t.pc + 5) % 12, quality: 'major', why: 'dorian brightness' },
  ];
}

function NextStepsCard({ tonic, mode, onSetTonic, onPlayChord, embedded = false }) {
  const keys = useMemo(() => relatedKeys(tonic, mode), [tonic, mode]);
  const borrowed = useMemo(() => borrowedChords(tonic, mode), [tonic, mode]);

  const body = (
    <>
      {!embedded && (
        <>
          <h3 className="cof-h3" style={{ margin: 0, marginBottom: 4 }}>Where to go next · <span className="cof-keyname">{tonic} {mode}</span></h3>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            modulation targets and chromatic colour
          </div>
        </>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: embedded ? '1fr' : '1fr 1fr', gap: 18 }}>
        <div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: '0.04em' }}>
            Closely related keys
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {keys.map((k, i) => (
              <button key={i}
                onClick={() => onSetTonic(k.tonic, k.mode)}
                title={`Switch to ${k.tonic} ${k.mode}`}
                style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'baseline',
                  padding: '6px 10px', borderRadius: 8,
                  background: 'transparent', border: '1px solid transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--page-2)'; e.currentTarget.style.borderColor = 'var(--hairline)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                <span style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', minWidth: 30 }}>{k.rel}</span>
                <span style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 13, color: 'var(--ink-1)' }}>
                  {k.tonic} <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>{k.mode}</span>
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }}>{k.why}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--ui)', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, letterSpacing: '0.04em' }}>
            Borrowed & secondary
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {borrowed.map((b, i) => {
              const useFlat = tonic.includes('b') || tonic.includes('♭');
              const noteName = (useFlat ? Theory.PC_FLAT : Theory.PC_SHARP)[b.pc];
              const sym = noteName + (
                b.quality === 'minor' ? 'm' :
                b.quality === 'diminished' ? '°' :
                b.quality === 'augmented' ? '+' : ''
              );
              const tone = b.quality === 'major' ? 'butter'
                : b.quality === 'minor' ? 'lav'
                : b.quality === 'diminished' ? 'sky'
                : 'mint';
              return (
                <button key={i}
                  onClick={() => onPlayChord(b.pc, b.quality)}
                  title={`Play ${sym}`}
                  style={{
                    display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: 8, alignItems: 'baseline',
                    padding: '6px 10px', borderRadius: 8,
                    background: 'transparent', border: '1px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `var(--${tone}-soft)`; e.currentTarget.style.borderColor = `var(--${tone})`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                  <span style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-3)', minWidth: 56 }}>{b.name}</span>
                  <span style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 13, color: 'var(--ink-1)' }}>{sym}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textAlign: 'right' }}>{b.why}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) return body;
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--hairline)',
      borderRadius: 20,
      boxShadow: 'var(--sh-sm)',
      padding: '18px 20px',
      width: '100%',
      maxWidth: 640,
    }}>
      {body}
    </div>
  );
}

function PageSwitch({ label, hint, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, width: '100%',
        padding: '10px 12px',
        border: '1px solid var(--hairline)',
        borderRadius: 12,
        background: 'var(--card)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--ui)',
      }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-1)' }}>{label}</span>
        {hint && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>{hint}</span>
        )}
      </span>
      <span aria-hidden style={{
        flex: 'none',
        width: 34, height: 20, borderRadius: 999,
        background: value ? 'var(--coral)' : 'var(--page-2)',
        position: 'relative',
        transition: 'background 160ms ease',
        boxShadow: value ? '0 0 0 2px rgba(217,119,87,0.18)' : 'inset 0 0 0 1px var(--hairline)',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 16 : 2,
          width: 16, height: 16, borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 2px rgba(42,29,58,0.18)',
          transition: 'left 160ms ease',
        }} />
      </span>
    </button>
  );
}

function PageSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)',
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 32px 10px 12px',
            border: '1px solid var(--hairline)',
            borderRadius: 12,
            background: 'var(--card)',
            color: 'var(--ink-1)',
            fontFamily: 'var(--ui)',
            fontSize: 13, fontWeight: 600,
            appearance: 'none',
            cursor: 'pointer',
          }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span aria-hidden style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11, pointerEvents: 'none',
        }}>▾</span>
      </div>
    </label>
  );
}

const PROGRESSIONS = {
  Ionian: [
    { id: 'pop',    name: 'I – V – vi – IV',    sub: 'pop · "Axis of Awesome"', degrees: [0, 4, 5, 3] },
    { id: 'jazz',   name: 'ii – V – I',         sub: 'jazz turnaround',         degrees: [1, 4, 0],   tag: 'authentic' },
    { id: 'doo',    name: 'I – vi – IV – V',    sub: '50s doo-wop',              degrees: [0, 5, 3, 4] },
    { id: 'pachel', name: 'I – V – vi – iii – IV – I – IV – V', sub: "Pachelbel", degrees: [0, 4, 5, 2, 3, 0, 3, 4] },
    { id: 'plagal', name: 'IV – I',             sub: 'plagal "amen" cadence',    degrees: [3, 0],      tag: 'plagal' },
  ],
  Lydian: [
    { id: 'lyd1', name: 'I – II – I',           sub: 'lydian shimmer',           degrees: [0, 1, 0] },
    { id: 'lyd2', name: 'I – V – II – I',       sub: 'open & bright',            degrees: [0, 4, 1, 0] },
    { id: 'lyd3', name: 'I – iii – II – I',     sub: 'floating cadence',         degrees: [0, 2, 1, 0] },
  ],
  Mixolydian: [
    { id: 'mix1', name: 'I – ♭VII – IV – I',    sub: 'rock / blues anthem',      degrees: [0, 6, 3, 0] },
    { id: 'mix2', name: 'I – v – ♭VII – IV',    sub: 'modal vamp',                degrees: [0, 4, 6, 3] },
    { id: 'mix3', name: '♭VII – IV – I',        sub: 'double-plagal cadence',     degrees: [6, 3, 0],   tag: 'modal' },
  ],
  Dorian: [
    { id: 'dor1', name: 'i – IV – i',           sub: 'dorian vamp',              degrees: [0, 3, 0] },
    { id: 'dor2', name: 'i – ♭VII – IV – i',    sub: '"So What" / "Oye Como Va"', degrees: [0, 6, 3, 0] },
    { id: 'dor3', name: 'i – ii – IV – i',      sub: 'modal turnaround',         degrees: [0, 1, 3, 0] },
  ],
  Aeolian: [
    { id: 'aeo1', name: 'i – ♭VI – ♭III – ♭VII', sub: 'epic minor',     degrees: [0, 5, 2, 6] },
    { id: 'aeo2', name: 'i – iv – v – i',        sub: 'natural minor',           degrees: [0, 3, 4, 0] },
    { id: 'aeo3', name: 'i – ♭VII – ♭VI – V*',   sub: 'andalusian (V is borrowed)', degrees: [0, 6, 5, 4] },
    { id: 'aeo4', name: 'i – ♭VI – ♭VII – i',    sub: 'aeolian cadence',  degrees: [0, 5, 6, 0] },
  ],
  Phrygian: [
    { id: 'phr1', name: 'i – ♭II – i',           sub: 'phrygian half-cadence',   degrees: [0, 1, 0] },
    { id: 'phr2', name: 'i – ♭II – ♭III – ♭II',  sub: 'flamenco flavour',  degrees: [0, 1, 2, 1] },
    { id: 'phr3', name: 'iv – ♭III – ♭II – i',   sub: 'descending phrygian', degrees: [3, 2, 1, 0] },
  ],
  Locrian: [
    { id: 'loc1', name: 'i° – ♭II – i°',         sub: 'unstable centre',          degrees: [0, 1, 0] },
    { id: 'loc2', name: 'i° – ♭v – ♭II – i°',    sub: 'locrian wander',           degrees: [0, 4, 1, 0] },
  ],
};

function ProgressionsCard({ tonic, mode, info, onPlay, embedded = false }) {
  const list = PROGRESSIONS[mode] || [];
  const [playing, setPlaying] = React.useState(null);
  const [step, setStep] = React.useState(-1);

  const posByDegree = React.useMemo(() => {
    const m = {};
    info.forEach((it, i) => { if (it.isDiatonic) m[it.degreeIdx] = i; });
    return m;
  }, [info]);

  const playProgression = React.useCallback(async (prog) => {
    phCapture('tool_progression_played', {
      id: prog.id,
      name: prog.name,
      degree_count: prog.degrees.length,
      tonic, mode,
    });
    setPlaying(prog.id);
    for (let i = 0; i < prog.degrees.length; i++) {
      setStep(i);
      const posIdx = posByDegree[prog.degrees[i]];
      if (posIdx != null) onPlay(posIdx, 'triad');
      await new Promise(r => setTimeout(r, 720));
    }
    setStep(-1);
    setPlaying(null);
  }, [onPlay, posByDegree, tonic, mode]);

  function chipFor(degreeIdx) {
    const it = info.find(x => x.degreeIdx === degreeIdx);
    if (!it) return { label: '?', tone: 'page-2', numeral: '?' };
    const tone = it.degreeIdx === 0 ? 'coral'
      : it.quality === 'major' ? 'butter'
      : it.quality === 'minor' ? 'lav'
      : it.quality === 'diminished' ? 'sky'
      : 'mint';
    const sym = it.label + (
      it.quality === 'minor' ? 'm' :
      it.quality === 'diminished' ? '°' :
      it.quality === 'augmented' ? '+' : ''
    );
    return { label: sym, tone, numeral: it.numeral };
  }

  const inner = (
    <>
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <h3 className="cof-h3" style={{ margin: 0 }}>Common progressions · <span className="cof-keyname">{tonic} {mode}</span></h3>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            click ▶ to play the loop
          </span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(prog => {
          const isPlaying = playing === prog.id;
          return (
            <div key={prog.id} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr', gap: 10,
              alignItems: 'center', padding: '8px 4px',
              borderTop: '1px solid var(--hairline)',
            }}>
              <button onClick={() => !playing && playProgression(prog)}
                disabled={!!playing && !isPlaying}
                title={`Play ${prog.name}`}
                style={{
                  width: 32, height: 32, borderRadius: 999,
                  border: 'none',
                  background: isPlaying ? 'var(--coral)' : 'var(--page-2)',
                  color: isPlaying ? '#fff' : 'var(--ink-2)',
                  cursor: playing ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                  transition: 'background 160ms ease',
                }}>
                {isPlaying ? '■' : '▶'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--disp)', fontWeight: 700, fontStyle: 'italic', fontSize: 14, color: 'var(--ink-1)' }}>
                    {prog.name}
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)' }}>
                    {prog.sub}
                  </span>
                  {prog.tag && (
                    <span style={{
                      fontFamily: 'var(--ui)', fontSize: 9.5, fontWeight: 700,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: 'var(--coral-ink)', background: 'var(--coral-soft)',
                      padding: '2px 8px', borderRadius: 999,
                    }}>{prog.tag} cadence</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {prog.degrees.map((deg, i) => {
                    const c = chipFor(deg);
                    const active = isPlaying && step === i;
                    return (
                      <button key={i}
                        onClick={() => {
                          const posIdx = posByDegree[deg];
                          if (posIdx != null) onPlay(posIdx, 'triad');
                        }}
                        style={{
                          padding: '4px 10px', borderRadius: 8,
                          background: active ? `var(--${c.tone})` : `var(--${c.tone}-soft)`,
                          color: active ? '#fff' : `var(--${c.tone}-ink)`,
                          border: '1px solid transparent',
                          fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 12.5,
                          cursor: 'pointer',
                          transform: active ? 'translateY(-1px)' : 'none',
                          transition: 'transform 120ms ease, background 160ms ease',
                          display: 'inline-flex', alignItems: 'baseline', gap: 6,
                        }}>
                        <span style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', fontSize: 11, opacity: 0.7 }}>{c.numeral}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)', padding: '8px 0' }}>
            No standard progressions catalogued for this mode yet.
          </div>
        )}
      </div>
    </>
  );

  if (embedded) return inner;
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--hairline)',
      borderRadius: 20,
      boxShadow: 'var(--sh-sm)',
      padding: '18px 20px',
      width: '100%',
      maxWidth: 640,
    }}>
      {inner}
    </div>
  );
}

function ViewToggle({ value, onChange }) {
  const opts = [
    { id: 'scales', label: 'Scales', sub: 'I · ii · iii · IV' },
    { id: 'intervals', label: 'Intervals', sub: 'P1 · M3 · P5' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
      padding: 4, background: 'var(--page-2)', borderRadius: 16,
    }}>
      {opts.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderRadius: 12,
              background: active ? 'var(--card)' : 'transparent',
              color: active ? 'var(--ink-1)' : 'var(--ink-2)',
              cursor: 'pointer',
              boxShadow: active ? 'var(--sh-sm)' : 'none',
              textAlign: 'center',
              fontFamily: 'var(--ui)',
            }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{o.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{o.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

function Readout({ tonic, mode, view, posIdx, lastKind }) {
  const info = useMemo(() => Theory.circleInfo(tonic, mode), [tonic, mode]);
  if (posIdx == null) {
    return (
      <div style={{ color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.55 }}>
        Hover any wedge to see the chord. Click to play the triad —
        {' '}<span style={{ fontFamily: 'var(--mono)', background: 'var(--page-2)', padding: '1px 6px', borderRadius: 4 }}>shift</span>+click for the seventh,
        {' '}<span style={{ fontFamily: 'var(--mono)', background: 'var(--page-2)', padding: '1px 6px', borderRadius: 4 }}>⌘</span>+click to set as tonic.
      </div>
    );
  }
  const item = info[posIdx];
  const tone = item.degreeIdx === 0 ? 'coral'
    : item.quality === 'major' ? 'butter'
    : item.quality === 'minor' ? 'lav'
    : item.quality === 'diminished' ? 'sky'
    : item.quality === 'augmented' ? 'mint' : 'soft';
  const fg = `var(--${tone}-ink, var(--ink-1))`;
  const bg = `var(--${tone}-soft, var(--page-2))`;

  const triadPcs = Theory.triadPCs(item.pc, item.quality);
  const seventhPcs = Theory.seventhPCs(item.pc, item.quality);
  const useFlat = item.label.includes('♭');
  const labelPcs = (pcs) => pcs.map(pc => (useFlat ? Theory.PC_FLAT : Theory.PC_SHARP)[pc]).join(' · ');

  const triadSym = item.label + (
    item.quality === 'minor' ? 'm' :
    item.quality === 'diminished' ? '°' :
    item.quality === 'augmented' ? '+' : ''
  );
  const seventhSym = item.label + (
    item.quality === 'major'      ? 'maj7' :
    item.quality === 'minor'      ? 'm7'   :
    item.quality === 'diminished' ? '°7'   :
    item.quality === 'augmented'  ? '+maj7': '7'
  );
  const seventhNumeral = item.numeral ? (
    item.quality === 'major'      ? item.numeral + 'M7'   :
    item.quality === 'minor'      ? item.numeral + '7'    :
    item.quality === 'diminished' ? item.numeral + '°7'   :
    item.quality === 'augmented'  ? item.numeral + '+M7'  : item.numeral + '7'
  ) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--disp)', fontSize: 36, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
          {item.label}{item.quality === 'minor' ? 'm' : item.quality === 'diminished' ? '°' : item.quality === 'augmented' ? '+' : ''}
        </span>
        <span style={{
          padding: '4px 10px', borderRadius: 999,
          background: bg, color: fg,
          fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          {item.isDiatonic ? `degree · ${item.numeral}` : 'chromatic'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 10, fontSize: 13, color: 'var(--ink-2)' }}>
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', alignSelf: 'start', paddingTop: 3 }}>quality</span>
        <span>{item.quality}</span>
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', alignSelf: 'start', paddingTop: 3 }}>interval</span>
        <span>{item.intervalName} <span style={{ color: 'var(--ink-3)' }}>· {item.intervalSt} semitones</span></span>
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', alignSelf: 'start', paddingTop: 3 }}>triad</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--disp)', fontWeight: 600, color: 'var(--ink-1)', fontSize: 15 }}>{triadSym}</span>
            {item.numeral && (
              <span style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 12 }}>{item.numeral}</span>
            )}
          </span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 12 }}>{labelPcs(triadPcs)}</span>
        </span>
        <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', alignSelf: 'start', paddingTop: 3 }}>seventh</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--disp)', fontWeight: 600, color: 'var(--ink-1)', fontSize: 15 }}>{seventhSym}</span>
            {seventhNumeral && (
              <span style={{ fontFamily: 'var(--disp)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 12 }}>{seventhNumeral}</span>
            )}
          </span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 12 }}>{labelPcs(seventhPcs)}</span>
        </span>
      </div>
      {lastKind && (
        <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--coral-ink)' }}>
          ▶ played {lastKind}
        </div>
      )}
    </div>
  );
}

function Legend() {
  const items = [
    { label: 'Tonic',       color: 'var(--coral)',  ink: '#fff' },
    { label: 'Major',       color: 'var(--butter)', ink: 'var(--butter-ink)' },
    { label: 'Minor',       color: 'var(--lav)',    ink: 'var(--lav-ink)' },
    { label: 'Diminished',  color: 'var(--sky)',    ink: 'var(--sky-ink)' },
    { label: 'Chromatic',   color: 'var(--page-2)', ink: 'var(--ink-3)' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map(it => (
        <div key={it.label} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px 4px 5px', borderRadius: 999,
          background: 'var(--card)', border: '1px solid var(--hairline)',
          fontFamily: 'var(--ui)', fontSize: 11, fontWeight: 600,
          color: 'var(--ink-2)', letterSpacing: '0.04em',
        }}>
          <span style={{ width: 14, height: 14, borderRadius: 99, background: it.color, display: 'inline-block' }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

function DiatonicList({ info, onPlay }) {
  const diatonic = info.filter(i => i.isDiatonic).sort((a, b) => a.degreeIdx - b.degreeIdx);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)',
        letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2,
      }}>
        click a chord to play · 7 plays the seventh
      </div>
      {diatonic.map(it => {
        const tone = it.degreeIdx === 0 ? 'coral'
          : it.quality === 'major' ? 'butter'
          : it.quality === 'minor' ? 'lav'
          : it.quality === 'diminished' ? 'sky'
          : 'mint';
        const triadSym = it.label + (
          it.quality === 'minor' ? 'm' :
          it.quality === 'diminished' ? '°' :
          it.quality === 'augmented' ? '+' : ''
        );
        return (
          <div key={it.degreeIdx} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'stretch', gap: 4,
          }}>
            <button onClick={() => onPlay(it.degreeIdx, 'triad')}
              title={`Play ${triadSym} triad`}
              style={{
                display: 'grid', gridTemplateColumns: '34px 1fr auto', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: `var(--${tone}-soft)`, color: 'var(--ink-1)',
                border: '1px solid transparent',
                fontFamily: 'var(--ui)', cursor: 'pointer', textAlign: 'left',
                transition: 'transform 120ms ease, border-color 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `var(--${tone})`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}>
              <span style={{
                fontFamily: 'var(--disp)', fontWeight: 700, fontStyle: 'italic',
                color: `var(--${tone}-ink)`, fontSize: 17,
              }}>{it.numeral}</span>
              <span style={{ fontFamily: 'var(--ui)', fontWeight: 600, fontSize: 14 }}>
                {triadSym}
              </span>
              <span aria-hidden style={{
                fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>▶ play</span>
            </button>
            <button onClick={() => onPlay(it.degreeIdx, 'seventh')}
              title={`Play ${triadSym}7 (seventh chord)`}
              style={{
                width: 44, padding: 0, borderRadius: 10,
                background: 'var(--card)', color: 'var(--ink-2)',
                border: '1px solid var(--hairline)',
                fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `var(--${tone})`; e.currentTarget.style.color = 'var(--ink-1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hairline)'; e.currentTarget.style.color = 'var(--ink-2)'; }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>+</span>
              <span>7</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

const TWEAK_DEFAULTS = {
  synth: 'triangle',
  showRelativeMinor: true,
  highlightOnly: false,
  palette: 'bold',
  compact: false,
};

function App() {
  const [tonic, setTonic] = useState('C');
  const [mode, setMode] = useState('Ionian');
  const [view, setView] = useState('scales');
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState(null);
  const [sticky, setSticky] = useState(null);
  const [lastKind, setLastKind] = useState(null);
  const [tweaks, setTweaksState] = useState(TWEAK_DEFAULTS);
  const setTweaks = useCallback((key, value) => {
    setTweaksState(prev => ({ ...prev, [key]: value }));
  }, []);

  const audio = useAudio();

  // Sync synth voice on change.
  useEffect(() => { audio.setSynth(tweaks.synth); }, [tweaks.synth, audio]);

  // Auto-detect compact (mobile) layout.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 720px)');
    const apply = () => setTweaksState(prev => ({ ...prev, compact: mq.matches }));
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else if (mq.removeListener) mq.removeListener(apply);
    };
  }, []);

  // Apply compact mode → set data attribute on <html>.
  useEffect(() => {
    if (tweaks.compact) document.documentElement.setAttribute('data-cof-view', 'compact');
    else document.documentElement.removeAttribute('data-cof-view');
  }, [tweaks.compact]);

  const info = useMemo(() => Theory.circleInfo(tonic, mode), [tonic, mode]);

  const [lastPlayedPc, setLastPlayedPc] = useState(null);

  useEffect(() => {
    setSticky(null); setActive(null); setHovered(null);
  }, [tonic, mode]);

  const handlePlay = useCallback((posIdx, kind) => {
    const item = info[posIdx];
    if (kind === 'tonic') {
      const useFlat = item.label.includes('♭');
      const targetName = TONIC_OPTS.find(n => Theory.tonicByName(n).pc === item.pc &&
        (useFlat ? n.includes('b') || !n.includes('#') : !n.includes('b')));
      const newTonic = targetName || TONIC_OPTS.find(n => Theory.tonicByName(n).pc === item.pc) || 'C';
      phCapture('tool_tonic_changed', { from: tonic, to: newTonic, mode, source: 'wedge_set_tonic' });
      setTonic(newTonic);
      return;
    }
    phCapture('tool_chord_clicked', {
      pc: item.pc,
      label: item.label,
      quality: item.quality,
      numeral: item.numeral,
      degree_idx: item.degreeIdx,
      is_diatonic: item.isDiatonic,
      kind: kind === 'seventh' ? 'seventh' : 'triad',
      tonic, mode, view,
    });
    setActive(posIdx);
    setSticky(posIdx);
    setLastKind(kind === 'seventh' ? '7th chord' : 'triad');
    const notes = Theory.buildChordNotes(item.pc, item.quality, kind);
    audio.play(notes, kind === 'seventh' ? '2n' : '4n');
    setTimeout(() => setActive(null), 700);
  }, [info, audio, tonic, mode, view]);

  const playSingleNote = useCallback((pc) => {
    setLastPlayedPc(pc);
    const useFlat = tonic.includes('b') || tonic.includes('♭');
    const noteName = (useFlat ? Theory.PC_FLAT : Theory.PC_SHARP)[pc];
    const t = Theory.tonicByName(tonic);
    const oct = (pc < t.pc) ? 5 : 4;
    const cleanName = noteName.replace('♯', '#').replace('♭', 'b');
    audio.play([cleanName + oct], '8n');
    setTimeout(() => setLastPlayedPc(null), 600);
  }, [audio, tonic]);

  const playChordByRoot = useCallback((rootPc, quality, kind = 'triad') => {
    const notes = Theory.buildChordNotes(rootPc, quality, kind);
    audio.play(notes, '4n');
  }, [audio]);

  // Tracked setters fire PostHog events when the value actually changes.
  // The `source` argument lets us segment events by interaction (picker / keyboard / related_key / wedge).
  const setTonicTracked = useCallback((next, source) => {
    if (next !== tonic) phCapture('tool_tonic_changed', { from: tonic, to: next, mode, source });
    setTonic(next);
  }, [tonic, mode]);
  const setModeTracked = useCallback((next, source) => {
    if (next !== mode) phCapture('tool_mode_changed', { from: mode, to: next, tonic, source });
    setMode(next);
  }, [tonic, mode]);
  const setViewTracked = useCallback((next, source) => {
    if (next !== view) phCapture('tool_view_changed', { from: view, to: next, tonic, mode, source });
    setView(next);
  }, [tonic, mode, view]);
  const setTweakTracked = useCallback((key, next) => {
    const prev = tweaks[key];
    if (prev !== next && (key === 'palette' || key === 'synth' || key === 'showRelativeMinor' || key === 'highlightOnly')) {
      phCapture('tool_setting_changed', { setting: key, from: prev, to: next, tonic, mode });
    }
    setTweaks(key, next);
  }, [tweaks, tonic, mode, setTweaks]);

  // Keyboard nav: arrow keys rotate tonic.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      const i = TONIC_OPTS.indexOf(tonic);
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        const next = TONIC_OPTS[Math.min(TONIC_OPTS.length - 1, i + 1)];
        if (next !== tonic) phCapture('tool_tonic_changed', { from: tonic, to: next, mode, source: 'keyboard' });
        setTonic(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        const next = TONIC_OPTS[Math.max(0, i - 1)];
        if (next !== tonic) phCapture('tool_tonic_changed', { from: tonic, to: next, mode, source: 'keyboard' });
        setTonic(next);
      } else if (/^[1-7]$/.test(e.key)) {
        const next = MODE_OPTS[parseInt(e.key) - 1];
        if (next !== mode) phCapture('tool_mode_changed', { from: mode, to: next, tonic, source: 'keyboard' });
        setMode(next);
      } else if (e.key === 'v' || e.key === 'V') {
        const next = view === 'scales' ? 'intervals' : 'scales';
        phCapture('tool_view_changed', { from: view, to: next, tonic, mode, source: 'keyboard' });
        setView(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tonic, mode, view]);

  const focusedPos = hovered ?? active ?? sticky;

  return (
    <div className="cof-page">
      <div className="cof-tool-strip">
        <h1>Circle of <em>Fifths</em> — interactive wheel with sound</h1>
        <span className="cof-eyebrow">
          <kbd>←</kbd> <kbd>→</kbd> tonic · <kbd>1–7</kbd> mode · <kbd>v</kbd> view
        </span>
      </div>

      <div className="cof-grid">
        <aside className="cof-rail cof-rail-left">
          <MaybeCollapsible compact={tweaks.compact} title="Tonic"
                            summary={tweaks.compact ? Theory.tonicByName(tonic).display : null}
                            defaultOpen={true}>
            <TonicPicker value={tonic} onChange={(v) => setTonicTracked(v, 'picker')} />
          </MaybeCollapsible>

          <MaybeCollapsible compact={tweaks.compact} title="Mode"
                            summary={tweaks.compact ? mode : null}
                            defaultOpen={true}>
            <ModePicker value={mode} onChange={(v) => setModeTracked(v, 'picker')} />
          </MaybeCollapsible>

          {!tweaks.compact && (
            <>
              <section className="cof-card">
                <h3 className="cof-h3">Display</h3>
                <ViewToggle value={view} onChange={(v) => setViewTracked(v, 'toggle')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <PageSwitch
                    label="Show relative minor"
                    hint="middle ring · italic minors"
                    value={tweaks.showRelativeMinor}
                    onChange={(v) => setTweakTracked('showRelativeMinor', v)}
                  />
                  <PageSwitch
                    label="Dim non-diatonic"
                    hint="fade chords outside the key"
                    value={tweaks.highlightOnly}
                    onChange={(v) => setTweakTracked('highlightOnly', v)}
                  />
                </div>
              </section>

              <section className="cof-card">
                <h3 className="cof-h3">Sound</h3>
                <PageSelect
                  label="Synth voice"
                  value={tweaks.synth}
                  onChange={(v) => setTweakTracked('synth', v)}
                  options={[
                    { value: 'triangle', label: 'Triangle (warm)' },
                    { value: 'sine',     label: 'Sine (pure)' },
                    { value: 'square',   label: 'Square (bright)' },
                    { value: 'sawtooth', label: 'Sawtooth (rich)' },
                  ]}
                />
                <div style={{ marginTop: 12 }}>
                  <PageSelect
                    label="Palette"
                    value={tweaks.palette}
                    onChange={(v) => setTweakTracked('palette', v)}
                    options={[
                      { value: 'pastel',  label: 'Pastel' },
                      { value: 'vibrant', label: 'Vibrant' },
                      { value: 'bold',    label: 'Bold' },
                    ]}
                  />
                </div>
              </section>
            </>
          )}
        </aside>

        <main className="cof-stage">
          <div className="cof-stage-inner">
            <CircleSVG
              tonic={tonic}
              mode={mode}
              view={view}
              palette={tweaks.palette}
              showRelativeMinor={tweaks.showRelativeMinor}
              highlightOnly={tweaks.highlightOnly}
              hovered={hovered}
              active={active}
              onHover={(idx) => { setHovered(idx); if (idx != null) setSticky(idx); }}
              onLeave={() => setHovered(null)}
              onPlay={handlePlay}
              size={620}
            />
            <KeySignatureCard tonic={tonic} mode={mode} />
          </div>
          <div className="cof-legend">
            <Legend />
          </div>
          {!tweaks.compact && (
            <>
              <ProgressionsCard
                tonic={tonic}
                mode={mode}
                info={info}
                onPlay={handlePlay}
              />
              <NextStepsCard
                tonic={tonic}
                mode={mode}
                onSetTonic={(newTonic, newMode) => {
                  if (TONIC_OPTS.includes(newTonic)) setTonicTracked(newTonic, 'related_key');
                  if (newMode) setModeTracked(newMode, 'related_key');
                }}
                onPlayChord={(rootPc, quality) => {
                  phCapture('tool_chord_clicked', { pc: rootPc, quality, kind: 'triad', tonic, mode, source: 'borrowed_chord' });
                  playChordByRoot(rootPc, quality, 'triad');
                }}
              />
            </>
          )}
        </main>

        <aside className="cof-rail cof-rail-right">
          {tweaks.compact ? (
            <CollapsibleCard title="Now reading" defaultOpen={true}>
              <Readout
                tonic={tonic}
                mode={mode}
                view={view}
                posIdx={focusedPos}
                lastKind={focusedPos === active ? lastKind : null}
              />
            </CollapsibleCard>
          ) : (
            <section className="cof-card cof-card--readout">
              <h3 className="cof-h3">Now reading</h3>
              <Readout
                tonic={tonic}
                mode={mode}
                view={view}
                posIdx={focusedPos}
                lastKind={focusedPos === active ? lastKind : null}
              />
            </section>
          )}

          {tweaks.compact && (
            <>
              <CollapsibleCard title="Display" summary={view === 'scales' ? 'Scales' : 'Intervals'} defaultOpen={false}>
                <ViewToggle value={view} onChange={(v) => setViewTracked(v, 'toggle')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <PageSwitch label="Show relative minor" hint="middle ring · italic minors"
                    value={tweaks.showRelativeMinor} onChange={(v) => setTweakTracked('showRelativeMinor', v)} />
                  <PageSwitch label="Dim non-diatonic" hint="fade chords outside the key"
                    value={tweaks.highlightOnly} onChange={(v) => setTweakTracked('highlightOnly', v)} />
                </div>
              </CollapsibleCard>

              <CollapsibleCard title="Sound" summary={tweaks.synth} defaultOpen={false}>
                <PageSelect label="Synth voice" value={tweaks.synth} onChange={(v) => setTweakTracked('synth', v)}
                  options={[
                    { value: 'triangle', label: 'Triangle (warm)' },
                    { value: 'sine',     label: 'Sine (pure)' },
                    { value: 'square',   label: 'Square (bright)' },
                    { value: 'sawtooth', label: 'Sawtooth (rich)' },
                  ]} />
              </CollapsibleCard>
            </>
          )}

          <MaybeCollapsible compact={tweaks.compact}
                            title={<>Diatonic chords · <span className="cof-keyname">{tonic} {mode}</span></>}
                            defaultOpen={!tweaks.compact}>
            <DiatonicList info={info} onPlay={(idx, kind) => {
              const posIdx = info.findIndex(it => it.degreeIdx === idx);
              handlePlay(posIdx, kind);
            }} />
          </MaybeCollapsible>

          <MaybeCollapsible compact={tweaks.compact} title="Resolves to" defaultOpen={!tweaks.compact}>
            <VoiceLeadingCard
              tonic={tonic}
              mode={mode}
              info={info}
              focusedPos={focusedPos}
              onPlayChord={(pc, quality) => playChordByRoot(pc, quality, 'triad')}
            />
          </MaybeCollapsible>

          <MaybeCollapsible compact={tweaks.compact} title="Scale notes" defaultOpen={!tweaks.compact}>
            <ScaleNotesStrip tonic={tonic} mode={mode} onPlayNote={playSingleNote} />
          </MaybeCollapsible>

          {tweaks.compact && (
            <>
              <CollapsibleCard title="Common progressions" summary={mode} defaultOpen={false}>
                <ProgressionsCard tonic={tonic} mode={mode} info={info} onPlay={handlePlay} embedded />
              </CollapsibleCard>

              <CollapsibleCard title="Where to go next" summary="modulation & colour" defaultOpen={false}>
                <NextStepsCard
                  tonic={tonic}
                  mode={mode}
                  onSetTonic={(newTonic, newMode) => {
                    if (TONIC_OPTS.includes(newTonic)) setTonicTracked(newTonic, 'related_key');
                    if (newMode) setModeTracked(newMode, 'related_key');
                  }}
                  onPlayChord={(rootPc, quality) => {
                    phCapture('tool_chord_clicked', { pc: rootPc, quality, kind: 'triad', tonic, mode, source: 'borrowed_chord' });
                    playChordByRoot(rootPc, quality, 'triad');
                  }}
                  embedded
                />
              </CollapsibleCard>
            </>
          )}
        </aside>
      </div>

      <div className="cof-piano-wrap" style={{ marginTop: 22, maxWidth: 1480 }}>
        <section className="cof-card">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h3 className="cof-h3" style={{ margin: 0 }}>Keyboard · <span className="cof-keyname">{tonic} {mode}</span></h3>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              tonic in coral · scale notes shaded
            </span>
          </div>
          <PianoKeyboard tonic={tonic} mode={mode} onPlayNote={playSingleNote} lastPlayedPc={lastPlayedPc} />
        </section>
      </div>

      <div className="cof-foot">
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
          tap a wedge → triad · shift+tap → 7th · ⌘+tap → set as tonic
        </span>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
