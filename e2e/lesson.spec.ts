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
// all. audio.spec.ts covers guitar, violin and cello directly.
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

// Rotation read stale stats, so it only began after a key change, if at all.
test('instruments start rotating once the first answers are right', async ({ page }) => {
  test.setTimeout(120_000);
  const degrees: string[] = [];
  const switches: string[] = [];
  page.on('console', (m) => {
    const degree = /Playing scale degree (\d)/.exec(m.text());
    if (degree) degrees.push(degree[1]);
    if (m.text().includes('synth: piano')) switches.push(m.text());
  });

  await holdSamples(page);
  await openApp(page, '/?start=scale_degree_major_1');
  await pastIntro(page);

  // Rotation starts on question 4 with piano, which is already playing, so the first
  // switch comes on question 5.
  const roman: Record<string, string> = { '1': 'I', '3': 'iii', '5': 'V' };
  for (let question = 1; question <= 4; question++) {
    await expect(page.getByRole('button', { name: 'I', exact: true })).toBeEnabled({ timeout: 20_000 });
    expect(switches).toEqual([]);
    const logged = degrees.length;
    await page.getByLabel('Replay').dispatchEvent('click'); // not click(): it pulses while audio plays
    await expect.poll(() => degrees.length).toBeGreaterThan(logged);
    await page.getByRole('button', { name: roman[degrees[degrees.length - 1]], exact: true }).click();
    await page.keyboard.press('Enter');
    await expect(page.getByText(`${question}/12`)).toBeVisible();
    await page.keyboard.press('Enter');
  }

  await expect.poll(() => switches, { timeout: 20_000 }).toEqual([expect.stringContaining('piano → sine')]);
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

// Same or Different Rhythm: count-in, pattern A, a bar of clicks alone, pattern B, all over
// a steady click (sameDiffPair, playSameDiffPair). Replay plays the very same pair again.
test('a same-or-different rhythm plays over a steady click, and Replay plays it again', async ({ page }) => {
  await openApp(page, '/?start=rhy_same_diff');
  await expect(page.getByText(/four clicks to count you in/)).toBeVisible();
  await pastIntro(page);
  await expect(page.getByRole('button', { name: /^same/i })).toBeVisible({ timeout: 20_000 });
  // 16 clicks (4 count-in and 12 through the three bars) plus at least 3 hits per pattern.
  await expect.poll(async () => (await sounds(page)).synth, { timeout: 10_000 }).toBeGreaterThanOrEqual(22);
  const first = (await sounds(page)).synth;
  // Not click(): the button pulses and briefly hides while audio plays. A replay in the
  // middle of the pair must not break it either.
  await page.getByLabel('Replay').dispatchEvent('click');
  await page.waitForTimeout(300);
  await page.getByLabel('Replay').dispatchEvent('click');
  await expect.poll(async () => (await sounds(page)).synth - first, { timeout: 10_000 }).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: /^same/i }).click();
});

test('the moved-hits rhythm lesson opens after the first one and plays over the click', async ({ page }) => {
  await openApp(page, '/?start=rhy_same_diff_moved', ['found_higher_lower', 'rhy_same_diff']);
  await expect(page.getByText(/an eighth or a sixteenth early or late/)).toBeVisible();
  await pastIntro(page);
  await expect(page.getByRole('button', { name: /^different/i })).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => (await sounds(page)).synth, { timeout: 10_000 }).toBeGreaterThanOrEqual(22);
});

// Tap Back the Rhythm: nobody had ever passed it, mostly on phones. A learner taps a little
// after each sound they hear (touch screens, reaction, Bluetooth). Someone who is steadily
// 80 ms behind every sound is still playing the rhythm, and must pass.
for (const lateMs of [0, 80, 150]) {
  test(`tapping along ${lateMs} ms after each sound passes Tap Back the Rhythm`, async ({ page }) => {
    await openApp(page, '/?start=rhy_tap_back', ['found_higher_lower', 'rhy_same_diff']);
    await pastIntro(page);
    const start = page.getByRole('button', { name: 'Start tap-back' });
    await expect(start).toBeEnabled({ timeout: 20_000 });
    await page.evaluate(() => { (window as unknown as { __soundTimes: number[] }).__soundTimes = []; });
    await start.click();
    // The pattern is scheduled at once; tap with space a fixed time after each sound starts.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __soundTimes: number[] }).__soundTimes.length)).toBeGreaterThan(2);
    await page.evaluate((late) => {
      for (const t of (window as unknown as { __soundTimes: number[] }).__soundTimes) {
        setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' })), t + late - performance.now());
      }
    }, lateMs);
    // One question answered, and answered right.
    await expect(page.getByText('1/8', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('100%', { exact: true })).toBeVisible();
  });
}

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

test('someone pressing "keep training" in a free tool is told the lesson picks up from it', async ({ page }) => {
  // The interval tool's round-end button. Its lesson's intro starts from scratch ("An interval
  // is the distance between two notes"), so without this note it reads as a step backwards.
  await page.goto('/?start=int_melodic_4ths_5ths_asc&utm_source=fifths.io&utm_medium=tool&utm_campaign=interval-ear-trainer&utm_content=round-end');
  await expect(page.getByRole('note')).toContainText('Picking up from the Interval Ear Trainer. Same drill, one difference');
  await page.getByRole('button', { name: /let's go/i }).click();
  await expect(page.getByRole('button', { name: 'Perfect 5th' })).toBeVisible({ timeout: 20_000 });

  // A link from a blog post gets the ordinary intro.
  await page.goto('/?start=int_melodic_4ths_5ths_asc&utm_source=fifths.io&utm_medium=blog&utm_campaign=x');
  await expect(page.getByRole('button', { name: /let's go/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('note')).toHaveCount(0);
});
