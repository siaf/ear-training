import { test, expect, fakeMic, openApp, sounds } from './fixtures';

const BASICS = ['found_higher_lower', 'found_same_diff', 'found_beating', 'found_consonance'];

async function pastIntro(page: import('@playwright/test').Page) {
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible();
  while (await next.isVisible()) await next.click();
  await go.click();
}

const saved = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('fifths.v1') ?? '{}').settings ?? {});

/** A returning learner with these lessons done, and saved settings. */
async function seed(page: import('@playwright/test').Page, completedLevels: string[], settings: object = {}) {
  await page.addInitScript(({ completedLevels, settings }) => {
    if (localStorage.getItem('fifths.v1')) return;
    localStorage.setItem('fifths.v1', JSON.stringify({ hasOnboarded: true, hasEverPracticed: true, completedLevels, settings }));
  }, { completedLevels, settings });
}

test('before the first singing lesson, a steady hum sets the voice range', async ({ page, browserName }) => {
  // Headless WebKit won't take a made-up stream as microphone input. The hum logic is the
  // same in every browser and has unit tests (src/lib/voiceCheck.test.ts); check Safari on
  // a real iPhone.
  test.skip(browserName !== 'chromium', 'WebKit refuses a synthetic mic stream');
  await fakeMic(page, 110); // A2: a low hum
  await seed(page, BASICS);
  await openApp(page, '/?start=voice_match_pitch');
  await pastIntro(page);

  await expect(page.getByRole('heading', { name: 'Hum any comfortable note.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Got it.' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/a lower voice/)).toBeVisible();
  await page.getByRole('button', { name: 'start the lesson' }).click();

  await expect(page.getByText(/^sing [A-G]/)).toBeVisible();
  const settings = await saved(page);
  expect(settings.voiceRange).toBe('lower');
  expect(settings.voiceCheckedAt).toBeGreaterThan(0);
});

test('a skipped voice check is not asked again, and Settings can bring it back', async ({ page }) => {
  await fakeMic(page, 'denied');
  await seed(page, BASICS);
  await openApp(page, '/?start=voice_match_pitch');
  await pastIntro(page);

  await expect(page.getByText(/microphone|mic/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'skip for now' }).click();
  await expect(page.getByText(/^sing [A-G]/)).toBeVisible();
  expect((await saved(page)).voiceCheckedAt).toBeGreaterThan(0);

  await page.goto('/settings');
  await page.getByRole('button', { name: /fine tune/ }).click();
  await page.getByRole('button', { name: 'check again' }).click();
  await expect(page.getByRole('button', { name: 'before next singing lesson' })).toBeDisabled();
  expect((await saved(page)).voiceCheckedAt).toBeUndefined();
});

test('Find Home plays chords that stop short of home, and never names the note', async ({ page }) => {
  await fakeMic(page, 'denied');
  await seed(page, [...BASICS, 'voice_match_pitch'], { voiceCheckedAt: 1 });
  await openApp(page, '/?start=voice_resting_tone');
  await pastIntro(page);

  await expect(page.getByText('sing home', { exact: true })).toBeVisible();
  await expect(page.getByText(/^sing [A-G]/)).toHaveCount(0);
  // Four chords of three notes, from samples or the synth. It used to play just the answer.
  const total = async () => { const s = await sounds(page); return s.synth + s.sample; };
  await expect.poll(total, { timeout: 10_000 }).toBeGreaterThanOrEqual(12);
});
