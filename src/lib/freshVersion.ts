// Keeps long-lived copies of the app current.
//
// A home-screen web app on iPhone stays in memory for days and resumes instead of
// reloading, so learners kept running a build several deploys old: no live checkout, old
// bugs, and errors when it asked for code files a later deploy had removed (Sentry
// FIFTHS-WEB-1P, -1T, -1V). So when the app comes back to the foreground it asks the server
// which build is live, and if a code file fails to load it knows its build is gone. Either
// way it reloads, but only on a screen where nothing is lost (never mid-lesson), and never
// twice for the same reason, so a broken deploy can't make it loop.

const RELOADED_KEY = 'fifths.reloadedFor';
/** Code that catches a failed import itself (billing does) fires this so the page reloads. */
export const STALE_CODE_EVENT = 'fifths:stale-code';
const CHECK_EVERY_MS = 5 * 60_000;

/** The main bundle a page of HTML loads, like `/assets/index-AbC123.js`. */
export function bundleIn(html: string): string | null {
  const m = /\/assets\/index-[A-Za-z0-9_-]+\.js/.exec(html);
  return m ? m[0] : null;
}

/** The bundle this page is running, or null in local dev (no built bundle). */
export function runningBundle(doc: Document = document): string | null {
  for (const s of Array.from(doc.querySelectorAll('script[src]'))) {
    const b = bundleIn(s.getAttribute('src') ?? '');
    if (b) return b;
  }
  return null;
}

/** The errors browsers give when a code file this build expects is no longer there. */
export function isStaleCodeError(reason: unknown): boolean {
  const msg = reason instanceof Error ? reason.message : String(reason ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|is not a valid JavaScript MIME type|error loading dynamically imported module/i.test(msg);
}

export interface FreshVersionOptions {
  /** True while reloading loses nothing: not in a lesson, results or checkout. */
  canReload: () => boolean;
  reload?: () => void;
  fetchHtml?: () => Promise<string>;
  doc?: Document;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  now?: () => number;
}

export function startFreshVersion(opts: FreshVersionOptions) {
  const doc = opts.doc ?? document;
  const reload = opts.reload ?? (() => window.location.reload());
  const fetchHtml = opts.fetchHtml ?? (() => fetch('/', { cache: 'no-store' }).then((r) => r.text()));
  const now = opts.now ?? Date.now;
  const storage = opts.storage ?? safeSession();
  const running = runningBundle(doc);
  let pending: string | null = null; // why we want to reload: the live bundle, or 'stale-code'
  let lastCheck = now();

  function tryReload() {
    if (!pending || !opts.canReload()) return;
    if (storage?.getItem(RELOADED_KEY) === pending) return; // already reloaded for this once
    storage?.setItem(RELOADED_KEY, pending);
    reload();
  }

  async function check() {
    if (!running || now() - lastCheck < CHECK_EVERY_MS) return;
    lastCheck = now();
    try {
      const live = bundleIn(await fetchHtml());
      if (live && live !== running) {
        pending = live;
        tryReload();
      }
    } catch {
      // Offline or a blip: try again on the next return to the app.
    }
  }

  function staleCode() {
    pending = pending ?? `stale-code:${running ?? 'dev'}`;
    tryReload();
  }

  const onVisible = () => { if (doc.visibilityState === 'visible') void check(); };
  const onPreloadError = (e: Event) => { e.preventDefault(); staleCode(); };
  const onRejection = (e: PromiseRejectionEvent) => { if (isStaleCodeError(e.reason)) staleCode(); };
  doc.addEventListener('visibilitychange', onVisible);
  window.addEventListener('vite:preloadError', onPreloadError);
  window.addEventListener('unhandledrejection', onRejection);
  window.addEventListener(STALE_CODE_EVENT, staleCode);

  return {
    /** Call when the screen changes: a reload that was waiting happens on a safe screen. */
    tryReload,
    check,
    staleCode,
    stop() {
      doc.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('vite:preloadError', onPreloadError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener(STALE_CODE_EVENT, staleCode);
    },
  };
}

function safeSession(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try { return window.sessionStorage; } catch { return null; }
}
