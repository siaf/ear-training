import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { audioEngine } from '../audioEngine';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function platform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/** Keep the native status bar in sync with the current theme. Reads --page / --ink-1
 *  from the document so it always matches the brand tokens, light or dark. */
export async function syncStatusBarToTheme() {
  if (!isNative()) return;
  try {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    if (platform() === 'android') {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue('--page')
        .trim() || (isDark ? '#15101c' : '#fff8ef');
      await StatusBar.setBackgroundColor({ color });
    }
  } catch (err) {
    console.warn('status bar sync failed', err);
  }
}

/** Call once at app boot. No-op on web. */
export async function initNative() {
  if (!isNative()) return;

  await syncStatusBarToTheme();

  try {
    await SplashScreen.hide();
  } catch (err) {
    console.warn('splash hide failed', err);
  }

  // Unlock audio on first user gesture — iOS WebView mirrors Safari's requirement.
  const unlock = () => {
    audioEngine.initialize().catch((e) => console.warn('audio unlock failed', e));
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });

  // Optional: listen for app state changes to stop drone in background.
  App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      try {
        audioEngine.toggleDrone('C', false);
      } catch {
        /* ignore */
      }
    }
  });
}
