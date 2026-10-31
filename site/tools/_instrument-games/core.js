// Shared, DOM-free logic for the instrument note games (piano-notes,
// guitar-fretboard-notes). Imported by each tool's main.jsx and by the
// verification scripts. Bundled into each tool by esbuild.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
export const BLACK_PCS = [1, 3, 6, 8, 10];

// Pitch-class names. Naturals have one standard name; black keys get both.
const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

export const pcOf = (midi) => ((midi % 12) + 12) % 12;
export const isBlack = (pc) => BLACK_PCS.indexOf(pcOf(pc)) >= 0;
export const sharpName = (pc) => SHARP_NAMES[pcOf(pc)];
export const flatName = (pc) => FLAT_NAMES[pcOf(pc)];
// "F♯/G♭" for black keys, "F" for naturals.
export const pcName = (pc) => (isBlack(pc) ? sharpName(pc) + '/' + flatName(pc) : sharpName(pc));
// Plain-ASCII name for analytics: "F#/Gb".
export const pcAscii = (pc) => pcName(pc).replace(/♯/g, '#').replace(/♭/g, 'b');
export const midiOctave = (midi) => Math.floor(midi / 12) - 1;
export const midiName = (midi) => sharpName(midi) + midiOctave(midi);
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Answer check for the letter pad. acc: -1 flat, 0 natural, 1 sharp.
// Only standard spellings count: F is "F" (not E♯); a black key is its sharp
// or its flat name.
export function answerMatches(pc, letter, acc) {
  const target = pcOf(pc);
  if (acc === 0) return NATURAL_PC[letter] === target;
  if (!isBlack(target)) return false;
  return pcOf(NATURAL_PC[letter] + acc) === target;
}

export function answerLabel(letter, acc) {
  return LETTERS[letter] + (acc === 1 ? '♯' : acc === -1 ? '♭' : '');
}

// ---- Weighted picking ---------------------------------------------------
// Each position carries a weight w (default 1). A miss pushes it up, a correct
// answer decays it back toward 1, so missed notes come back more often.
export function bumpWeight(w, correct) {
  const cur = typeof w === 'number' ? w : 1;
  return correct ? Math.max(1, cur * 0.6) : Math.min(8, cur + 2);
}

export function weightedPick(items, weightOf, rng = Math.random) {
  if (!items.length) return null;
  let total = 0;
  const ws = items.map((it) => { const w = Math.max(0.01, weightOf(it)); total += w; return w; });
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

// ---- Level unlock -------------------------------------------------------
export const UNLOCK_WINDOW = 15;
export const UNLOCK_ACCURACY = 0.85;
export function passesUnlock(recent) {
  if (!recent || recent.length < UNLOCK_WINDOW) return false;
  const last = recent.slice(-UNLOCK_WINDOW);
  return last.filter(Boolean).length / last.length >= UNLOCK_ACCURACY;
}

// ---- Sprint scoring -----------------------------------------------------
export const SPRINT_SECONDS = 60;
// ×1, then ×2 after 5 in a row, ×3 after 10, ×4 (max) after 15.
export const comboMultiplier = (streak) => Math.min(4, 1 + Math.floor(streak / 5));

// ---- Stats --------------------------------------------------------------
export function accuracyOf(s) { return s && s.n ? s.ok / s.n : null; }

export function weakestKey(stats, minSeen = 3) {
  let best = null;
  Object.keys(stats || {}).forEach((k) => {
    const s = stats[k];
    if (!s || s.n < minSeen) return;
    const a = s.ok / s.n;
    if (a >= 1) return;
    if (!best || a < best.a || (a === best.a && s.n > best.n)) best = { k, a, n: s.n };
  });
  return best;
}

// Heat colour for a position's accuracy (null → no colour).
export function heatColor(s) {
  if (!s || !s.n) return null;
  const a = s.ok / s.n;
  if (a >= 0.9) return 'var(--ig-heat-good)';
  if (a >= 0.7) return 'var(--ig-heat-mid)';
  return 'var(--ig-heat-bad)';
}

// ---- Storage ------------------------------------------------------------
export function loadStore(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === 'object') return v;
  } catch (_) { /* private mode / blocked */ }
  return {};
}
export function saveStore(key, v) {
  try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* ignore */ }
}

// ---- Funnel + analytics -------------------------------------------------
export function appUrl(slug, content) {
  return 'https://app.fifths.io/?utm_source=fifths.io&utm_medium=tool&utm_campaign=' +
    encodeURIComponent(slug) + (content ? '&utm_content=' + encodeURIComponent(content) : '');
}

export function phCapture(event, props) {
  try {
    if (typeof window !== 'undefined' && window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(event, props || {});
    }
  } catch (_) { /* swallow */ }
}
