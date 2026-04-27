import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

const STREAK_NOTIFICATION_ID = 1001;
const PERMISSION_KEY = 'fifths.notifications.permission';

const native = () => Capacitor.isNativePlatform();

type PermissionState = 'granted' | 'denied' | 'default' | 'unknown';

export async function getNotificationPermission(): Promise<PermissionState> {
  if (!native()) return 'unknown';
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return 'granted';
    if (display === 'denied') return 'denied';
    return 'default';
  } catch {
    return 'unknown';
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!native()) return 'unknown';
  try {
    const { display } = await LocalNotifications.requestPermissions();
    const state: PermissionState = display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default';
    try {
      localStorage.setItem(PERMISSION_KEY, state);
    } catch {
      /* ignore */
    }
    return state;
  } catch {
    return 'unknown';
  }
}

/** Schedule a single reminder for `hoursFromNow`. Cancels prior one first. */
export async function scheduleStreakReminder(hoursFromNow = 22): Promise<void> {
  if (!native()) return;
  const perm = await getNotificationPermission();
  if (perm !== 'granted') return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: STREAK_NOTIFICATION_ID }] });
    const at = new Date(Date.now() + hoursFromNow * 3_600_000);
    const options: ScheduleOptions = {
      notifications: [
        {
          id: STREAK_NOTIFICATION_ID,
          title: "Your ear's ready when you are",
          body: '5 minutes keeps the streak alive.',
          schedule: { at },
          smallIcon: 'ic_stat_notification',
          sound: undefined,
          extra: { kind: 'streak_recovery' },
        },
      ],
    };
    await LocalNotifications.schedule(options);
  } catch (err) {
    console.warn('scheduleStreakReminder failed', err);
  }
}

export async function cancelStreakReminder(): Promise<void> {
  if (!native()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: STREAK_NOTIFICATION_ID }] });
  } catch {
    /* ignore */
  }
}
