import { test, expect, openApp } from './fixtures';

// The mascots are animated drawings (src/components/Mascot.tsx), not pictures.

test('a lesson intro shows its mascot, which greets and plays a move when tapped', async ({ page }, info) => {
  await openApp(page, '/?start=int_harmonic_4ths_5ths');
  await expect(page).toHaveURL(/practice/);
  const mascot = page.locator('[data-mascot] svg');
  await expect(mascot).toBeVisible();
  await page.waitForTimeout(700); // the circle scales in (fx-mascot-enter, 520 ms)
  const box = await mascot.boundingBox();
  // 92% of the 160 or 220 px circle, give or take the idle breathing.
  expect(box!.width).toBeGreaterThan(144);
  expect(Math.abs(box!.width - box!.height)).toBeLessThan(4);
  // It greets once the entrance has finished.
  await expect(mascot).toHaveClass(/anim-/, { timeout: 3000 });
  await page.screenshot({ path: info.outputPath('intro.png') });
  await expect(mascot).not.toHaveClass(/anim-/, { timeout: 5000 });
  await page.locator('[data-mascot]').click();
  await expect(mascot).toHaveClass(/anim-/);
});

test('the path screen draws the small mascots at their size', async ({ page }, info) => {
  await openApp(page);
  // Today's panel: Pulse's bust (the path's guides are full-body).
  const pulse = page.locator('[data-mascot="pulse"] svg[data-view="bust"]');
  await expect(pulse).toBeVisible();
  const box = await pulse.boundingBox();
  expect(box!.width).toBeGreaterThan(50);
  expect(box!.width).toBeLessThan(90);
  await expect(pulse).toHaveAttribute('data-view', 'bust');
  await page.screenshot({ path: info.outputPath('path.png'), fullPage: true });
});

test('mascots keep still for people who ask for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, '/?start=int_harmonic_4ths_5ths');
  await expect(page).toHaveURL(/practice/);
  const mascot = page.locator('[data-mascot] svg');
  await expect(mascot).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(mascot).not.toHaveClass(/anim-/);
});

test('stats has Major, who keeps track, even before the first session', async ({ page }) => {
  await openApp(page, '/stats');
  const major = page.locator('[data-mascot="major"] svg');
  await expect(major).toBeVisible();
  await expect(major).toHaveClass(/anim-/, { timeout: 3000 });
});
