import type { User } from '@supabase/supabase-js';

/**
 * A real, finished account: not a Supabase guest, and its email (or phone) confirmed.
 * Google and magic-link sign-ins are confirmed by the time they arrive. Billing waits for
 * this, on the server's copy of the user (see syncEngine.ts).
 */
export function isEstablishedAccount(user: Pick<User, 'is_anonymous' | 'email_confirmed_at' | 'phone_confirmed_at'>): boolean {
  return !user.is_anonymous && Boolean(user.email_confirmed_at || user.phone_confirmed_at);
}
