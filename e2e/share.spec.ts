import { test, expect, openApp } from './fixtures';
import type { Page } from '@playwright/test';

/** Remembers the pages the share sheet opens, instead of opening them. */
async function catchOpens(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __opened: string[] };
    w.__opened = [];
    window.open = ((url?: string | URL) => { w.__opened.push(String(url)); return null; }) as typeof window.open;
  });
}
const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

/** Passes "Higher or Lower" (every question pinned to "higher"), on the main app. */
async function passHigherOrLower(page: Page, completed: string[] = []) {
  await page.addInitScript(() => { Math.random = () => 0; });
  await openApp(page, '/?start=found_higher_lower', completed);
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible({ timeout: 20_000 });
  if (await next.isVisible()) await next.click();
  await go.click();
  for (let q = 1; q <= 8; q++) {
    await page.getByRole('button', { name: /^higher/i }).click({ timeout: 20_000 });
    await page.keyboard.press('Enter');
    const counter = page.getByText(`${q}/8`, { exact: true });
    await expect.poll(async () => /results/.test(page.url()) || await counter.isVisible(), { timeout: 10_000 }).toBe(true);
    if (/results/.test(page.url())) break;
    await page.keyboard.press('Enter');
  }
  await expect(page).toHaveURL(/results/);
}

/** One saved session `daysAgo` days back, with per-item scores. */
function seedSessions(page: Page, sessions: { daysAgo: number; levelId: string; items: Record<string, [number, number]>; unlocked?: boolean }[]) {
  return page.addInitScript((list) => {
    const day = 86_400_000;
    localStorage.setItem('fifths.sessions.v1', JSON.stringify(list.map((s, i) => {
      const endedAt = Date.now() - s.daysAgo * day - 60_000;
      const entries = Object.entries(s.items);
      const total = entries.reduce((n, [, [a]]) => n + a, 0);
      const correct = entries.reduce((n, [, [, c]]) => n + c, 0);
      return {
        id: `seed${i}`, endedAt, startedAt: endedAt - 300_000, levelId: s.levelId, segmentId: 'intervals',
        totalQuestions: total, correct, accuracy: (correct / total) * 100, avgResponseMs: 1500, fastestMs: 900,
        items: Object.fromEntries(entries.map(([k, [a, c]]) => [k, { attempts: a, correct: c }])),
        confusions: [], unlocked: Boolean(s.unlocked),
      };
    })));
  }, sessions);
}

test('a mastered lesson can be shared as a picture, on X, on Reddit as a text post, or as a link', async ({ page }) => {
  test.setTimeout(90_000);
  await catchOpens(page);
  await passHigherOrLower(page);

  const mastered = page.getByRole('dialog', { name: /mastery/i });
  await mastered.getByRole('button', { name: /share your medal/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Share your medal' });
  await expect(sheet).toBeVisible();
  const picture = sheet.getByAltText("The picture you'll share");
  await expect(picture).toBeVisible();
  expect(await picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1200);

  await sheet.getByRole('button', { name: 'Post on X' }).click();
  const x = new URL((await opened(page))[0]);
  expect(x.origin + x.pathname).toBe('https://x.com/intent/post');
  expect(x.searchParams.get('text')).toBe('I can hear two notes and tell which is higher. Just mastered "Higher or Lower" in my ear training 🎧');
  // The link opens the app on the same lesson, so whoever sees it can try it themselves.
  expect(x.searchParams.get('url')).toBe('https://app.fifths.io/?start=found_higher_lower&utm_source=share&utm_medium=x&utm_campaign=medal');

  // Reddit: the picture is saved to add to the post, and the post is text, not a bare link.
  const download = page.waitForEvent('download');
  await sheet.getByRole('button', { name: 'Post on Reddit' }).click();
  expect((await download).suggestedFilename()).toBe('fifths-found_higher_lower-medal.png');
  const reddit = new URL((await opened(page))[1]);
  expect(reddit.origin + reddit.pathname).toBe('https://www.reddit.com/submit');
  expect(reddit.searchParams.get('type')).toBe('TEXT');
  expect(reddit.searchParams.get('title')).toBe('Just mastered "Higher or Lower" in my ear training');
  expect(reddit.searchParams.get('text')).toContain('https://app.fifths.io/?start=found_higher_lower&utm_source=share&utm_medium=reddit&utm_campaign=medal');

  // Escape closes the sheet, not the medal behind it.
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(mastered).toBeVisible();
});

test('the stats screen shares your week, leading with what improved', async ({ page }) => {
  await catchOpens(page);
  await seedSessions(page, [
    { daysAgo: 20, levelId: 'int_harmonic_6ths', items: { 'interval:minor_6th': [10, 5] } },
    { daysAgo: 1, levelId: 'int_harmonic_6ths', items: { 'interval:minor_6th': [10, 9] }, unlocked: true },
  ]);
  await openApp(page, '/stats', ['found_higher_lower', 'found_same_diff']);
  await expect(page.getByText('Minor 6th: 50% → 90%')).toBeVisible();
  await page.getByRole('button', { name: /share your week/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Share your week' });
  await expect(sheet.getByAltText("The picture you'll share")).toBeVisible();
  await sheet.getByRole('button', { name: 'Post on X' }).click();
  const x = new URL((await opened(page))[0]);
  expect(x.searchParams.get('text')).toContain('My week of ear training: Minor 6th: 50% → 90%.');
  expect(x.searchParams.get('text')).toContain('Mastered: Harmonic: Sixths.');
  expect(x.searchParams.get('url')).toBe('https://app.fifths.io/?start=int_harmonic_6ths&utm_source=share&utm_medium=x&utm_campaign=week');
});

test('reaching a 7-day streak offers to share the week, once', async ({ page }) => {
  test.setTimeout(90_000);
  await seedSessions(page, [1, 2, 3, 4, 5, 6].map((daysAgo) => ({ daysAgo, levelId: 'found_higher_lower', items: { 'acoustic:higher': [8, 7] } })));
  // Already passed, so no medal covers the results.
  await passHigherOrLower(page, ['found_higher_lower']);
  const card = page.getByText('7-day streak');
  await expect(card).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(card).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('fifths.share.streak.7'))).toBe('1');
});

test('someone opening a shared medal lands in that lesson, invited to try it themselves', async ({ page }) => {
  await page.goto('/?start=found_higher_lower&utm_source=share&utm_medium=x&utm_campaign=medal');
  await expect(page.getByRole('note')).toContainText('Shared with you. Someone just mastered this. Can you?');
  const next = page.getByRole('button', { name: /^next/i });
  if (await next.isVisible()) await next.click();
  await page.getByRole('button', { name: /try it yourself/i }).click();
  await expect(page.getByRole('button', { name: /^higher/i })).toBeVisible({ timeout: 20_000 });
});
