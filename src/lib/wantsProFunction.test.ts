// Tests for functions/api/wants-pro.js (the fifths.io Pages Function). It lives here
// because Cloudflare turns every file under functions/ into a route.
import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain JS module with no types
import { onRequestOptions, onRequestPost } from '../../functions/api/wants-pro.js';

const env = { LOOPS_API_KEY: 'loops_test' };

function request(headers: Record<string, string>, body?: unknown) {
  return new Request('https://fifths.io/api/wants-pro', {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const SIGNED_IN = { origin: 'https://app.fifths.io', authorization: 'Bearer token', apikey: 'sb_publishable_x' };

function stubFetch(supabase: { status: number; email?: string }, loopsStatus = 200) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes('supabase.co')) {
      return new Response(JSON.stringify({ email: supabase.email }), { status: supabase.status });
    }
    return new Response('{}', { status: loopsStatus });
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('POST /api/wants-pro', () => {
  it('marks the signed-in learner, using the email from Supabase, not the request', async () => {
    const calls = stubFetch({ status: 200, email: 'Learner@Example.com' });
    const res = await onRequestPost({ request: request(SIGNED_IN, { email: 'someone-else@example.com' }), env });

    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.fifths.io');
    expect(calls[0].url).toBe('https://azsedefwatnqjogotudi.supabase.co/auth/v1/user');
    const loops = calls[1];
    expect(loops.url).toBe('https://app.loops.so/api/v1/contacts/update');
    expect(loops.init?.method).toBe('PUT');
    expect(JSON.parse(loops.init?.body as string)).toEqual({ email: 'learner@example.com', wantsPro: true });
  });

  it('refuses without a valid sign-in and never reaches Loops', async () => {
    const calls = stubFetch({ status: 401 });
    expect((await onRequestPost({ request: request(SIGNED_IN), env })).status).toBe(401);
    expect(calls.some((c) => c.url.includes('loops.so'))).toBe(false);

    stubFetch({ status: 200, email: 'a@b.co' });
    const { authorization: _, ...noToken } = SIGNED_IN;
    expect((await onRequestPost({ request: request(noToken), env })).status).toBe(401);
  });

  it('says so when Loops fails, so the app reports it', async () => {
    stubFetch({ status: 200, email: 'a@b.co' }, 500);
    expect((await onRequestPost({ request: request(SIGNED_IN), env })).status).toBe(502);
  });

  it('allows the app and local dev to call it, and no other site', async () => {
    const preflight = async (origin: string) =>
      (await onRequestOptions({ request: new Request('https://fifths.io/api/wants-pro', { method: 'OPTIONS', headers: { origin } }) }))
        .headers.get('access-control-allow-origin');
    expect(await preflight('https://app.fifths.io')).toBe('https://app.fifths.io');
    expect(await preflight('http://localhost:5173')).toBe('http://localhost:5173');
    expect(await preflight('https://evil.example')).toBeNull();
  });
});
