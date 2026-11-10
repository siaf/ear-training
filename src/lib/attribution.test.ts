import { beforeEach, describe, expect, it, vi } from 'vitest';

const phCapture = vi.fn();
const phIdentify = vi.fn();
vi.mock('./posthog', () => ({ phCapture, phIdentify, phRegister: vi.fn() }));

const { isFirstSignIn, trackAccountSignup } = await import('./attribution');

const CREATED = '2026-11-08T15:56:45Z';

// A Google sign-in that created the account: confirmed and signed in within a second.
const newGoogleUser = {
  id: 'u1',
  email: 'learner@example.com',
  created_at: CREATED,
  email_confirmed_at: '2026-11-08T15:56:45.400Z',
  confirmed_at: '2026-11-08T15:56:45.400Z',
  last_sign_in_at: '2026-11-08T15:56:46Z',
};

// The same account signing in again the next day on another device.
const returningUser = { ...newGoogleUser, last_sign_in_at: '2026-11-09T17:36:42Z' };

// An emailed link: the account exists from the request, but it's confirmed and
// signed in at the moment the link is opened, hours later.
const newEmailLinkUser = {
  id: 'u2',
  email: 'reader@example.com',
  created_at: '2026-11-09T08:00:00Z',
  email_confirmed_at: '2026-11-09T11:30:00Z',
  confirmed_at: '2026-11-09T11:30:00Z',
  last_sign_in_at: '2026-11-09T11:30:00.300Z',
};

function signupsCaptured() {
  return phCapture.mock.calls.filter(([name]) => name === 'fifths_signup').length;
}

describe('isFirstSignIn', () => {
  it('is true when the sign-in created the account', () => {
    expect(isFirstSignIn(newGoogleUser)).toBe(true);
    expect(isFirstSignIn(newEmailLinkUser)).toBe(true);
  });

  it('is false for a returning account', () => {
    expect(isFirstSignIn(returningUser)).toBe(false);
  });

  it('is false when Supabase leaves out the timestamps', () => {
    expect(isFirstSignIn({ id: 'u3' })).toBe(false);
    expect(isFirstSignIn({ id: 'u3', confirmed_at: CREATED })).toBe(false);
  });
});

describe('trackAccountSignup', () => {
  beforeEach(() => {
    localStorage.clear();
    phCapture.mockClear();
    phIdentify.mockClear();
  });

  it('counts a new account once, even after reloads', () => {
    trackAccountSignup(newGoogleUser);
    trackAccountSignup(newGoogleUser);
    expect(signupsCaptured()).toBe(1);
  });

  it("doesn't count an existing account signing in on a new device", () => {
    trackAccountSignup(returningUser);
    expect(signupsCaptured()).toBe(0);
    // It still links the device to the account in PostHog.
    expect(phIdentify).toHaveBeenCalledWith('u1', expect.objectContaining({ email: 'learner@example.com' }));
  });
});
