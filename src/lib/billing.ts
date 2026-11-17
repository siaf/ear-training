import * as Sentry from '@sentry/react';
import { isNative, platform } from './native';
import { trackPurchase } from './attribution';
import { phCapture } from './posthog';
import { reportError } from './reportError';

// Entitlement identifier configured in RevenueCat dashboard.
// Pro is one monthly subscription, and it grants this entitlement.
export const PRO_ENTITLEMENT = 'pro';

// IAP product IDs — these must match exactly in App Store Connect, Play
// Console, and RevenueCat Web Billing (Stripe). See [TODO.md](../../TODO.md).
export const PRODUCT_IDS = {
  // Pro at its $9.99 list price. RevenueCat can't change a Web Billing product's price
  // once saved, so the original fifths_pro_monthly ($4.99, never sold) stays unused.
  proMonthly: 'fifths_pro_monthly_999',
} as const;
// fifths_pro_annual and fifths_lifetime still exist in RevenueCat and the stores but are
// no longer sold. Pro is monthly only.

/**
 * RevenueCat Web Billing discount code applied at checkout without the learner typing it:
 * $5.00 off, forever, on the monthly product, so launch subscribers pay $4.99 for as long
 * as they stay. It's what makes the crossed-out $9.99 on the paywall a real price. To end
 * the launch price, set this to '' and drop the crossed-out price and "launch discount"
 * badge from the Paywall and fifths.io in the same change. Earlier subscribers keep theirs.
 */
export const LAUNCH_DISCOUNT_CODE = 'LAUNCH';

type CustomerInfoLike = {
  entitlements?: { active?: Record<string, unknown> };
};

const PRODUCT_VALUE_USD: Record<string, number> = {
  // What a subscriber pays: the $9.99 list price less LAUNCH_DISCOUNT_CODE's $5.00. Change
  // it here, on the Paywall card and on fifths.io together.
  [PRODUCT_IDS.proMonthly]: 4.99,
};

interface BillingProvider {
  /** The account RevenueCat is talking to. */
  userId: string;
  /** Point RevenueCat at another signed-in account (no anonymous ID in between). */
  switchUser: (userId: string) => Promise<void>;
  /** Fetch the account's customer info: the first call creates the RevenueCat customer. */
  load: () => Promise<void>;
  /** Stop talking to RevenueCat until someone signs in again. */
  stop: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

// On the web and Android, RevenueCat only ever hears about signed-in accounts that
// Supabase's server has confirmed (see startBilling's caller in syncEngine.ts). A visitor
// who isn't signed in never loads the SDK, so nothing is sent for them.
//
// The iOS app is the exception. Apple doesn't let an app require an account just to buy,
// so there billing starts at launch with RevenueCat's anonymous ID (Apple's receipt is
// what proves a purchase), and moves to the account with logIn once one is confirmed.
// Signing out goes back to anonymous, and "Restore purchases" finds them by Apple ID.

/** Stands for "no account yet" in the iOS app, where billing runs without one. */
const ANONYMOUS = '$anonymous';

/** False only in the iOS app: everywhere else, buying needs a confirmed account. */
export function purchasesNeedAccount(): boolean {
  return !(isNative() && platform() === 'ios');
}

/** iOS app only: start billing at launch, before anyone signs in. Does nothing elsewhere. */
export function startBillingWithoutAccount(): Promise<void> {
  if (purchasesNeedAccount()) return Promise.resolve();
  return startBilling(ANONYMOUS);
}

let provider: BillingProvider | null = null;
/** The confirmed account billing should serve, or null when nobody is signed in. */
let accountId: string | null = null;
/** That account's email, pre-filled in the web checkout so buyers don't type it again. */
let accountEmail: string | null = null;
/** Customer info has loaded for accountId. */
let loaded = false;
let starting: Promise<void> | null = null;
let customerInfo: CustomerInfoLike | null = null;
const listeners = new Set<(info: CustomerInfoLike | null) => void>();

/** Waits between tries when RevenueCat or the network fails. Tests shorten them. */
let retryDelaysMs = [2_000, 8_000];
export function setBillingRetryDelaysForTests(delays: number[]) { retryDelaysMs = delays; }

function notify() {
  for (const fn of listeners) {
    try { fn(customerInfo); } catch { /* swallow */ }
  }
}

function setCustomerInfo(info: CustomerInfoLike | null) {
  customerInfo = info;
  notify();
}

export function subscribeBilling(fn: (info: CustomerInfoLike | null) => void): () => void {
  listeners.add(fn);
  fn(customerInfo);
  return () => { listeners.delete(fn); };
}

export function isPro(): boolean {
  return Boolean(customerInfo?.entitlements?.active?.[PRO_ENTITLEMENT]);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start billing for a signed-in account. Only call this once Supabase's server has
 * confirmed the account: its id is what RevenueCat stores, and purchases attach to it.
 * Tries a few times before reporting, since one failed request is usually the network.
 */
export function startBilling(userId: string, email?: string | null): Promise<void> {
  if (accountId === userId && (loaded || starting)) {
    if (email) accountEmail = email;
    return starting ?? Promise.resolve();
  }
  accountId = userId;
  accountEmail = email ?? null;
  loaded = false;
  // One start at a time, so the SDK is never configured twice (in the iOS app, launch
  // starts anonymous billing and a sign-in can follow straight away).
  const previous = starting;
  const run = (async () => {
    if (previous) await previous.catch(() => {});
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      if (attempt > 0) await wait(retryDelaysMs[attempt - 1]);
      if (accountId !== userId) return; // signed out or switched while waiting
      try {
        if (!provider) provider = await (isNative() ? initNative(userId) : userId === ANONYMOUS ? null : initWeb(userId));
        if (!provider) return; // no key for this platform: billing is off
        if (provider.userId !== userId) await provider.switchUser(userId);
        await provider.load();
        if (accountId !== userId) return;
        loaded = true;
        return;
      } catch (err) {
        lastError = err;
      }
    }
    if (accountId === userId) reportError('billing', lastError, { step: 'load', attempts: retryDelaysMs.length + 1 });
  })();
  starting = run;
  void run.finally(() => { if (starting === run) starting = null; });
  return run;
}

/**
 * Signed out: forget the account. Everywhere but the iOS app, stop talking to RevenueCat;
 * the iOS app goes back to anonymous billing, as at launch.
 */
export async function stopBilling(): Promise<void> {
  if (accountId === ANONYMOUS) return;
  setCustomerInfo(null);
  if (!purchasesNeedAccount()) { await startBilling(ANONYMOUS); return; }
  accountId = null;
  accountEmail = null;
  loaded = false;
  if (!provider) return;
  try { await provider.stop(); } catch (err) { console.warn('[billing] stop failed', err); }
}

/** Billing for the confirmed account, loading it again first if an earlier load failed. */
async function readyProvider(): Promise<BillingProvider | null> {
  if (!accountId) return null;
  if (!loaded) await startBilling(accountId);
  return loaded ? provider : null;
}

/**
 * False while the web key is RevenueCat's sandbox key: its checkout can't take real money,
 * so buyers get a message instead. Opens by itself once the live key is in.
 *
 * To test a purchase against the sandbox (Stripe test mode, card 4242 4242 4242 4242),
 * run `VITE_SANDBOX_CHECKOUT=open npm run dev`. Local dev only: a build ignores it, and so
 * does the browser tests' server, which checks the closed-checkout message.
 */
export function checkoutIsOpen(): boolean {
  const key = import.meta.env.VITE_REVENUECAT_WEB_KEY as string | undefined;
  if (isNative() || !key?.startsWith('rcb_sb_')) return true;
  return Boolean(import.meta.env.DEV) && import.meta.env.VITE_SANDBOX_CHECKOUT === 'open';
}

/**
 * Tells us the moment someone tries to buy while checkout is closed. Error level and one
 * fingerprint on purpose: the first attempt opens a new high-priority issue, which is what
 * emails us. Later attempts add to its count.
 */
export function reportSandboxCheckoutAttempt(productId: string, signedIn: boolean): void {
  if (checkoutIsOpen()) return;
  Sentry.captureMessage('Someone tried to buy, but checkout is still in sandbox mode', {
    level: 'error',
    fingerprint: ['sandbox-checkout-attempt'],
    tags: { area: 'billing', product: productId, signed_in: String(signedIn) },
  });
}

/** How a checkout ended. A cancel is the buyer's choice, so the app shows no error for it. */
export type PurchaseResult = 'purchased' | 'cancelled' | 'failed';

export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  phCapture('purchase_started', { product_id: productId });
  // The app asks people to sign in before buying, so no account means no checkout.
  if (!accountId) {
    phCapture('purchase_failed', { product_id: productId, reason: 'not_signed_in' });
    return 'failed';
  }
  // Loading can fail on a bad connection (the SDK is a lazy import), so it tries again here.
  const ready = await readyProvider();
  if (!ready) {
    reportError('billing', new Error('Checkout opened before billing loaded'), { step: 'purchase', productId });
    phCapture('purchase_failed', { product_id: productId, reason: 'billing_not_ready' });
    return 'failed';
  }
  try { return (await ready.purchaseProduct(productId)) ? 'purchased' : 'failed'; }
  catch (err) {
    const { code, errorCode } = err as { code?: string; errorCode?: number };
    // Native reports a cancel as a code string, the web SDK as ErrorCode.UserCancelledError (1).
    if (code === 'PURCHASE_CANCELLED' || errorCode === 1) {
      phCapture('purchase_cancelled', { product_id: productId });
      return 'cancelled';
    }
    reportError('billing', err, { step: 'purchase', productId });
    phCapture('purchase_failed', { product_id: productId, reason: code ?? 'error' });
    return 'failed';
  }
}

export async function restorePurchases(): Promise<boolean> {
  const ready = await readyProvider();
  if (!ready) return false;
  try { return await ready.restorePurchases(); }
  catch (err) { reportError('billing', err, { step: 'restore' }); return false; }
}

// ─── Web (Stripe via RevenueCat Web Billing) ────────────────────────────
// Billing used to start with an anonymous ID kept here, then alias it on sign-in.
const OLD_RC_ANON_ID_KEY = 'fifths.rc.anon_id';

async function initWeb(userId: string): Promise<BillingProvider | null> {
  const apiKey = import.meta.env.VITE_REVENUECAT_WEB_KEY as string | undefined;
  if (!apiKey) return null;

  const { Purchases, LogLevel } = await import('@revenuecat/purchases-js');
  if (import.meta.env.DEV) Purchases.setLogLevel(LogLevel.Verbose);
  try { localStorage.removeItem(OLD_RC_ANON_ID_KEY); } catch { /* ignore */ }

  // Configured straight away with the account's id: no request goes out until load().
  let inst = Purchases.isConfigured() ? Purchases.getSharedInstance() : Purchases.configure({ apiKey, appUserId: userId });
  const web: BillingProvider = {
    userId,
    switchUser: async (uid: string) => {
      if (!Purchases.isConfigured()) inst = Purchases.configure({ apiKey, appUserId: uid });
      else if (inst.getAppUserId() !== uid) await inst.changeUser(uid);
      web.userId = uid;
    },
    load: async () => {
      const info = await inst.getCustomerInfo();
      if (accountId === web.userId) setCustomerInfo(info); // not if they signed out meanwhile
    },
    stop: async () => {
      // close() sends nothing; the next sign-in configures again with that account.
      if (Purchases.isConfigured()) inst.close();
      web.userId = '';
    },
    purchaseProduct: async (productId: string) => {
      const offerings = await inst.getOfferings();
      const offering = offerings.current;
      const pkg = offering?.availablePackages.find(
        (p) => p.webBillingProduct?.identifier === productId,
      );
      if (!pkg) {
        reportError('billing', new Error(`No web package for ${productId}`), { step: 'purchase', productId });
        return false;
      }
      const result = await inst.purchase({
        rcPackage: pkg,
        ...(LAUNCH_DISCOUNT_CODE ? { discountCode: LAUNCH_DISCOUNT_CODE } : {}),
        // Without it, the checkout asks for an email; the receipt and Stripe customer use it.
        ...(accountEmail ? { customerEmail: accountEmail } : {}),
      });
      setCustomerInfo(result.customerInfo);
      const granted = Boolean(result.customerInfo.entitlements.active[PRO_ENTITLEMENT]);
      if (granted) {
        trackPurchase({ value: PRODUCT_VALUE_USD[productId] ?? 0, transactionId: productId });
      }
      return granted;
    },
    restorePurchases: async () => {
      // Web billing is single-device; "restore" reduces to refetching customer info.
      const info = await inst.getCustomerInfo();
      setCustomerInfo(info);
      return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
    },
  };
  return web;
}

// ─── Native (iOS / Android via Capacitor) ───────────────────────────────
async function initNative(userId: string): Promise<BillingProvider | null> {
  // Android follows the web's rule; only the iOS app bills before sign-in.
  if (userId === ANONYMOUS && purchasesNeedAccount()) return null;
  const apiKey = platform() === 'ios'
    ? (import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined)
    : (import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined);
  if (!apiKey) return null;

  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  // Configured once per launch: with the signed-in account, or (iOS app only) anonymously.
  await Purchases.configure({ apiKey, appUserID: userId === ANONYMOUS ? undefined : userId });

  const native: BillingProvider = {
    userId,
    // Between accounts, logIn goes straight from one to the other. logOut makes an anonymous
    // user, so it's only used to go back to anonymous billing in the iOS app.
    switchUser: async (uid: string) => {
      if (uid !== ANONYMOUS) {
        const boughtAnonymously = native.userId === ANONYMOUS && isPro();
        const { customerInfo: info } = await Purchases.logIn({ appUserID: uid });
        // logIn merges an anonymous buyer into the account, unless the account already has
        // an anonymous ID of its own (another device, or the web before Nov 2026). Then the
        // Apple receipt is restored onto the account, so Pro follows them in.
        if (boughtAnonymously && !info.entitlements.active[PRO_ENTITLEMENT]) await Purchases.restorePurchases();
      } else if (native.userId && native.userId !== ANONYMOUS) {
        await Purchases.logOut();
      }
      native.userId = uid;
    },
    load: async () => {
      const { customerInfo: info } = await Purchases.getCustomerInfo();
      if (accountId === native.userId) setCustomerInfo(info); // not if they signed out meanwhile
    },
    stop: async () => {
      native.userId = '';
    },
    purchaseProduct: async (productId: string) => {
      const { current } = await Purchases.getOfferings();
      const pkg = current?.availablePackages.find((p) => p.product.identifier === productId);
      if (!pkg) {
        reportError('billing', new Error(`No native package for ${productId}`), { step: 'purchase', productId });
        return false;
      }
      const { customerInfo: info } = await Purchases.purchasePackage({ aPackage: pkg });
      setCustomerInfo(info);
      const granted = Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
      if (granted) {
        trackPurchase({ value: PRODUCT_VALUE_USD[productId] ?? 0, transactionId: productId });
      }
      return granted;
    },
    restorePurchases: async () => {
      const { customerInfo: info } = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
    },
  };
  // Renewals and refunds arrive here; ignore them once the account has signed out.
  void Purchases.addCustomerInfoUpdateListener((info) => {
    if (accountId && accountId === native.userId) setCustomerInfo(info);
  });
  return native;
}
