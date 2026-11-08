// Google and magic-link sign-in return to the app with the session in the URL fragment:
// #access_token=…&refresh_token=…&provider_token=…. The access token carries the person's
// email and name, and the refresh token can renew their session, so none of them may reach
// analytics, error reports or session recordings. Supabase clears the fragment, but only
// after PostHog, Sentry and the Google tag have already read the page address.
//
// The Google tag in index.html has its own copy of this pattern; keep the two in step.
const TOKEN_PARAM = /\b(access_token|refresh_token|provider_token|provider_refresh_token)=[^&#\s"'\\]*/g;

export function redactAuthTokens(text: string): string {
  if (!text.includes('_token=')) return text;
  return text.replace(TOKEN_PARAM, '$1=redacted');
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Redacts tokens in every string inside a value, in place, and returns the value. Walks plain
 * objects and arrays only, so it's safe on PostHog and Sentry events and recording frames.
 */
export function redactAuthDeep<T>(value: T, depth = 0): T {
  if (typeof value === 'string') return redactAuthTokens(value) as T;
  if (value === null || typeof value !== 'object' || depth > 50) return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = redactAuthDeep(value[i], depth + 1);
    return value;
  }
  if (!isPlainObject(value)) return value;
  const record: Record<string, unknown> = value;
  for (const key of Object.keys(record)) {
    const before = record[key];
    const after = redactAuthDeep(before, depth + 1);
    if (after !== before) record[key] = after;
  }
  return value;
}
