import { test, expect, openApp } from './fixtures';

// FIFTHS-WEB-11: the RevenueCat SDK is a lazy import, and a bad connection at boot left
// billing dead until a reload. Runs the real module with RevenueCat's API stubbed.
test('billing recovers when its first load fails', async ({ page }) => {
  let blocked = 0;
  await page.route(/purchases-js/, (route) => {
    if (blocked++ === 0) return route.abort();
    return route.continue();
  });
  await openApp(page);
  await expect.poll(() => blocked).toBeGreaterThan(0);

  // Signed in while billing was down: the retry must use this account, or a purchase
  // would attach to an anonymous ID and be lost.
  const customer = page.waitForRequest(/api\.revenuecat\.com.*e2e-user/);
  const restored = await page.evaluate(async () => {
    const { identifyUser, restorePurchases } = await import('/src/lib/billing.ts');
    await identifyUser('e2e-user');
    return restorePurchases();
  });
  await customer;
  expect(restored).toBe(false); // a free customer, answered by the SDK
});
