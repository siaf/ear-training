import { test, expect, asPro, openApp, sounds, ACCOUNTS_APP } from './fixtures';

const TWO_DONE = ['found_higher_lower', 'found_same_diff'];
const DICTATION_READY = [...TWO_DONE, 'ton_stable_unstable', 'ton_is_tonic', 'scale_degree_major_1', 'scale_degree_major_2'];

async function pastIntro(page: import('@playwright/test').Page) {
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible();
  if (await next.isVisible()) await next.click();
  await go.click();
}

test('free learners can save a drill, and starting it leads to the plans', async ({ page }) => {
  await openApp(page, '/path', TWO_DONE);
  await page.getByRole('button', { name: /Custom practice/ }).first().click();
  await expect(page).toHaveURL(/custom/);
  await expect(page.getByText('pro feature')).toBeVisible();
  // With no drills and no mistakes yet, starters are offered; one tap saves one.
  await page.getByRole('button', { name: 'Add drill m6 vs M6' }).click();
  await page.getByRole('button', { name: 'Start m6 vs M6' }).click();
  await expect(page).toHaveURL(/paywall/);
});

/** Answer every question of a custom session, checking the offered answers each time. */
async function answerAll(page: import('@playwright/test').Page, total: number, pick: RegExp, check: () => Promise<void>) {
  for (let q = 1; q <= total; q++) {
    const answer = page.getByRole('button', { name: pick });
    await expect(answer).toBeEnabled({ timeout: 20_000 });
    await check();
    await answer.click();
    await page.keyboard.press('Enter');
    await expect(page.getByText(`${q}/${total}`)).toBeVisible();
    await page.keyboard.press('Enter');
  }
}

test('a saved interval drill asks only its intervals, unlocks nothing, and keeps its score', async ({ page }) => {
  test.setTimeout(120_000);
  await asPro(page);
  await openApp(page, `${ACCOUNTS_APP}/path`, TWO_DONE);
  await page.getByRole('button', { name: /Custom practice/ }).first().click();

  await page.getByRole('button', { name: /Make your first drill/ }).click();
  await page.getByRole('button', { name: /Intervals/ }).click();
  // Played downwards only, sixths only.
  await page.getByRole('button', { name: 'Together', exact: true }).click();
  await page.getByRole('button', { name: 'Down', exact: true }).click();
  await page.getByRole('button', { name: 'Minor 6th', exact: true }).click();
  await page.getByRole('button', { name: 'Major 6th', exact: true }).click();
  await page.getByRole('radio', { name: '10 questions' }).click();
  await page.getByRole('button', { name: /save & start/ }).click();

  await expect(page).toHaveURL(/practice/);
  await expect(page.getByText('10 questions on exactly what you picked.')).toBeVisible();
  await pastIntro(page);

  await answerAll(page, 10, /Minor 6th/, async () => {
    // Only the two chosen intervals are offered.
    await expect(page.getByRole('button', { name: /Major 3rd|Perfect 5th|Octave/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Major 6th/ })).toBeVisible();
  });

  await expect(page).toHaveURL(/results/);
  await expect(page.getByText('unlocks nothing')).toBeVisible();
  await expect(page.locator('h1')).toContainText('m6 vs M6');
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('fifths.v1') ?? '{}').completedLevels);
  expect(done).toEqual(TWO_DONE);

  // The drill is saved, with how it went.
  await page.goto(`${ACCOUNTS_APP}/custom`);
  await expect(page.getByText(/last \d+\/10 · today/)).toBeVisible();
});

test('a chords drill mixes triads and sevenths, offering every chosen chord on every question', async ({ page }) => {
  test.setTimeout(120_000);
  await asPro(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('fifths.custom_drills.v1')) return;
    localStorage.setItem('fifths.custom_drills.v1', JSON.stringify([
      { id: 'sixths', name: '', groupId: 'intervals', variantIds: ['up'], items: ['minor_6th', 'major_6th'], length: 10, createdAt: 1 },
    ]));
  });
  await openApp(page, `${ACCOUNTS_APP}/custom`, TWO_DONE);

  await page.getByRole('button', { name: /^New drill/ }).click();
  await page.getByRole('button', { name: /Chords/ }).click();
  await page.getByRole('button', { name: 'Major triad', exact: true }).click();
  await page.getByRole('button', { name: 'Dominant 7', exact: true }).click();
  await page.getByRole('textbox', { name: 'Drill name' }).fill('Dominant or not');
  await page.getByRole('radio', { name: '10 questions' }).click();
  await page.getByRole('button', { name: 'save', exact: true }).click();

  // Both drills are kept.
  await expect(page.getByRole('button', { name: 'Start m6 vs M6' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Dominant or not' }).click();
  await expect(page).toHaveURL(/practice/);
  await pastIntro(page);

  await answerAll(page, 10, /Dominant 7/, async () => {
    // A triad question still offers the dominant 7, and a seventh question the triad.
    await expect(page.getByRole('button', { name: /Major/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Minor|Diminished|Major 7/ })).toHaveCount(0);
  });
  await expect(page).toHaveURL(/results/);
  await expect(page.locator('h1')).toContainText('Dominant or not');
});

test('melodic dictation plays a key and a melody, then marks each note', async ({ page }) => {
  await asPro(page);
  await openApp(page, `${ACCOUNTS_APP}/path`, DICTATION_READY);
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
  await openApp(page, `${ACCOUNTS_APP}/stats`);
  await expect(page.getByText('last 30 days')).toBeVisible();
  await page.getByRole('button', { name: 'all time', exact: true }).click();
  await expect(page.getByText('all time, by week')).toBeVisible();
});
