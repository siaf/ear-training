import { describe, it, expect } from 'vitest';
import { redactAuthDeep, redactAuthTokens } from './redactAuth';

const SIGN_IN_RETURN =
  'https://app.fifths.io/path#access_token=eyJhbGciOiJFUzI1NiJ9.eyJlbWFpbCI6ImFAYi5jb20ifQ.sig' +
  '&expires_at=1794157036&expires_in=3600&provider_token=ya29.abc-DEF_123' +
  '&provider_refresh_token=1//0gXYZ&refresh_token=5keivpmvbu37&sb=&token_type=bearer';

describe('redactAuthTokens', () => {
  it('removes every token from a sign-in return address', () => {
    const out = redactAuthTokens(SIGN_IN_RETURN);
    expect(out).toBe(
      'https://app.fifths.io/path#access_token=redacted&expires_at=1794157036&expires_in=3600' +
        '&provider_token=redacted&provider_refresh_token=redacted&refresh_token=redacted&sb=&token_type=bearer',
    );
    expect(out).not.toContain('eyJ');
    expect(out).not.toContain('ya29');
    expect(out).not.toContain('5keivpmvbu37');
  });

  it('leaves ordinary addresses alone', () => {
    const url = 'https://app.fifths.io/?start=level_1&utm_source=google#results';
    expect(redactAuthTokens(url)).toBe(url);
  });

  it('keeps error details from a failed sign-in', () => {
    const url = 'https://app.fifths.io/#error=access_denied&error_description=User+cancelled';
    expect(redactAuthTokens(url)).toBe(url);
  });
});

describe('redactAuthDeep', () => {
  it('cleans a PostHog pageview, person properties included', () => {
    const event = {
      event: '$pageview',
      properties: { $current_url: SIGN_IN_RETURN, $pathname: '/path', count: 3, flag: true, none: null },
      $set_once: { $initial_current_url: SIGN_IN_RETURN },
      timestamp: new Date(0),
    };
    redactAuthDeep(event);
    expect(JSON.stringify(event)).not.toMatch(/eyJ|ya29|5keivpmvbu37/);
    expect(event.properties.$pathname).toBe('/path');
    expect(event.properties.count).toBe(3);
    expect(event.timestamp).toEqual(new Date(0));
  });

  it('cleans recording frames and breadcrumbs nested in arrays', () => {
    const snapshot = { $snapshot_data: [{ type: 4, data: { href: SIGN_IN_RETURN, width: 390 } }] };
    const breadcrumbs = [{ category: 'navigation', data: { from: SIGN_IN_RETURN, to: '/practice' } }];
    redactAuthDeep(snapshot);
    redactAuthDeep(breadcrumbs);
    expect(snapshot.$snapshot_data[0].data.href).toContain('access_token=redacted');
    expect(breadcrumbs[0].data.from).toContain('refresh_token=redacted');
    expect(breadcrumbs[0].data.to).toBe('/practice');
  });
});
