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

  // The score can be shared, linking back to this post's test. Reddit gets a text post.
  const share = page.getByLabel('Share your score');
  const x = new URL((await share.getByRole('link', { name: 'Post on X' }).getAttribute('href'))!);
  expect(x.searchParams.get('text')).toMatch(/^I got [0-3] of 3 on a 30-second ear test/);
  expect(x.searchParams.get('url')).toBe(`${POST}?utm_source=share&utm_medium=x&utm_campaign=ear-test`);
  const reddit = new URL((await share.getByRole('link', { name: 'Post on Reddit' }).getAttribute('href'))!);
  expect(reddit.searchParams.get('type')).toBe('TEXT');
  expect(reddit.searchParams.get('title')).toMatch(/^I got [0-3]\/3 on a 30-second ear test/);
  expect(reddit.searchParams.get('text')).toContain(`${POST}?utm_source=share&utm_medium=reddit&utm_campaign=ear-test`);
});

test('the singing apps post starts a singing lesson from the top, and counts links to other apps', async ({ page }) => {
  await page.goto(`${SITE}/blog/apps-to-sing-in-tune/`);
  const top = page.locator('a[data-ph-cta="article-top"]');
  await expect(top).toHaveText(/Sing your first note/);
  await expect(top).toHaveAttribute('href', /\?start=voice_match_pitch&.*utm_content=top/);

  // PostHog's script doesn't load in tests; stand in for it and keep the page here.
  await page.evaluate(() => {
    const w = window as unknown as { posthog: { capture: (...a: unknown[]) => void }; __captured: unknown[][] };
    w.__captured = [];
    w.posthog = { capture: (...a: unknown[]) => { w.__captured.push(a); } };
    document.addEventListener('click', (e) => e.preventDefault());
  });
  await page.locator('.prose a[href*="singingcarrots.com"]').first().click();
  const captured = await page.evaluate(() => (window as unknown as { __captured: unknown[][] }).__captured);
  expect(captured).toEqual([['outbound_link_clicked', expect.objectContaining({ link_host: 'singingcarrots.com' }), { transport: 'sendBeacon' }]]);

  // Links within the site and into the app aren't outbound.
  await top.click();
  expect(await page.evaluate(() => (window as unknown as { __captured: unknown[][] }).__captured.length)).toBe(1);
});

