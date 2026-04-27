import { isNative, platform } from './native';

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

interface BillingProvider {
  isPro: () => boolean;
  identifyUser: (userId: string) => Promise<void>;
  logOut: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

let provider: BillingProvider | null = null;
let initStarted = false;
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
    console.warn('[billing] init failed', err);
    provider = null;
    initStarted = false;
  }
}

export async function identifyUser(userId: string): Promise<void> {
  if (!provider) return;
  try { await provider.identifyUser(userId); } catch (err) { console.warn('[billing] identify failed', err); }
}

export async function logOutBilling(): Promise<void> {
  if (!provider) return;
  try { await provider.logOut(); } catch (err) { console.warn('[billing] logOut failed', err); }
}

export async function purchaseProduct(productId: string): Promise<boolean> {
  if (!provider) {
    console.warn('[billing] purchaseProduct called before init');
    return false;
  }
  try { return await provider.purchaseProduct(productId); }
  catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'PURCHASE_CANCELLED') console.warn('[billing] purchase failed', err);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!provider) return false;
  try { return await provider.restorePurchases(); }
  catch (err) { console.warn('[billing] restore failed', err); return false; }
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
      return Boolean(result.customerInfo.entitlements.active[PRO_ENTITLEMENT]);
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
      return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
    },
    restorePurchases: async () => {
      const { customerInfo: info } = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return Boolean(info.entitlements.active[PRO_ENTITLEMENT]);
    },
  };
}
