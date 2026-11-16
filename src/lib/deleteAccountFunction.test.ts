// Tests for functions/api/delete-account.js (the fifths.io Pages Function). It lives here
// because Cloudflare turns every file under functions/ into a route.
import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain JS module with no types
import { onRequestOptions, onRequestPost } from '../../functions/api/delete-account.js';

const USER_ID = '6f1c2a3b-0000-4000-8000-00000000abcd';
const SIGNED_IN = { origin: 'https://app.fifths.io', authorization: 'Bearer token', apikey: 'sb_publishable_x' };

function request(headers: Record<string, string>) {
  return new Request('https://fifths.io/api/delete-account', { method: 'POST', headers });
}

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

/** Fakes every service. `status` overrides a service's answer, by a piece of its address. */
function stubFetch(opts: { user?: { id?: string; email?: string } | null; status?: Record<string, number>; subscriber?: unknown } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method, headers: Object.fromEntries(new Headers(init.headers).entries()), body: init.body as string | undefined });
    const override = Object.entries(opts.status ?? {}).find(([part]) => url.includes(part));
    if (override) return new Response('{}', { status: override[1] });
    if (url.endsWith('/auth/v1/user')) {
      return opts.user === null
        ? new Response('{}', { status: 401 })
        : new Response(JSON.stringify(opts.user ?? { id: USER_ID, email: 'Learner@Example.com' }), { status: 200 });
    }
    if (url.includes('revenuecat') && method === 'GET') {
      return new Response(JSON.stringify({ subscriber: opts.subscriber ?? { subscriptions: {} } }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  }));
  return calls;
}

function fakeDb() {
  const runs: { sql: string; args: unknown[] }[] = [];
  return {
    runs,
    prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ run: async () => { runs.push({ sql, args }); } }) }),
  };
}

const ENV = { SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x', LOOPS_API_KEY: 'loops_x', REVENUECAT_SECRET_KEY: 'sk_rc' };

afterEach(() => vi.unstubAllGlobals());

describe('POST /api/delete-account', () => {
  it('removes the learner everywhere, account last, using the id and email from Supabase', async () => {
    const calls = stubFetch();
    const DB = fakeDb();
    const res = await onRequestPost({ request: request(SIGNED_IN), env: { ...ENV, DB } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.fifths.io');

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET https://azsedefwatnqjogotudi.supabase.co/auth/v1/user',
      `GET https://api.revenuecat.com/v1/subscribers/${USER_ID}`,
      `DELETE https://api.revenuecat.com/v1/subscribers/${USER_ID}`,
      'POST https://app.loops.so/api/v1/contacts/delete',
      `DELETE https://azsedefwatnqjogotudi.supabase.co/rest/v1/sessions?user_id=eq.${USER_ID}`,
      `DELETE https://azsedefwatnqjogotudi.supabase.co/rest/v1/profiles?user_id=eq.${USER_ID}`,
      `DELETE https://azsedefwatnqjogotudi.supabase.co/auth/v1/admin/users/${USER_ID}`,
    ]);
    expect(JSON.parse(calls[3].body!)).toEqual({ email: 'learner@example.com' });
    expect(DB.runs).toEqual([{ sql: 'DELETE FROM waitlist WHERE email = ?', args: ['learner@example.com'] }]);
    // A new-style secret key isn't a JWT, so it goes on apikey only.
    expect(calls[6].headers).toEqual({ apikey: 'sb_secret_x' });
  });

  it('sends an old JWT service key as a bearer token too', async () => {
    const calls = stubFetch();
    await onRequestPost({ request: request(SIGNED_IN), env: { SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGc.x.y' } });
    expect(calls[calls.length - 1].headers).toEqual({ apikey: 'eyJhbGc.x.y', authorization: 'Bearer eyJhbGc.x.y' });
  });

  it('refuses while a subscription will still renew, and deletes nothing', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const calls = stubFetch({ subscriber: { subscriptions: { pro_monthly: { store: 'stripe', expires_date: future, unsubscribe_detected_at: null } } } });
    const res = await onRequestPost({ request: request(SIGNED_IN), env: ENV });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('subscription_active');
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });

  it('goes ahead once the subscription is cancelled or expired', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    stubFetch({ subscriber: { subscriptions: {
      cancelled: { store: 'stripe', expires_date: future, unsubscribe_detected_at: past },
      expired: { store: 'app_store', expires_date: past, unsubscribe_detected_at: null },
    } } });
    expect((await onRequestPost({ request: request(SIGNED_IN), env: ENV })).status).toBe(200);
  });

  it('treats "not found" as already gone, so a retry can finish', async () => {
    stubFetch({ status: { 'revenuecat': 404, 'loops.so': 404, 'admin/users': 404 } });
    expect((await onRequestPost({ request: request(SIGNED_IN), env: ENV })).status).toBe(200);
  });

  it('stops before deleting the account when an earlier step fails', async () => {
    const calls = stubFetch({ status: { 'loops.so': 500 } });
    const res = await onRequestPost({ request: request(SIGNED_IN), env: ENV });
    expect(res.status).toBe(502);
    expect((await res.json()).step).toBe('loops');
    expect(calls.some((c) => c.url.includes('admin/users'))).toBe(false);
  });

  it('refuses without a valid sign-in, or without the service key', async () => {
    let calls = stubFetch({ user: null });
    expect((await onRequestPost({ request: request(SIGNED_IN), env: ENV })).status).toBe(401);
    expect(calls).toHaveLength(1);

    calls = stubFetch();
    const { authorization: _, ...noToken } = SIGNED_IN;
    expect((await onRequestPost({ request: request(noToken), env: ENV })).status).toBe(401);
    expect((await onRequestPost({ request: request(SIGNED_IN), env: { LOOPS_API_KEY: 'x' } })).status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it('skips RevenueCat and Loops when their keys are not set', async () => {
    const calls = stubFetch();
    expect((await onRequestPost({ request: request(SIGNED_IN), env: { SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' } })).status).toBe(200);
    expect(calls.some((c) => /revenuecat|loops/.test(c.url))).toBe(false);
  });

  it('allows the app, the native apps and local dev to call it, and no other site', async () => {
    const preflight = async (origin: string) =>
      (await onRequestOptions({ request: new Request('https://fifths.io/api/delete-account', { method: 'OPTIONS', headers: { origin } }) }))
        .headers.get('access-control-allow-origin');
    expect(await preflight('https://app.fifths.io')).toBe('https://app.fifths.io');
    expect(await preflight('capacitor://localhost')).toBe('capacitor://localhost');
    expect(await preflight('http://localhost:5173')).toBe('http://localhost:5173');
    expect(await preflight('https://evil.example')).toBeNull();
    expect(await preflight('https://localhost.evil.example')).toBeNull();
  });
});
