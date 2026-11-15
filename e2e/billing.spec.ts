import { test, expect, openApp, signedIn, ACCOUNTS_APP, E2E_USER } from './fixtures';
import type { Page } from '@playwright/test';

/** Every request the page makes to RevenueCat, and every load of its SDK. */
function watchRevenueCat(page: Page) {
  const calls: string[] = [];
  const sdkLoads: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('api.revenuecat.com')) calls.push(decodeURIComponent(r.url()));
    if (/purchases-js/.test(r.url())) sdkLoads.push(r.url());
  });
  return { calls, sdkLoads };
}

/**
 * Waits until the app has asked Supabase's server about the account, plus a moment.
 * Call before loading the page: the answer can come before a later listener starts.
 */
function accountCheck(page: Page) {
  const answered = page.waitForResponse(/localhost:5199\/auth\/v1\/user/);
  return async () => { await answered; await page.waitForTimeout(1_500); };
}

test('nothing goes to RevenueCat for a learner who isn’t signed in', async ({ page }) => {
  const rc = watchRevenueCat(page);
  await openApp(page, '/path');
  await page.goto('/paywall');
  await openApp(page, `${ACCOUNTS_APP}/path`);
  await page.goto(`${ACCOUNTS_APP}/paywall`);
  await expect(page.getByRole('button', { name: 'subscribe' })).toBeVisible();
  await page.waitForTimeout(1_000);
  expect(rc.sdkLoads).toEqual([]);
  expect(rc.calls).toEqual([]);
});

test('a signed-in learner’s billing uses their own account, never an anonymous id', async ({ page }) => {
  const rc = watchRevenueCat(page);
  await signedIn(page);
  const customer = page.waitForRequest(new RegExp(`api\\.revenuecat\\.com.*${E2E_USER.id}`));
  await openApp(page, `${ACCOUNTS_APP}/path`);
  await customer;
  expect(rc.calls.length).toBeGreaterThan(0);
  expect(rc.calls.filter((u) => !u.includes(E2E_USER.id))).toEqual([]);
  expect(rc.calls.join(' ')).not.toContain('RCAnonymousID');
});

for (const server of ['rejects', 'unconfirmed'] as const) {
  test(`nothing goes to RevenueCat when Supabase’s server ${server === 'rejects' ? 'refuses the session' : 'says the email isn’t confirmed'}`, async ({ page }) => {
    const rc = watchRevenueCat(page);
    await signedIn(page, { server });
    const checked = accountCheck(page);
    await openApp(page, `${ACCOUNTS_APP}/path`);
    await checked();
    expect(rc.sdkLoads).toEqual([]);
    expect(rc.calls).toEqual([]);
  });
}

// FIFTHS-WEB-11: the RevenueCat SDK is a lazy import, and a bad connection used to leave
// billing dead until a reload. It tries again, still with the signed-in account.
test('billing recovers when its first load fails', async ({ page }) => {
  let blocked = 0;
  await page.route(/purchases-js/, (route) => {
    if (blocked++ === 0) return route.abort();
    return route.continue();
  });
  await signedIn(page);
  const customer = page.waitForRequest(new RegExp(`api\\.revenuecat\\.com.*${E2E_USER.id}`), { timeout: 15_000 });
  await openApp(page, `${ACCOUNTS_APP}/path`);
  await customer;
  expect(blocked).toBeGreaterThan(1);
});
