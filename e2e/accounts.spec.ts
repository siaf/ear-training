import { test, expect, openApp } from './fixtures';

const ACCOUNTS_APP = process.env.ACCOUNTS_APP_URL ?? 'http://localhost:5192';

// A first lesson passed with a perfect score, which opens the mastery overlay.
async function passFirstLesson(page: import('@playwright/test').Page) {
  await page.addInitScript(() => { Math.random = () => 0; }); // every question has the same answer
  await openApp(page, `${ACCOUNTS_APP}/?start=found_higher_lower`);
  await page.getByRole('button', { name: /^next/i }).or(page.getByRole('button', { name: /let's go/i })).first().click();
  const go = page.getByRole('button', { name: /let's go/i });
  if (await go.isVisible()) await go.click();

  for (let question = 1; question <= 8; question++) {
    await page.getByRole('button', { name: /^higher/i }).click({ timeout: 20_000 });
    await page.keyboard.press('Enter');
    await expect(page.getByText(`${question}/8`, { exact: true })).toBeVisible();
    await page.keyboard.press('Enter');
  }
  await expect(page).toHaveURL(/results/);
}

test('the sign-in ask stays up after continuing from a passed lesson', async ({ page }) => {
  test.setTimeout(120_000);
  await passFirstLesson(page);

  await page.getByRole('dialog', { name: /mastery/i }).getByRole('button', { name: /keep going/i }).click();

  await expect(page.getByRole('dialog', { name: /sign in/i })).toBeVisible();
  await expect(page).toHaveURL(/results/);

  await page.getByRole('button', { name: /not now/i }).click();
  await expect(page.getByRole('dialog', { name: /sign in/i })).toBeHidden();
});
