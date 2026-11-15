// The Rhythm, Theory and History courses, and the Bass section of Guitar & Bass. Each test
// answers by reading what's drawn (or, for History, what's asked), so a picture that
// doesn't match its answer fails here.

import type { Page } from '@playwright/test';
import { test, expect, openApp, signedIn, ACCOUNTS_APP } from './fixtures';
import { BASS_OPEN_MIDI, noteAtPosition, midiOf } from '../src/notation/theory';
import { countAt, countLabel, T44 } from '../src/rhythm/model';
import { FACTS } from '../src/history/content';

async function pastIntro(page: Page) {
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible();
  while (await next.isVisible()) await next.click();
  // Under load a click can land while the intro is still sliding in; try again until it's gone.
  await expect(async () => {
    if (await go.isVisible()) await go.click();
    await expect(go).toBeHidden({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
}

/** Answer, then wait for the next question (or the results after the last). */
async function settle(page: Page, q: number, total: number) {
  if (q === total) return expect(page).toHaveURL(/results/);
  await expect(page.getByText('nice!')).toBeVisible();
  await expect(page.getByText(`${q}/${total}`)).toBeVisible();
  await expect(page.getByText('nice!')).toBeHidden();
}

test('the course switcher has all six courses', async ({ page }) => {
  await openApp(page);
  const tabs = page.getByRole('tablist', { name: 'Course' });
  for (const name of [/ear/i, /read/i, /guitar/i, /rhythm/i, /theory/i, /history/i]) await expect(tabs.getByRole('tab', { name })).toBeVisible();
  await tabs.getByRole('tab', { name: /rhythm/i }).click();
  await expect(page.getByText('The Beat', { exact: true }).first()).toBeVisible();
  await tabs.getByRole('tab', { name: /history/i }).click();
  await expect(page.getByText('The Eras', { exact: true }).first()).toBeVisible();
});

test('a rhythm counting lesson can be finished by counting the bar', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, '/?start=ry_count_eighths');
  await pastIntro(page);
  for (let q = 1; q <= 12; q++) {
    await expect(page.getByRole('heading', { name: 'Which count is the marked note on?' })).toBeVisible();
    const tick = Number(await page.locator('g[data-mark="ask"]').getAttribute('data-start'));
    await page.getByRole('button', { name: countLabel(countAt(tick, T44)), exact: true }).click();
    await settle(page, q, 12);
  }
});

test('tapping a written rhythm in time is right, and the rhythm was never played first', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, '/?start=ry_tap_quarters');
  await pastIntro(page);
  for (let q = 1; q <= 3; q++) {
    await expect(page.getByRole('heading', { name: 'Read it, then tap it' })).toBeVisible();
    // No way to hear the answer before tapping it.
    await expect(page.getByRole('button', { name: 'Hear it' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown');
    await page.waitForFunction(() => document.querySelector('[data-targets]'));
    // A steady 60 ms late, as a phone screen might be.
    await page.evaluate(() => {
      const el = document.querySelector('[data-targets]')!;
      const pad = el.querySelector('button')!;
      for (const t of JSON.parse(el.getAttribute('data-targets')!) as number[]) {
        setTimeout(() => pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), t + 60 - performance.now());
      }
    });
    await expect(page.getByText('nice!')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-tap-summary]')).toContainText('on time');
    await expect(page.getByText(`${q}/8`)).toBeVisible();
    await expect(page.getByText('nice!')).toBeHidden();
  }
});

test('tapping out of time is marked wrong, note by note', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, '/?start=ry_tap_quarters');
  await pastIntro(page);
  // Start, then don't tap at all (any rhythm, even a single whole note, is then wrong).
  await page.getByRole('button', { name: 'Start' }).dispatchEvent('pointerdown');
  await expect(page.getByText('not quite')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('g[data-mark="bad"]').first()).toBeVisible();
});

test('a theory lesson can be finished by reading the scale', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, '/?start=th_steps_major');
  await pastIntro(page);
  const ACC: Record<string, number> = { sharp: 1, flat: -1, natural: 0, '': 0 };
  for (let q = 1; q <= 10; q++) {
    await expect(page.getByRole('heading', { name: 'Whole step or half step?' })).toBeVisible();
    const marked = await page.locator('g[data-mark="1"]').evaluateAll((gs) => gs.map((g) => [Number(g.getAttribute('data-note')), g.getAttribute('data-acc') ?? ''] as const));
    const [a, b] = marked.map(([p, acc]) => midiOf(noteAtPosition(p, 'treble', ACC[acc]))).sort((x, y) => x - y);
    await page.getByRole('button', { name: b - a === 1 ? 'Half step' : 'Whole step', exact: true }).click();
    await settle(page, q, 10);
  }
});

test('a history quiz can be finished, and every answer is a real option', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, '/?start=hx_timeline');
  await pastIntro(page);
  for (let q = 1; q <= 10; q++) {
    const heading = page.getByRole('heading').filter({ hasText: /\?|…$/ }).first();
    await expect(heading).toBeVisible();
    const text = (await heading.textContent())!.trim();
    const fact = Object.values(FACTS).find((f) => f.prompt === text);
    expect(fact, text).toBeDefined();
    await page.getByRole('button', { name: fact!.options[0], exact: true }).click();
    await settle(page, q, 10);
  }
});

test('the bass lessons draw a four-string neck and can be answered from it', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, '/?start=gt_bass_strings');
  await expect(page.locator('[data-string-names]')).toHaveText('EADG');
  await pastIntro(page);
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let q = 1; q <= 4; q++) {
    await expect(page.getByRole('heading', { name: 'Name this note' })).toBeVisible();
    const pos = (await page.locator('g[data-pos]').first().getAttribute('data-pos'))!;
    const m = /^b(\d)f(\d+)$/.exec(pos)!;
    const pc = (BASS_OPEN_MIDI[+m[1]] + +m[2]) % 12;
    const name = NAMES[pc];
    await page.getByRole('button', { name: name.length > 1 ? new RegExp(`^${name[0]}♯`) : new RegExp(`^${name}$`) }).click();
    await settle(page, q, 12);
  }
});

test('the side cards follow the course: review counts that course, mixed and custom practice are ear training only', async ({ page }) => {
  const old = Date.now() - 3 * 86_400_000;
  const rec = { recentResults: [true], lastSeen: old, lastCorrect: old, box: 1, nextDueAt: old };
  await page.addInitScript((r) => {
    if (localStorage.getItem('fifths.mastery.v1')) return;
    localStorage.setItem(
      'fifths.mastery.v1',
      JSON.stringify({ 'found_higher_lower::higher': r, 'found_higher_lower::lower': r, 'ry_values_long::val_q': r }),
    );
  }, rec);
  await openApp(page, '/path', ['found_higher_lower', 'found_same_diff', 'ry_values_long']);
  const tabs = page.getByRole('tablist', { name: 'Course' });

  await tabs.getByRole('tab', { name: /^ear/i }).click();
  await expect(page.getByText('2 items due')).toBeVisible();
  await expect(page.getByText('Mix it up')).toBeVisible();
  await expect(page.getByText('Custom practice')).toBeVisible();

  await tabs.getByRole('tab', { name: /rhythm/i }).click();
  await expect(page.getByText('1 item due')).toBeVisible();
  await expect(page.getByText('Mix it up')).toHaveCount(0);
  await expect(page.getByText('Custom practice')).toHaveCount(0);

  // Reviewing from Rhythm asks Rhythm's item, not ear training's.
  await page.getByText("Today's Review").click();
  await page.getByRole('button', { name: /let's go/i }).click();
  await expect(page.getByRole('heading', { name: /How many beats/ })).toBeVisible();

  // A course with nothing due shows no review.
  await page.goto('/path');
  await page.getByRole('tablist', { name: 'Course' }).getByRole('tab', { name: /history/i }).click();
  await expect(page.getByText("Today's Review")).toHaveCount(0);
});

// The accounts server runs with the course preview off, as learners see the app.
test('courses still being built show as coming soon, and links to their lessons do nothing', async ({ page }) => {
  await openApp(page, `${ACCOUNTS_APP}/path`);
  const tabs = page.getByRole('tablist', { name: 'Course' });
  await expect(tabs.getByRole('tab', { name: /^ear/i })).toHaveAttribute('aria-selected', 'true');
  for (const name of [/read/i, /guitar/i, /rhythm/i, /theory/i, /history/i]) {
    await expect(tabs.getByRole('tab', { name })).toHaveAttribute('aria-disabled', 'true');
  }
  // aria-disabled stops Playwright's click, but not a learner's tap.
  await tabs.getByRole('tab', { name: /rhythm/i }).click({ force: true });
  await expect(page.getByRole('status').filter({ hasText: 'Rhythm is coming soon.' })).toBeVisible();
  // Still on ear training.
  await expect(tabs.getByRole('tab', { name: /^ear/i })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('The Beat', { exact: true })).toHaveCount(0);

  await page.goto(`${ACCOUNTS_APP}/?start=ry_count_eighths`);
  await expect(page.getByRole('tablist', { name: 'Course' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Which count is the marked note on?' })).toHaveCount(0);
});

test("the owner's account can open every course", async ({ page }) => {
  await signedIn(page, { email: 'siavash.fathi@gmail.com' });
  await openApp(page, `${ACCOUNTS_APP}/path`);
  const tabs = page.getByRole('tablist', { name: 'Course' });
  const rhythm = tabs.getByRole('tab', { name: /rhythm/i });
  await expect(rhythm).not.toHaveAttribute('aria-disabled', 'true');
  await rhythm.click();
  await expect(page.getByText('The Beat', { exact: true }).first()).toBeVisible();
  await expect(rhythm).toHaveAttribute('aria-selected', 'true');
});
