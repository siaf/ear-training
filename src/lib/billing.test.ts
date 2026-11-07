import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({ captureMessage: vi.fn() }));
const reportError = vi.hoisted(() => vi.fn());
const phCapture = vi.hoisted(() => vi.fn());
const purchases = vi.hoisted(() => ({ purchase: vi.fn(), getOfferings: vi.fn() }));

vi.mock('@sentry/react', () => sentry);
vi.mock('./reportError', () => ({ reportError }));
vi.mock('./posthog', () => ({ phCapture }));
vi.mock('./attribution', () => ({ trackPurchase: vi.fn() }));
vi.mock('./native', () => ({ isNative: () => false, platform: () => 'web' }));
vi.mock('@revenuecat/purchases-js', () => ({
  LogLevel: { Verbose: 0 },
  Purchases: {
    setLogLevel: vi.fn(),
    generateRevenueCatAnonymousAppUserId: () => 'anon',
    isConfigured: () => true,
    getSharedInstance: () => ({
      getCustomerInfo: async () => ({ entitlements: { active: {} } }),
      getOfferings: purchases.getOfferings,
      purchase: purchases.purchase,
    }),
  },
}));

const offering = (identifier: string) => ({
  current: { availablePackages: [{ webBillingProduct: { identifier } }] },
});

async function loadBilling(key: string) {
  vi.resetModules();
  vi.stubEnv('VITE_REVENUECAT_WEB_KEY', key);
  return import('./billing');
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
    const { initBilling, purchaseProduct } = await loadBilling('rcb_sb_test');
    await initBilling('user');
    purchases.getOfferings.mockResolvedValue(offering('fifths_pro_monthly'));
    purchases.purchase.mockRejectedValue({ errorCode: 1 });

    expect(await purchaseProduct('fifths_pro_monthly')).toBe(false);
    expect(phCapture).toHaveBeenCalledWith('purchase_cancelled', { product_id: 'fifths_pro_monthly' });
    expect(reportError).not.toHaveBeenCalled();
  });

  it('reports a product missing from the offering', async () => {
    const { initBilling, purchaseProduct } = await loadBilling('rcb_sb_test');
    await initBilling('user');
    purchases.getOfferings.mockResolvedValue(offering('something_else'));

    expect(await purchaseProduct('fifths_pro_monthly')).toBe(false);
    expect(reportError).toHaveBeenCalledTimes(1);
  });
});
