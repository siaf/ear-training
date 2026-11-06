import { test, expect, SITE } from './fixtures';

const TOOLS = [
  'alto-clef-notes',
  'bass-clef-notes',
  'circle-of-fifths',
  'grand-staff-notes',
  'guitar-fretboard-intervals',
  'guitar-fretboard-notes',
  'interval-ear-trainer',
  'note-identification',
  'piano-notes',
  'tenor-clef-notes',
  'treble-clef-notes',
  'vocal-range-test',
];

test('the tools index links to every tool', async ({ page }) => {
  await page.goto(`${SITE}/tools/`);
  for (const tool of TOOLS) {
    await expect(page.locator(`a[href*="/tools/${tool}"]`).first()).toBeAttached();
  }
});

for (const tool of TOOLS) {
  test(`${tool} loads and renders`, async ({ page }) => {
    const missing: string[] = [];
    page.on('response', (r) => {
      if (r.url().startsWith(SITE) && r.status() >= 400 && !r.url().includes('favicon')) missing.push(r.url());
    });
    await page.goto(`${SITE}/tools/${tool}/`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main button, #root button, [id*=app] button').first()).toBeVisible();
    expect(missing).toEqual([]);
  });
}

const SAMPLE_CHECKS = [
  { tool: 'treble-clef-notes', folder: 'piano', tap: 'C' },
  { tool: 'guitar-fretboard-notes', folder: 'guitar', tap: 'C' },
];

for (const { tool, folder, tap } of SAMPLE_CHECKS) {
  test(`${tool} loads its ${folder} samples after the first tap`, async ({ page }) => {
    await page.goto(`${SITE}/tools/${tool}/`);
    const sample = page.waitForResponse((r) => r.url().includes(`/audio/${folder}/`) && r.ok());
    await page.getByRole('button', { name: tap, exact: true }).click();
    await sample;
  });
}
