// The Read Music and Guitar paths: switching courses, and whole lessons answered by
// reading what's drawn. Each test works out the answer from the staff or the neck the
// learner sees, so a drawing that doesn't match its answer fails here.

import type { Page } from '@playwright/test';
import { test, expect, openApp } from './fixtures';
import { LETTERS, OPEN_MIDI, noteAtPosition, parseNote, staffPosition, type ClefId } from '../src/notation/theory';

async function pastIntro(page: Page) {
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible();
  while (await next.isVisible()) await next.click();
  await go.click();
}

/** The clef and position of the one note on the first staff that has notes. */
async function readNote(page: Page): Promise<{ clef: ClefId; p: number }> {
  const staff = page.locator('svg g[data-clef]').filter({ has: page.locator('[data-note]') }).first();
  const clef = (await staff.getAttribute('data-clef')) as ClefId;
  const p = Number(await staff.locator('[data-note]').first().getAttribute('data-note'));
  return { clef, p };
}

test('the course switcher shows each path and remembers the choice', async ({ page }) => {
  await openApp(page);
  const tabs = page.getByRole('tablist', { name: 'Course' });
  await tabs.getByRole('tab', { name: /read/i }).click();
  await expect(page.getByText('Treble Clef', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/0 of 46 cleared/)).toBeVisible();

  await tabs.getByRole('tab', { name: /guitar/i }).click();
  await expect(page.getByText('Find Your Way', { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('tab', { name: /guitar/i, selected: true })).toBeVisible();
  await expect(page.getByText('Find Your Way', { exact: true }).first()).toBeVisible();
});

test('a reading lesson can be finished by reading the staff', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, '/?start=rd_tr_lines');
  await pastIntro(page);

  for (let q = 1; q <= 10; q++) {
    await expect(page.getByRole('heading', { name: 'Name this note' })).toBeVisible();
    const { clef, p } = await readNote(page);
    expect(clef).toBe('treble');
    expect(p % 2).toBe(0); // a lines-only lesson
    const letter = LETTERS[noteAtPosition(p, clef).letter];
    await page.getByRole('button', { name: letter, exact: true }).click();
    if (q === 10) break; // the last answer goes straight to the results
    await expect(page.getByText('nice!')).toBeVisible();
    await expect(page.getByText(`${q}/10`)).toBeVisible();
    await expect(page.getByText('nice!')).toBeHidden(); // the next question is up
  }

  await expect(page).toHaveURL(/results/);
  // Progress is saved, and counts on the Read path only.
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fifths.v1') ?? '{}').completedLevels ?? []))
    .toContain('rd_tr_lines');
  await page.goto('/path');
  await expect(page.getByText(/1 of 46 cleared/)).toBeVisible();
});

test('placing middle C on the staff, in every clef', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, '/?start=rd_middle_c');
  await pastIntro(page);

  for (let q = 1; q <= 8; q++) {
    await expect(page.getByRole('heading', { name: /middle C/ })).toBeVisible();
    const clef = (await page.locator('svg g[data-clef]').first().getAttribute('data-clef')) as ClefId;
    const target = staffPosition(parseNote('C4'), clef);
    await page.keyboard.press('ArrowUp'); // puts a note on the staff
    const svg = page.locator('svg[data-tap-value]');
    let at = Number(await svg.getAttribute('data-tap-value'));
    while (at !== target) {
      await page.keyboard.press(at < target ? 'ArrowUp' : 'ArrowDown');
      at = Number(await svg.getAttribute('data-tap-value'));
    }
    await page.keyboard.press('Enter');
    if (q === 8) break;
    await expect(page.getByText('nice!')).toBeVisible();
    await expect(page.getByText(`${q}/8`)).toBeVisible();
    await expect(page.getByText('nice!')).toBeHidden();
  }
  await expect(page).toHaveURL(/results/);
});

test('a wrong note on the staff shows where it goes and why', async ({ page }) => {
  await openApp(page, '/?start=rd_middle_c');
  await pastIntro(page);
  const clef = (await page.locator('svg g[data-clef]').first().getAttribute('data-clef')) as ClefId;
  const target = staffPosition(parseNote('C4'), clef);
  await page.keyboard.press('ArrowUp');
  const svg = page.locator('svg[data-tap-value]');
  const at = Number(await svg.getAttribute('data-tap-value'));
  if (at === target) await page.keyboard.press('ArrowUp');
  await page.getByRole('button', { name: 'check' }).click();
  await expect(page.getByText('not quite')).toBeVisible();
  await expect(page.getByText('Right answer in green.')).toBeVisible();
  await expect(page.locator(`[data-note="${target}"][data-tone="ok"]`)).toBeVisible();
});

test('a guitar lesson can be finished by reading the neck', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, '/?start=gt_open_strings');
  await pastIntro(page);
  for (let q = 1; q <= 10; q++) {
    await expect(page.getByRole('heading', { name: 'Name this note' })).toBeVisible();
    const pos = await page.locator('g[data-pos]').first().getAttribute('data-pos');
    const s = Number(/^s(\d)f0$/.exec(pos!)![1]);
    await page.getByRole('button', { name: ['E', 'A', 'D', 'G', 'B', 'E'][s], exact: true }).click();
    if (q === 10) break;
    await expect(page.getByText('nice!')).toBeVisible();
    await expect(page.getByText(`${q}/10`)).toBeVisible();
    await expect(page.getByText('nice!')).toBeHidden(); // the next question is up
  }
  await expect(page).toHaveURL(/results/);
});

test('string names are taught in the intro, hidden in the question, and shown with the answer', async ({ page }) => {
  await openApp(page, '/?start=gt_open_strings');
  const names = page.locator('[data-string-names]');
  await expect(names).toHaveText('EADGBe'); // the intro's neck names every string
  await expect(page.locator('g[data-pos]')).toHaveCount(6); // a labelled dot on each open string
  await pastIntro(page);
  await expect(page.getByRole('heading', { name: 'Name this note' })).toBeVisible();
  await expect(names).toHaveText('');
  // Answer wrong on purpose so the feedback stays up.
  const pos = await page.locator('g[data-pos]').first().getAttribute('data-pos');
  const s = Number(/^s(\d)f0$/.exec(pos!)![1]);
  const wrong = s === 2 ? 'A' : 'D';
  await page.getByRole('button', { name: wrong, exact: true }).click();
  await expect(page.getByText('not quite')).toBeVisible();
  await expect(names).toHaveText('EADGBe');
});

test('finding a named note on a string by tapping the neck', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, '/?start=gt_find_e_a');
  await pastIntro(page);
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let q = 1; q <= 4; q++) {
    const heading = page.getByRole('heading', { name: /^Find / });
    await expect(heading).toBeVisible();
    const m = /^Find ([A-G]) on the (low E|A) string/.exec((await heading.textContent())!)!;
    const s = m[2] === 'A' ? 1 : 0;
    const f = (names.indexOf(m[1]) - (OPEN_MIDI[s] % 12) + 12) % 12;
    await page.locator(`rect[data-pos="s${s}f${f}"]`).dispatchEvent('click');
    await expect(page.getByText('nice!')).toBeVisible();
    await expect(page.getByText(`${q}/12`)).toBeVisible();
    await expect(page.getByText('nice!')).toBeHidden();
  }
});

test('lessons on one path never send "next lesson" to another path', async ({ page }) => {
  await openApp(page, '/path', ['rd_tr_landmarks']);
  await page.getByRole('tab', { name: /read/i }).click();
  await page.getByRole('button', { name: /▶ continue/i }).click();
  await expect(page).toHaveURL(/practice/);
  await expect(page.getByText('Treble Lines').or(page.getByText(/E G B D F/)).first()).toBeVisible();
});

const parsePos = (k: string) => {
  const m = /^s(\d)f(\d+)$/.exec(k)!;
  return { s: +m[1], f: +m[2] };
};
const midiAt = (k: string) => OPEN_MIDI[parsePos(k).s] + parsePos(k).f;
const DEGREE_BY_SEMIS: Record<number, string> = { 0: 'Root', 2: '2', 3: '♭3', 4: '3', 5: '4', 7: '5', 9: '6', 10: '♭7', 11: '7' };

test('chord shapes: name the marked chord tone by measuring from the root', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, '/?start=gt_chord_minor');
  await pastIntro(page);
  for (let q = 1; q <= 12; q++) {
    await expect(page.getByRole('heading', { name: 'Which chord tone is the marked dot?' })).toBeVisible();
    const root = (await page.locator('g[data-state="root"]').getAttribute('data-pos'))!;
    const target = (await page.locator('g[data-state="target"]').getAttribute('data-pos'))!;
    // Only the root is labelled while asking.
    await expect(page.locator('g[data-state="ghost"] text')).toHaveCount(0);
    const answer = DEGREE_BY_SEMIS[(((midiAt(target) - midiAt(root)) % 12) + 12) % 12];
    await page.getByRole('button', { name: answer, exact: true }).click();
    if (q === 12) break;
    // Answered: right, and every dot in the shape shows its degree. Checked in one go, every
    // frame, because the feedback only stays up a moment before the next question.
    await page.waitForFunction(
      () => document.body.innerText.includes('nice!') && !!document.querySelector('g[data-state="ghost"] text'),
      undefined,
      { polling: 'raf', timeout: 5000 },
    );
    await expect(page.getByText(`${q}/12`)).toBeVisible();
    await expect(page.getByText('nice!')).toBeHidden();
  }
  await expect(page).toHaveURL(/results/);
});

test('scale shapes: tap the missing note in the box', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, '/?start=gt_pent_find');
  await pastIntro(page);
  const SEMIS: Record<string, number> = { root: 0, 'minor 3rd': 3, '4th': 5, '5th': 7, '♭7': 10 };
  for (let q = 1; q <= 4; q++) {
    const heading = page.getByRole('heading', { name: /^Fill the gap: tap the / });
    await expect(heading).toBeVisible();
    const want = SEMIS[/tap the (.+)$/.exec((await heading.textContent())!)![1]];
    await expect(page.locator('g[data-state]').first()).toBeVisible();
    const rootDot = page.locator('g[data-state="root"]');
    const root = (await rootDot.count()) ? await rootDot.getAttribute('data-pos') : null;
    // With the root itself missing, measure from the 5th (labelled "5") instead.
    const fromPos = root ?? (await page.locator('g[data-state="ghost"]').filter({ hasText: /^5$/ }).first().getAttribute('data-pos'))!;
    const rootMidi = root ? midiAt(root) : midiAt(fromPos) - 7;
    const shown = await page.locator('g[data-state]').evaluateAll((gs) => gs.map((g) => g.getAttribute('data-pos')!));
    const frets = shown.map((k) => parsePos(k).f);
    // Any empty spot in the box with the wanted note.
    let pick: string | null = null;
    for (let s = 0; s <= 5 && !pick; s++) for (let f = Math.min(...frets); f <= Math.max(...frets); f++) {
      const k = `s${s}f${f}`;
      if (!shown.includes(k) && (((OPEN_MIDI[s] + f - rootMidi) % 12) + 12) % 12 === want) { pick = k; break; }
    }
    expect(pick).not.toBeNull();
    await page.locator(`rect[data-pos="${pick}"]`).dispatchEvent('click');
    await expect(page.getByText('nice!')).toBeVisible();
    await expect(page.getByText(`${q}/12`)).toBeVisible();
    await expect(page.getByText('nice!')).toBeHidden();
  }
});

test('the bend lesson shows the even neck, tuned E A D G C F', async ({ page }) => {
  await openApp(page, '/?start=gt_pat_shift');
  await expect(page.locator('[data-string-names]')).toHaveText('EADGCF');
  await page.getByRole('button', { name: /^next/i }).click();
  await expect(page.locator('[data-string-names]')).toHaveText('EADGBe');
});
