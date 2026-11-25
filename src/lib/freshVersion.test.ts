import { afterEach, describe, expect, it, vi } from 'vitest';
import { bundleIn, isStaleCodeError, runningBundle, startFreshVersion, STALE_CODE_EVENT } from './freshVersion';

const OLD = '/assets/index-OLD111.js';
const NEW = '/assets/index-NEW222.js';
const page = (bundle: string) => `<!doctype html><html><head><script type="module" crossorigin src="${bundle}"></script></head></html>`;

function setup(opts: { safe?: boolean; live?: string; running?: string | null } = {}) {
  const doc = document.implementation.createHTMLDocument('app');
  if (opts.running !== null) {
    const s = doc.createElement('script');
    s.setAttribute('src', opts.running ?? OLD);
    doc.head.append(s);
  }
  const store = new Map<string, string>();
  const reload = vi.fn();
  let t = 0;
  let safe = opts.safe ?? true;
  const f = startFreshVersion({
    canReload: () => safe,
    reload,
    fetchHtml: async () => page(opts.live ?? NEW),
    doc,
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) },
    now: () => t,
  });
  return { f, reload, store, later: (ms: number) => { t += ms; }, setSafe: (v: boolean) => { safe = v; } };
}

let stops: (() => void)[] = [];
afterEach(() => { stops.forEach((s) => s()); stops = []; });

describe('freshVersion', () => {
  it('reads the bundle from the HTML and from the running page', () => {
    expect(bundleIn(page(NEW))).toBe(NEW);
    expect(bundleIn('<script type="module" src="/src/main.tsx"></script>')).toBeNull(); // local dev
    const doc = document.implementation.createHTMLDocument('x');
    doc.head.innerHTML = `<script type="module" src="${OLD}"></script>`;
    expect(runningBundle(doc)).toBe(OLD);
  });

  it("recognises the browsers' errors for a code file that's gone", () => {
    expect(isStaleCodeError(new TypeError('Failed to fetch dynamically imported module: https://app.fifths.io/assets/Purchases.es-vZMxKF6S.js'))).toBe(true);
    expect(isStaleCodeError(new TypeError("'text/html' is not a valid JavaScript MIME type."))).toBe(true);
    expect(isStaleCodeError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleCodeError(new Error('There was a credentials issue.'))).toBe(false);
  });

  it('reloads into a newer live build on a safe screen, at most every five minutes', async () => {
    const { f, reload, later } = setup();
    stops.push(f.stop);
    await f.check();
    expect(reload).not.toHaveBeenCalled(); // just started: nothing to check yet
    later(5 * 60_000);
    await f.check();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('waits for the end of a lesson before reloading', async () => {
    const { f, reload, later, setSafe } = setup({ safe: false });
    stops.push(f.stop);
    later(5 * 60_000);
    await f.check();
    expect(reload).not.toHaveBeenCalled();
    setSafe(true);
    f.tryReload(); // the app calls this whenever the screen changes
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('leaves the current build alone, and does nothing in local dev', async () => {
    const same = setup({ live: OLD });
    stops.push(same.f.stop);
    same.later(5 * 60_000);
    await same.f.check();
    expect(same.reload).not.toHaveBeenCalled();
    const dev = setup({ running: null });
    stops.push(dev.f.stop);
    dev.later(5 * 60_000);
    await dev.f.check();
    expect(dev.reload).not.toHaveBeenCalled();
  });

  it('reloads once when a code file has gone, and never loops', () => {
    const { f, reload } = setup();
    stops.push(f.stop);
    window.dispatchEvent(new Event(STALE_CODE_EVENT));
    expect(reload).toHaveBeenCalledTimes(1);
    // Same reason again (as after a reload that didn't help): no second reload.
    window.dispatchEvent(new Event(STALE_CODE_EVENT));
    f.staleCode();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
