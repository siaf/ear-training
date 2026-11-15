import { test, expect, SITE } from './fixtures';

// The public lesson pages built by scripts/build-lessons.mjs (run `npm run build:lessons`,
// or `npm run predeploy:site`, before these tests).

test('the lessons index links every lesson, marked free or Pro', async ({ page }) => {
  await page.goto(`${SITE}/lessons/`);
  await expect(page.locator('h1')).toHaveText('Ear training lessons');
  const links = page.locator('.lesson-list a');
  expect(await links.count()).toBeGreaterThan(60);
  await expect(page.locator('.lesson-list a', { hasText: 'Higher or Lower' })).toContainText('FREE');
  await expect(page.locator('.lesson-list a', { hasText: 'Voicings' })).toContainText('PRO');
  await page.locator('.lesson-list a', { hasText: 'Harmonic: Fourths, Fifths and Octaves' }).click();
  await expect(page).toHaveURL(/\/lessons\/harmonic-fourths-fifths-and-octaves\/$/);
});

test('a free lesson page starts that lesson in the app, and has its own preview picture', async ({ page, request }) => {
  await page.goto(`${SITE}/lessons/harmonic-fourths-fifths-and-octaves/`);
  await expect(page.locator('h1')).toHaveText('Harmonic: Fourths, Fifths and Octaves');
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toBe('https://fifths.io/lessons/harmonic-fourths-fifths-and-octaves/card.png');
  const card = await request.get(`${SITE}/lessons/harmonic-fourths-fifths-and-octaves/card.png`);
  expect(card.ok()).toBe(true);
  expect(card.headers()['content-type']).toBe('image/png');
  await expect(page.getByRole('link', { name: 'Try it yourself →' }).first())
    .toHaveAttribute('href', /^https:\/\/app\.fifths\.io\/\?start=int_harmonic_4ths_5ths&utm_source=fifths\.io&utm_medium=lesson-page/);
  await expect(page.locator('.lesson-items li')).toHaveText(['Perfect 4th', 'Perfect 5th', 'Octave']);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld[0]).toMatchObject({ '@type': 'LearningResource', isAccessibleForFree: true, name: 'Harmonic: Fourths, Fifths and Octaves' });
});

test('a Pro lesson page says so, and opens the app rather than the lesson', async ({ page }) => {
  await page.goto(`${SITE}/lessons/voicings-closed-drop-2-quartal-upper-structure/`);
  await expect(page.getByText('Part of Fifths Pro.')).toBeVisible();
  const href = await page.getByRole('link', { name: 'Open Fifths →' }).first().getAttribute('href');
  expect(href).toMatch(/^https:\/\/app\.fifths\.io\/\?utm_source=fifths\.io/);
  expect(href).not.toContain('start=');
});

test('the sitemap lists the lesson pages, and llms.txt describes Fifths for AI assistants', async ({ request }) => {
  const sitemap = await (await request.get(`${SITE}/sitemap.xml`)).text();
  expect(sitemap).toContain('<loc>https://fifths.io/lessons/</loc>');
  expect(sitemap).toContain('<loc>https://fifths.io/lessons/harmonic-fourths-fifths-and-octaves/</loc>');
  const llms = await (await request.get(`${SITE}/llms.txt`)).text();
  expect(llms).toMatch(/^# Fifths\n\n> Fifths is an ear training app/);
  expect(llms).toMatch(/\d+ lessons, \d+ of them free/);
  expect(llms).toContain('$4.99');
});
