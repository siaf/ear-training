import { supabase } from './supabase';
import { reportError } from './reportError';

/** functions/api/account-confirmed.js, on the marketing site, which holds the Loops key. */
export const ACCOUNT_CONFIRMED_URL = 'https://fifths.io/api/account-confirmed';
const DONE_KEY = 'fifths.loopsConfirmed';

/**
 * Tells Loops this account's email is confirmed, so only people who actually got in get
 * the Welcome email (Supabase adds a Loops contact as soon as someone asks for a magic link).
 * Once per account per device; a failure tries again the next time the app opens.
 */
export async function tellLoopsConfirmed(userId: string): Promise<void> {
  if (!supabase) return;
  try { if (localStorage.getItem(DONE_KEY) === userId) return; } catch { /* storage blocked: just send */ }
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch(ACCOUNT_CONFIRMED_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      },
    });
    if (!res.ok) throw new Error(`account-confirmed returned ${res.status}`);
    try { localStorage.setItem(DONE_KEY, userId); } catch { /* fine */ }
  } catch (err) {
    // A dropped connection just waits for the next launch; anything else is worth knowing.
    if (!(err instanceof TypeError)) reportError('sync', err, { step: 'loops_confirmed' });
  }
}
