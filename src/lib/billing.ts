import { isNative, platform } from './native';
import { trackPurchase } from './attribution';
import { phCapture } from './posthog';
import { reportError } from './reportError';

// Entitlement identifier configured in RevenueCat dashboard.
// All paid tiers (monthly, annual, lifetime) grant this same entitlement.
export const PRO_ENTITLEMENT = 'pro';

// IAP product IDs — these must match exactly in App Store Connect, Play
// Console, and RevenueCat Web Billing (Stripe). See [TODO.md](../../TODO.md).
export const PRODUCT_IDS = {
  proMonthly: 'fifths_pro_monthly',
  proAnnual:  'fifths_pro_annual',
  lifetime:   'fifths_lifetime',
} as const;

type CustomerInfoLike = {
  entitlements?: { active?: Record<string, unknown> };
};

const PRODUCT_VALUE_USD: Record<string, number> = {
  [PRODUCT_IDS.proMonthly]: 4.99,
  [PRODUCT_IDS.proAnnual]: 39.99,
  [PRODUCT_IDS.lifetime]: 99.0,
};

interface BillingProvider {
  isPro: () => boolean;
  identifyUser: (userId: string) => Promise<void>;
  logOut: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

let provider: BillingProvider | null = null;
let initStarted = false;
let lastUserId: string | undefined;
let customerInfo: CustomerInfoLike | null = null;
const listeners = new Set<(info: CustomerInfoLike | null) => void>();

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

/** Call once at app boot. Picks the right SDK (web vs iOS/Android). */
export async function initBilling(userId?: string): Promise<void> {
  if (initStarted) return;
  initStarted = true;

  try {
    if (isNative()) {
      provider = await initNative(userId);
    } else {
      provider = await initWeb(userId);
    }
  } catch (err) {
    reportError('billing', err, { step: 'init' });
    provider = null;
    initStarted = false;
  }
}

export async function identifyUser(userId: string): Promise<void> {
  lastUserId = userId;
  if (!provider) return;
  try { await provider.identifyUser(userId); } catch (err) { reportError('billing', err, { step: 'identify' }); }
}

export async function logOutBilling(): Promise<void> {
  if (!provider) return;
  try { await provider.logOut(); } catch (err) { console.warn('[billing] logOut failed', err); }
}

export async function purchaseProduct(productId: string): Promise<boolean> {
  phCapture('purchase_started', { product_id: productId });
  // Init can fail on a bad connection at boot (the SDK is a lazy import), so try again.
  if (!provider) await initBilling(lastUserId);
  if (!provider) {
    reportError('billing', new Error('purchaseProduct called before billing init'), { step: 'purchase', productId });
    phCapture('purchase_failed', { product_id: productId, reason: 'billing_not_ready' });
    return false;
  }
  try { return await provider.purchaseProduct(productId); }
  catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'PURCHASE_CANCELLED') {
      phCapture('purchase_cancelled', { product_id: productId });
    } else {
      reportError('billing', err, { step: 'purchase', productId });
      phCapture('purchase_failed', { product_id: productId, reason: code ?? 'error' });
    }
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!provider) await initBilling(lastUserId);
  if (!provider) return false;
  try { return await provider.restorePurchases(); }
  catch (err) { reportError('billing', err, { step: 'restore' }); return false; }
}

// ─── Web (Stripe via RevenueCat Web Billing) ────────────────────────────
const RC_ANON_ID_KEY = 'fifths.rc.anon_id';

function persistedAnonId(generate: () => string): string {
  try {
    const existing = localStorage.getItem(RC_ANON_ID_KEY);
    if (existing) return existing;
    const fresh = generate();
    localStorage.setItem(RC_ANON_ID_KEY, fresh);
    return fresh;
  } catch {
    return generate();
  }
}

async function initWeb(userId?: string): Promise<BillingProvider | null> {
  const apiKey = import.meta.env.VITE_REVENUECAT_WEB_KEY as string | undefined;
  if (!apiKey) return null;

  const { Purchases, LogLevel } = await import('@revenuecat/purchases-js');
  if (import.meta.env.DEV) Purchases.setLogLevel(LogLevel.Verbose);

  const appUserId = userId ?? persistedAnonId(() => Purchases.generateRevenueCatAnonymousAppUserId());
  if (!Purchases.isConfigured()) {
    Purchases.configure({ apiKey, appUserId });
  }
  const inst = Purchases.getSharedInstance();
  setCustomerInfo(await inst.getCustomerInfo());

  return {
    isPro,
    identifyUser: async (uid: string) => {
      const result = await inst.identifyUser(uid);
      setCustomerInfo(result.customerInfo);
    },
    logOut: async () => {
      const fresh = Purchases.generateRevenueCatAnonymousAppUserId();
      try { localStorage.setItem(RC_ANON_ID_KEY, fresh); } catch { /* ignore */ }
      await inst.changeUser(fresh);
      setCustomerInfo(await inst.getCustomerInfo());
    },
    purchaseProduct: async (productId: string) => {
      const offerings = await inst.getOfferings();
      const offering = offerings.current;
      const pkg = offering?.availablePackages.find(
        (p) => p.webBillingProduct?.identifier === productId,
      );
      if (!pkg) {
        console.warn('[billing] no web package for', productId);
        return false;
      }
      const result = await inst.purchase({ rcPackage: pkg });
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
}

// ─── Native (iOS / Android via Capacitor) ───────────────────────────────
async function initNative(userId?: string): Promise<BillingProvider | null> {
  const apiKey = platform() === 'ios'
    ? (import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined)
    : (import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined);
  if (!apiKey) return null;

  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey, appUserID: userId });
  const { customerInfo: info } = await Purchases.getCustomerInfo();
  setCustomerInfo(info);

  Purchases.addCustomerInfoUpdateListener((info) => {
    setCustomerInfo(info);
  });

  return {
    isPro,
    identifyUser: async (uid: string) => {
      await Purchases.logIn({ appUserID: uid });
      const { customerInfo: info } = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    },
    logOut: async () => {
      await Purchases.logOut();
      setCustomerInfo(null);
    },
    purchaseProduct: async (productId: string) => {
      const { current } = await Purchases.getOfferings();
      const pkg = current?.availablePackages.find((p) => p.product.identifier === productId);
      if (!pkg) {
        console.warn('[billing] no native package for', productId);
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
}
