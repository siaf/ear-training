import * as Sentry from '@sentry/react';
import { platform } from './native';
import { phCapture } from './posthog';

// Why the mic isn't giving us audio. Each kind maps to different advice for the user.
export type MicProblem =
  | 'denied'       // permission refused (site setting, app setting, or Screen Time restriction)
  | 'busy'         // another app holds the mic (FaceTime, a call, a recorder)
  | 'unsupported'  // no mediaDevices API (old browser, in-app webview, non-https)
  | 'silent'       // permission granted, but the stream delivers pure digital silence
  | 'unknown';

export function classifyMicError(err: unknown): MicProblem {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') return 'busy';
  if (name === 'NotFoundError' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }
  return 'unknown';
}

function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as desktop Safari; touch support gives it away.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Plain-language steps to fix the problem on the device the user is actually holding. */
export function micHelpText(problem: MicProblem): string {
  const p = platform();
  const apple = p === 'ios' || isAppleMobile();

  switch (problem) {
    case 'denied':
      if (p === 'ios') {
        return 'open the Settings app → Apps → Fifths → turn on Microphone, then come back and tap try again.';
      }
      if (p === 'android') {
        return 'open Settings → Apps → Fifths → Permissions → Microphone → Allow, then tap try again.';
      }
      if (apple) {
        return 'in Safari, tap the "aA" (or ⋯) button in the address bar → Website Settings → Microphone → Allow, then tap try again. If that option is greyed out, check Settings → Screen Time → Content & Privacy Restrictions → Microphone.';
      }
      return 'click the lock or mic icon in the address bar, set Microphone to Allow, then tap try again.';
    case 'busy':
      return 'another app is using the microphone (a call, FaceTime, or a recorder). Close it, then tap try again.';
    case 'unsupported':
      return apple
        ? 'this browser can’t use the microphone. Open app.fifths.io in Safari, or use the Fifths app.'
        : 'this browser can’t use the microphone. Try the latest Chrome, Safari, or Firefox.';
    case 'silent':
      return apple
        ? 'we have mic access but can’t hear anything. Make sure nothing else is using the mic, unplug any headset, then tap try again. If it still fails, close and reopen the app or tab.'
        : 'we have mic access but can’t hear anything. Check your input device in system sound settings, then tap try again.';
    case 'unknown':
      return 'something went wrong opening the microphone. Tap try again, or reload the page.';
  }
}

/**
 * Report a mic failure. These used to be swallowed by the component's .catch, so
 * neither Sentry nor PostHog ever saw a user who couldn't use the singing exercises.
 */
export function reportMicProblem(problem: MicProblem, err: unknown, where: string): void {
  const e = err as { name?: string; message?: string } | undefined;
  const props = {
    problem,
    where,
    error_name: e?.name,
    error_message: e?.message,
    platform: platform(),
    apple_mobile: isAppleMobile(),
  };
  phCapture('mic_failed', props);
  // A user refusing permission is a choice, not a bug: log it, but don't alert on it.
  const level = problem === 'denied' ? 'info' : 'warning';
  Sentry.captureMessage(`mic_failed: ${problem}`, {
    level,
    tags: { mic_problem: problem, mic_where: where, platform: props.platform },
    extra: props,
  });
}
