import { test, expect, openApp, sounds } from './fixtures';
import type { Page } from '@playwright/test';

// After a wrong answer the learner hears the difference: the right interval beside theirs,
// or an unstable note resolving over the home chord (src/lib/feedbackSounds.ts).

async function pastIntro(page: Page) {
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible({ timeout: 20_000 });
  if (await next.isVisible()) await next.click();
  await go.click();
}

const started = async (page: Page) => {
  const s = await sounds(page);
  return s.synth + s.sample;
};

test('Stable or Unstable plays each note over the home chord, and a miss resolves it', async ({ page }) => {
  const degrees: string[] = [];
  page.on('console', (m) => {
    const d = /Playing scale degree (\d)/.exec(m.text());
    if (d) degrees.push(d[1]);
  });
  await openApp(page, '/?start=ton_stable_unstable');
  await pastIntro(page);

  const stable = page.getByRole('button', { name: 'Stable', exact: true });
  await expect(stable).toBeEnabled({ timeout: 20_000 });
  await expect.poll(() => degrees.length).toBeGreaterThan(0);
  expect(['1', '2', '7']).toContain(degrees[degrees.length - 1]);

  // Replay sounds the note and the four notes of the chord under it.
  await page.waitForTimeout(2500);
  const before = await started(page);
  await page.getByLabel('Replay').dispatchEvent('click');
  await expect.poll(() => started(page)).toBeGreaterThanOrEqual(before + 5);

  // Answer wrong on purpose.
  const degree = degrees[degrees.length - 1];
  await page.getByRole('button', { name: degree === '1' ? 'Unstable' : 'Stable', exact: true }).click();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/That was/)).toBeVisible();
  const hear = page.getByRole('button', { name: degree === '1' ? /hear it rest/ : /hear it resolve/ });
  await expect(hear).toBeVisible();

  // It plays by itself once, and again on the button.
  const afterAnswer = await started(page);
  await expect.poll(() => started(page), { timeout: 5_000 }).toBeGreaterThan(afterAnswer + 4);
  await page.waitForTimeout(3000);
  const beforeButton = await started(page);
  await hear.click();
  await expect.poll(() => started(page)).toBeGreaterThan(beforeButton + 4);
});

test('a wrong interval offers the right one and yours, side by side', async ({ page }) => {
  // Every question asks a perfect 5th (Math.random is pinned); answer "Octave".
  await page.addInitScript(() => { Math.random = () => 0; });
  await openApp(page, '/?start=int_harmonic_5ths_octaves', ['found_higher_lower', 'found_same_diff', 'found_beating', 'found_consonance']);
  await pastIntro(page);

  const octave = page.getByRole('button', { name: /^Octave/ });
  await expect(octave).toBeEnabled({ timeout: 20_000 });
  await octave.click();
  await page.keyboard.press('Enter');

  const right = page.getByRole('button', { name: /hear Perfect 5th/ });
  const yours = page.getByRole('button', { name: /hear Octave/ });
  await expect(right).toBeVisible();
  await expect(yours).toBeVisible();

  await page.waitForTimeout(4000); // let the automatic comparison finish
  const before = await started(page);
  await yours.click();
  await expect.poll(() => started(page)).toBeGreaterThan(before);

  // "next" moves on as usual.
  await page.keyboard.press('Enter');
  await expect(right).toBeHidden();
});
