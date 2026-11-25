// Tests for functions/api/account-confirmed.js (the fifths.io Pages Function). It lives here
// because Cloudflare turns every file under functions/ into a route.
import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain JS module with no types
import { onRequestOptions, onRequestPost } from '../../functions/api/account-confirmed.js';

const env = { LOOPS_API_KEY: 'loops_test' };
const SIGNED_IN = { origin: 'https://app.fifths.io', authorization: 'Bearer token', apikey: 'sb_publishable_x' };
const CONFIRMED = { id: 'u-1', email: 'Learner@Example.com', email_confirmed_at: '2026-11-17T09:04:52Z' };

const request = (headers: Record<string, string>) =>
  new Request('https://fifths.io/api/account-confirmed', { method: 'POST', headers });

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

function stubFetch(user: Record<string, unknown> | null, opts: { contact?: Record<string, unknown>; sendStatus?: number } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? 'GET', headers: Object.fromEntries(new Headers(init.headers).entries()), body: init.body as string | undefined });
    if (url.endsWith('/auth/v1/user')) return user ? new Response(JSON.stringify(user)) : new Response('{}', { status: 401 });
    if (url.includes('contacts/find')) return new Response(JSON.stringify(opts.contact ? [opts.contact] : []));
    return new Response('{"success":true}', { status: opts.sendStatus ?? 200 });
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('POST /api/account-confirmed', () => {
  it('marks a confirmed account in Loops and starts Welcome, using the email from Supabase', async () => {
    const calls = stubFetch(CONFIRMED, { contact: { email: 'learner@example.com' } });
    const res = await onRequestPost({ request: request(SIGNED_IN), env });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.fifths.io');
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET https://azsedefwatnqjogotudi.supabase.co/auth/v1/user',
      'GET https://app.loops.so/api/v1/contacts/find?email=learner%40example.com',
      'POST https://app.loops.so/api/v1/events/send',
      'POST https://us.i.posthog.com/i/v0/e/',
    ]);
    expect(JSON.parse(calls[2].body!)).toEqual({ email: 'learner@example.com', userId: 'u-1', eventName: 'account_confirmed', emailConfirmed: true });
    expect(calls[2].headers['idempotency-key']).toBe('account_confirmed-u-1');
  });

  it('counts the new account in PostHog by its id alone, even for browsers that block trackers', async () => {
    const calls = stubFetch(CONFIRMED, { contact: { email: 'learner@example.com' } });
    await onRequestPost({ request: request(SIGNED_IN), env });
    const sent = JSON.parse(calls[3].body!);
    expect(sent).toMatchObject({ event: 'account_confirmed', distinct_id: 'u-1' });
    expect(sent.api_key).toMatch(/^phc_/);
    expect(JSON.stringify(sent)).not.toMatch(/example\.com/i);
  });

  it('still answers 200 when PostHog is down, and counts nobody twice', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify(CONFIRMED));
      if (url.includes('contacts/find')) return new Response('[]');
      if (url.includes('posthog')) throw new Error('offline');
      return new Response('{"success":true}');
    }));
    expect((await onRequestPost({ request: request(SIGNED_IN), env })).status).toBe(200);
    const again = stubFetch(CONFIRMED, { contact: { email: 'learner@example.com', emailConfirmed: true } });
    await onRequestPost({ request: request(SIGNED_IN), env });
    expect(again.some((c) => c.url.includes('posthog'))).toBe(false);
    const raced = stubFetch(CONFIRMED, { sendStatus: 409 });
    await onRequestPost({ request: request(SIGNED_IN), env });
    expect(raced.some((c) => c.url.includes('posthog'))).toBe(false);
  });

  it('sends nothing more for a contact already marked, so Welcome goes out once', async () => {
    const calls = stubFetch(CONFIRMED, { contact: { email: 'learner@example.com', emailConfirmed: true } });
    expect((await onRequestPost({ request: request(SIGNED_IN), env })).status).toBe(200);
    expect(calls.some((c) => c.url.includes('events/send'))).toBe(false);
  });

  it('refuses an account whose email is not confirmed, and never reaches Loops', async () => {
    const calls = stubFetch({ id: 'u-2', email: 'typo@example.com', email_confirmed_at: null });
    expect((await onRequestPost({ request: request(SIGNED_IN), env })).status).toBe(409);
    expect(calls.some((c) => c.url.includes('loops.so'))).toBe(false);
  });

  it('refuses without a valid sign-in, and says so when Loops fails', async () => {
    stubFetch(null);
    expect((await onRequestPost({ request: request(SIGNED_IN), env })).status).toBe(401);
    stubFetch(CONFIRMED, { sendStatus: 500 });
    expect((await onRequestPost({ request: request(SIGNED_IN), env })).status).toBe(502);
    stubFetch(CONFIRMED, { sendStatus: 409 }); // already sent in the last 24 hours
    expect((await onRequestPost({ request: request(SIGNED_IN), env })).status).toBe(200);
  });

  it('allows the app, the native apps and local dev to call it, and no other site', async () => {
    const preflight = async (origin: string) =>
      (await onRequestOptions({ request: new Request('https://fifths.io/api/account-confirmed', { method: 'OPTIONS', headers: { origin } }) }))
        .headers.get('access-control-allow-origin');
    expect(await preflight('https://app.fifths.io')).toBe('https://app.fifths.io');
    expect(await preflight('capacitor://localhost')).toBe('capacitor://localhost');
    expect(await preflight('https://evil.example')).toBeNull();
  });
});
