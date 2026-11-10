import { test, expect, SITE } from './fixtures';

const POST = `${SITE}/blog/best-ear-training-apps/`;

test('the best-apps post shows its updated date and lesson buttons', async ({ page }) => {
  await page.goto(POST);
  await expect(page.locator('.article-meta')).toContainText('Updated');
  const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent() ?? '{}');
  expect(ld.dateModified > ld.datePublished).toBe(true);
  await expect(page.locator('a[data-ph-cta="article-mid"]')).toHaveAttribute('href', /utm_content=mid/);
  await expect(page.locator('.prose')).not.toContainText('{{lesson-cta}}');
});

test('the ear test plays three questions and ends on a lesson link', async ({ page }) => {
  // Count notes started, since headless browsers play audio silently.
  await page.addInitScript(() => {
    const w = window as unknown as { __notes: number };
    w.__notes = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args: Parameters<OscillatorNode['start']>) {
      w.__notes++;
      return start.apply(this, args);
    };
  });
  await page.goto(POST);
  await page.getByRole('button', { name: /Start the ear test/ }).click();

  for (let q = 1; q <= 3; q++) {
    await expect(page.getByText(`Question ${q} of 3`)).toBeVisible();
    const answer = page.getByRole('button', { name: 'Scale degree 3' });
    await expect(answer).toBeEnabled({ timeout: 8000 });
    await answer.click();
    await expect(page.locator('.ear-quiz-answer.is-right')).toHaveCount(1);
  }

  await expect(page.getByText(/You got [0-3] of 3\./)).toBeVisible();
  await expect(page.getByRole('link', { name: /Keep training free in Fifths/ }))
    .toHaveAttribute('href', /app\.fifths\.io\/.*utm_campaign=best-ear-training-apps.*utm_content=quiz/);
  // Each question is a four-chord cadence plus the target note, two oscillators per note.
  expect(await page.evaluate(() => (window as unknown as { __notes: number }).__notes)).toBeGreaterThan(3 * 2 * 10);
});
