// Shared game shell for the instrument note games. Each tool passes a `def`
// describing its instrument, levels, question generator and hints; this file
// owns the game loop, Practice/Sprint modes, scoring, unlocks, stats, share
// and the app funnel. React is a UMD global.
/* global React */
import {
  LETTERS, answerMatches, answerLabel, pcName, bumpWeight, passesUnlock,
  UNLOCK_WINDOW, SPRINT_SECONDS, comboMultiplier, weakestKey, loadStore,
  saveStore, appUrl, phCapture,
} from './core.js';

const { useState, useEffect, useRef, useCallback } = React;

const PRACTICE_BREAK_EVERY = 20;
const FIND_MAX_MISSES = 3;

function useForce() {
  const [, set] = useState(0);
  return useCallback(() => set((v) => v + 1), []);
}

function Seg({ label, value, options, onChange, className }) {
  return (
    <div className={'ig-seg ' + (className || '')} role="radiogroup" aria-label={label}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([key, text, sub]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key}
          className={'ig-chip' + (value === key ? ' is-on' : '')} onClick={() => onChange(key)}>
          <span>{text}</span>{sub && <small>{sub}</small>}
        </button>
      ))}
    </div>
  );
}

export function AppCard({ slug, placement, compact, headline }) {
  return (
    <div className={'ig-appcard' + (compact ? ' ig-appcard--compact' : '')}>
      <h3>{headline || 'Knowing where notes are is half of it — Fifths trains your ear to hear them.'}</h3>
      {!compact && <p>Short daily ear-training sessions: higher or lower, intervals, scale degrees and melodies, focused on what you miss. Free to start.</p>}
      <a className="btn btn-coral ig-appcard-btn" href={appUrl(slug, placement)} data-ph-track data-ph-cta="tool-result">
        Train your ear in Fifths →
      </a>
    </div>
  );
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

function LetterPad({ onLetter, accOn, acc, setAcc, disabled, picked, correctPc, showResult }) {
  return (
    <div className="ig-pad">
      {accOn && (
        <div className="ig-accrow" role="group" aria-label="Sharp or flat">
          {[[-1, '♭', 'flat'], [1, '♯', 'sharp']].map(([a, g, w]) => (
            <button key={a} type="button" aria-pressed={acc === a} disabled={disabled}
              className={'ig-chip ig-accbtn' + (acc === a ? ' is-on' : '')}
              onClick={() => setAcc(acc === a ? 0 : a)}>
              <b>{g}</b> {w}
            </button>
          ))}
        </div>
      )}
      <div className="ig-letters">
        {LETTERS.map((L, i) => {
          let cls = 'ig-letter';
          if (showResult) {
            if (answerMatches(correctPc, i, 0) || (picked && i === picked.letter && answerMatches(correctPc, i, picked.acc))) cls += ' is-correct';
            else if (picked && i === picked.letter) cls += ' is-wrong';
          }
          return (
            <button key={L} type="button" className={cls} disabled={disabled} onClick={() => onLetter(i)}>
              {L}{accOn && acc !== 0 && !disabled ? (acc === 1 ? '♯' : '♭') : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Answer pad for games whose answers aren't note letters (def.choices).
function ChoicePad({ choices, onChoice, disabled, picked, correctKey, showResult }) {
  return (
    <div className={'ig-choices' + (choices.length > 8 ? ' ig-choices--wide' : '')}
      style={choices.length < 4 ? { gridTemplateColumns: `repeat(${choices.length}, 1fr)` } : undefined}>
      {choices.map((c) => {
        let cls = 'ig-letter ig-choice';
        if (showResult) {
          if (c.key === correctKey) cls += ' is-correct';
          else if (picked && c.key === picked.key) cls += ' is-wrong';
        }
        return (
          <button key={c.key} type="button" className={cls} disabled={disabled} onClick={() => onChoice(c.key)}
            aria-label={c.sub || c.label}>
            {c.label}{c.sub && <small>{c.sub}</small>}
          </button>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <p className="ig-legend" aria-hidden="true">
      <span><i style={{ background: 'var(--ig-heat-good)' }} /> 90%+</span>
      <span><i style={{ background: 'var(--ig-heat-mid)' }} /> 70–89%</span>
      <span><i style={{ background: 'var(--ig-heat-bad)' }} /> under 70%</span>
    </p>
  );
}

export function NoteGame({ def }) {
  const ctx = def.useCtx();
  const audio = def.useAudio();
  const force = useForce();

  // ---- persisted store ----
  const store = useRef(null);
  if (!store.current) {
    store.current = Object.assign({ unlocked: 0, recent: {}, stats: {}, w: {}, best: {}, bestStreak: 0, lastLevel: 0 }, loadStore(def.storeKey));
  }
  const commit = useCallback(() => saveStore(def.storeKey, store.current), [def.storeKey]);
  const weightOf = useCallback((k) => store.current.w[k] || 1, []);

  const [play, setPlay] = useState('practice');
  const [task, setTask] = useState('name');
  const [level, setLevel] = useState(() => Math.min(def.levels.length - 1, Math.max(0, store.current.lastLevel | 0)));
  const [q, setQ] = useState(null);
  const [phase, setPhase] = useState('ask'); // ask | fb
  const [picked, setPicked] = useState(null);
  const [acc, setAcc] = useState(0);
  const [result, setResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [toast, setToast] = useState(null);
  const [breakCard, setBreakCard] = useState(null);
  const [copied, setCopied] = useState(false);
  const [gain, setGain] = useState(null); // floating "+2" in sprint

  const marks = useRef({});       // find mode: posId -> 'hit' | 'miss'
  const qMisses = useRef(0);
  const sess = useRef({ n: 0, ok: 0, streak: 0, best: 0, blockN: 0, blockOk: 0 });
  const sprint = useRef({ status: 'idle' });
  const runStarted = useRef(false);
  const timers = useRef([]);
  const [now, setNow] = useState(Date.now());

  const live = useRef({});
  live.current = { play, task, level, ctx, q, phase, acc };

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => clearTimers(), []);

  const nextQuestion = useCallback(() => {
    clearTimers();
    const L = live.current;
    marks.current = {};
    qMisses.current = 0;
    setQ(def.makeQuestion({ task: L.task, level: L.level, ctx: L.ctx, weightOf, prev: L.q }));
    setPicked(null); setAcc(0); setResult(null); setShowHint(false); setPhase('ask');
  }, [def, weightOf]);

  // Reset the run when the game, level, mode or visible range changes.
  useEffect(() => {
    runStarted.current = false;
    sprint.current = { status: 'idle' };
    sess.current.blockN = 0; sess.current.blockOk = 0;
    setBreakCard(null);
    nextQuestion();
  }, [task, level, play, ctx.rangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { store.current.lastLevel = level; commit(); }, [level, commit]);

  const levelNum = level + 1;

  const finishSprint = useCallback(() => {
    const sp = sprint.current;
    if (sp.status !== 'running') return;
    clearTimers();
    const L = live.current;
    const key = L.task + ':' + L.level;
    const prevBest = store.current.best[key] || 0;
    const newBest = sp.score > prevBest;
    if (newBest) { store.current.best[key] = sp.score; commit(); }
    sprint.current = { ...sp, status: 'done', prevBest, newBest };
    setCopied(false);
    phCapture('tool_notegame_completed', {
      game: def.id, mode: 'sprint', task: L.task, level: L.level + 1,
      score: sp.score, correct: sp.correct, answered: sp.n,
      accuracy: sp.n ? Math.round((sp.correct / sp.n) * 100) : 0,
    });
    force();
  }, [def.id, commit, force]);

  // Sprint clock.
  useEffect(() => {
    if (play !== 'sprint' || sprint.current.status !== 'running') return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= sprint.current.endsAt) finishSprint();
    }, 100);
    return () => clearInterval(id);
  }, [play, sprint.current.status, finishSprint]);

  const startSprint = () => {
    audio.unlock();
    sprint.current = { status: 'running', endsAt: Date.now() + SPRINT_SECONDS * 1000, score: 0, correct: 0, n: 0, streak: 0, bestCombo: 0, mult: 1 };
    setNow(Date.now());
    phCapture('tool_notegame_started', { game: def.id, mode: 'sprint', task, level: levelNum });
    nextQuestion();
    force();
  };

  // Record one scored answer. Returns false if it should be ignored.
  const record = (correct, statKey, note, extra) => {
    const L = live.current;
    if (L.play === 'sprint' && sprint.current.status !== 'running') return false;
    if (L.play === 'practice' && !runStarted.current) {
      runStarted.current = true;
      phCapture('tool_notegame_started', { game: def.id, mode: 'practice', task: L.task, level: L.level + 1 });
    }
    const st = store.current;
    const s = st.stats[statKey] || { n: 0, ok: 0 };
    s.n += 1; if (correct) s.ok += 1;
    st.stats[statKey] = s;
    st.w[statKey] = bumpWeight(st.w[statKey], correct);
    const rec = (st.recent[L.level] || []).concat([!!correct]).slice(-UNLOCK_WINDOW);
    st.recent[L.level] = rec;
    if (passesUnlock(rec) && st.unlocked <= L.level && L.level < def.levels.length - 1) {
      st.unlocked = L.level + 1;
      setToast({ level: L.level + 1 });
    }

    const se = sess.current;
    se.n += 1; se.blockN += 1;
    if (correct) { se.ok += 1; se.blockOk += 1; se.streak += 1; } else se.streak = 0;
    se.best = Math.max(se.best, se.streak);
    if (se.streak > (st.bestStreak || 0)) st.bestStreak = se.streak;
    commit();

    if (L.play === 'sprint') {
      const sp = sprint.current;
      sp.n += 1;
      if (correct) {
        sp.streak += 1; sp.correct += 1;
        const m = comboMultiplier(sp.streak);
        sp.score += m; sp.mult = m;
        sp.bestCombo = Math.max(sp.bestCombo, sp.streak);
        setGain({ v: m, id: sp.n });
      } else { sp.streak = 0; sp.mult = 1; }
    } else if (se.blockN >= PRACTICE_BREAK_EVERY) {
      const blockOk = se.blockOk;
      setBreakCard({ n: se.blockN, ok: blockOk });
      phCapture('tool_notegame_completed', {
        game: def.id, mode: 'practice', task: L.task, level: L.level + 1,
        score: blockOk, accuracy: Math.round((blockOk / se.blockN) * 100),
      });
      se.blockN = 0; se.blockOk = 0;
    }

    phCapture('tool_notegame_answered', Object.assign({
      game: def.id, note, correct: !!correct, level: L.level + 1, mode: L.play, task: L.task,
    }, extra || {}));
    return true;
  };

  const inSprint = play === 'sprint';
  const sprintRunning = inSprint && sprint.current.status === 'running';
  const canAnswer = phase === 'ask' && q && (!inSprint || sprintRunning);

  const answerName = (letter) => {
    const L = live.current;
    if (!L.q || L.q.task !== 'name' || L.phase !== 'ask') return;
    if (L.play === 'sprint' && sprint.current.status !== 'running') return;
    const a = def.levels[L.level].acc ? L.acc : 0;
    const correct = answerMatches(L.q.pc, letter, a);
    playAnswer(L.q);
    if (!record(correct, L.q.statKey, L.q.note, Object.assign({ answer: answerLabel(letter, a) }, L.q.extra))) return;
    setPicked({ letter, acc: a });
    setResult({ correct });
    setPhase('fb');
    const sp = L.play === 'sprint';
    if (correct) later(nextQuestion, sp ? 320 : 700);
    else if (sp) later(nextQuestion, 1300);
  };

  const playAnswer = (cq) => { if (def.playAnswer) def.playAnswer(audio, cq); else audio.play(cq.midi); };

  const answerChoice = (key) => {
    const L = live.current;
    if (!L.q || L.q.task !== 'name' || L.phase !== 'ask') return;
    if (L.play === 'sprint' && sprint.current.status !== 'running') return;
    const correct = key === L.q.answerKey;
    playAnswer(L.q);
    if (!record(correct, L.q.statKey, L.q.note, Object.assign({ answer: key }, L.q.extra))) return;
    const choice = def.choices(L.q, L.level).find((c) => c.key === key);
    setPicked({ key, label: choice ? choice.label : key });
    setResult({ correct });
    setPhase('fb');
    const sp = L.play === 'sprint';
    if (correct) later(nextQuestion, sp ? 420 : 900);
    else if (sp) later(nextQuestion, 1500);
  };

  const endFind = (correct, extraResult) => {
    const sp = live.current.play === 'sprint';
    setResult(Object.assign({ correct }, extraResult));
    setPhase('fb');
    if (correct) later(nextQuestion, sp ? 380 : 750);
    else if (sp) later(nextQuestion, 1400);
  };

  const tapPos = (pos) => {
    const L = live.current;
    const cq = L.q;
    if (!cq) return;
    if (cq.task !== 'find' || L.phase !== 'ask' || (L.play === 'sprint' && sprint.current.status !== 'running')) {
      // Outside a find question the instrument is still playable for listening.
      if (L.phase === 'fb') audio.play(def.midiOfPos(pos));
      return;
    }
    if (def.isActive && !def.isActive(cq, pos)) return;
    const id = def.posId(pos);
    if (marks.current[id]) return;
    if (def.playTap) def.playTap(audio, cq, pos); else audio.play(def.midiOfPos(pos));
    const isTarget = cq.targets.some((t) => def.posId(t) === id);
    if (isTarget) {
      if (!record(true, def.statKeyOfPos(pos, cq), cq.note, Object.assign({ tapped: def.posLabel(pos) }, cq.extra))) return;
      marks.current = { ...marks.current, [id]: 'hit' };
      const hits = cq.targets.filter((t) => marks.current[def.posId(t)] === 'hit').length;
      if (!cq.needAll || hits === cq.targets.length) endFind(qMisses.current === 0, { hits, total: cq.targets.length });
      else force();
    } else {
      if (!record(false, def.missKeyFor(cq, pos), cq.note, Object.assign({ tapped: def.posLabel(pos) }, cq.extra))) return;
      marks.current = { ...marks.current, [id]: 'miss' };
      qMisses.current += 1;
      const hits = cq.targets.filter((t) => marks.current[def.posId(t)] === 'hit').length;
      if (!cq.needAll || qMisses.current >= FIND_MAX_MISSES) endFind(false, { hits, total: cq.targets.length, revealed: true, tappedPos: pos });
      else force();
    }
  };

  const giveUp = () => {
    const L = live.current;
    const cq = L.q;
    if (!cq || cq.task !== 'find' || L.phase !== 'ask') return;
    const left = cq.targets.filter((t) => marks.current[def.posId(t)] !== 'hit');
    // One miss per question when a single hit would have answered it.
    (cq.needAll ? left : left.slice(0, 1))
      .forEach((t) => record(false, def.statKeyOfPos(t, cq), cq.note, Object.assign({ gave_up: true }, cq.extra)));
    endFind(false, { hits: cq.targets.length - left.length, total: cq.targets.length, revealed: true });
  };

  // Keyboard: A–G to answer, # / = / ↑ sharp, - / ↓ flat, Enter/Space next.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const L = live.current;
      const k = (e.key || '').toUpperCase();
      const i = LETTERS.indexOf(k);
      const accOn = def.levels[L.level].acc;
      if (L.phase === 'ask' && L.q && L.q.task === 'name' && def.choices) {
        // 1–9 then 0, -, = pick the pad buttons in order.
        const n = '1234567890-='.indexOf(e.key);
        const cs = def.choices(L.q, L.level);
        if (n >= 0 && n < cs.length) { e.preventDefault(); answerChoice(cs[n].key); }
      } else if (L.phase === 'ask' && L.q && L.q.task === 'name') {
        if (i >= 0) { e.preventDefault(); answerName(i); return; }
        if (accOn && (e.key === '#' || e.key === '=' || e.key === '+' || e.key === 'ArrowUp')) { e.preventDefault(); setAcc((a) => (a === 1 ? 0 : 1)); return; }
        if (accOn && (e.key === '-' || e.key === '_' || e.key === 'ArrowDown')) { e.preventDefault(); setAcc((a) => (a === -1 ? 0 : -1)); return; }
      }
      if (L.phase === 'fb' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
        if (L.play === 'practice') { e.preventDefault(); nextQuestion(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---- derived view data ----
  const lv = def.levels[level];
  const accOn = !!lv.acc;
  const st = store.current;
  const viewMarks = q && def.baseMarks ? def.baseMarks(q, phase) : {};
  if (q) {
    if (q.task === 'name') {
      const id = def.posId(q.pos);
      if (phase === 'ask') viewMarks[id] = { state: 'target' };
      else viewMarks[id] = { state: result && result.correct ? 'correct' : 'wrong', label: q.answerShort };
    } else {
      Object.keys(marks.current).forEach((id) => { viewMarks[id] = { state: marks.current[id] }; });
      if (phase === 'fb') {
        q.targets.forEach((t) => {
          const id = def.posId(t);
          viewMarks[id] = { state: marks.current[id] === 'hit' ? 'hit' : 'reveal', label: def.posShort(t, q) };
        });
        if (result && result.tappedPos && def.posId(result.tappedPos) in marks.current) {
          viewMarks[def.posId(result.tappedPos)] = { state: 'miss', label: def.posShort(result.tappedPos, q) };
        }
      }
    }
  }

  const sp = sprint.current;
  const secsLeft = sp.status === 'running' ? Math.max(0, Math.ceil((sp.endsAt - now) / 1000)) : SPRINT_SECONDS;
  const pctLeft = sp.status === 'running' ? Math.max(0, (sp.endsAt - now) / (SPRINT_SECONDS * 1000)) : 1;
  const weak = weakestKey(st.stats);
  const se = sess.current;
  const bestKey = task + ':' + level;
  const best = st.best[bestKey] || 0;
  const shareText = sp.status === 'done'
    ? `I ${task === 'find' ? 'found' : 'named'} ${sp.correct} ${def.shareNoun} in 60 seconds — ${def.shareUrl}`
    : '';

  const instrument = (
    <def.Instrument ctx={ctx} q={q} marks={viewMarks} onTap={tapPos} interactive
      dimInactive={q && q.task === 'find'} />
  );

  // ---- feedback text ----
  let feedback = null;
  if (q && phase === 'ask') {
    if (inSprint && !sprintRunning) feedback = null;
    else if (q.task === 'name') feedback = <p className="ig-prompt">{def.tasks.name.prompt}</p>;
    else {
      const hits = q.targets.filter((t) => marks.current[def.posId(t)] === 'hit').length;
      feedback = (
        <p className="ig-prompt ig-prompt--find">
          {q.prompt}
          {q.needAll && <span className="ig-found"> {hits}/{q.targets.length} found{qMisses.current ? ` · ${qMisses.current} miss${qMisses.current > 1 ? 'es' : ''}` : ''}</span>}
        </p>
      );
    }
  } else if (q && phase === 'fb' && result) {
    if (q.task === 'name') {
      feedback = result.correct
        ? <p className="ig-fb ig-fb--ok">✓ {q.answerLong}</p>
        : (
          <div className="ig-fb ig-fb--no">
            <p><strong>That's {q.answerLong}</strong> — you picked {picked.label || answerLabel(picked.letter, picked.acc)}.</p>
            <p className="ig-hint">{def.hint(q, ctx)}</p>
          </div>
        );
    } else if (result.correct) {
      feedback = <p className="ig-fb ig-fb--ok">✓ {q.needAll ? `All ${q.targets.length} found` : q.answerLong}</p>;
    } else {
      feedback = (
        <div className="ig-fb ig-fb--no">
          <p><strong>{def.findMissHeadline(q, result)}</strong></p>
          <p className="ig-hint">{def.hint(q, ctx)}</p>
        </div>
      );
    }
  }

  const levelPicker = (
    <div className="ig-field">
      <p className="ig-label">Level</p>
      <div className="ig-levels">
        {def.levels.map((L, i) => {
          const locked = i > st.unlocked;
          return (
            <button key={i} type="button" aria-pressed={i === level}
              className={'ig-level' + (i === level ? ' is-on' : '') + (locked ? ' is-locked' : '')}
              onClick={() => setLevel(i)}>
              <span className="ig-level-n">{i + 1}{locked && <span className="ig-lock" aria-label="not unlocked yet"> ·</span>}</span>
              <span className="ig-level-t">{L.label}</span>
            </button>
          );
        })}
      </div>
      <p className="ig-small">Levels unlock at 85% over your last 15 answers, but you can pick any level.</p>
    </div>
  );

  let main;
  if (inSprint && sp.status === 'done') {
    const acc = sp.n ? Math.round((sp.correct / sp.n) * 100) : 0;
    main = (
      <div className="ig-result">
        <p className="ig-eyebrow">Sprint over · Level {levelNum} · {def.tasks[task].label}</p>
        {sp.newBest && sp.score > 0 && <p className="ig-newbest">New personal best!</p>}
        <div className="ig-result-score"><span className="ig-result-num">{sp.score}</span><span className="ig-result-unit">points</span></div>
        <p className="ig-result-line">
          {sp.correct} {task === 'find' ? 'found' : 'named'} · {acc}% accuracy · best combo {sp.bestCombo}
          {!sp.newBest && sp.prevBest > 0 && <> · personal best {sp.prevBest}</>}
        </p>
        <div className="ig-row">
          <button type="button" className="btn btn-ink ig-grow" onClick={async () => { setCopied(await copyText(shareText)); }}>
            {copied ? 'Copied ✓' : 'Copy result'}
          </button>
          <button type="button" className="btn btn-soft ig-grow" onClick={startSprint}>Play again</button>
        </div>
        <p className="ig-share-preview">“{shareText}”</p>
        {weak && <p className="ig-result-line">Your weakest {def.weakNoun || 'note'} so far: <strong>{def.keyLabel(weak.k)}</strong> ({Math.round(weak.a * 100)}%).</p>}
        <AppCard slug={def.slug} placement="sprint-result" headline={def.appHeadline} />
      </div>
    );
  } else {
    main = (
      <>
        {inSprint ? (
          <div className="ig-status ig-status--sprint">
            <div className="ig-timer" aria-label={`${secsLeft} seconds left`}><span style={{ width: pctLeft * 100 + '%' }} className={secsLeft <= 10 ? 'is-low' : ''} /></div>
            <span><strong>{secsLeft}</strong>s</span>
            <span>Score <strong>{sp.score || 0}</strong>{gain && sprintRunning && <em key={gain.id} className="ig-gain">+{gain.v}</em>}</span>
            <span className={'ig-combo' + ((sp.mult || 1) > 1 ? ' is-hot' : '')} key={'m' + (sp.mult || 1)}>×{sp.mult || 1}</span>
          </div>
        ) : (
          <div className="ig-status">
            <span>Accuracy <strong>{se.n ? Math.round((se.ok / se.n) * 100) + '%' : '—'}</strong>{se.n > 0 && <span className="ig-muted"> ({se.ok}/{se.n})</span>}</span>
            <span>Streak <strong>{se.streak}</strong><span className="ig-muted"> · best {se.best}</span></span>
          </div>
        )}

        <div className="ig-instrument">{instrument}</div>

        <div className="ig-feedback" role="status" aria-live="polite">
          {inSprint && !sprintRunning ? (
            <div className="ig-sprint-intro">
              <p><strong>60 seconds.</strong> {task === 'find' ? 'Tap the right positions' : 'Name as many as you can'} — streaks build a combo up to ×4.</p>
              <p className="ig-muted">Level {levelNum}: {lv.label}{best > 0 ? ` · your best: ${best} points` : ''}</p>
              <button type="button" className="btn btn-coral ig-start" onClick={startSprint}>Start the 60-second sprint</button>
            </div>
          ) : feedback}
          {showHint && phase === 'ask' && q && <p className="ig-hint ig-hint--pre">{def.hint(q, ctx)}</p>}
        </div>

        {q && q.task === 'name' && def.choices && (
          <ChoicePad choices={def.choices(q, level)} onChoice={answerChoice} disabled={!canAnswer}
            picked={picked} correctKey={q.answerKey} showResult={phase === 'fb'} />
        )}
        {q && q.task === 'name' && !def.choices && (
          <LetterPad onLetter={answerName} accOn={accOn} acc={acc} setAcc={setAcc}
            disabled={!canAnswer} picked={picked} correctPc={q.pc} showResult={phase === 'fb'} />
        )}

        <div className="ig-row">
          {def.listenLabel && phase === 'ask' && q && canAnswer && <button type="button" className="btn btn-soft btn-sm" onClick={() => playAnswer(q)}>{def.listenLabel}</button>}
          {!inSprint && phase === 'ask' && q && <button type="button" className="btn btn-soft btn-sm" onClick={() => setShowHint(true)} disabled={showHint}>Hint</button>}
          {!inSprint && phase === 'ask' && q && q.task === 'find' && <button type="button" className="btn btn-soft btn-sm" onClick={giveUp}>Show me</button>}
          {!inSprint && phase === 'fb' && result && !result.correct && (
            <button type="button" className="btn btn-coral ig-grow" onClick={nextQuestion}>Next →</button>
          )}
        </div>
        <p className="ig-kbd">{def.kbdText ? def.kbdText(task) : task === 'name' ? `Keyboard: A–G to answer${accOn ? ', # or ↑ for sharp, - or ↓ for flat' : ''}, Enter for next.` : 'Tap the instrument to answer.'}</p>
      </>
    );
  }

  return (
    <div className="ig-app">
      <div className="ig-card ig-card--game">
        <div className="ig-modes">
          <Seg label="Mode" value={play} onChange={(v) => { if (v !== play) setPlay(v); }}
            options={[['practice', 'Practice', 'untimed, hints'], ['sprint', 'Sprint', '60 seconds']]} />
        </div>
        {main}
        {def.Controls && !(inSprint && sp.status === 'done') && <def.Controls ctx={ctx} />}
      </div>

      {toast && (
        <div className="ig-toast" role="status">
          <span>Level {toast.level + 1} unlocked: {def.levels[toast.level].label}.</span>
          <button type="button" className="btn btn-coral btn-sm" onClick={() => { setLevel(toast.level); setToast(null); }}>Go to level {toast.level + 1}</button>
          <button type="button" className="ig-x" aria-label="Dismiss" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {breakCard && !inSprint && (
        <div className="ig-card ig-break">
          <button type="button" className="ig-x" aria-label="Dismiss" onClick={() => setBreakCard(null)}>×</button>
          <p className="ig-eyebrow">Nice — {breakCard.n} answers</p>
          <p className="ig-result-line">{breakCard.ok} of {breakCard.n} right ({Math.round((breakCard.ok / breakCard.n) * 100)}%) in that stretch. Keep going, or take a breather.</p>
          <AppCard slug={def.slug} placement="practice-break" compact headline={def.appHeadline} />
        </div>
      )}

      <div className="ig-card ig-settings">
        <div className="ig-field">
          <p className="ig-label">Game</p>
          <Seg label="Game" value={task} onChange={setTask}
            options={[['name', def.tasks.name.label, def.tasks.name.sub], ['find', def.tasks.find.label, def.tasks.find.sub]]} />
        </div>
        {levelPicker}
      </div>

      <div className="ig-card ig-stats">
        <p className="ig-eyebrow">Your accuracy map</p>
        {def.StatsView ? <def.StatsView stats={st.stats} /> : (
          <>
            <p className="ig-small">Every answer you give is saved on this device and drawn on the {def.instrumentNoun} below.</p>
            <div className="ig-instrument ig-instrument--compact">
              <def.Instrument ctx={ctx} q={null} marks={{}} heat={st.stats} compact />
            </div>
            <Legend />
          </>
        )}
        <div className="ig-statgrid">
          <div><span>Session</span><strong>{se.n ? Math.round((se.ok / se.n) * 100) + '%' : '—'}</strong><small>{se.ok}/{se.n} right</small></div>
          <div><span>Best streak</span><strong>{Math.max(st.bestStreak || 0, se.best)}</strong><small>all time</small></div>
          <div><span>Sprint best</span><strong>{best || '—'}</strong><small>level {levelNum}, {def.tasks[task].short}</small></div>
        </div>
        <p className="ig-weak">{weak ? <>Your weakest {def.weakNoun || 'note'}: <strong>{def.keyLabel(weak.k)}</strong> — {Math.round(weak.a * 100)}% over {weak.n} answers. It will come up more often.</> : `Answer a few more and your weakest ${def.weakNoun || 'note'} will show up here.`}</p>
        <button type="button" className="btn-link ig-reset" onClick={() => {
          if (!window.confirm('Reset your saved accuracy, unlocks and personal bests for this game?')) return;
          store.current = { unlocked: 0, recent: {}, stats: {}, w: {}, best: {}, bestStreak: 0, lastLevel: level };
          commit(); force();
        }}>Reset saved stats</button>
      </div>
    </div>
  );
}

export { pcName };
