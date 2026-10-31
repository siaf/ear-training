// Interval ear trainer — fifths.io/tools/interval-ear-trainer/
// Build: esbuild bundles this + theory.js into ../interval-ear-trainer.js
// (see the build:tool:intervals script). React, ReactDOM and Tone are UMD globals.
/* global React, ReactDOM, Tone */
import {
  INTERVALS, PRESETS, DIRECTIONS, intervalBySemitones, lessonIdFor, appUrl,
  makeQuestion, spellInterval, noteLabel, noteMidi, midiToFreq,
} from './theory.js';

const { useState, useEffect, useRef, useCallback, useMemo } = React;

const ROUND_LENGTH = 10;

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
      volume: -8,
    }).connect(limiter);
    synthRef.current = synth;
    return synth;
  }, []);

  // mode: 'harm' plays both notes together; 'asc' / 'desc' plays first then second.
  const playPair = useCallback(async (first, second, mode) => {
    try {
      const s = await ensure();
      s.releaseAll();
      const t = Tone.now() + 0.05;
      const a = midiToFreq(noteMidi(first));
      const b = midiToFreq(noteMidi(second));
      if (mode === 'harm') {
        s.triggerAttackRelease([a, b], 1.5, t);
      } else {
        s.triggerAttackRelease(a, 0.75, t);
        s.triggerAttackRelease(b, 1.0, t + 0.8);
      }
    } catch (_) { /* audio unavailable — UI still works */ }
  }, [ensure]);

  return { playPair };
}

function emptyStats() {
  const o = {};
  INTERVALS.forEach((i) => { o[i.st] = { asked: 0, correct: 0 }; });
  return o;
}

function pct(c, a) { return a ? Math.round((c / a) * 100) : 0; }

// ---- Settings ----------------------------------------------------------
function SettingsPanel({ settings, onChange }) {
  const { preset, custom, direction, randomRoot } = settings;
  const toggleCustom = (st) => {
    const has = custom.includes(st);
    if (has && custom.length <= 2) return; // need at least two to choose between
    const next = has ? custom.filter((s) => s !== st) : [...custom, st].sort((a, b) => a - b);
    onChange({ ...settings, preset: 'custom', custom: next });
  };
  return (
    <div className="it-settings">
      <fieldset className="it-field">
        <legend>Intervals</legend>
        <div className="it-seg it-seg--wrap" role="radiogroup" aria-label="Interval set">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} type="button" role="radio" aria-checked={preset === key}
              className={'it-chip' + (preset === key ? ' is-on' : '')}
              onClick={() => onChange({ ...settings, preset: key })}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="it-checks">
            {INTERVALS.map((i) => (
              <label key={i.st} className={'it-check' + (custom.includes(i.st) ? ' is-on' : '')}>
                <input type="checkbox" checked={custom.includes(i.st)} onChange={() => toggleCustom(i.st)} />
                <span className="it-check-short">{i.short}</span>
                <span className="it-check-name">{i.name}</span>
              </label>
            ))}
            <p className="it-hint">Pick at least two.</p>
          </div>
        )}
      </fieldset>
      <fieldset className="it-field">
        <legend>Direction</legend>
        <div className="it-seg" role="radiogroup" aria-label="Direction">
          {Object.entries(DIRECTIONS).map(([key, d]) => (
            <button key={key} type="button" role="radio" aria-checked={direction === key}
              className={'it-chip' + (direction === key ? ' is-on' : '')}
              onClick={() => onChange({ ...settings, direction: key })}>
              {d.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="it-toggle">
        <input type="checkbox" checked={randomRoot} onChange={(e) => onChange({ ...settings, randomRoot: e.target.checked })} />
        <span>Random starting note <em>{randomRoot ? '(any key)' : '(always C)'}</em></span>
      </label>
    </div>
  );
}

// ---- Round summary -----------------------------------------------------
function RoundEnd({ results, settings, bestStreak, sessionStats, onAgain, onSettings }) {
  const score = results.filter((r) => r.correct).length;
  const lessonId = lessonIdFor(settings.preset, settings.direction);
  const byInterval = {};
  results.forEach((r) => {
    byInterval[r.semis] = byInterval[r.semis] || { asked: 0, correct: 0 };
    byInterval[r.semis].asked++;
    if (r.correct) byInterval[r.semis].correct++;
  });
  const rows = INTERVALS.filter((i) => byInterval[i.st]);
  const missed = rows
    .map((i) => ({ i, miss: byInterval[i.st].asked - byInterval[i.st].correct }))
    .filter((x) => x.miss > 0)
    .sort((a, b) => b.miss - a.miss);
  const headline = score === ROUND_LENGTH ? 'Perfect round.' : score >= 8 ? 'Strong round.' : score >= 5 ? 'Solid start.' : 'Good first pass.';

  return (
    <div className="it-end">
      <p className="it-eyebrow">Round complete</p>
      <div className="it-end-score">
        <span className="it-end-num">{score}</span><span className="it-end-of">/ {ROUND_LENGTH}</span>
      </div>
      <p className="it-end-head">{headline} Best streak: {bestStreak}.</p>

      <table className="it-table">
        <thead><tr><th>Interval</th><th>This round</th><th>Session</th></tr></thead>
        <tbody>
          {rows.map((i) => {
            const r = byInterval[i.st];
            const s = sessionStats[i.st];
            return (
              <tr key={i.st}>
                <td><strong>{i.short}</strong> <span className="it-muted">{i.name}</span></td>
                <td>
                  <span className={'it-bar'}><span style={{ width: pct(r.correct, r.asked) + '%' }} /></span>
                  {r.correct}/{r.asked}
                </td>
                <td className="it-muted">{pct(s.correct, s.asked)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="it-cta">
        <h3>Keep training — Fifths adapts to the intervals you miss</h3>
        <p>
          {missed.length
            ? <>This round, <strong>{missed[0].i.name.toLowerCase()}</strong> tripped you up most. </>
            : <>Nothing missed this round. </>}
          The Fifths app tracks every answer and keeps bringing back the intervals you get wrong, inside a full course that also covers scale degrees, chords and melody.
        </p>
        <a className="btn btn-coral it-cta-btn" href={appUrl(lessonId, 'round-end')}
          data-ph-track data-ph-cta="tool-result">
          Keep training in Fifths →
        </a>
      </div>

      <div className="it-row it-row--center">
        <button type="button" className="btn btn-soft" onClick={onAgain}>Play another round</button>
        <button type="button" className="btn-link it-linkbtn" onClick={onSettings}>Change settings</button>
      </div>
    </div>
  );
}

// ---- App ---------------------------------------------------------------
function App() {
  const audio = useAudio();
  const [settings, setSettings] = useState({ preset: 'fourths_fifths', custom: [3, 4, 5, 7], direction: 'asc', randomRoot: true });
  const [phase, setPhase] = useState('setup'); // setup | question | feedback | end
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]); // this round
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionStats, setSessionStats] = useState(emptyStats);
  const [showSettings, setShowSettings] = useState(false);

  const pool = useMemo(
    () => (settings.preset === 'custom' ? settings.custom : PRESETS[settings.preset].semis),
    [settings]
  );

  const nextQuestion = useCallback((prev) => {
    const nq = makeQuestion(pool, settings.direction, settings.randomRoot, Math.random, prev ? prev.semis : null);
    setQ(nq);
    setPicked(null);
    setPhase('question');
    audio.playPair(nq.first, nq.second, nq.direction);
  }, [pool, settings, audio]);

  const startRound = useCallback(() => {
    setResults([]);
    setShowSettings(false);
    nextQuestion(null);
  }, [nextQuestion]);

  const changeSettings = useCallback((next) => {
    setSettings(next);
    // A settings change starts a fresh round so the score and CTA match.
    if (phase !== 'setup') { setPhase('setup'); setResults([]); setQ(null); }
  }, [phase]);

  const answer = useCallback((st) => {
    if (phase !== 'question' || !q) return;
    const correct = st === q.semis;
    setPicked(st);
    setPhase('feedback');
    const nextResults = [...results, { semis: q.semis, correct, picked: st }];
    setResults(nextResults);
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    setBestStreak((b) => Math.max(b, newStreak));
    setSessionStats((prev) => ({
      ...prev,
      [q.semis]: { asked: prev[q.semis].asked + 1, correct: prev[q.semis].correct + (correct ? 1 : 0) },
    }));
    phCapture('tool_interval_answered', {
      interval: intervalBySemitones(q.semis).short,
      answer: intervalBySemitones(st).short,
      correct,
      direction: q.direction,
      preset: settings.preset,
    });
    if (nextResults.length === ROUND_LENGTH) {
      phCapture('tool_interval_round_completed', {
        score: nextResults.filter((r) => r.correct).length,
        preset: settings.preset,
        direction: settings.direction,
      });
    }
  }, [phase, q, results, settings, streak]);

  const replay = useCallback((mode) => {
    if (!q) return;
    audio.playPair(q.first, q.second, mode || q.direction);
  }, [q, audio]);

  const playPicked = useCallback(() => {
    if (!q || picked == null) return;
    // Same starting note as the question, so the comparison is like-for-like.
    const s = spellInterval(q.rootMidi, picked, q.direction);
    if (s) audio.playPair(s.first, s.second, q.direction);
  }, [q, picked, audio]);

  const done = results.length >= ROUND_LENGTH && phase === 'feedback';
  const advance = useCallback(() => {
    if (results.length >= ROUND_LENGTH) setPhase('end');
    else nextQuestion(q);
  }, [results, nextQuestion, q]);

  // Keyboard: Space = replay, Enter / → = next.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === ' ' && (phase === 'question' || phase === 'feedback')) { e.preventDefault(); replay(); }
      else if ((e.key === 'Enter' || e.key === 'ArrowRight') && phase === 'feedback') { e.preventDefault(); advance(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, replay, advance]);

  const score = results.filter((r) => r.correct).length;
  const qNum = Math.min(results.length + (phase === 'question' ? 1 : 0), ROUND_LENGTH);
  const correctIv = q ? intervalBySemitones(q.semis) : null;
  const isRight = phase === 'feedback' && picked === q.semis;
  const altMode = q && q.direction === 'harm' ? 'asc' : 'harm';

  return (
    <div className="it-app">
      {phase === 'setup' && (
        <div className="it-card">
          <h2 className="it-h2">Set up your round</h2>
          <p className="it-sub">10 questions. You'll hear two notes; tap the interval. Headphones help on a phone.</p>
          <SettingsPanel settings={settings} onChange={changeSettings} />
          <button type="button" className="btn btn-coral it-start" onClick={startRound}>
            ▶ Start training
          </button>
        </div>
      )}

      {(phase === 'question' || phase === 'feedback') && q && (
        <div className="it-card">
          <div className="it-status">
            <span>Question <strong>{qNum}</strong> / {ROUND_LENGTH}</span>
            <span>Score <strong>{score}</strong></span>
            <span>Streak <strong>{streak}</strong>{bestStreak > 0 && <span className="it-muted"> · best {bestStreak}</span>}</span>
          </div>
          <div className="it-progress" aria-hidden="true">
            {Array.from({ length: ROUND_LENGTH }).map((_, i) => (
              <span key={i} className={i < results.length ? (results[i].correct ? 'ok' : 'no') : (i === results.length ? 'cur' : '')} />
            ))}
          </div>

          <div className="it-prompt">
            <p className="it-prompt-label">
              {DIRECTIONS[q.direction].label} interval · {PRESETS[settings.preset].label}
            </p>
            <button type="button" className="btn btn-soft it-replay" onClick={() => replay()}>
              🔊 Replay <kbd>space</kbd>
            </button>
          </div>

          <div className={'it-answers' + (pool.length <= 4 ? ' it-answers--few' : '')}>
            {INTERVALS.filter((i) => pool.includes(i.st)).map((i) => {
              let cls = 'it-ans';
              if (phase === 'feedback') {
                if (i.st === q.semis) cls += ' is-correct';
                else if (i.st === picked) cls += ' is-wrong';
                else cls += ' is-dim';
              }
              return (
                <button key={i.st} type="button" className={cls} onClick={() => answer(i.st)}
                  disabled={phase === 'feedback'} aria-label={i.name}>
                  <span className="it-ans-short">{i.short}</span>
                  <span className="it-ans-name">{i.name}</span>
                </button>
              );
            })}
          </div>

          {phase === 'feedback' && (
            <div className={'it-feedback ' + (isRight ? 'is-right' : 'is-wrong')} role="status" aria-live="polite">
              <p className="it-feedback-head">
                {isRight ? '✓ Correct — ' : '✗ Not quite — it was a '}
                <strong>{correctIv.name}</strong>
              </p>
              <p className="it-feedback-notes">
                {noteLabel(q.first)} {q.direction === 'harm' ? '+' : '→'} {noteLabel(q.second)} · {q.semis} semitone{q.semis === 1 ? '' : 's'}
              </p>
              <div className="it-row">
                <button type="button" className="btn btn-soft btn-sm" onClick={() => replay()}>Replay</button>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => replay(altMode)}>
                  Hear it {altMode === 'harm' ? 'harmonically' : 'melodically'}
                </button>
                {!isRight && (
                  <button type="button" className="btn btn-soft btn-sm" onClick={playPicked}>
                    Hear your answer ({intervalBySemitones(picked).short})
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-coral it-next" onClick={advance}>
                {done ? 'See round results →' : 'Next →'}
              </button>
            </div>
          )}

          <div className="it-settings-toggle">
            <button type="button" className="btn-link it-linkbtn" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
              {showSettings ? 'Hide settings' : 'Change settings'}
            </button>
            {showSettings && (
              <>
                <p className="it-hint">Changing a setting starts a new round.</p>
                <SettingsPanel settings={settings} onChange={changeSettings} />
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'end' && (
        <div className="it-card">
          <RoundEnd
            results={results}
            settings={settings}
            bestStreak={bestStreak}
            sessionStats={sessionStats}
            onAgain={startRound}
            onSettings={() => { setPhase('setup'); setResults([]); }}
          />
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
