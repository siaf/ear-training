import { test, expect, openApp } from './fixtures';
import type { Page } from '@playwright/test';

// Old copies of the app (home-screen web apps on iPhone) ask for code files a later deploy
// removed. The app then reloads into the live build, once, and never mid-lesson.
// See src/lib/freshVersion.ts.

const markPage = (page: Page) => page.evaluate(() => { (window as unknown as { __marker?: number }).__marker = 1; });
const stillSamePage = (page: Page) => page.evaluate(() => (window as unknown as { __marker?: number }).__marker === 1);
// What the browser fires when a lazily loaded code file is gone (Vite's preload error).
const codeFileGone = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true })));

test('a missing code file reloads the app once, on the path', async ({ page }) => {
  await openApp(page, '/path');
  await expect(page.getByRole('button', { name: /continue/i }).first()).toBeVisible();
  await markPage(page);
  await codeFileGone(page);
  await expect.poll(() => stillSamePage(page).catch(() => false)).toBe(false);
  await expect(page.getByRole('button', { name: /continue/i }).first()).toBeVisible();

  // The same failure again (a broken deploy, say) doesn't reload it in a loop.
  await markPage(page);
  await codeFileGone(page);
  await page.waitForTimeout(500);
  expect(await stillSamePage(page)).toBe(true);
});

test('a reload never interrupts a lesson: it waits until the learner is back on the path', async ({ page }) => {
  await openApp(page, '/?start=found_higher_lower');
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible({ timeout: 20_000 });
  if (await next.isVisible()) await next.click();
  await go.click();
  await expect(page.getByRole('button', { name: /^higher/i })).toBeVisible({ timeout: 20_000 });
  await markPage(page);
  await codeFileGone(page);
  await page.waitForTimeout(500);
  expect(await stillSamePage(page)).toBe(true); // still in the lesson

  await page.getByRole('button', { name: 'Exit session' }).click();
  const confirm = page.getByRole('button', { name: /end|leave|exit/i }).last();
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await expect.poll(() => stillSamePage(page).catch(() => false), { timeout: 10_000 }).toBe(false);
});
