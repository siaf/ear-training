import { phCapture, phIdentify, phRegister } from './posthog';

// Attribution capture + Google Ads conversion firing.
//
// Picks up gclid + utm_* from the landing URL, persists first-touch values to
// localStorage with a 90-day TTL (matches Google Ads attribution window), and
// exposes a helper that recovers them later (for OCI / Supabase profile sync /
// GA event parameters).
//
// Conversion firing is gated on env vars:
//   VITE_GOOGLE_ADS_ID        AW-XXXXXXXXXX
//   VITE_GADS_LABEL_SIGNUP    waitlist/signup conversion label
//   VITE_GADS_LABEL_PURCHASE  purchase conversion label
//   VITE_GADS_LABEL_ENGAGED   anonymous-engagement conversion label
// Missing labels make the corresponding event a silent no-op.

const ATTR_KEYS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
type AttrKey = typeof ATTR_KEYS[number];
type Attribution = Partial<Record<AttrKey, string>> & { ts?: number };

const STORAGE_KEY = 'fifths.attribution.v1';
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

const SIGNUP_FIRED_KEY = 'fifths.gads.signup_fired';
const ENGAGED_FIRED_KEY = 'fifths.gads.engaged_fired';

function safeGet(): Attribution | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function safeSet(v: Attribution) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v, ts: Date.now() })); } catch {}
}

export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const fresh: Attribution = {};
  for (const k of ATTR_KEYS) {
    const v = params.get(k);
    if (v) fresh[k] = v;
  }
  if (Object.keys(fresh).length === 0) return;
  const merged = { ...(safeGet() ?? {}), ...fresh };
  safeSet(merged);
  phRegister(fresh as Record<string, unknown>);
}

export function getStoredAttribution(): Attribution {
  return safeGet() ?? {};
}

type GtagFn = (...args: unknown[]) => void;
function gtag(): GtagFn | null {
  const w = typeof window === 'undefined' ? null : (window as unknown as { gtag?: GtagFn });
  return w && typeof w.gtag === 'function' ? w.gtag : null;
}

const ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;
const LABEL_SIGNUP = import.meta.env.VITE_GADS_LABEL_SIGNUP as string | undefined;
const LABEL_PURCHASE = import.meta.env.VITE_GADS_LABEL_PURCHASE as string | undefined;
const LABEL_ENGAGED = import.meta.env.VITE_GADS_LABEL_ENGAGED as string | undefined;

// Dual-fire: one event to Google Ads (named `conversion`, scoped via send_to)
// AND one named event to GA4 (no send_to → goes to all configured gtag
// destinations, which is just GA4 since Ads is the only other one and it
// only listens to `conversion` events). The GA4 event is what makes funnels
// visible in GA4 reports — without it, GA4 sees no conversion signal at all.
function fireConversion(eventName: string, label: string | undefined, params: Record<string, unknown> = {}) {
  const fn = gtag();
  if (!fn) return;
  // Google Ads side
  if (ADS_ID && label) {
    try {
      fn('event', 'conversion', { send_to: `${ADS_ID}/${label}`, ...params });
    } catch (e) {
      console.warn('[ads] conversion fire failed', e);
    }
  }
  // GA4 side — fires regardless of Ads config so the funnel is visible.
  try {
    fn('event', eventName, params);
  } catch (e) {
    console.warn('[ga4] event fire failed', e);
  }
}

export function trackAccountSignup(userId: string, email?: string | null): void {
  let alreadyFired = false;
  try {
    const key = `${SIGNUP_FIRED_KEY}.${userId}`;
    if (localStorage.getItem(key)) alreadyFired = true;
    else localStorage.setItem(key, '1');
  } catch {}
  // Identify in PostHog regardless of de-dup so the distinct_id stitches
  // even on later sessions where the conversion already fired.
  const attribution = getStoredAttribution();
  phIdentify(userId, { email: email ?? undefined, ...attribution });
  if (alreadyFired) return;
  fireConversion('fifths_signup', LABEL_SIGNUP);
  phCapture('fifths_signup', { ...attribution });
}

export function trackPurchase(opts: { value: number; currency?: string; transactionId?: string }): void {
  const currency = opts.currency ?? 'USD';
  fireConversion('fifths_purchase', LABEL_PURCHASE, {
    value: opts.value,
    currency,
    transaction_id: opts.transactionId ?? '',
  });
  phCapture('fifths_purchase', {
    value: opts.value,
    currency,
    product_id: opts.transactionId ?? null,
    ...getStoredAttribution(),
  });
}

export function trackEngagedAnon(): void {
  try {
    if (localStorage.getItem(ENGAGED_FIRED_KEY)) return;
    localStorage.setItem(ENGAGED_FIRED_KEY, '1');
  } catch {}
  fireConversion('fifths_engaged', LABEL_ENGAGED);
  phCapture('fifths_engaged', { ...getStoredAttribution() });
}
