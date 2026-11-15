import { describe, expect, it } from 'vitest';
import { isEstablishedAccount } from './establishedAccount';

describe('which accounts billing may hear about', () => {
  it('needs a real account with a confirmed address', () => {
    expect(isEstablishedAccount({ is_anonymous: false, email_confirmed_at: '2026-11-15T00:00:00Z' })).toBe(true);
    expect(isEstablishedAccount({ phone_confirmed_at: '2026-11-15T00:00:00Z' })).toBe(true);
    expect(isEstablishedAccount({ is_anonymous: false })).toBe(false); // email not confirmed yet
    expect(isEstablishedAccount({ is_anonymous: true, email_confirmed_at: '2026-11-15T00:00:00Z' })).toBe(false);
  });
});
