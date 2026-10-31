// Note-reading games: one engine for every staff page.
//   /tools/treble-clef-notes/  /tools/bass-clef-notes/  /tools/alto-clef-notes/
//   /tools/tenor-clef-notes/   /tools/grand-staff-notes/ /tools/note-identification/ (mixed)
// Each page sets window.NOTE_GAME = { game: 'treble' | 'bass' | 'alto' | 'tenor' | 'grand' | 'mixed' }
// before loading ../_note-games/note-games.js. React, ReactDOM and Tone are UMD globals.
// Build: esbuild --bundle (see the build:tool:notegames script).
/* global React, ReactDOM, Tone */
import {
  LETTERS, ACC_GLYPH, CLEFS, GAMES, hintFor, itemKey, itemNote, itemLabel, noteLabel,
  noteAtPosition, noteMidi, midiToFreq, pickItem, multiplierFor, shouldUnlock,
  statPositions, appUrl, UNLOCK_WINDOW,
} from './theory.js';
import { renderScore } from './staff.js';

const { useState, useEffect, useRef, useCallback, useMemo } = React;

const CFG = (typeof window !== 'undefined' && window.NOTE_GAME) || {};
const GAME_ID = GAMES[CFG.game] ? CFG.game : GAMES[CFG.clef] ? CFG.clef : 'treble';
const GAME = GAMES[GAME_ID];
const SPRINT_MS = 60000;
const BREAK_EVERY = 25;
const STORE_KEY = 'fifths-notegame-v1:' + GAME_ID;
const NEED_TO_UNLOCK = Math.ceil(UNLOCK_WINDOW * 0.85); // 13 of the last 15
// ?ngdebug exposes the current question on window.__ng for the Playwright checks.
const DEBUG = typeof location !== 'undefined' && /[?&]ngdebug\b/.test(location.search);

// ---- Storage (per game, wrapped: private mode / blocked storage must not break play)
function loadStore() {
  const base = { stats: {}, unlocked: 1, best: {}, lastLevel: 1, bestStreak: 0, total: 0, muted: false };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(base, JSON.parse(raw));
  } catch (_) { /* ignore */ }
  return base;
}
function saveStore(s) {
  try { window.localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_) { /* ignore */ }
}

function phCapture(event, props) {
  try {
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, props || {});
    }
  } catch (_) { /* swallow */ }
}

// ---- Audio: Tone.js PolySynth + limiter, as in the circle-of-fifths tool.
// Created lazily inside the first tap/keypress so iOS allows it.
function useAudio(mutedRef) {
  const synthRef = useRef(null);
  const ensure = useCallback(async () => {
    if (synthRef.current) return synthRef.current;
    if (typeof Tone === 'undefined') return null;
    await Tone.start();
    const limiter = new Tone.Limiter(-1).toDestination();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.35, release: 0.9 },
      volume: -6,
    }).connect(limiter);
    synthRef.current = synth;
    return synth;
  }, []);
  const playNote = useCallback(async (note, force) => {
    if (mutedRef.current && !force) return;
    try {
      const s = await ensure();
      if (!s) return;
      s.releaseAll();
      s.triggerAttackRelease(midiToFreq(noteMidi(note)), 0.8, Tone.now() + 0.02);
    } catch (_) { /* audio unavailable: UI still works */ }
  }, [ensure]);
  const warm = useCallback(() => { ensure().catch(() => {}); }, [ensure]);
  return { playNote, warm };
}

// ---- Staff for the current question --------------------------------------
const STATUS_COLOR = { correct: 'var(--mint-ink)', wrong: 'var(--coral-ink)', pending: 'var(--ink-1)' };

function GameStaff({ item, status, animate }) {
  const grand = !!GAME.grand;
  const html = useMemo(() => {
    const color = STATUS_COLOR[status];
    const note = {
      clef: item.clef, p: item.p, acc: item.acc, x: grand ? 128 : 118, color,
      cls: 'ng-note' + (animate ? ' ng-in' : '') + (status === 'wrong' ? ' ng-shake' : ''),
      pulse: status === 'correct',
      label: status === 'wrong' ? itemLabel(item) : null, side: true,
      labelColor: 'var(--coral-ink)', labelText: 'var(--card)',
    };
    const aria = grand
      ? `Grand staff with one note on the ${item.clef} staff. Name the note.`
      : `${CLEFS[item.clef].label} clef staff with one note. Name the note.`;
    return renderScore(grand
      ? { layout: 'grand', width: 200, notes: [note], className: 'ng-staff ng-staff--grand', aria, vbTop: -30, vbBottom: 172 }
      : { clef: item.clef, width: 180, notes: [note], className: 'ng-staff', aria, vbTop: -30, vbBottom: 72 });
  }, [item, status, animate, grand]);
  return <div className="ng-staff-box" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ---- Stats map: every position on the staff, coloured by accuracy ---------
function accColor(s) {
  if (!s || !s.n) return 'var(--ink-5)';
  const a = s.ok / s.n;
  if (a >= 0.85) return 'var(--mint-ink)';
  if (a >= 0.6) return 'var(--butter)';
  return 'var(--coral)';
}

function aggregate(stats, clef) {
  const byP = {};
  for (const k in stats) {
    const [c, p] = k.split(':');
    if (c !== clef) continue;
    const s = byP[p] || (byP[p] = { n: 0, ok: 0 });
    s.n += stats[k].n; s.ok += stats[k].ok;
  }
  return byP;
}

function weakestNote(stats) {
  let worst = null;
  for (const k in stats) {
    const s = stats[k];
    if (s.n < 3) continue;
    const a = s.ok / s.n;
    if (a >= 1) continue;
    if (!worst || a < worst.a || (a === worst.a && s.n > worst.s.n)) worst = { k, s, a };
  }
  if (!worst) return null;
  const [clef, p, acc] = worst.k.split(':');
  const it = { clef, p: +p, acc: +acc };
  return { item: it, label: itemLabel(it), clef, s: worst.s };
}

function StatsMap({ stats }) {
  return (
    <div className="ng-map">
      {GAME.clefs.map((clef) => {
        const ps = statPositions(GAME_ID, clef);
        const agg = aggregate(stats, clef);
        const step = 19;
        const x0 = 50;
        const notes = ps.map((p, i) => {
          const s = agg[p];
          const n = noteAtPosition(p, clef);
          return {
            clef, p, acc: 0, x: x0 + i * step, head: 'whole', color: accColor(s),
            label: LETTERS[n.letter], labelSize: 11, labelColor: s && s.n ? 'var(--ink-1)' : 'var(--ink-3)',
          };
        });
        const minP = ps[0];
        const maxP = ps[ps.length - 1];
        const vbTop = Math.min(-14, 40 - maxP * 5 - 12);
        const labelsY = Math.max(56, 40 - minP * 5 + 18);
        const svg = renderScore({
          clef, width: x0 + ps.length * step + 4, notes, className: 'ng-map-svg', labelsY,
          vbTop, vbBottom: labelsY + 6,
          aria: `${CLEFS[clef].label} clef note map coloured by your accuracy`,
        });
        return (
          <div key={clef} className="ng-map-row">
            {GAME.clefs.length > 1 && <p className="ng-map-clef">{CLEFS[clef].label} {GAME.grand ? 'staff' : 'clef'}</p>}
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        );
      })}
      <div className="ng-legend">
        <span><i style={{ background: 'var(--mint-ink)' }} />85%+</span>
        <span><i style={{ background: 'var(--butter)' }} />60–84%</span>
        <span><i style={{ background: 'var(--coral)' }} />under 60%</span>
        <span><i style={{ background: 'var(--ink-5)' }} />not seen yet</span>
      </div>
    </div>
  );
}

function StatsCard({ store, sess, onReset }) {
  const weak = weakestNote(store.stats);
  const seen = Object.values(store.stats).reduce((a, s) => a + s.n, 0);
  const right = Object.values(store.stats).reduce((a, s) => a + s.ok, 0);
  const bests = GAME.levels.map((lv, i) => ({ lv, i, b: store.best[i + 1] })).filter((x) => x.b);
  return (
    <section className="ng-card ng-stats" aria-label="Your note reading stats">
      <div className="ng-stats-head">
        <h2>Your note map</h2>
        {seen > 0 && <button type="button" className="ng-link" onClick={onReset}>Reset</button>}
      </div>
      <p className="ng-sub">Every note you've answered, coloured by how often you got it right. Saved on this device.</p>
      <StatsMap stats={store.stats} />
      <dl className="ng-kv">
        <div><dt>This visit</dt><dd>{sess.n ? `${sess.ok}/${sess.n} · ${Math.round((sess.ok / sess.n) * 100)}%` : '–'}</dd></div>
        <div><dt>All time</dt><dd>{seen ? `${right}/${seen} · ${Math.round((right / seen) * 100)}%` : '–'}</dd></div>
        <div><dt>Best streak</dt><dd>{store.bestStreak || 0}</dd></div>
      </dl>
      <p className="ng-weak">
        {weak
          ? <>Your weakest note: <strong>{weak.label}</strong>{GAME.clefs.length > 1 ? ` (${CLEFS[weak.clef].label.toLowerCase()} ${GAME.grand ? 'staff' : 'clef'})` : ''}, {weak.s.ok} of {weak.s.n} right. It comes up more often until it sticks.</>
          : seen ? 'No weak spots yet. Keep going, or move up a level.' : 'Answer a few notes and your weakest one shows up here.'}
      </p>
      {bests.length > 0 && (
        <p className="ng-bests">Sprint bests: {bests.map((x) => `L${x.i + 1} ${x.b.score}`).join(' · ')}</p>
      )}
    </section>
  );
}

// ---- Small pieces -----------------------------------------------------------
function AppCard({ placement, compact }) {
  return (
    <div className={'ng-cta' + (compact ? ' ng-cta--compact' : '')}>
      <p className="ng-cta-h">Reading notes is half of it — Fifths trains your ear to hear them.</p>
      {!compact && <p className="ng-cta-p">Fifths is an ear-training app: higher or lower, intervals, scale degrees and melodies, with practice that adapts to what you miss.</p>}
      <a className="btn btn-coral ng-cta-btn" href={appUrl(GAME.slug, placement)} data-ph-track data-ph-cta="tool-result">
        Try Fifths free →
      </a>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="ng-lock" viewBox="0 0 12 14" aria-hidden="true">
      <rect x="1" y="6" width="10" height="7.5" rx="1.8" fill="currentColor" />
      <path d="M3.4 6V4.3a2.6 2.6 0 0 1 5.2 0V6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SoundIcon({ muted }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor" />
      {muted
        ? <path d="M13 7.5l5 5M18 7.5l-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        : <path d="M13 7a4.2 4.2 0 0 1 0 6M15.4 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function RecentDots({ recent }) {
  const last = recent.slice(-UNLOCK_WINDOW);
  const dots = [];
  for (let i = 0; i < UNLOCK_WINDOW; i++) {
    const v = last[i];
    dots.push(<i key={i} className={v === undefined ? '' : v ? 'ok' : 'no'} />);
  }
  return <span className="ng-dots" aria-hidden="true">{dots}</span>;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (_) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) { return false; }
}

function SprintEnd({ result, levelIdx, onAgain, onPractice }) {
  const [copied, setCopied] = useState(false);
  const url = `fifths.io/tools/${GAME.slug}/`;
  const shareText = `I named ${result.ok} ${GAME.noun} in 60 seconds — ${url}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const missed = Object.entries(result.misses).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <div className="ng-end">
      <p className="ng-eyebrow">Time! · Level {levelIdx + 1}: {GAME.levels[levelIdx].name}</p>
      <div className="ng-end-score">
        <span className="ng-end-num">{result.score}</span><span className="ng-end-unit">points</span>
        {result.isNewBest && (
          <span className="ng-best-badge">
            {result.prevBest ? 'New best!' : 'First best set'}
            <span className="ng-sparks" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
          </span>
        )}
      </div>
      <p className="ng-end-line">
        <strong>{result.ok}</strong> notes named · {result.n ? Math.round((result.ok / result.n) * 100) : 0}% accuracy · best streak {result.bestStreak} · top combo x{result.maxMult}
      </p>
      {!result.isNewBest && result.prevBest && <p className="ng-end-line ng-muted">Personal best on this level: {result.prevBest.score}</p>}
      {result.isNewBest && result.prevBest && <p className="ng-end-line ng-muted">Previous best: {result.prevBest.score}</p>}
      {missed.length > 0 && (
        <div className="ng-missed">
          <p className="ng-eyebrow">Missed this sprint</p>
          <ul>{missed.map(([k, n]) => {
            const [c, p, a] = k.split(':');
            const lab = itemLabel({ clef: c, p: +p, acc: +a });
            return <li key={k}>{lab}{GAME.clefs.length > 1 ? ` ${CLEFS[c].label.toLowerCase()}` : ''}{n > 1 ? ` ×${n}` : ''}</li>;
          })}</ul>
        </div>
      )}
      <div className="ng-share">
        <button type="button" className="btn btn-soft ng-share-btn" onClick={async () => {
          const ok = await copyText(shareText + '');
          setCopied(ok ? 'yes' : 'no');
        }}>{copied === 'yes' ? 'Copied!' : copied === 'no' ? 'Copy failed' : 'Copy result'}</button>
        {canShare && (
          <button type="button" className="btn btn-soft ng-share-btn" onClick={() => {
            navigator.share({ text: `I named ${result.ok} ${GAME.noun} in 60 seconds.`, url: 'https://' + url }).catch(() => {});
          }}>Share…</button>
        )}
      </div>
      <p className="ng-share-text">{shareText}</p>
      <div className="ng-row ng-row--center">
        <button type="button" className="btn btn-coral" onClick={onAgain}>Play again</button>
        <button type="button" className="btn btn-soft" onClick={onPractice}>Practise these notes</button>
      </div>
      <AppCard placement="sprint-result" />
    </div>
  );
}

// ---- App -------------------------------------------------------------------
function App() {
  const storeRef = useRef(loadStore());
  const store = storeRef.current;
  const nLevels = GAME.levels.length;
  const mutedRef = useRef(!!store.muted);
  const audio = useAudio(mutedRef);
  const [, force] = useState(0);
  const rerender = () => force((x) => x + 1);

  const [level, setLevel] = useState(Math.min(Math.max(1, store.lastLevel || 1), nLevels));
  const [mode, setMode] = useState('practice');
  const [screen, setScreen] = useState('play'); // play | ready | countdown | end
  const lv = GAME.levels[level - 1];
  const recentMissesRef = useRef([]);
  const [item, setItem] = useState(() => pickItem(lv.pool, store.stats, [], null));
  const [phase, setPhase] = useState('question');
  const [picked, setPicked] = useState(null);
  const [accSel, setAccSel] = useState(0);
  const [qid, setQid] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [sess, setSess] = useState({ n: 0, ok: 0, streak: 0, bestStreak: 0 });
  const [recent, setRecent] = useState([]);
  const [toast, setToast] = useState(null);
  const [breakCard, setBreakCard] = useState(null);
  const [count, setCount] = useState(3);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState(null);
  const spRef = useRef(null);
  const endAtRef = useRef(0);
  const timerRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const persist = () => saveStore(storeRef.current);

  const newQuestion = useCallback((prevItem, poolOverride) => {
    clearTimeout(timerRef.current);
    const pool = poolOverride || GAME.levels[level - 1].pool;
    setItem(pickItem(pool, storeRef.current.stats, recentMissesRef.current, prevItem));
    setPhase('question');
    setPicked(null);
    setAccSel(0);
    setShowHint(false);
    setQid((q) => q + 1);
  }, [level]);

  const chooseLevel = (l) => {
    if (l === level) return;
    clearTimeout(timerRef.current);
    setLevel(l);
    store.lastLevel = l; persist();
    setRecent([]);
    recentMissesRef.current = [];
    setToast(null);
    startedRef.current = false;
    const pool = GAME.levels[l - 1].pool;
    setItem(pickItem(pool, store.stats, [], null));
    setPhase('question'); setPicked(null); setAccSel(0); setShowHint(false); setQid((q) => q + 1);
    if (mode === 'sprint') setScreen('ready');
  };

  const chooseMode = (m) => {
    if (m === mode && screen !== 'end') return;
    clearTimeout(timerRef.current);
    setMode(m);
    setBreakCard(null);
    startedRef.current = false;
    if (m === 'practice') { setScreen('play'); newQuestion(item); }
    else setScreen('ready');
  };

  const startSprint = () => {
    audio.warm();
    clearTimeout(timerRef.current);
    setResult(null);
    setScreen('countdown');
    setCount(3);
    let c = 3;
    const tick = () => {
      c -= 1;
      if (c > 0) { setCount(c); timerRef.current = setTimeout(tick, 600); return; }
      spRef.current = { score: 0, n: 0, ok: 0, streak: 0, bestStreak: 0, maxMult: 1, misses: {} };
      endAtRef.current = Date.now() + SPRINT_MS;
      setNow(Date.now());
      setScreen('play');
      newQuestion(null);
      phCapture('tool_notegame_started', { game: GAME_ID, mode: 'sprint', level });
    };
    timerRef.current = setTimeout(tick, 600);
  };

  const finishSprint = useCallback(() => {
    clearTimeout(timerRef.current);
    const sp = spRef.current;
    if (!sp) return;
    const st = storeRef.current;
    const prevBest = st.best[level] || null;
    const isNewBest = sp.score > 0 && (!prevBest || sp.score > prevBest.score);
    if (isNewBest) st.best[level] = { score: sp.score, ok: sp.ok, at: Date.now() };
    saveStore(st);
    const res = Object.assign({}, sp, { prevBest, isNewBest });
    setResult(res);
    setScreen('end');
    phCapture('tool_notegame_completed', {
      game: GAME_ID, mode: 'sprint', level, score: sp.score,
      accuracy: sp.n ? Math.round((sp.ok / sp.n) * 100) / 100 : 0,
    });
  }, [level]);

  // Sprint clock.
  useEffect(() => {
    if (mode !== 'sprint' || screen !== 'play') return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endAtRef.current) { clearInterval(id); finishSprint(); }
    }, 100);
    return () => clearInterval(id);
  }, [mode, screen, finishSprint]);

  const answer = useCallback((letter) => {
    if (phase !== 'question' || screen !== 'play') return;
    const acc = lv.acc ? accSel : 0;
    const note = itemNote(item);
    const correct = letter === note.letter && acc === note.acc;
    audio.playNote(note);
    const st = storeRef.current;
    const key = itemKey(item);
    const s = st.stats[key] || (st.stats[key] = { n: 0, ok: 0 });
    s.n += 1; if (correct) s.ok += 1;
    st.total = (st.total || 0) + 1;
    const rm = recentMissesRef.current.filter((k) => k !== key);
    if (!correct) rm.push(key);
    recentMissesRef.current = rm.slice(-6);

    if (!startedRef.current && mode === 'practice') {
      startedRef.current = true;
      phCapture('tool_notegame_started', { game: GAME_ID, mode: 'practice', level });
    }
    phCapture('tool_notegame_answered', { game: GAME_ID, note: itemLabel(item), correct, level });

    setPicked({ letter, acc });
    setPhase('feedback');
    const nextRecent = [...recent, correct].slice(-UNLOCK_WINDOW);
    setRecent(nextRecent);
    if (level < nLevels && level >= st.unlocked && shouldUnlock(nextRecent)) {
      st.unlocked = level + 1;
      setToast({ level: level + 1 });
    }

    if (mode === 'sprint') {
      const sp = spRef.current;
      sp.n += 1;
      if (correct) {
        const mult = multiplierFor(sp.streak);
        sp.score += 10 * mult;
        sp.ok += 1;
        sp.streak += 1;
        sp.bestStreak = Math.max(sp.bestStreak, sp.streak);
        sp.maxMult = Math.max(sp.maxMult, multiplierFor(sp.streak));
      } else {
        sp.streak = 0;
        sp.misses[key] = (sp.misses[key] || 0) + 1;
      }
      st.bestStreak = Math.max(st.bestStreak || 0, sp.streak);
      saveStore(st);
      timerRef.current = setTimeout(() => newQuestion(item), correct ? 260 : 1000);
      return;
    }

    const ns = correct ? sess.streak + 1 : 0;
    const nextSess = { n: sess.n + 1, ok: sess.ok + (correct ? 1 : 0), streak: ns, bestStreak: Math.max(sess.bestStreak, ns) };
    setSess(nextSess);
    st.bestStreak = Math.max(st.bestStreak || 0, ns);
    saveStore(st);
    if (nextSess.n % BREAK_EVERY === 0) {
      setBreakCard({ n: nextSess.n, ok: nextSess.ok });
      phCapture('tool_notegame_completed', {
        game: GAME_ID, mode: 'practice', level, score: nextSess.ok,
        accuracy: Math.round((nextSess.ok / nextSess.n) * 100) / 100,
      });
    }
    if (correct) timerRef.current = setTimeout(() => newQuestion(item), 700);
  }, [phase, screen, lv, accSel, item, audio, mode, level, recent, nLevels, sess, newQuestion]);

  const toggleMute = () => {
    mutedRef.current = !mutedRef.current;
    store.muted = mutedRef.current; persist(); rerender();
  };

  const resetStats = () => {
    if (!window.confirm('Reset your note map, best streak and sprint bests for this game?')) return;
    const st = storeRef.current;
    st.stats = {}; st.best = {}; st.bestStreak = 0; st.total = 0;
    persist(); rerender();
  };

  // Keyboard: A–G answer; ↑ / # sharp, ↓ / - flat, = natural; Enter = next / start.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key;
      const i = LETTERS.indexOf(k.toUpperCase());
      if (screen === 'play' && phase === 'question') {
        if (i >= 0 && k.length === 1) { e.preventDefault(); answer(i); return; }
        if (lv.acc) {
          if (k === 'ArrowUp' || k === '#' || k === '+') { e.preventDefault(); setAccSel((a) => (a === 1 ? 0 : 1)); return; }
          if (k === 'ArrowDown' || k === '-') { e.preventDefault(); setAccSel((a) => (a === -1 ? 0 : -1)); return; }
          if (k === '=' || k === 'n' || k === 'N') { e.preventDefault(); setAccSel(0); return; }
        }
        if (k === 'h' || k === 'H' || k === '?') { if (mode === 'practice') setShowHint(true); }
      } else if (k === 'Enter') {
        if (screen === 'play' && phase === 'feedback' && mode === 'practice') { e.preventDefault(); newQuestion(item); }
        else if (screen === 'ready' && e.target === document.body) { e.preventDefault(); startSprint(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const note = itemNote(item);
  const isRight = phase === 'feedback' && picked && picked.letter === note.letter && picked.acc === note.acc;
  const status = phase === 'feedback' ? (isRight ? 'correct' : 'wrong') : 'pending';
  const hint = hintFor(item);
  const sp = spRef.current;
  const timeLeft = Math.max(0, endAtRef.current - now);
  const mult = sp ? multiplierFor(sp.streak) : 1;
  const recentOk = recent.filter(Boolean).length;
  const unlocked = store.unlocked;
  if (DEBUG) window.__ng = { label: itemLabel(item), letter: note.letter, acc: note.acc, clef: item.clef, p: item.p, screen, phase, mode, level, unlocked };

  // ---- Render ----
  let stage;
  if (screen === 'ready') {
    const b = store.best[level];
    stage = (
      <div className="ng-ready">
        <p className="ng-ready-h">60-second sprint</p>
        <p className="ng-ready-p">Name as many notes as you can. Every 5 in a row raises your combo, up to x4. A miss resets it.</p>
        <p className="ng-ready-best">{b ? <>Your best on this level: <strong>{b.score}</strong> ({b.ok} notes)</> : 'No best on this level yet.'}</p>
        <button type="button" className="btn btn-coral ng-go" onClick={startSprint}>Start sprint</button>
      </div>
    );
  } else if (screen === 'countdown') {
    stage = (
      <div className="ng-ready">
        <p key={count} className="ng-count">{count}</p>
        <p className="ng-ready-p">Get ready…</p>
      </div>
    );
  } else if (screen === 'end' && result) {
    stage = (
      <SprintEnd result={result} levelIdx={level - 1}
        onAgain={startSprint}
        onPractice={() => chooseMode('practice')} />
    );
  } else {
    stage = (
      <>
        <div className={'ng-staff-wrap' + (GAME.grand ? ' is-grand' : '')}>
          {GAME.clefs.length > 1 && !GAME.grand && <span className="ng-clef-tag">{CLEFS[item.clef].label} clef</span>}
          <GameStaff key={qid} item={item} status={status} animate={phase === 'question'} />
        </div>
        <div className="ng-fb-slot" role="status" aria-live="polite">
          {phase === 'question' && !showHint && <p className="ng-prompt">What note is this?</p>}
          {phase === 'question' && showHint && (
            <div className="ng-fb ng-fb--hint"><p>{hint.main}</p>{hint.landmark && !hint.spoils && <p className="ng-hint">{hint.landmark}</p>}</div>
          )}
          {phase === 'feedback' && isRight && <p className="ng-fb ng-fb--ok">✓ {noteLabel(note)}</p>}
          {phase === 'feedback' && !isRight && (
            <div className="ng-fb ng-fb--no">
              <p><strong>That's {noteLabel(note)}</strong> — you picked {LETTERS[picked.letter]}{ACC_GLYPH[String(picked.acc)]}.</p>
              {mode === 'practice' && <p className="ng-hint">{hint.landmark || hint.main}</p>}
              {mode === 'practice' && hint.landmark && <p className="ng-hint">{hint.main}</p>}
            </div>
          )}
        </div>
        {lv.acc && (
          <div className="ng-acc" role="radiogroup" aria-label="Accidental">
            {[[-1, '♭ flat'], [0, '♮ natural'], [1, '♯ sharp']].map(([a, t]) => (
              <button key={a} type="button" role="radio" aria-checked={accSel === a}
                className={'ng-chip' + (accSel === a ? ' is-on' : '')}
                onClick={() => setAccSel(a)} disabled={phase !== 'question'}>{t}</button>
            ))}
          </div>
        )}
        <div className="ng-letters">
          {LETTERS.map((L, i) => {
            let cls = 'ng-letter';
            if (phase === 'feedback') {
              if (i === note.letter) cls += ' is-correct';
              else if (picked && i === picked.letter) cls += ' is-wrong';
            }
            return (
              <button key={L} type="button" className={cls} onClick={() => answer(i)} disabled={phase !== 'question'}
                aria-label={`${L}${lv.acc && accSel ? (accSel === 1 ? ' sharp' : ' flat') : ''}`}>
                {L}{lv.acc && accSel !== 0 && phase === 'question' ? ACC_GLYPH[String(accSel)] : ''}
              </button>
            );
          })}
        </div>
        {mode === 'practice' && (
          <div className="ng-row">
            {phase === 'question' && (
              <button type="button" className="btn btn-soft btn-sm ng-hint-btn" onClick={() => setShowHint(true)} disabled={showHint}>Hint</button>
            )}
            {phase === 'feedback' && !isRight && (
              <>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => audio.playNote(note, true)}>Hear it again</button>
                <button type="button" className="btn btn-coral ng-next" onClick={() => newQuestion(item)}>Next →</button>
              </>
            )}
          </div>
        )}
        <p className="ng-kbd">Keyboard: A–G to answer{lv.acc ? ', ↑ sharp, ↓ flat' : ''}{mode === 'practice' ? ', H for a hint, Enter for next' : ''}.</p>
      </>
    );
  }

  return (
    <div className="ng">
      <div className="ng-card ng-game">
        <div className="ng-top">
          <div className="ng-modes" role="tablist" aria-label="Game mode">
            <button type="button" role="tab" aria-selected={mode === 'practice'} className={'ng-mode' + (mode === 'practice' ? ' is-on' : '')} onClick={() => chooseMode('practice')}>Practice</button>
            <button type="button" role="tab" aria-selected={mode === 'sprint'} className={'ng-mode' + (mode === 'sprint' ? ' is-on' : '')} onClick={() => chooseMode('sprint')}>Sprint · 60s</button>
          </div>
          <button type="button" className="ng-icon-btn" onClick={toggleMute} aria-pressed={mutedRef.current} aria-label={mutedRef.current ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}>
            <SoundIcon muted={mutedRef.current} />
          </button>
        </div>

        <div className="ng-levels" role="radiogroup" aria-label="Level">
          {GAME.levels.map((L, i) => {
            const n = i + 1;
            const locked = n > unlocked;
            return (
              <button key={n} type="button" role="radio" aria-checked={level === n}
                className={'ng-level' + (level === n ? ' is-on' : '') + (locked ? ' is-locked' : '')}
                onClick={() => chooseLevel(n)} disabled={mode === 'sprint' && (screen === 'play' || screen === 'countdown')}
                title={locked ? `Unlocks at ${NEED_TO_UNLOCK}/${UNLOCK_WINDOW} correct on level ${n - 1}; you can still pick it.` : undefined}>
                <span className="ng-level-n">{locked ? <LockIcon /> : n}</span>
                <span className="ng-level-t">{L.name}</span>
                <span className="ng-level-d">{L.desc}</span>
              </button>
            );
          })}
        </div>

        {toast && (
          <div className="ng-toast" role="status">
            <span><strong>Level {toast.level} unlocked:</strong> {GAME.levels[toast.level - 1].name}</span>
            <span className="ng-toast-btns">
              <button type="button" className="btn btn-coral btn-sm" onClick={() => { setToast(null); chooseLevel(toast.level); }}>Play it</button>
              <button type="button" className="ng-link" onClick={() => setToast(null)}>Stay here</button>
            </span>
          </div>
        )}

        {mode === 'practice' && screen === 'play' && (
          <div className="ng-hud">
            <span>Accuracy <strong>{sess.n ? Math.round((sess.ok / sess.n) * 100) + '%' : '–'}</strong></span>
            <span>Streak <strong key={sess.streak} className={sess.streak ? 'ng-bump' : ''}>{sess.streak}</strong></span>
            <span>Best <strong>{Math.max(sess.bestStreak, store.bestStreak || 0)}</strong></span>
            {level < nLevels && (
              <span className="ng-unlock" title={`Get ${NEED_TO_UNLOCK} of the last ${UNLOCK_WINDOW} right to unlock the next level`}>
                <RecentDots recent={recent} />
                <em>{level >= unlocked ? `${recentOk}/${NEED_TO_UNLOCK} to unlock L${level + 1}` : `Last ${UNLOCK_WINDOW}: ${recentOk} right`}</em>
              </span>
            )}
          </div>
        )}
        {mode === 'sprint' && screen === 'play' && sp && (
          <div className="ng-hud ng-hud--sprint">
            <div className="ng-timebar" aria-hidden="true"><span style={{ transform: `scaleX(${timeLeft / SPRINT_MS})` }} className={timeLeft < 10000 ? 'is-low' : ''} /></div>
            <span className="ng-time">{Math.ceil(timeLeft / 1000)}s</span>
            <span>Score <strong key={sp.score} className="ng-bump">{sp.score}</strong></span>
            <span>Notes <strong>{sp.ok}</strong></span>
            <span key={mult} className={'ng-combo' + (mult > 1 ? ' is-hot' : '')}>x{mult}<small>{sp.streak > 0 ? ` · ${sp.streak} in a row` : ' combo'}</small></span>
          </div>
        )}

        {stage}

        {breakCard && mode === 'practice' && (
          <div className="ng-break">
            <p className="ng-break-h">{breakCard.n} notes done · {Math.round((breakCard.ok / breakCard.n) * 100)}% right</p>
            <AppCard placement="practice-break" compact />
            <button type="button" className="ng-link" onClick={() => setBreakCard(null)}>Keep practising</button>
          </div>
        )}
      </div>

      <StatsCard store={store} sess={sess} onReset={resetStats} />
    </div>
  );
}

const rootEl = document.getElementById('note-game');
if (rootEl) ReactDOM.createRoot(rootEl).render(<App />);
