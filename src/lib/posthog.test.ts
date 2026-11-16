import { afterEach, describe, expect, it, vi } from 'vitest';

const init = vi.hoisted(() => vi.fn());
vi.mock('posthog-js', () => ({ default: { init } }));
const ph = vi.hoisted(() => ({ register: vi.fn(), opt_out_capturing: vi.fn(), setInternalOrTestUser: vi.fn() }));
vi.mock('./native', () => ({ isNative: () => false, platform: () => 'web' }));

afterEach(() => vi.unstubAllEnvs());

describe('PostHog setup', () => {
  it('strips sign-in tokens from events before they are sent', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    const { initPostHog } = await import('./posthog');
    initPostHog();

    const { before_send } = init.mock.calls[0][1];
    const event = before_send({
      uuid: '1',
      event: '$pageview',
      properties: { $current_url: 'https://app.fifths.io/path#access_token=eyJabc&refresh_token=rt1' },
      $set_once: { $initial_current_url: 'https://app.fifths.io/path#access_token=eyJabc' },
    });

    expect(JSON.stringify(event)).not.toMatch(/eyJabc|rt1/);
    expect(event.properties.$current_url).toBe(
      'https://app.fifths.io/path#access_token=redacted&refresh_token=redacted',
    );
  });
});

describe('our own visits', () => {
  it('marks local and preview builds, and devices flagged internal, as internal users', async () => {
    vi.resetModules();
    init.mockClear();
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    const { initPostHog } = await import('./posthog');
    initPostHog();
    const config = init.mock.calls[0][1];
    expect(config.internal_or_test_user_hostname.test('127.0.0.1')).toBe(true);
    expect(config.internal_or_test_user_hostname.test('app.fifths.io')).toBe(false);

    document.cookie = 'fifths_internal=1; path=/';
    config.loaded(ph);
    expect(ph.setInternalOrTestUser).toHaveBeenCalledTimes(1);
    document.cookie = 'fifths_internal=; path=/; max-age=0';
  });
});
