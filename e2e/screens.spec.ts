import { test, expect, openApp } from './fixtures';

test('the lesson path lists lessons', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Higher or Lower').first()).toBeVisible();
});

test('stats opens for someone with no history', async ({ page }) => {
  await openApp(page, '/stats');
  await expect(page).toHaveURL(/stats/);
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});

test('settings opens and keeps the chosen instrument', async ({ page }) => {
  await openApp(page, '/settings');
  await page.getByRole('button', { name: /fine tune/ }).click();
  await page.getByRole('button', { name: 'Guitar', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fifths.v1') ?? '{}').settings?.synth))
    .toBe('guitar');
  await page.reload();
  await expect(page).toHaveURL(/settings/);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fifths.v1') ?? '{}').settings?.synth))
    .toBe('guitar');
});

test('the paywall shows the plans and can be closed', async ({ page }) => {
  await openApp(page, '/paywall');
  await expect(page.getByText('Free, or Pro.')).toBeVisible();
  await expect(page.getByRole('button', { name: /subscribe/i })).toHaveCount(1);
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL(/path/);
});

test('the paywall sells one monthly plan at the launch price, after signing in', async ({ page }) => {
  await openApp(page, '/paywall');
  await expect(page.getByText('$4.99', { exact: true })).toBeVisible();
  await expect(page.locator('s', { hasText: '$9.99' })).toBeVisible();
  await expect(page.getByText('launch discount')).toBeVisible();
  await expect(page.getByText(/lifetime|one-time|per year/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'subscribe' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/paywall/);
});

test('a link cannot start a Pro lesson', async ({ page }) => {
  await openApp(page, '/?start=rhy_meter');
  await expect(page).toHaveURL(/path/);
});
