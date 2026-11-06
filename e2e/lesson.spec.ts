import { test, expect, holdSamples, openApp, sounds } from './fixtures';

async function pastIntro(page: import('@playwright/test').Page) {
  // Lessons have one or two intro pages.
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible();
  if (await next.isVisible()) await next.click();
  await go.click();
}

test('a new visitor can skip onboarding and see the lessons', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole('button', { name: /browse lessons/i }).click();
  await expect(page).toHaveURL(/path/);
});

test('a link from the site opens a free lesson', async ({ page }) => {
  await openApp(page, '/?start=int_harmonic_4ths_5ths');
  await expect(page).toHaveURL(/practice/);
  await pastIntro(page);
  await expect(page.getByRole('button', { name: /Perfect 5th/ })).toBeVisible();
});

// The silent-question bug: an instrument that hadn't downloaded yet played nothing at
// all. When rotation starts varies, so audio.spec.ts covers guitar, violin and cello.
test('every question in a lesson plays, even with no samples downloaded', async ({ page }) => {
  test.setTimeout(180_000);
  const degrees: string[] = [];
  page.on('console', (m) => {
    const degree = /Playing scale degree (\d)/.exec(m.text());
    if (degree) degrees.push(degree[1]);
  });

  await holdSamples(page);
  await openApp(page, '/?start=scale_degree_major_1');
  await pastIntro(page);

  const roman: Record<string, string> = { '1': 'I', '3': 'iii', '5': 'V' };
  for (let question = 1; question <= 12; question++) {
    // Answers unlock only once the new question is ready. Replay then logs its note,
    // which gives the right answer and proves the question makes a sound.
    await expect(page.getByRole('button', { name: 'I', exact: true })).toBeEnabled({ timeout: 20_000 });
    const before = (await sounds(page)).synth;
    const logged = degrees.length;
    await page.getByLabel('Replay').dispatchEvent('click'); // not click(): it pulses while audio plays
    await expect.poll(() => degrees.length).toBeGreaterThan(logged);
    await expect.poll(async () => (await sounds(page)).synth).toBeGreaterThan(before);

    await page.getByRole('button', { name: roman[degrees[degrees.length - 1]], exact: true }).click();
    await page.keyboard.press('Enter');
    await expect(page.getByText(`${question}/12`)).toBeVisible();
    await page.keyboard.press('Enter');
  }

  await expect(page).toHaveURL(/results/);
});

test('pressing Replay during a rhythm does not break it', async ({ page }) => {
  await openApp(page, '/?start=rhy_tap_back');
  await pastIntro(page);
  // Not click(): the button pulses and briefly hides while audio plays.
  const replay = page.getByLabel('Replay');
  await replay.dispatchEvent('click');
  await page.waitForTimeout(250);
  await replay.dispatchEvent('click');
  await page.waitForTimeout(250);
  await replay.dispatchEvent('click');
});

const BASICS = ['found_higher_lower', 'found_same_diff', 'found_beating', 'found_consonance'];

async function openSingingLesson(page: import('@playwright/test').Page) {
  await page.addInitScript((completedLevels) => {
    if (localStorage.getItem('fifths.v1')) return;
    localStorage.setItem('fifths.v1', JSON.stringify({ hasOnboarded: true, hasEverPracticed: true, completedLevels }));
  }, BASICS);
  await openApp(page, '/?start=voice_match_pitch');
}

const skipSinging = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /skip singing lessons/i });

const skipSaved = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('fifths.v1') ?? '{}').settings?.skipSinging);

test('someone who cannot sing can leave from the lesson intro', async ({ page }) => {
  await openSingingLesson(page);
  await skipSinging(page).click();

  await expect(page).toHaveURL(/path/);
  await expect.poll(() => skipSaved(page)).toBe(true);
});

test('listening lessons do not offer to skip singing', async ({ page }) => {
  await openApp(page, '/?start=int_harmonic_4ths_5ths');
  await expect(page.getByRole('button', { name: /^next|let's go/i }).first()).toBeVisible();
  await expect(skipSinging(page)).toBeHidden();
});
