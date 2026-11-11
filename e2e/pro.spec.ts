import { test, expect, asPro, openApp, sounds } from './fixtures';

const TWO_DONE = ['found_higher_lower', 'found_same_diff'];
const DICTATION_READY = [...TWO_DONE, 'ton_stable_unstable', 'ton_is_tonic', 'scale_degree_major_1', 'scale_degree_major_2'];

async function pastIntro(page: import('@playwright/test').Page) {
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible();
  if (await next.isVisible()) await next.click();
  await go.click();
}

test('custom practice is offered to free learners as Pro and leads to the plans', async ({ page }) => {
  await openApp(page, '/path', TWO_DONE);
  await page.getByRole('button', { name: /Custom practice/ }).first().click();
  await expect(page).toHaveURL(/custom/);
  await page.getByRole('button', { name: 'unlock with pro' }).click();
  await expect(page).toHaveURL(/paywall/);
});

test('custom practice drills only the chosen intervals and unlocks nothing', async ({ page }) => {
  test.setTimeout(120_000);
  await asPro(page);
  await openApp(page, '/path', TWO_DONE);
  await page.getByRole('button', { name: /Custom practice/ }).first().click();

  await page.getByRole('button', { name: 'Intervals', exact: true }).click();
  // Played downwards only, sixths only.
  await page.getByRole('button', { name: 'Together', exact: true }).click();
  await page.getByRole('button', { name: 'Down', exact: true }).click();
  for (const name of ['Minor 2nd', 'Major 2nd', 'Minor 3rd']) {
    const chip = page.getByRole('button', { name, exact: true });
    if ((await chip.getAttribute('aria-pressed')) === 'true') await chip.click();
  }
  await page.getByRole('button', { name: 'Minor 6th', exact: true }).click();
  await page.getByRole('button', { name: 'Major 6th', exact: true }).click();
  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: 'start practice' }).click();

  await expect(page).toHaveURL(/practice/);
  await expect(page.getByText('10 questions on exactly what you picked.')).toBeVisible();
  await pastIntro(page);

  for (let q = 1; q <= 10; q++) {
    const answer = page.getByRole('button', { name: /Minor 6th/ });
    await expect(answer).toBeEnabled({ timeout: 20_000 });
    // Only the two chosen intervals are offered.
    await expect(page.getByRole('button', { name: /Major 3rd|Perfect 5th|Octave/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Major 6th/ })).toBeVisible();
    await answer.click();
    await page.keyboard.press('Enter');
    await expect(page.getByText(`${q}/10`)).toBeVisible();
    await page.keyboard.press('Enter');
  }

  await expect(page).toHaveURL(/results/);
  await expect(page.getByText('unlocks nothing')).toBeVisible();
  await expect(page.locator('h1')).toContainText('Custom practice');
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('fifths.v1') ?? '{}').completedLevels);
  expect(done).toEqual(TWO_DONE);
});

test('melodic dictation plays a key and a melody, then marks each note', async ({ page }) => {
  await asPro(page);
  await openApp(page, '/path', DICTATION_READY);
  await page.getByRole('button', { name: 'Three Notes, Step by Step', exact: true }).click();
  await expect(page).toHaveURL(/practice/);
  await pastIntro(page);

  // Tonic chord (three notes) plus three melody notes, from samples or the synth.
  const total = async () => { const s = await sounds(page); return s.synth + s.sample; };
  await expect.poll(total, { timeout: 10_000 }).toBeGreaterThanOrEqual(6);
  await expect(page.getByRole('listitem', { name: 'Note 1: empty' })).toBeVisible();

  const check = page.getByRole('button', { name: 'check' });
  await expect(check).toBeDisabled();
  await page.getByRole('button', { name: 'Degree 1' }).click();
  await page.getByRole('button', { name: 'Degree 2' }).click();
  await page.getByRole('button', { name: 'Degree 4' }).click();
  await page.getByRole('button', { name: /undo/ }).click();
  await expect(page.getByRole('listitem', { name: 'Note 3: empty' })).toBeVisible();
  await page.getByRole('button', { name: 'Degree 3' }).click();

  const before = await total();
  await page.getByRole('button', { name: /again/ }).click();
  await expect.poll(total).toBeGreaterThanOrEqual(before + 4);

  await check.click();
  await expect(page.getByText(/nice!|not quite/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel('The melody').locator('div')).toHaveCount(3);
});

test('Pro stats can show all time, by week once the history is long', async ({ page }) => {
  await asPro(page);
  await page.addInitScript(() => {
    const day = 86_400_000;
    const session = (daysAgo: number) => {
      const endedAt = Date.now() - daysAgo * day;
      return {
        id: `s${daysAgo}`, endedAt, startedAt: endedAt - 300_000, levelId: 'found_higher_lower', segmentId: 'foundations',
        totalQuestions: 10, correct: 8, accuracy: 80, avgResponseMs: 1500, fastestMs: 900,
        items: { 'acoustic:higher': { attempts: 10, correct: 8 } }, confusions: [], unlocked: false,
      };
    };
    localStorage.setItem('fifths.sessions.v1', JSON.stringify([session(200), session(1)]));
  });
  await openApp(page, '/stats');
  await expect(page.getByText('last 30 days')).toBeVisible();
  await page.getByRole('button', { name: 'all time', exact: true }).click();
  await expect(page.getByText('all time, by week')).toBeVisible();
});
