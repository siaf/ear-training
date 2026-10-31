/** Tiny hash-free router. Source of truth is React state; URL mirrors it. */

import { useEffect } from 'react';

export type Route = 'onboarding' | 'path' | 'practice' | 'results' | 'settings' | 'stats' | 'paywall' | 'review';

const KNOWN: Route[] = ['onboarding', 'path', 'practice', 'results', 'settings', 'stats', 'paywall', 'review'];

function basePath(): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return base.endsWith('/') ? base : `${base}/`;
}

function stripBase(pathname: string): string {
  const b = basePath();
  return pathname.startsWith(b) ? pathname.slice(b.length) : pathname.replace(/^\//, '');
}

export function parseRouteFromUrl(fallback: Route): Route {
  try {
    const rest = stripBase(window.location.pathname).split('/')[0] || '';
    return (KNOWN as readonly string[]).includes(rest) ? (rest as Route) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Sync URL with route. Only called for routes that make sense to share.
 * `keepQuery` holds on to UTM tags on the first sync so analytics still sees
 * them; `start` is dropped so a reload doesn't restart the deep-linked lesson.
 */
export function syncUrl(route: Route, replace = false, keepQuery = false) {
  try {
    const base = basePath();
    let query = '';
    if (keepQuery) {
      const params = new URLSearchParams(window.location.search);
      params.delete('start');
      query = params.toString() ? `?${params}` : '';
    }
    const target = `${base}${route}${query}`;
    const current = window.location.pathname + window.location.search;
    if (current === target) return;
    if (replace) window.history.replaceState({}, '', target);
    else window.history.pushState({}, '', target);
  } catch {
    /* non-browser / sandboxed — ignore */
  }
}

/** Hook: listen for back/forward and notify parent. */
export function usePopStateRoute(onRoute: (r: Route) => void) {
  useEffect(() => {
    const handler = () => {
      const next = parseRouteFromUrl('path');
      onRoute(next);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [onRoute]);
}
