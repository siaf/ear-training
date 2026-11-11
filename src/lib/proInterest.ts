import { supabase } from './supabase';
import { phCapture } from './posthog';
import { reportError } from './reportError';

/** functions/api/wants-pro.js, on the marketing site, which holds the Loops key. */
export const WANTS_PRO_URL = 'https://fifths.io/api/wants-pro';

/**
 * While checkout is closed, the paywall promises a signed-in learner an email when Pro
 * opens. This marks their Loops contact (wantsPro = true) so the launch email reaches them.
 * The server reads the email from their Supabase session, not from us.
 */
export async function registerProInterest(productId: string): Promise<boolean> {
  phCapture('pro_interest_registered', { product_id: productId });
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const res = await fetch(WANTS_PRO_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      },
    });
    if (!res.ok) throw new Error(`wants-pro returned ${res.status}`);
    return true;
  } catch (err) {
    // PostHog's pro_interest_registered event above still names them, so we can follow up.
    reportError('billing', err, { step: 'wants_pro' });
    return false;
  }
}
