import { test, expect, openApp, asPro, ACCOUNTS_APP } from './fixtures';
import type { Page } from '@playwright/test';

const FOUNDATIONS = ['found_higher_lower', 'found_same_diff', 'rhy_same_diff', 'found_beating', 'found_consonance'];
const LESSON = 'Harmonic: Fourths, Fifths and Octaves';

async function pastIntro(page: Page) {
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible({ timeout: 20_000 });
  if (await next.isVisible()) await next.click();
  await go.click();
}

/** Answer every question with the same button until the results screen. */
async function answerEverything(page: Page, answer: RegExp | ((q: number) => RegExp)) {
  for (let q = 1; q <= 40 && !/results/.test(page.url()); q++) {
    const button = page.getByRole('button', { name: typeof answer === 'function' ? answer(q) : answer });
    await expect(button).toBeEnabled({ timeout: 20_000 });
    await button.click();
    await page.keyboard.press('Enter');
    // The last answer can go straight to the results.
    const counter = page.getByText(new RegExp(`^${q}/\\d+$`));
    await expect.poll(async () => /results/.test(page.url()) || await counter.isVisible(), { timeout: 10_000 }).toBe(true);
    if (/results/.test(page.url())) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
  }
  await expect(page).toHaveURL(/results/);
}

/**
 * The 4ths, 5ths and octaves lesson, every question asking a perfect 4th (Math.random is
 * pinned), answered "Perfect 5th" every time: a failed lesson that mixed up P4 and P5.
 */
async function failIntervalLesson(page: Page, base = '') {
  await page.addInitScript(() => { Math.random = () => 0; });
  await openApp(page, `${base}/?start=int_harmonic_4ths_5ths`, FOUNDATIONS);
  await pastIntro(page);
  await answerEverything(page, /^Perfect 5th/);
}

test('after a lesson, "repeat lesson" plays the same lesson again, and leads when it was missed', async ({ page }) => {
  test.setTimeout(120_000);
  await failIntervalLesson(page);

  await expect(page.getByRole('button', { name: /next lesson/ })).toBeHidden();
  const repeat = page.getByRole('button', { name: 'repeat lesson' });
  await expect(repeat).toBeVisible();
  await expect(page.getByRole('button', { name: /keep going/ })).toBeHidden();

  await repeat.click();
  await expect(page).toHaveURL(/practice/);
  await expect(page.getByText(LESSON).first()).toBeVisible();
});

test('free learners are offered a drill of what they missed, which leads to the plans', async ({ page }) => {
  test.setTimeout(120_000);
  await failIntervalLesson(page);

  await expect(page.getByText('P4 vs P5', { exact: true })).toBeVisible();
  await expect(page.getByText(/drill just these, 10 questions · together/)).toBeVisible();
  await page.getByRole('button', { name: /drill what you missed/ }).click();
  await expect(page).toHaveURL(/paywall/);
});

test('Pro learners drill just what they missed, and can repeat that drill', async ({ page }) => {
  test.setTimeout(150_000);
  await asPro(page);
  await failIntervalLesson(page, ACCOUNTS_APP);

  await page.getByRole('button', { name: /drill what you missed/ }).click();
  await expect(page).toHaveURL(/practice/);
  await pastIntro(page);
  // Only the two intervals that were mixed up, not the octave the lesson also asks.
  await expect(page.getByRole('button', { name: /^Perfect 4th/ })).toBeEnabled({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /^Octave/ })).toHaveCount(0);
  await answerEverything(page, /^Perfect 4th/);

  await expect(page.locator('h1')).toContainText('P4 vs P5');
  await expect(page.getByText('unlocks nothing')).toBeVisible();
  await expect(page.getByRole('button', { name: 'repeat drill' })).toBeVisible();
  // A clean drill has nothing left to drill.
  await expect(page.getByRole('button', { name: /drill what you missed/ })).toBeHidden();
});

test('finished lessons on the path say they can be repeated, and tapping one replays it', async ({ page }) => {
  await openApp(page, '/path', FOUNDATIONS);
  const done = page.getByRole('button', { name: 'Higher or Lower', exact: true });
  await expect(done).toHaveAttribute('title', 'Repeat Higher or Lower');
  // Lessons not finished yet don't.
  await expect(page.getByRole('button', { name: LESSON, exact: true })).not.toHaveAttribute('title', /Repeat/);
  await done.click();
  await expect(page).toHaveURL(/practice/);
  await expect(page.getByText('Higher or Lower').first()).toBeVisible();
});

test('a narrow pass offers "repeat lesson" next to "keep going", and says why', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => { Math.random = () => 0; }); // every question is a perfect 4th
  await openApp(page, '/?start=int_harmonic_4ths_5ths', FOUNDATIONS);
  await pastIntro(page);
  // 10 of 12 right: a pass (the target is 75%), but not a solid one.
  await answerEverything(page, (q) => (q <= 2 ? /^Perfect 5th/ : /^Perfect 4th/));

  const mastered = page.getByRole('dialog', { name: /mastery/i });
  await expect(mastered).toBeVisible();
  await expect(mastered).toContainText('You passed with 83%. One more run would lock it in.');
  await expect(mastered.getByRole('button', { name: /keep going/ })).toBeVisible();
  await mastered.getByRole('button', { name: 'repeat lesson' }).click();

  await expect(page).toHaveURL(/practice/);
  await expect(page.getByText(LESSON).first()).toBeVisible();
});
