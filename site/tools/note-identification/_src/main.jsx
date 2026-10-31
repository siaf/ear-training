// Note identification — fifths.io/tools/note-identification/
// Build: esbuild bundles this + theory.js into ../note-identification.js
// (see the build:tool:notes script). React, ReactDOM and Tone are UMD globals.
/* global React, ReactDOM, Tone */
import {
  LETTERS, CLEFS, RANGES, buildPool, pickQuestion, ledgerLines, noteLabel,
  noteMidi, midiToFreq, appUrl,
} from './theory.js';

const { useState, useEffect, useRef, useCallback, useMemo } = React;

const ROUND_LENGTH = 20;
const ACC_GLYPH = { '-1': '♭', '0': '', '1': '♯' };

// Same guard as the circle-of-fifths tool: no-op if PostHog is blocked.
function phCapture(event, props) {
  try {
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, props || {});
    }
  } catch (_) { /* swallow */ }
}

// ---- Audio (same Tone.js PolySynth + limiter approach as circle-of-fifths) ----
function useAudio() {
  const synthRef = useRef(null);
  const ensure = useCallback(async () => {
    if (synthRef.current) return synthRef.current;
    await Tone.start(); // must run inside a user gesture on iOS
    const limiter = new Tone.Limiter(-1).toDestination();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.35, release: 0.9 },
      volume: -6,
    }).connect(limiter);
    synthRef.current = synth;
    return synth;
  }, []);
  const playNote = useCallback(async (note) => {
    try {
      const s = await ensure();
      s.releaseAll();
      s.triggerAttackRelease(midiToFreq(noteMidi(note)), 0.9, Tone.now() + 0.02);
    } catch (_) { /* audio unavailable — UI still works */ }
  }, [ensure]);
  return { playNote };
}

// ---- Staff SVG ---------------------------------------------------------
// Units: line gap = 10. Bottom line at y = 40, top line at y = 0.
// Staff position p (0 = bottom line, 8 = top line) → y = 40 - 5p.
const yFor = (p) => 40 - p * 5;
const NOTE_X = 118;

function TrebleClef({ color }) {
  // Hand-drawn G clef: the spiral curls around the G line (p = 2, y = 30).
  return (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <path strokeWidth="2.3" d="M 17.5 47 L 15.2 -6 C 14.8 -15, 22.5 -19, 22.8 -10 C 23 -2, 7 10, 6.5 27 C 6 39, 22 43, 25 33 C 27.5 25, 21 20.5, 15.5 22.5 C 10.5 24.5, 11 32, 16.5 33" />
      <path strokeWidth="2.1" d="M 17.5 47 C 18 53.5, 11.5 55, 9.5 51.5" />
      <circle cx="10.5" cy="50.5" r="2.8" fill={color} stroke="none" />
    </g>
  );
}

function BassClef({ color }) {
  // F clef: the head and the two dots straddle the F line (p = 6, y = 10).
  return (
    <g fill={color} stroke={color} strokeLinecap="round">
      <circle cx="9" cy="10" r="3.4" stroke="none" />
      <path fill="none" strokeWidth="2.4" d="M 6.2 9 C 6 1.5, 21 -1.5, 23.5 8 C 26 18, 17 30, 5 37" />
      <circle cx="29.5" cy="5" r="1.7" stroke="none" />
      <circle cx="29.5" cy="15" r="1.7" stroke="none" />
    </g>
  );
}

function Sharp({ cx, cy, color }) {
  return (
    <g stroke={color} strokeLinecap="round">
      <line x1={cx - 2} y1={cy - 8} x2={cx - 2} y2={cy + 7} strokeWidth="1.3" />
      <line x1={cx + 2} y1={cy - 7} x2={cx + 2} y2={cy + 8} strokeWidth="1.3" />
      <line x1={cx - 4.5} y1={cy - 1.4} x2={cx + 4.5} y2={cy - 3.6} strokeWidth="2.6" />
      <line x1={cx - 4.5} y1={cy + 3.6} x2={cx + 4.5} y2={cy + 1.4} strokeWidth="2.6" />
    </g>
  );
}

function Flat({ cx, cy, color }) {
  const x = cx - 2.5;
  return (
    <g stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <line x1={x} y1={cy - 12} x2={x} y2={cy + 4} strokeWidth="1.4" />
      <path d={`M ${x} ${cy + 4} C ${x + 8} ${cy - 1}, ${x + 7} ${cy - 6.5}, ${x} ${cy - 1.5}`} fill="none" strokeWidth="2" />
    </g>
  );
}

function Staff({ clef, q, status }) {
  const ink = 'var(--ink-1)';
  const noteColor = status === 'correct' ? 'var(--mint-ink)' : status === 'wrong' ? 'var(--coral-ink)' : ink;
  const p = q.p;
  const cy = yFor(p);
  const stemUp = p < 4;
  return (
    <svg className="ni-staff" viewBox="0 -38 180 116" role="img"
      aria-label={`${CLEFS[clef].label} clef staff with one note. Name the note.`}>
      {[0, 2, 4, 6, 8].map((lp) => (
        <line key={lp} x1="2" y1={yFor(lp)} x2="178" y2={yFor(lp)} stroke="var(--ink-3)" strokeWidth="1" />
      ))}
      <line x1="2" y1="0" x2="2" y2="40" stroke="var(--ink-3)" strokeWidth="1" />
      {clef === 'treble' ? <TrebleClef color={ink} /> : <BassClef color={ink} />}
      {ledgerLines(p).map((lp) => (
        <line key={lp} x1={NOTE_X - 11} y1={yFor(lp)} x2={NOTE_X + 11} y2={yFor(lp)} stroke="var(--ink-2)" strokeWidth="1.2" />
      ))}
      {q.note.acc === 1 && <Sharp cx={NOTE_X - 16} cy={cy} color={noteColor} />}
      {q.note.acc === -1 && <Flat cx={NOTE_X - 15} cy={cy} color={noteColor} />}
      <ellipse cx={NOTE_X} cy={cy} rx="6" ry="4.3" fill={noteColor} transform={`rotate(-20 ${NOTE_X} ${cy})`} />
      {stemUp
        ? <line x1={NOTE_X + 5.5} y1={cy - 1} x2={NOTE_X + 5.5} y2={cy - 35} stroke={noteColor} strokeWidth="1.4" />
        : <line x1={NOTE_X - 5.5} y1={cy + 1} x2={NOTE_X - 5.5} y2={cy + 35} stroke={noteColor} strokeWidth="1.4" />}
    </svg>
  );
}

// A short reading hint shown after a miss.
function hintFor(q) {
  const p = q.p;
  const lines = q.clef === 'treble' ? 'E G B D F' : 'G B D F A';
  const spaces = q.clef === 'treble' ? 'F A C E' : 'A C E G';
  const clefName = CLEFS[q.clef].label.toLowerCase();
  if (p >= 0 && p <= 8 && p % 2 === 0) return `It's on a line. ${CLEFS[q.clef].label}-clef lines, bottom to top: ${lines}.`;
  if (p >= 1 && p <= 7) return `It's in a space. ${CLEFS[q.clef].label}-clef spaces, bottom to top: ${spaces}.`;
  if (p === -1) return `Just below the ${clefName} staff — one step down from the bottom line (${q.clef === 'treble' ? 'E' : 'G'}).`;
  if (p === 9) return `Just above the ${clefName} staff — one step up from the top line (${q.clef === 'treble' ? 'F' : 'A'}).`;
  if (p === -2 && q.clef === 'treble') return 'One ledger line below the treble staff is middle C.';
  if (p === 10 && q.clef === 'bass') return 'One ledger line above the bass staff is middle C.';
  return p < 0 ? 'Ledger lines: count down line, space, line from the bottom of the staff.' : 'Ledger lines: count up line, space, line from the top of the staff.';
}

// ---- Settings ----------------------------------------------------------
function Seg({ label, value, options, onChange }) {
  return (
    <fieldset className="ni-field">
      <legend>{label}</legend>
      <div className="ni-seg" role="radiogroup" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map(([key, text]) => (
          <button key={key} type="button" role="radio" aria-checked={value === key}
            className={'ni-chip' + (value === key ? ' is-on' : '')} onClick={() => onChange(key)}>
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SettingsPanel({ settings, onChange }) {
  return (
    <div className="ni-settings">
      <Seg label="Clef" value={settings.clef}
        options={[['treble', 'Treble'], ['bass', 'Bass'], ['both', 'Both']]}
        onChange={(clef) => onChange({ ...settings, clef })} />
      <Seg label="Range" value={settings.range}
        options={[['staff', 'On the staff'], ['ledger', '+ Ledger lines']]}
        onChange={(range) => onChange({ ...settings, range })} />
      <Seg label="Accidentals" value={settings.accidentals ? 'on' : 'off'}
        options={[['off', 'Off'], ['on', '♯ / ♭ on']]}
        onChange={(v) => onChange({ ...settings, accidentals: v === 'on' })} />
    </div>
  );
}

// ---- Round summary -----------------------------------------------------
function RoundEnd({ results, bestStreak, settings, onAgain }) {
  const score = results.filter((r) => r.correct).length;
  const missedMap = {};
  results.filter((r) => !r.correct).forEach((r) => {
    const k = r.label + ' (' + CLEFS[r.clef].label.toLowerCase() + ')';
    missedMap[k] = (missedMap[k] || 0) + 1;
  });
  const missed = Object.entries(missedMap).sort((a, b) => b[1] - a[1]);
  const byClef = ['treble', 'bass'].map((c) => {
    const rs = results.filter((r) => r.clef === c);
    return { c, n: rs.length, ok: rs.filter((r) => r.correct).length };
  }).filter((x) => x.n > 0);
  const headline = score === ROUND_LENGTH ? 'Perfect round.' : score >= 16 ? 'Strong reading.' : score >= 10 ? 'Solid progress.' : 'Good first pass.';

  return (
    <div className="ni-end">
      <p className="ni-eyebrow">Round complete</p>
      <div className="ni-end-score">
        <span className="ni-end-num">{score}</span><span className="ni-end-of">/ {ROUND_LENGTH}</span>
      </div>
      <p className="ni-end-head">{headline} Best streak: {bestStreak}.</p>
      {settings.clef === 'both' && (
        <p className="ni-end-line">
          {byClef.map((x) => `${CLEFS[x.c].label}: ${x.ok}/${x.n}`).join(' · ')}
        </p>
      )}
      {missed.length > 0
        ? (
          <div className="ni-missed">
            <p className="ni-eyebrow">Notes to review</p>
            <ul>{missed.map(([k, n]) => <li key={k}>{k}{n > 1 ? ` ×${n}` : ''}</li>)}</ul>
          </div>
        )
        : <p className="ni-end-line">No misses this round. Try adding ledger lines or accidentals.</p>}

      <div className="ni-cta">
        <h3>Now train your ear to hear notes, not just read them</h3>
        <p>Reading tells you what a note is called. Ear training tells you what it sounds like. Fifths starts with telling higher from lower and builds up to intervals, scale degrees and melodies, adapting to what you miss.</p>
        <a className="btn btn-coral ni-cta-btn" href={appUrl('round-end')} data-ph-track data-ph-cta="tool-result">
          Start ear training in Fifths →
        </a>
      </div>

      <div className="ni-row ni-row--center">
        <button type="button" className="btn btn-soft" onClick={onAgain}>Play another round</button>
      </div>
    </div>
  );
}

// ---- App ---------------------------------------------------------------
function App() {
  const audio = useAudio();
  const [settings, setSettings] = useState({ clef: 'treble', range: 'staff', accidentals: false });
  const pool = useMemo(() => buildPool(settings.clef, settings.range, settings.accidentals), [settings]);
  const [q, setQ] = useState(() => pickQuestion(buildPool('treble', 'staff', false)));
  const [phase, setPhase] = useState('question'); // question | feedback | end
  const [picked, setPicked] = useState(null);
  const [accSel, setAccSel] = useState(0);
  const [results, setResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const next = useCallback((resultsNow) => {
    clearTimeout(timerRef.current);
    if ((resultsNow || results).length >= ROUND_LENGTH) { setPhase('end'); return; }
    setQ((prev) => pickQuestion(pool, Math.random, prev));
    setPicked(null);
    setAccSel(0);
    setPhase('question');
  }, [pool, results]);

  const restart = useCallback((nextPool) => {
    clearTimeout(timerRef.current);
    setResults([]);
    setPicked(null);
    setAccSel(0);
    setQ(pickQuestion(nextPool || pool));
    setPhase('question');
  }, [pool]);

  const changeSettings = useCallback((s) => {
    setSettings(s);
    restart(buildPool(s.clef, s.range, s.accidentals));
  }, [restart]);

  const answer = useCallback((letter) => {
    if (phase !== 'question') return;
    const acc = settings.accidentals ? accSel : 0;
    const correct = letter === q.note.letter && acc === q.note.acc;
    audio.playNote(q.note);
    const label = noteLabel(q.note);
    const nextResults = [...results, { label, clef: q.clef, correct }];
    setResults(nextResults);
    setPicked({ letter, acc });
    setPhase('feedback');
    const ns = correct ? streak + 1 : 0;
    setStreak(ns);
    setBestStreak((b) => Math.max(b, ns));
    phCapture('tool_note_answered', {
      note: label,
      clef: q.clef,
      correct,
      answer: LETTERS[letter] + ACC_GLYPH[String(acc)],
      ledger: q.p < -1 || q.p > 9,
      accidentals: settings.accidentals,
    });
    if (nextResults.length === ROUND_LENGTH) {
      phCapture('tool_note_round_completed', {
        score: nextResults.filter((r) => r.correct).length,
        clef: settings.clef,
        range: settings.range,
        accidentals: settings.accidentals,
      });
    }
    if (correct) timerRef.current = setTimeout(() => next(nextResults), 750);
  }, [phase, settings, accSel, q, audio, results, streak, next]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toUpperCase();
      const i = LETTERS.indexOf(k);
      if (i >= 0 && phase === 'question') { e.preventDefault(); answer(i); }
      else if ((e.key === 'Enter' || e.key === 'ArrowRight') && phase === 'feedback') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, answer, next]);

  const score = results.filter((r) => r.correct).length;
  const isRight = phase === 'feedback' && picked && picked.letter === q.note.letter && picked.acc === q.note.acc;
  const status = phase === 'feedback' ? (isRight ? 'correct' : 'wrong') : 'pending';
  const qNum = Math.min(results.length + (phase === 'question' ? 1 : 0), ROUND_LENGTH);

  if (phase === 'end') {
    return (
      <div className="ni-card">
        <RoundEnd results={results} bestStreak={bestStreak} settings={settings} onAgain={() => restart()} />
      </div>
    );
  }

  return (
    <div className="ni-app">
      <div className="ni-card">
        <div className="ni-status">
          <span>Note <strong>{qNum}</strong> / {ROUND_LENGTH}</span>
          <span>Score <strong>{score}</strong></span>
          <span>Streak <strong>{streak}</strong>{bestStreak > 0 && <span className="ni-muted"> · best {bestStreak}</span>}</span>
        </div>
        <div className="ni-progress" aria-hidden="true">
          <span style={{ width: (results.length / ROUND_LENGTH) * 100 + '%' }} />
        </div>

        <div className="ni-staff-wrap">
          <span className="ni-clef-tag">{CLEFS[q.clef].label} clef</span>
          <Staff clef={q.clef} q={q} status={status} />
        </div>

        <div className="ni-feedback-slot" role="status" aria-live="polite">
          {phase === 'question' && <p className="ni-prompt">What note is this?</p>}
          {phase === 'feedback' && isRight && <p className="ni-fb ni-fb--ok">✓ {noteLabel(q.note)}</p>}
          {phase === 'feedback' && !isRight && (
            <div className="ni-fb ni-fb--no">
              <p><strong>That's {noteLabel(q.note)}</strong> — you picked {LETTERS[picked.letter]}{ACC_GLYPH[String(picked.acc)]}.</p>
              <p className="ni-hint">{hintFor(q)}</p>
            </div>
          )}
        </div>

        {settings.accidentals && (
          <div className="ni-acc" role="radiogroup" aria-label="Accidental">
            {[[-1, '♭ flat'], [0, '♮ natural'], [1, '♯ sharp']].map(([a, t]) => (
              <button key={a} type="button" role="radio" aria-checked={accSel === a}
                className={'ni-chip' + (accSel === a ? ' is-on' : '')}
                onClick={() => setAccSel(a)} disabled={phase !== 'question'}>{t}</button>
            ))}
          </div>
        )}

        <div className="ni-letters">
          {LETTERS.map((L, i) => {
            let cls = 'ni-letter';
            if (phase === 'feedback') {
              if (i === q.note.letter) cls += ' is-correct';
              else if (picked && i === picked.letter) cls += ' is-wrong';
            }
            return (
              <button key={L} type="button" className={cls} onClick={() => answer(i)} disabled={phase !== 'question'}>
                {L}{settings.accidentals && accSel !== 0 && phase === 'question' ? ACC_GLYPH[String(accSel)] : ''}
              </button>
            );
          })}
        </div>

        {phase === 'feedback' && !isRight && (
          <div className="ni-row">
            <button type="button" className="btn btn-soft btn-sm" onClick={() => audio.playNote(q.note)}>🔊 Hear it again</button>
            <button type="button" className="btn btn-coral ni-next" onClick={() => next()}>
              {results.length >= ROUND_LENGTH ? 'See round results →' : 'Next →'}
            </button>
          </div>
        )}
        <p className="ni-kbd-hint">Keyboard: press A–G to answer, Enter for next.</p>
      </div>

      <div className="ni-card ni-card--settings">
        <SettingsPanel settings={settings} onChange={changeSettings} />
        <p className="ni-hint">Changing a setting starts a new round.</p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
