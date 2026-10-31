import * as Sentry from '@sentry/react';

// Report a failure we handle ourselves (show a message, fall back, retry).
// Caught errors never reach Sentry on their own, which is how broken sign-in
// and checkout went unnoticed, so every user-facing failure path calls this.
export function reportError(area: string, err: unknown, extra: Record<string, unknown> = {}): void {
  console.warn(`[${area}]`, err);
  const error = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
  Sentry.captureException(error, { tags: { area }, extra });
}
