// Tests for functions/api/daily-nudges.js (the fifths.io Pages Function) and the Worker that
// calls it (workers/daily-nudges/). They live here because Cloudflare turns every file under
// functions/ into a route.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain JS module with no types
import { onRequestPost } from '../../functions/api/daily-nudges.js';
// @ts-expect-error plain JS module with no types
import { run } from '../../workers/daily-nudges/index.js';

const NOW = Date.parse('2026-11-28T16:00:00Z');
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const ENV = { NUDGES_SECRET: 'nudge-secret', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x', LOOPS_API_KEY: 'loops_x' };

type Session = { user_id: string; started_at: string };
type Account = { id: string; email?: string; email_confirmed_at?: string | null; is_anonymous?: boolean };
type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

const confirmed = (id: string, email = `${id}@example.com`): Account => ({ id, email, email_confirmed_at: '2026-11-01T00:00:00Z' });

/** Fakes Supabase and Loops. `loops` sets Loops' answer for each send, in order. */
function stubFetch({ sessions = [] as Session[], accounts = [] as Account[], loops = [] as number[], supabase = 200 } = {}) {
  const calls: Call[] = [];
  let send = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, method: init.method ?? 'GET', headers: Object.fromEntries(new Headers(init.headers).entries()), body: init.body as string | undefined });
    if (url.includes('supabase.co') && supabase !== 200) return new Response('{}', { status: supabase });
    if (url.includes('/rest/v1/sessions')) {
      const offset = Number(new URL(url).searchParams.get('offset'));
      return new Response(JSON.stringify(sessions.slice(offset, offset + 1000)), { status: 200 });
    }
    if (url.includes('/auth/v1/admin/users')) return new Response(JSON.stringify({ users: accounts }), { status: 200 });
    if (url.includes('loops.so')) return new Response('{}', { status: loops[send++] ?? 200 });
    return new Response('{}', { status: 404 });
  }));
  return calls;
}

function post(path = '/api/daily-nudges', secret: string | null = ENV.NUDGES_SECRET) {
  const headers: Record<string, string> = secret === null ? {} : { authorization: `Bearer ${secret}` };
  return new Request(`https://fifths.io${path}`, { method: 'POST', headers });
}

const loopsSends = (calls: Call[]) =>
  calls.filter((c) => c.url.includes('loops.so')).map((c) => ({ ...JSON.parse(c.body!), key: c.headers['idempotency-key'] }));

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('POST /api/daily-nudges', () => {
  it('refuses requests without the shared secret, and does nothing', async () => {
    const calls = stubFetch();
    expect((await onRequestPost({ request: post(undefined, null), env: ENV })).status).toBe(403);
    expect((await onRequestPost({ request: post(undefined, 'wrong'), env: ENV })).status).toBe(403);
    expect((await onRequestPost({ request: post(), env: { ...ENV, NUDGES_SECRET: '' } })).status).toBe(403);
    expect(calls).toEqual([]);
  });

  it('says so when a key is missing', async () => {
    stubFetch();
    const res = await onRequestPost({ request: post(), env: { NUDGES_SECRET: ENV.NUDGES_SECRET } });
    expect(res.status).toBe(503);
  });

  it('nudges the day after, and after 14, 30 and 60 quiet days, with the streak and lesson count', async () => {
    const calls = stubFetch({
      sessions: [
        // Two days in a row, last lesson 30 hours ago.
        { user_id: 'daily', started_at: ago(54 * HOUR + 10 * 60_000) },
        { user_id: 'daily', started_at: ago(30 * HOUR + 5 * 60_000) },
        { user_id: 'daily', started_at: ago(30 * HOUR) },
        { user_id: 'two-weeks', started_at: ago(14 * DAY + 3 * HOUR) },
        { user_id: 'month', started_at: ago(30 * DAY + 3 * HOUR) },
        { user_id: 'two-months', started_at: ago(60 * DAY + 3 * HOUR) },
      ],
      accounts: [confirmed('daily', 'Daily@Example.com'), confirmed('two-weeks'), confirmed('month'), confirmed('two-months')],
    });
    const res = await onRequestPost({ request: post(), env: ENV });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, sent: 4, already: 0, failed: 0 });

    const sent = loopsSends(calls);
    expect(sent.map((s) => [s.email, s.eventName])).toEqual([
      ['daily@example.com', 'missed_a_day'],
      ['two-weeks@example.com', 'inactive_14_days'],
      ['month@example.com', 'inactive_30_days'],
      ['two-months@example.com', 'inactive_60_days'],
    ]);
    expect(sent[0]).toMatchObject({
      userId: 'daily',
      eventProperties: {
        streakDays: 2,
        lessonsDone: 3,
        daysSinceLastSession: 1,
        appUrl: 'https://app.fifths.io/?utm_source=loops&utm_medium=email&utm_campaign=missed_a_day',
      },
      key: 'missed_a_day-daily-2026-11-27',
    });
    const loopsCall = calls.find((c) => c.url.includes('loops.so'))!;
    expect(loopsCall.url).toBe('https://app.loops.so/api/v1/events/send');
    expect(loopsCall.headers.authorization).toBe('Bearer loops_x');
    // Nothing about answers or lessons beyond the count goes to Loops.
    expect(Object.keys(sent[0].eventProperties).sort()).toEqual(['appUrl', 'daysSinceLastSession', 'lessonsDone', 'streakDays']);
  });

  it('leaves out learners outside the windows, and accounts that are unconfirmed, anonymous or gone', async () => {
    const calls = stubFetch({
      sessions: [
        { user_id: 'today', started_at: ago(19 * HOUR) },
        { user_id: 'three-days', started_at: ago(3 * DAY) },
        { user_id: 'edge', started_at: ago(44 * HOUR) },
        { user_id: 'unconfirmed', started_at: ago(30 * HOUR) },
        { user_id: 'anonymous', started_at: ago(30 * HOUR) },
        { user_id: 'deleted', started_at: ago(30 * HOUR) },
      ],
      accounts: [
        confirmed('today'), confirmed('three-days'), confirmed('edge'),
        { id: 'unconfirmed', email: 'u@example.com', email_confirmed_at: null },
        { ...confirmed('anonymous'), is_anonymous: true },
      ],
    });
    const res = await onRequestPost({ request: post(), env: ENV });
    expect(await res.json()).toMatchObject({ ok: true, sent: 0 });
    expect(loopsSends(calls)).toEqual([]);
  });

  it('a dry run counts without sending', async () => {
    const calls = stubFetch({ sessions: [{ user_id: 'a', started_at: ago(30 * HOUR) }], accounts: [confirmed('a')] });
    const res = await onRequestPost({ request: post('/api/daily-nudges?dry=1'), env: ENV });
    expect(await res.json()).toEqual({
      ok: true, dry: true,
      counts: { missed_a_day: 1, inactive_14_days: 0, inactive_30_days: 0, inactive_60_days: 0 },
    });
    expect(loopsSends(calls)).toEqual([]);
  });

  it('reads Supabase with the secret key, every page of sessions, and only the last 62 days', async () => {
    const many = Array.from({ length: 1500 }, () => ({ user_id: 'a', started_at: ago(30 * HOUR) }));
    const calls = stubFetch({ sessions: many, accounts: [confirmed('a')] });
    const res = await onRequestPost({ request: post('/api/daily-nudges?dry=1'), env: ENV });
    expect((await res.json()).counts.missed_a_day).toBe(1);
    const pages = calls.filter((c) => c.url.includes('/rest/v1/sessions'));
    expect(pages.map((c) => new URL(c.url).searchParams.get('offset'))).toEqual(['0', '1000']);
    expect(new URL(pages[0].url).searchParams.get('started_at')).toBe(`gte.${ago(62 * DAY)}`);
    expect(pages[0].headers).toMatchObject({ apikey: 'sb_secret_x', authorization: 'Bearer sb_secret_x' });
  });

  it('counts a repeat send as already done, and reports Loops failures without stopping', async () => {
    stubFetch({
      sessions: ['a', 'b', 'c'].map((id) => ({ user_id: id, started_at: ago(30 * HOUR) })),
      accounts: [confirmed('a'), confirmed('b'), confirmed('c')],
      loops: [409, 500, 200],
    });
    const res = await onRequestPost({ request: post(), env: ENV });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, sent: 1, already: 1, failed: 1 });
  });

  it('sends nothing when Supabase fails', async () => {
    const calls = stubFetch({ supabase: 500 });
    const res = await onRequestPost({ request: post(), env: ENV });
    expect(res.status).toBe(502);
    expect(loopsSends(calls)).toEqual([]);
  });
});

describe('the daily-nudges Worker', () => {
  it('calls fifths.io with the shared secret', async () => {
    const fake = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await run({ NUDGES_SECRET: 'nudge-secret' }, fake);
    expect(fake).toHaveBeenCalledWith('https://fifths.io/api/daily-nudges', {
      method: 'POST',
      headers: { Authorization: 'Bearer nudge-secret' },
    });
  });

  it('fails the run when fifths.io does, so Cloudflare shows it', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(run({ NUDGES_SECRET: 's' }, async () => new Response('{}', { status: 502 }))).rejects.toThrow('502');
    await expect(run({}, async () => new Response('{}'))).rejects.toThrow('NUDGES_SECRET');
  });
});
