import { useEffect } from 'react';
import { syncStatusBarToTheme } from './native';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'fifths.theme';

export function loadThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  // Design spec is light-only. Dark is strictly opt-in.
  return 'light';
}

export function saveThemePreference(p: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, p);
  } catch {
    /* ignore */
  }
}

/** Applies the preference by setting or removing <html data-theme>. */
export function applyTheme(p: ThemePreference) {
  try {
    const root = document.documentElement;
    if (p === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', p);
    // Match the web theme-color and native status bar so the chrome matches the page.
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (meta) {
      const styles = getComputedStyle(root);
      const page = styles.getPropertyValue('--page').trim();
      if (page) meta.setAttribute('content', page);
    }
    void syncStatusBarToTheme();
  } catch {
    /* ignore */
  }
}

/** Hook that applies + persists the preference. */
export function useTheme(preference: ThemePreference) {
  useEffect(() => {
    applyTheme(preference);
    saveThemePreference(preference);
  }, [preference]);
}
