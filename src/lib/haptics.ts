import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const native = () => Capacitor.isNativePlatform();

// Web fallback via navigator.vibrate (Android Chrome + some mobile browsers).
// iOS Safari ignores it, and desktop browsers don't expose it.
function webVibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* swallow */
  }
}

async function safe<T>(fn: () => Promise<T>, webPattern?: number | number[]) {
  if (native()) {
    try {
      await fn();
    } catch {
      /* swallow — plugins can no-op on older devices */
    }
    return;
  }
  if (webPattern !== undefined) webVibrate(webPattern);
}

export const haptics = {
  light:     () => safe(() => Haptics.impact({ style: ImpactStyle.Light }),  10),
  medium:    () => safe(() => Haptics.impact({ style: ImpactStyle.Medium }), 20),
  heavy:     () => safe(() => Haptics.impact({ style: ImpactStyle.Heavy }),  35),
  success:   () => safe(() => Haptics.notification({ type: NotificationType.Success }), [15, 60, 25]),
  warning:   () => safe(() => Haptics.notification({ type: NotificationType.Warning }), [30, 80, 30]),
  error:     () => safe(() => Haptics.notification({ type: NotificationType.Error }),   [40, 60, 40, 60, 40]),
  selection: () => safe(() => Haptics.selectionStart().then(() => Haptics.selectionEnd()), 8),
};
