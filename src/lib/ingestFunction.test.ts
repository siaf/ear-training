// Tests for functions/ingest/[[path]].js, the PostHog proxy on fifths.io and app.fifths.io.
// It lives here because Cloudflare turns every file under functions/ into a route.
import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain JS module with no types
import { onRequest, upstreamFor } from '../../functions/ingest/[[path]].js';

afterEach(() => vi.unstubAllGlobals());

describe('/ingest proxy', () => {
  it('sends the SDK and remote config to the assets host, and everything else to the API', () => {
    const up = (path: string) => upstreamFor(new URL(`https://app.fifths.io${path}`)).toString();
    expect(up('/ingest/static/array.js')).toBe('https://us-assets.i.posthog.com/static/array.js');
    expect(up('/ingest/array/phc_x/config.js')).toBe('https://us-assets.i.posthog.com/array/phc_x/config.js');
    expect(up('/ingest/e/?ip=0&ver=1')).toBe('https://us.i.posthog.com/e/?ip=0&ver=1');
    expect(up('/ingest/flags/?v=2')).toBe('https://us.i.posthog.com/flags/?v=2');
  });

  it('forwards the body and the visitor address, but none of our cookies', async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: URL, init: RequestInit) => {
      seen.push({ url: url.toString(), init });
      return new Response('{"status":1}');
    }));
    const res = await onRequest({
      request: new Request('https://fifths.io/ingest/e/', {
        method: 'POST',
        body: '{"event":"$pageview"}',
        headers: {
          cookie: 'sb-access-token=secret; fifths_internal=1',
          'cf-connecting-ip': '203.0.113.7',
          'cf-ray': 'a1b2c3',
          'x-forwarded-proto': 'https',
          'content-type': 'application/json',
        },
      }),
    });
    expect(res.status).toBe(200);
    expect(seen[0].url).toBe('https://us.i.posthog.com/e/');
    const headers = new Headers(seen[0].init.headers);
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.7');
    // PostHog sits behind Cloudflare, which refuses Cloudflare's own headers from a Worker.
    expect([...headers.keys()].filter((k) => k.startsWith('cf-') || k === 'x-forwarded-proto')).toEqual([]);
    expect(await new Response(seen[0].init.body).text()).toBe('{"event":"$pageview"}');
  });
});
