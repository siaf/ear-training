import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({ captureMessage: vi.fn() }));
const reportError = vi.hoisted(() => vi.fn());
const phCapture = vi.hoisted(() => vi.fn());
// A stand-in for the RevenueCat web SDK that remembers what the app asked of it.
const rc = vi.hoisted(() => {
  const state = {
    imported: false,
    configuredWith: [] as string[],
    current: null as string | null,
    closed: 0,
    anonymousIdsMade: 0,
    customerInfoFor: [] as string[],
    getCustomerInfo: vi.fn(),
    purchase: vi.fn(),
    getOfferings: vi.fn(),
  };
  const instance = {
    getAppUserId: () => state.current,
    changeUser: async (id: string) => { state.current = id; },
    close: () => { state.current = null; state.closed++; },
    getCustomerInfo: async () => {
      state.customerInfoFor.push(state.current!);
      return state.getCustomerInfo();
    },
    getOfferings: (...a: unknown[]) => state.getOfferings(...a),
    purchase: (...a: unknown[]) => state.purchase(...a),
  };
  return { state, instance };
});

vi.mock('@sentry/react', () => sentry);
vi.mock('./reportError', () => ({ reportError }));
vi.mock('./posthog', () => ({ phCapture }));
vi.mock('./attribution', () => ({ trackPurchase: vi.fn() }));
const device = vi.hoisted(() => ({ platform: 'web' as 'web' | 'ios' | 'android' }));
vi.mock('./native', () => ({ isNative: () => device.platform !== 'web', platform: () => device.platform }));

// A stand-in for the RevenueCat native SDK (iOS and Android apps).
const native = vi.hoisted(() => ({
  imported: false,
  configuredWith: [] as (string | undefined)[],
  current: null as string | null,
  calls: [] as string[],
  pro: new Set<string>(),
  /** Accounts that already have an anonymous ID, so logIn won't merge another into them. */
  aliased: new Set<string>(),
}));
vi.mock('@revenuecat/purchases-capacitor', () => {
  native.imported = true;
  const info = () => ({ customerInfo: { entitlements: { active: native.current && native.pro.has(native.current) ? { pro: {} } : {} } } });
  return {
    LOG_LEVEL: { DEBUG: 0 },
    Purchases: {
      setLogLevel: async () => {},
      configure: async ({ appUserID }: { appUserID?: string }) => {
        native.configuredWith.push(appUserID);
        native.current = appUserID ?? '$RCAnonymousID:1';
      },
      logIn: async ({ appUserID }: { appUserID: string }) => {
        native.calls.push(`logIn ${appUserID}`);
        // RevenueCat merges the anonymous buyer in, unless the account already has an anonymous alias.
        if (native.current?.startsWith('$RCAnonymousID') && native.pro.has(native.current) && !native.aliased.has(appUserID)) native.pro.add(appUserID);
        native.current = appUserID;
        return info();
      },
      logOut: async () => { native.calls.push('logOut'); native.current = '$RCAnonymousID:2'; },
      getCustomerInfo: async () => info(),
      restorePurchases: async () => { native.calls.push('restore'); if (native.current) native.pro.add(native.current); return info(); },
      addCustomerInfoUpdateListener: async () => 'listener',
    },
  };
});
vi.mock('@revenuecat/purchases-js', () => {
  rc.state.imported = true;
  return {
    LogLevel: { Verbose: 0 },
    Purchases: {
      setLogLevel: vi.fn(),
      generateRevenueCatAnonymousAppUserId: () => { rc.state.anonymousIdsMade++; return 'anon'; },
      isConfigured: () => rc.state.current !== null,
      configure: ({ appUserId }: { appUserId: string }) => {
        rc.state.configuredWith.push(appUserId);
        rc.state.current = appUserId;
        return rc.instance;
      },
      getSharedInstance: () => rc.instance,
    },
  };
});

const FREE = { entitlements: { active: {} } };
const PRO = { entitlements: { active: { pro: {} } } };

function resetRc() {
  Object.assign(rc.state, { imported: false, configuredWith: [], current: null, closed: 0, anonymousIdsMade: 0, customerInfoFor: [] });
  rc.state.getCustomerInfo.mockReset().mockResolvedValue(FREE);
  rc.state.purchase.mockReset();
  rc.state.getOfferings.mockReset();
}

const offering = (identifier: string) => ({
  current: { availablePackages: [{ webBillingProduct: { identifier } }] },
});

async function loadBilling(key: string, platform: 'web' | 'ios' | 'android' = 'web') {
  vi.resetModules();
  resetRc();
  device.platform = platform;
  Object.assign(native, { imported: false, configuredWith: [], current: null, calls: [], pro: new Set(), aliased: new Set() });
  vi.stubEnv('VITE_REVENUECAT_WEB_KEY', key);
  vi.stubEnv('VITE_REVENUECAT_IOS_KEY', 'appl_test');
  vi.stubEnv('VITE_REVENUECAT_ANDROID_KEY', 'goog_test');
  const billing = await import('./billing');
  billing.setBillingRetryDelaysForTests([1, 1]);
  return billing;
}

describe('sandbox checkout attempts', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('alerts us when someone picks a plan on the sandbox key', async () => {
    const { reportSandboxCheckoutAttempt } = await loadBilling('rcb_sb_test');
    reportSandboxCheckoutAttempt('fifths_pro_monthly', false);
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
    const [, context] = sentry.captureMessage.mock.calls[0];
    expect(context.level).toBe('error');
    expect(context.fingerprint).toEqual(['sandbox-checkout-attempt']);
    expect(context.tags).toMatchObject({ product: 'fifths_pro_monthly', signed_in: 'false' });
  });

  it('stays quiet and opens checkout once the live key is in', async () => {
    const { checkoutIsOpen, reportSandboxCheckoutAttempt } = await loadBilling('rcb_live_key');
    reportSandboxCheckoutAttempt('fifths_pro_monthly', true);
    expect(sentry.captureMessage).not.toHaveBeenCalled();
    expect(checkoutIsOpen()).toBe(true);
  });

  it('keeps checkout closed on the sandbox key', async () => {
    const { checkoutIsOpen } = await loadBilling('rcb_sb_test');
    expect(checkoutIsOpen()).toBe(false);
  });
});

describe('purchaseProduct on the web', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('treats closing the checkout as a cancel, not a failure', async () => {
    const { startBilling, purchaseProduct } = await loadBilling('rcb_sb_test');
    await startBilling('user');
    rc.state.getOfferings.mockResolvedValue(offering('fifths_pro_monthly'));
    rc.state.purchase.mockRejectedValue({ errorCode: 1 });

    expect(await purchaseProduct('fifths_pro_monthly')).toBe('cancelled');
    expect(phCapture).toHaveBeenCalledWith('purchase_cancelled', { product_id: 'fifths_pro_monthly' });
    expect(reportError).not.toHaveBeenCalled();
  });

  it('reports a product missing from the offering', async () => {
    const { startBilling, purchaseProduct } = await loadBilling('rcb_sb_test');
    await startBilling('user');
    rc.state.getOfferings.mockResolvedValue(offering('something_else'));

    expect(await purchaseProduct('fifths_pro_monthly')).toBe('failed');
    expect(reportError).toHaveBeenCalledTimes(1);
  });
});

describe('billing only for signed-in accounts', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('sends nothing to RevenueCat for someone who isn’t signed in, not even to buy', async () => {
    const { purchaseProduct, restorePurchases, isPro } = await loadBilling('rcb_live_key');
    expect(await purchaseProduct('fifths_pro_monthly')).toBe('failed');
    expect(await restorePurchases()).toBe(false);
    expect(isPro()).toBe(false);
    expect(rc.state.imported).toBe(false);
    expect(phCapture).toHaveBeenCalledWith('purchase_failed', { product_id: 'fifths_pro_monthly', reason: 'not_signed_in' });
  });

  it('starts with the account’s own id: no anonymous id, nothing to alias', async () => {
    const { startBilling, isPro } = await loadBilling('rcb_live_key');
    rc.state.getCustomerInfo.mockResolvedValue(PRO);
    await startBilling('account-1');
    expect(rc.state.configuredWith).toEqual(['account-1']);
    expect(rc.state.customerInfoFor).toEqual(['account-1']);
    expect(rc.state.anonymousIdsMade).toBe(0);
    expect(isPro()).toBe(true);
  });

  it('tries again when RevenueCat fails, and reports only when every try failed', async () => {
    const { startBilling, isPro } = await loadBilling('rcb_live_key');
    rc.state.getCustomerInfo.mockRejectedValueOnce(new Error('Unknown backend error.')).mockResolvedValue(PRO);
    await startBilling('account-1');
    expect(isPro()).toBe(true);
    expect(reportError).not.toHaveBeenCalled();

    const again = await loadBilling('rcb_live_key');
    rc.state.getCustomerInfo.mockRejectedValue(new Error('Unknown backend error.'));
    await again.startBilling('account-2');
    expect(rc.state.customerInfoFor).toEqual(['account-2', 'account-2', 'account-2']);
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError.mock.calls[0][2]).toMatchObject({ step: 'load', attempts: 3 });
  });

  it('loads again before checkout if the first load never worked', async () => {
    const { startBilling, purchaseProduct } = await loadBilling('rcb_live_key');
    rc.state.getCustomerInfo.mockRejectedValue(new Error('offline'));
    await startBilling('account-1');
    rc.state.getCustomerInfo.mockResolvedValue(FREE);
    rc.state.getOfferings.mockResolvedValue(offering('fifths_pro_monthly'));
    rc.state.purchase.mockResolvedValue({ customerInfo: PRO });
    expect(await purchaseProduct('fifths_pro_monthly')).toBe('purchased');
    expect(new Set(rc.state.customerInfoFor)).toEqual(new Set(['account-1']));
  });

  it('forgets the account on sign-out, and the next account starts clean', async () => {
    const { startBilling, stopBilling, isPro } = await loadBilling('rcb_live_key');
    rc.state.getCustomerInfo.mockResolvedValue(PRO);
    await startBilling('account-1');
    await stopBilling();
    expect(isPro()).toBe(false);
    expect(rc.state.closed).toBe(1);

    rc.state.getCustomerInfo.mockResolvedValue(FREE);
    await startBilling('account-2');
    expect(rc.state.configuredWith).toEqual(['account-1', 'account-2']);
    expect(isPro()).toBe(false);
    expect(rc.state.anonymousIdsMade).toBe(0);
  });

  it('ignores an answer that arrives after the account signed out', async () => {
    const { startBilling, stopBilling, isPro } = await loadBilling('rcb_live_key');
    let answer: (v: unknown) => void = () => {};
    rc.state.getCustomerInfo.mockReturnValue(new Promise((r) => { answer = r; }));
    const loading = startBilling('account-1');
    await vi.waitFor(() => expect(rc.state.customerInfoFor).toHaveLength(1));
    await stopBilling();
    answer(PRO);
    await loading;
    expect(isPro()).toBe(false);
  });
});

describe('the iOS app, where Apple lets people buy without an account', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('bills anonymously from launch, so buying and restoring work signed out', async () => {
    const billing = await loadBilling('rcb_live_key', 'ios');
    expect(billing.purchasesNeedAccount()).toBe(false);
    native.pro.add('$RCAnonymousID:1');
    await billing.startBillingWithoutAccount();
    expect(native.configuredWith).toEqual([undefined]);
    expect(billing.isPro()).toBe(true);
    expect(await billing.restorePurchases()).toBe(true);
    expect(rc.state.imported).toBe(false); // never the web SDK
  });

  it('brings a purchase made before signing in into the account', async () => {
    const billing = await loadBilling('rcb_live_key', 'ios');
    native.pro.add('$RCAnonymousID:1');
    await billing.startBillingWithoutAccount();
    await billing.startBilling('account-1');
    expect(native.calls).toEqual(['logIn account-1']); // merged by logIn
    expect(billing.isPro()).toBe(true);

    // An account that already has an anonymous ID doesn't merge, so the receipt is restored onto it.
    const again = await loadBilling('rcb_live_key', 'ios');
    native.pro.add('$RCAnonymousID:1');
    native.aliased.add('account-2');
    await again.startBillingWithoutAccount();
    await again.startBilling('account-2');
    expect(native.calls).toEqual(['logIn account-2', 'restore']);
    expect(again.isPro()).toBe(true);
  });

  it('moves to the account once it is confirmed, and back to anonymous on sign-out', async () => {
    const billing = await loadBilling('rcb_live_key', 'ios');
    native.pro.add('account-1');
    void billing.startBillingWithoutAccount();
    await billing.startBilling('account-1'); // a sign-in straight after launch waits its turn
    expect(native.configuredWith).toEqual([undefined]);
    expect(native.calls).toEqual(['logIn account-1']);
    expect(billing.isPro()).toBe(true);

    await billing.stopBilling();
    expect(native.calls).toEqual(['logIn account-1', 'logOut']);
    expect(billing.isPro()).toBe(false);
  });
});

describe('the Android app and the web keep the account rule', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  for (const platform of ['android', 'web'] as const) {
    it(`${platform}: nothing starts without an account, and sign-out never makes an anonymous user`, async () => {
      const billing = await loadBilling('rcb_live_key', platform);
      expect(billing.purchasesNeedAccount()).toBe(true);
      await billing.startBillingWithoutAccount();
      expect(native.imported || rc.state.imported).toBe(false);
      expect(await billing.purchaseProduct('fifths_pro_monthly')).toBe('failed');

      await billing.startBilling('account-1');
      await billing.stopBilling();
      expect(native.calls).not.toContain('logOut');
      expect(rc.state.anonymousIdsMade).toBe(0);
      if (platform === 'android') expect(native.configuredWith).toEqual(['account-1']);
    });
  }
});
