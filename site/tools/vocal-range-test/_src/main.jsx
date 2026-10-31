// Vocal range test — fifths.io/tools/vocal-range-test/
// Edit and rebuild via:  npm run build:tool:vrt
// React/ReactDOM come from the UMD globals loaded in index.html (same as the
// circle-of-fifths tool); pitchy + ./range.js are bundled in by esbuild.
/* global React, ReactDOM */
import {
  createFrameAnalyzer,
  createStabilityTracker,
  hzToMidiFloat,
  midiToHz,
  prettyNote,
  midiToName,
  estimateVoiceType,
  describeSpan,
  parseResultFromSearch,
  resultQuery,
  VOICE_TYPES,
} from './range.js';

const { useState, useEffect, useRef, useCallback } = React;

const APP_URL =
  'https://app.fifths.io/?start=voice_match_pitch&utm_source=fifths.io&utm_medium=tool&utm_campaign=vocal-range-test';
const PAGE_URL = 'https://fifths.io/tools/vocal-range-test/';
const BUFFER_SIZE = 4096;      // ~85 ms at 48 kHz: enough periods for low bass notes
const SILENT_MIC_MS = 4000;    // pure digital zeros this long = dead mic stream
const QUIET_HINT_MS = 6000;    // no voiced frames this long = nudge the user

// ---------------- Telemetry (posthog / Sentry may be blocked: always guard) ----------------
function phCapture(event, props) {
  try {
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, props || {});
    }
  } catch (_) { /* swallow */ }
}
function sentryMessage(message, level, extra) {
  try {
    if (window.Sentry && typeof window.Sentry.captureMessage === 'function') {
      window.Sentry.captureMessage(message, { level, tags: { area: 'site', tool: 'vocal-range-test' }, extra });
    }
  } catch (_) { /* swallow */ }
}

// ---------------- Mic trouble (mirrors src/lib/micDiagnostics.ts in the app) ----------------
function detectPlatform() {
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports itself as desktop Safari; touch support gives it away.
  const appleMobile = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const iosOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const firefox = /Firefox\//.test(ua);
  const safari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|OPR|Android/.test(ua);
  const mac = /Macintosh/.test(ua) && !appleMobile;
  const inApp = /FBAN|FBAV|Instagram|Line\/|LinkedInApp|TikTok|musical_ly|Snapchat|; wv\)/.test(ua);
  return { appleMobile, android, iosOtherBrowser, firefox, safari, mac, inApp };
}

function classifyMicError(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'no_device';
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') return 'busy';
  if (name === 'Unsupported' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 'unsupported';
  return 'unknown';
}

/** Device-specific steps for the device the visitor is actually holding. */
function micHelp(reason) {
  const p = detectPlatform();
  switch (reason) {
    case 'denied':
      if (p.inApp) {
        return { title: 'This in-app browser blocked the microphone', steps: ['Open this page in Safari or Chrome (use the ⋯ or share menu → "Open in browser"), then tap Try again.'] };
      }
      if (p.appleMobile && p.iosOtherBrowser) {
        return { title: 'Microphone access is blocked', steps: [
          'Open the Settings app → scroll down to your browser (e.g. Chrome) → turn on Microphone.',
          'Come back to this tab and tap Try again.',
        ] };
      }
      if (p.appleMobile) {
        return { title: 'Microphone access is blocked', steps: [
          'In Safari, tap the "aA" (or ⋯) button in the address bar → Website Settings → Microphone → Allow.',
          'If that option is greyed out, check Settings → Screen Time → Content & Privacy Restrictions → Microphone.',
          'Then tap Try again.',
        ] };
      }
      if (p.android) {
        return { title: 'Microphone access is blocked', steps: [
          'Tap the icon to the left of the address bar → Permissions → Microphone → Allow.',
          'Still blocked? Open Settings → Apps → Chrome (or your browser) → Permissions → Microphone → Allow.',
          'Then tap Try again.',
        ] };
      }
      if (p.safari) {
        return { title: 'Microphone access is blocked', steps: [
          'In the menu bar, choose Safari → Settings for fifths.io… → Microphone → Allow.',
          'Then tap Try again.',
        ] };
      }
      if (p.firefox) {
        return { title: 'Microphone access is blocked', steps: [
          'Click the microphone/permissions icon at the left of the address bar and clear the "Blocked" setting.',
          'Then tap Try again and choose Allow.',
        ] };
      }
      return { title: 'Microphone access is blocked', steps: [
        'Click the lock or settings icon at the left of the address bar and set Microphone to Allow.',
        p.mac
          ? 'On a Mac, also check System Settings → Privacy & Security → Microphone and make sure your browser is switched on.'
          : 'On Windows, also check Settings → Privacy & security → Microphone and allow desktop apps / your browser.',
        'Then tap Try again.',
      ] };
    case 'no_device':
      return { title: 'No microphone found', steps: [
        p.appleMobile || p.android
          ? 'Your device didn’t report a microphone. Unplug any adapter or headset and try again.'
          : 'Plug in a headset or USB microphone, or check that your built-in mic isn’t disabled in your system sound settings.',
        'Then tap Try again.',
      ] };
    case 'busy':
      return { title: 'The microphone is busy', steps: [
        'Another app is using the microphone (a call, FaceTime, Zoom, or a recorder). Close it, then tap Try again.',
      ] };
    case 'unsupported':
      return { title: 'This browser can’t use the microphone', steps: [
        p.inApp
          ? 'You’re in an in-app browser (Instagram, Facebook, TikTok…) that blocks the microphone. Open this page in Safari or Chrome.'
          : p.appleMobile
            ? 'Open this page in Safari.'
            : 'Try the latest Chrome, Safari, Edge, or Firefox.',
      ] };
    case 'silent':
      return { title: 'We have mic access but can’t hear anything', steps: [
        p.appleMobile
          ? 'Make sure nothing else is using the mic and unplug any headset. If it still fails, close and reopen the tab.'
          : 'Check that the right input device is selected (and not muted) in your system sound settings.',
        'Then tap Try again.',
      ] };
    default:
      return { title: 'Something went wrong opening the microphone', steps: ['Tap Try again, or reload the page.'] };
  }
}

// ---------------- Mic + analysis ----------------
async function openMic() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !Ctx) {
    const e = new Error('getUserMedia or AudioContext unavailable');
    e.name = 'Unsupported';
    throw e;
  }
  // Raw signal: browser noise suppression treats a sustained sung tone as noise
  // and AGC flattens dynamics. Same constraints as the app's pitchDetector.ts.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    video: false,
  });
  const ctx = new Ctx();
  if (ctx.state !== 'running') { try { await ctx.resume(); } catch (_) { /* ignore */ } }
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = BUFFER_SIZE;
  source.connect(analyser);
  return { ctx, stream, source, analyser };
}

function closeMic(mic) {
  if (!mic) return;
  try { mic.source.disconnect(); } catch (_) { /* ignore */ }
  try { mic.stream.getTracks().forEach((t) => t.stop()); } catch (_) { /* ignore */ }
  try { mic.ctx.close(); } catch (_) { /* ignore */ }
}

function readFrame(analyser, buf, byteBuf) {
  if (analyser.getFloatTimeDomainData) {
    analyser.getFloatTimeDomainData(buf);
  } else {
    analyser.getByteTimeDomainData(byteBuf);
    for (let i = 0; i < buf.length; i++) buf[i] = (byteBuf[i] - 128) / 128;
  }
}

// ---------------- Playback (tiny Web Audio synth, no samples) ----------------
let playCtx = null;
function getPlayCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!playCtx || playCtx.state === 'closed') playCtx = new Ctx();
  if (playCtx.state !== 'running') playCtx.resume().catch(() => {});
  return playCtx;
}
function makeVoice(ctx, t0, dur) {
  // Harmonic-rich tone so low notes are audible on phone speakers that can't
  // reproduce an 82 Hz fundamental (the ear infers it from the overtones).
  const real = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]);
  const imag = new Float32Array([0, 1, 0.55, 0.35, 0.22, 0.14, 0.09, 0.05]);
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.35);
  g.gain.setValueAtTime(0.14, t0 + dur - 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
  return osc;
}
function playNote(midi, dur = 1.2) {
  const ctx = getPlayCtx(); if (!ctx) return;
  const t0 = ctx.currentTime + 0.03;
  makeVoice(ctx, t0, dur).frequency.setValueAtTime(midiToHz(midi), t0);
}
function playSweep(low, high) {
  const ctx = getPlayCtx(); if (!ctx) return;
  const t0 = ctx.currentTime + 0.03;
  const dur = 2.6;
  const osc = makeVoice(ctx, t0, dur);
  osc.frequency.setValueAtTime(midiToHz(low), t0);
  osc.frequency.setValueAtTime(midiToHz(low), t0 + 0.5);
  osc.frequency.exponentialRampToValueAtTime(midiToHz(high), t0 + dur - 0.6);
}

// ---------------- Share helpers ----------------
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

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Draws a 1200×630 result card. Synchronous so share/download stay inside the tap gesture. */
function drawResultCanvas(low, high, vt) {
  const W = 1200, H = 630;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const page = '#fff8ef', ink1 = '#2a1d3a', ink2 = '#54466b', ink3 = '#8a7b9d';
  const coral = '#ff8a6b', coralInk = '#c64632', hair = '#ebe1ef', lav = '#c8b8ff';
  c.fillStyle = page; c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffffff'; roundRect(c, 40, 40, W - 80, H - 80, 36); c.fill();
  c.strokeStyle = hair; c.lineWidth = 2; c.stroke();

  c.fillStyle = ink3; c.font = '600 22px "JetBrains Mono", ui-monospace, monospace';
  c.fillText('VOCAL RANGE TEST', 96, 118);
  c.fillStyle = ink1; c.font = '700 112px Fraunces, "DM Serif Display", Georgia, serif';
  c.fillText(prettyNote(low) + ' – ' + prettyNote(high), 90, 240);
  c.fillStyle = ink2; c.font = '500 32px Outfit, system-ui, sans-serif';
  c.fillText(describeSpan(high - low) + '  ·  closest voice type: ' + vt.label, 96, 298);

  // Mini range chart
  const axisMin = Math.min(36, Math.floor(low / 12) * 12);
  const axisMax = Math.max(84, Math.ceil(high / 12) * 12);
  const x0 = 290, x1 = W - 96, rowH = 30, top = 340;
  const X = (m) => x0 + ((m - axisMin) / (axisMax - axisMin)) * (x1 - x0);
  const rows = VOICE_TYPES.slice().reverse();
  const matchIds = vt.types.map((t) => t.id);
  c.fillStyle = 'rgba(255,138,107,0.16)';
  c.fillRect(X(low), top - 8, X(high) - X(low), rows.length * rowH + 8);
  rows.forEach((v, i) => {
    const y = top + i * rowH;
    const hit = matchIds.indexOf(v.id) >= 0;
    c.fillStyle = hit ? ink1 : ink3;
    c.font = (hit ? '700 ' : '500 ') + '20px Outfit, system-ui, sans-serif';
    c.fillText(v.label, 96, y + 17);
    c.fillStyle = hit ? lav : '#efe8f3';
    roundRect(c, X(v.low), y + 2, X(v.high) - X(v.low), 18, 9); c.fill();
  });
  c.strokeStyle = coral; c.lineWidth = 3;
  [low, high].forEach((m) => { c.beginPath(); c.moveTo(X(m), top - 8); c.lineTo(X(m), top + rows.length * rowH); c.stroke(); });

  c.fillStyle = coralInk; c.font = '600 24px Outfit, system-ui, sans-serif';
  c.fillText('Test yours free → fifths.io/tools/vocal-range-test', 96, H - 70);
  return cv;
}

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ---------------- Visual components ----------------
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const isWhite = (m) => WHITE_PCS.indexOf(((m % 12) + 12) % 12) >= 0;

function axisFor(low, high) {
  let min = 36, max = 84; // C2..C6 covers the six standard voice types
  if (low != null) min = Math.min(min, Math.floor(low / 12) * 12);
  if (high != null) max = Math.max(max, Math.ceil(high / 12) * 12);
  return { min, max };
}

function Piano({ low, high, live }) {
  const { min, max } = axisFor(low, high);
  const whites = [];
  for (let m = min; m <= max; m++) if (isWhite(m)) whites.push(m);
  const KW = 24, KH = 96, BW = 14, BH = 58;
  const W = whites.length * KW;
  const liveNote = live != null ? Math.round(live) : null;
  const inRange = (m) => low != null && high != null && m >= low && m <= high;
  const fillFor = (m, white) => {
    if (m === liveNote) return 'var(--lav)';
    if (m === low) return 'var(--mint)';
    if (m === high) return 'var(--coral)';
    if (inRange(m)) return white ? 'var(--butter-soft)' : 'var(--butter-ink)';
    return white ? 'var(--card)' : 'var(--ink-1)';
  };
  const blacks = [];
  whites.forEach((m, i) => {
    if (m + 1 <= max && !isWhite(m + 1)) blacks.push({ m: m + 1, x: (i + 1) * KW - BW / 2 });
  });
  return (
    <div className="vr-piano">
      <svg viewBox={`0 0 ${W} ${KH}`} preserveAspectRatio="none" role="img"
        aria-label={low != null ? `Piano from ${prettyNote(min)} to ${prettyNote(max)}` : 'Piano keyboard'}>
        {whites.map((m, i) => (
          <rect key={m} x={i * KW + 0.5} y={0.5} width={KW - 1} height={KH - 1} rx={3}
            fill={fillFor(m, true)} stroke="var(--hairline)" strokeWidth={1} />
        ))}
        {blacks.map(({ m, x }) => (
          <rect key={m} x={x} y={0} width={BW} height={BH} rx={2} fill={fillFor(m, false)} />
        ))}
      </svg>
      <div className="vr-piano-labels" aria-hidden="true">
        {whites.map((m, i) => (m % 12 === 0 ? (
          <span key={m} style={{ left: `${((i + 0.5) / whites.length) * 100}%` }}>{midiToName(m)}</span>
        ) : null))}
      </div>
    </div>
  );
}

function RangeChart({ low, high, matchIds }) {
  const { min, max } = axisFor(low, high);
  const pct = (m) => ((m - min) / (max - min)) * 100;
  const rows = VOICE_TYPES.slice().reverse();
  const ticks = [];
  for (let m = min; m <= max; m += 12) ticks.push(m);
  return (
    <div className="vr-chart" role="img"
      aria-label={`Your range ${prettyNote(low)} to ${prettyNote(high)} compared with standard voice-type ranges`}>
      <div className="vr-chart-row vr-chart-ticks" aria-hidden="true">
        <span className="vr-chart-label" />
        <span className="vr-chart-track">
          {ticks.map((m) => <span key={m} className="vr-tick" style={{ left: `${pct(m)}%` }}>{midiToName(m)}</span>)}
        </span>
      </div>
      <div className="vr-chart-body">
        <div className="vr-chart-row vr-chart-you">
          <span className="vr-chart-label">You</span>
          <span className="vr-chart-track">
            <span className="vr-bar vr-bar-you" style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }} />
          </span>
        </div>
        {rows.map((v) => {
          const hit = matchIds.indexOf(v.id) >= 0;
          return (
            <div key={v.id} className={'vr-chart-row' + (hit ? ' is-match' : '')}>
              <span className="vr-chart-label">{v.label}</span>
              <span className="vr-chart-track">
                <span className="vr-bar" style={{ left: `${pct(v.low)}%`, width: `${pct(v.high) - pct(v.low)}%` }}
                  title={`${v.label}: ${prettyNote(v.low)}–${prettyNote(v.high)}`} />
              </span>
            </div>
          );
        })}
        <div className="vr-chart-band" aria-hidden="true">
          <span style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }} />
        </div>
      </div>
      <p className="vr-chart-note">Bars show the conventional range for each voice type. The shaded band is yours.</p>
    </div>
  );
}

function MicTrouble({ reason, onRetry }) {
  const help = micHelp(reason);
  return (
    <div className="vr-trouble" role="alert">
      <h2 className="vr-step-title">{help.title}</h2>
      <ol>{help.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      <button type="button" className="btn btn-ink" onClick={onRetry}>Try again</button>
    </div>
  );
}

// ---------------- App ----------------
function App() {
  const initial = typeof window !== 'undefined' ? parseResultFromSearch(window.location.search) : null;
  const [phase, setPhase] = useState(initial ? 'result' : 'intro');
  const [result, setResult] = useState(initial ? { ...initial, fromLink: true } : null);
  const [errorReason, setErrorReason] = useState(null);
  const [live, setLive] = useState({ midi: null, progress: 0, hz: null });
  const [lowest, setLowest] = useState(null);
  const [highest, setHighest] = useState(null);
  const [quiet, setQuiet] = useState(false);
  const [toast, setToast] = useState('');
  const sessionRef = useRef(null);

  const stopSession = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    s.running = false;
    if (s.raf) cancelAnimationFrame(s.raf);
    closeMic(s.mic);
    sessionRef.current = null;
  }, []);

  useEffect(() => {
    const onHide = () => stopSession();
    window.addEventListener('pagehide', onHide);
    return () => { window.removeEventListener('pagehide', onHide); stopSession(); };
  }, [stopSession]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const fail = useCallback((reason, err, where) => {
    stopSession();
    setErrorReason(reason);
    setPhase('error');
    const props = {
      reason,
      where,
      error_name: err && err.name,
      error_message: err && err.message,
      apple_mobile: detectPlatform().appleMobile,
    };
    phCapture('tool_mic_failed', props);
    // Refusing permission is a choice, not a bug: log it quietly.
    sentryMessage('tool_mic_failed: ' + reason, reason === 'denied' ? 'info' : 'warning', props);
  }, [stopSession]);

  const tick = useCallback(() => {
    const s = sessionRef.current;
    if (!s || !s.running) return;
    const now = performance.now();
    readFrame(s.mic.analyser, s.buf, s.byteBuf);
    const f = s.analyze(s.buf, s.mic.ctx.sampleRate);

    if (!s.heard) {
      if (f.sumSq > 0) s.heard = true;
      else if (now - s.openedAt > SILENT_MIC_MS) { fail('silent', null, s.phase); return; }
    }
    if (f.hz) s.lastVoiced = now;

    const out = s.tracker.push(f.hz ? hzToMidiFloat(f.hz) : null, now);
    if (out.stable != null) {
      if (s.phase === 'low' && (s.lowest == null || out.stable < s.lowest)) {
        s.lowest = out.stable; setLowest(out.stable);
      } else if (s.phase === 'high' && out.stable > s.lowest && (s.highest == null || out.stable > s.highest)) {
        s.highest = out.stable; setHighest(out.stable);
      }
    }
    setLive({ midi: out.live, progress: out.progress, hz: f.hz });
    setQuiet(now - Math.max(s.phaseStart, s.lastVoiced) > QUIET_HINT_MS);
    s.raf = requestAnimationFrame(tick);
  }, [fail]);

  const start = useCallback(async (source) => {
    stopSession();
    phCapture('tool_range_started', { source });
    setErrorReason(null);
    setLowest(null); setHighest(null); setQuiet(false);
    setLive({ midi: null, progress: 0, hz: null });
    setPhase('starting');
    let mic;
    try {
      mic = await openMic();
    } catch (err) {
      fail(classifyMicError(err), err, 'open');
      return;
    }
    const now = performance.now();
    const s = {
      mic,
      running: true,
      raf: 0,
      buf: new Float32Array(BUFFER_SIZE),
      byteBuf: new Uint8Array(BUFFER_SIZE),
      analyze: createFrameAnalyzer(BUFFER_SIZE),
      tracker: createStabilityTracker({ holdMs: 400 }),
      phase: 'low',
      phaseStart: now,
      openedAt: now,
      lastVoiced: 0,
      heard: false,
      lowest: null,
      highest: null,
    };
    mic.stream.getAudioTracks().forEach((t) => t.addEventListener('ended', () => {
      if (sessionRef.current === s && s.running) fail('silent', { name: 'TrackEnded' }, s.phase);
    }));
    sessionRef.current = s;
    setPhase('low');
    s.raf = requestAnimationFrame(tick);
  }, [fail, stopSession, tick]);

  const toHigh = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.lowest == null) return;
    s.phase = 'high';
    s.phaseStart = performance.now();
    s.tracker.reset();
    setQuiet(false);
    setPhase('high');
  }, []);

  const finish = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.lowest == null || s.highest == null) return;
    const low = s.lowest, high = s.highest;
    stopSession();
    const vt = estimateVoiceType(low, high);
    setResult({ low, high, fromLink: false });
    setPhase('result');
    try { window.history.replaceState(null, '', window.location.pathname + resultQuery(low, high)); } catch (_) { /* ignore */ }
    phCapture('tool_range_completed', {
      low: midiToName(low),
      high: midiToName(high),
      semitones: high - low,
      voice_type: vt.types.map((t) => t.id).join('/'),
      tentative: vt.tentative,
    });
  }, [stopSession]);

  const restart = useCallback(() => {
    try { window.history.replaceState(null, '', window.location.pathname); } catch (_) { /* ignore */ }
    setResult(null);
    start(result && result.fromLink ? 'shared_link' : 'retake');
  }, [start, result]);

  // ---------- Views ----------
  if (phase === 'intro') {
    return (
      <div className="vr-card vr-intro">
        <h2 className="vr-step-title">Find your vocal range in about a minute</h2>
        <ol className="vr-steps">
          <li><strong>Sing your lowest comfortable note</strong> on an open “ahh” and hold it for about a second.</li>
          <li><strong>Then your highest comfortable note</strong>, in a clear voice, not a squeak or a shout.</li>
          <li><strong>Get your range</strong> and the voice types it lines up with.</li>
        </ol>
        <button type="button" className="btn btn-coral vr-start" onClick={() => start('intro')}>Start the test</button>
        <p className="vr-fine">Uses your microphone. Audio is analysed on your device and never recorded or uploaded. A quiet room helps.</p>
      </div>
    );
  }

  if (phase === 'starting') {
    return (
      <div className="vr-card vr-center">
        <h2 className="vr-step-title">Opening the microphone…</h2>
        <p className="vr-muted">If your browser asks, tap <strong>Allow</strong>.</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="vr-card">
        <MicTrouble reason={errorReason} onRetry={() => start('retry')} />
      </div>
    );
  }

  if (phase === 'low' || phase === 'high') {
    const isLow = phase === 'low';
    const liveNote = live.midi != null ? Math.round(live.midi) : null;
    const holding = liveNote != null && live.progress < 1;
    return (
      <div className="vr-card vr-capture">
        <div className="vr-stepper" aria-hidden="true">
          <span className={isLow ? 'is-on' : 'is-done'}>1 · Low</span>
          <span className={!isLow ? 'is-on' : ''}>2 · High</span>
        </div>
        <h2 className="vr-step-title">{isLow ? 'Sing your lowest comfortable note' : 'Now sing your highest comfortable note'}</h2>
        <p className="vr-muted">
          {isLow
            ? 'Start in the middle of your voice and slide down slowly on “ahh”. Hold the lowest note you can sing clearly (no croaking) for about a second.'
            : 'Slide up slowly. Hold the highest note you can sing clearly without straining for about a second. Head voice is fine; stop before it turns into a squeak.'}
        </p>

        <div className="vr-readout" aria-live="polite">
          <div className={'vr-note' + (liveNote == null ? ' is-idle' : '')}>
            {liveNote != null ? prettyNote(liveNote) : '—'}
          </div>
          <div className="vr-hold">
            <span style={{ width: `${Math.round((liveNote != null ? live.progress : 0) * 100)}%` }} />
          </div>
          <div className="vr-status">
            {liveNote == null
              ? (quiet ? 'Can’t hear you yet. Sing a little louder or move closer to the mic.' : 'Listening… sing “ahh”')
              : holding ? 'Hold it steady…' : 'Got it'}
          </div>
        </div>

        <Piano low={lowest} high={isLow ? null : highest} live={live.midi} />

        <div className="vr-captured">
          {isLow
            ? (lowest != null
              ? <>Lowest so far: <strong>{prettyNote(lowest)}</strong>. Try one note lower, or continue.</>
              : 'No note locked in yet.')
            : (highest != null
              ? <>Highest so far: <strong>{prettyNote(highest)}</strong>. Try one note higher, or see your result.</>
              : <>Lowest: <strong>{prettyNote(lowest)}</strong>. Now go up.</>)}
        </div>

        <div className="vr-actions">
          {isLow
            ? <button type="button" className="btn btn-coral" disabled={lowest == null} onClick={toHigh}>That’s my lowest →</button>
            : <button type="button" className="btn btn-coral" disabled={highest == null} onClick={finish}>See my result →</button>}
          <button type="button" className="btn btn-soft btn-sm" onClick={() => start('restart')}>Start over</button>
        </div>
      </div>
    );
  }

  // ---------- Result ----------
  const { low, high, fromLink } = result;
  const vt = estimateVoiceType(low, high);
  const semis = high - low;
  const shareUrl = PAGE_URL + resultQuery(low, high);

  const onCopy = async () => {
    const ok = await copyText(shareUrl);
    setToast(ok ? 'Link copied' : 'Couldn’t copy. Copy the address bar instead.');
    if (ok) phCapture('tool_range_shared', { method: 'copy_link', low: midiToName(low), high: midiToName(high) });
  };
  const onImage = () => {
    try {
      const dataUrl = drawResultCanvas(low, high, vt).toDataURL('image/png');
      const fname = `vocal-range-${midiToName(low)}-${midiToName(high)}.png`.replace(/#/g, 's');
      const blob = dataUrlToBlob(dataUrl);
      let file = null;
      try { file = new File([blob], fname, { type: 'image/png' }); } catch (_) { /* old Safari */ }
      const p = detectPlatform();
      if (file && (p.appleMobile || p.android) && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'My vocal range', text: shareUrl }).catch(() => {});
        phCapture('tool_range_shared', { method: 'image_share', low: midiToName(low), high: midiToName(high) });
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      phCapture('tool_range_shared', { method: 'image_download', low: midiToName(low), high: midiToName(high) });
    } catch (err) {
      setToast('Couldn’t create the image.');
      sentryMessage('vocal-range image export failed: ' + (err && err.message), 'warning');
    }
  };

  return (
    <div className="vr-card vr-result">
      <div className="vr-eyebrow">{fromLink ? 'Shared vocal range' : 'Your vocal range'}</div>
      <div className="vr-range">{prettyNote(low)} <span>–</span> {prettyNote(high)}</div>
      <div className="vr-span">{describeSpan(semis)} <span className="vr-muted">({semis} semitones)</span></div>

      <div className="vr-type">
        <div className="vr-type-label">Closest voice type</div>
        <div className="vr-type-value">{vt.label}</div>
        {vt.tentative && (
          <p className="vr-type-tent">That’s a fairly narrow range, so this is a rough guess. Try again after a warm-up and you’ll often find a few more notes at each end.</p>
        )}
        <p className="vr-honest">Range is only one clue. Voice teachers also listen to your timbre (the colour of your voice), your tessitura (where it sits most comfortably), and where your register shifts happen. Treat this as a starting point, not a label.</p>
      </div>

      <div className="vr-play">
        <button type="button" className="btn btn-soft btn-sm" onClick={() => playNote(low)}>▶ Low {prettyNote(low)}</button>
        <button type="button" className="btn btn-soft btn-sm" onClick={() => playNote(high)}>▶ High {prettyNote(high)}</button>
        <button type="button" className="btn btn-soft btn-sm" onClick={() => playSweep(low, high)}>▶ Low → high</button>
      </div>
      <p className="vr-fine vr-fine-left">No sound on iPhone? Check the silent switch.</p>

      <RangeChart low={low} high={high} matchIds={vt.types.map((t) => t.id)} />

      <div className="vr-cta">
        <strong>Know your range? Now sing in tune across it.</strong>
        <p>Fifths’ Voice lessons start with matching a single note, then build to steps, skips, arpeggios and scales, with your mic checking every note you sing.</p>
        <a className="btn btn-coral vr-cta-btn" href={APP_URL} data-ph-track data-ph-cta="tool-result">Train your pitch with Fifths — free</a>
      </div>

      <div className="vr-share">
        <button type="button" className="btn btn-soft btn-sm" onClick={onCopy}>Copy link</button>
        <button type="button" className="btn btn-soft btn-sm" onClick={onImage}>Save image</button>
        <button type="button" className="btn btn-ink btn-sm" onClick={restart}>{fromLink ? 'Take the test yourself' : 'Test again'}</button>
      </div>
      <div className="vr-toast" role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(<App />);
