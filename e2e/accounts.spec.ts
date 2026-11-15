import { test, expect, openApp, ACCOUNTS_APP } from './fixtures';

// ACCOUNTS_APP: the app with accounts switched on (see fixtures.ts).

// A first lesson passed with a perfect score, which opens the mastery overlay.
async function passFirstLesson(page: import('@playwright/test').Page) {
  await page.addInitScript(() => { Math.random = () => 0; }); // every question has the same answer
  await openApp(page, `${ACCOUNTS_APP}/?start=found_higher_lower`);
  await page.getByRole('button', { name: /^next/i }).or(page.getByRole('button', { name: /let's go/i })).first().click();
  const go = page.getByRole('button', { name: /let's go/i });
  if (await go.isVisible()) await go.click();

  for (let question = 1; question <= 8; question++) {
    await page.getByRole('button', { name: /^higher/i }).click({ timeout: 20_000 });
    await page.keyboard.press('Enter');
    await expect(page.getByText(`${question}/8`, { exact: true })).toBeVisible();
    await page.keyboard.press('Enter');
  }
  await expect(page).toHaveURL(/results/);
}

test('the path offers sign-in next to continue when signed out', async ({ page }) => {
  await openApp(page, `${ACCOUNTS_APP}/path`);
  await page.getByRole('button', { name: 'sign in', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /sign in/i })).toBeVisible();
});

test('the path has no sign-in button when accounts are off', async ({ page }) => {
  await openApp(page, '/path');
  await expect(page.getByRole('button', { name: /continue/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'sign in', exact: true })).toBeHidden();
});

test('the Google tag gets the sign-in return address without its tokens', async ({ page }) => {
  await openApp(page, '/path#access_token=eyJSECRET.part&expires_in=3600&provider_token=ya29SECRET&refresh_token=rtSECRET&token_type=bearer');
  const configs = await page.evaluate(() =>
    JSON.stringify(((window as unknown as { dataLayer: unknown[] }).dataLayer ?? []).map((args) => Array.from(args as ArrayLike<unknown>))),
  );
  expect(configs).toContain('access_token=redacted');
  expect(configs).not.toContain('SECRET');
});

test('the sign-in ask stays up after continuing from a passed lesson', async ({ page }) => {
  test.setTimeout(120_000);
  await passFirstLesson(page);

  await page.getByRole('dialog', { name: /mastery/i }).getByRole('button', { name: /keep going/i }).click();

  await expect(page.getByRole('dialog', { name: /sign in/i })).toBeVisible();
  await expect(page).toHaveURL(/results/);

  await page.getByRole('button', { name: /not now/i }).click();
  await expect(page.getByRole('dialog', { name: /sign in/i })).toBeHidden();
});

test('while checkout is closed, a signed-in learner is told on the page and put on the Pro list', async ({ page }) => {
  // A signed-in session as supabase-js stores it for http://localhost:5199 (the fake address).
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('sb-localhost-auth-token', JSON.stringify({
      access_token: 'e2e-access-token', refresh_token: 'e2e-refresh', token_type: 'bearer',
      expires_in: 3600, expires_at: now + 3600,
      user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'learner@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }));
  });
  // Sync talks to the fake Supabase; answer it with nothing saved.
  await page.route(/^http:\/\/localhost:5199\//, (route) => route.fulfill({ json: [] }));
  const wantsPro: { auth?: string; apikey?: string }[] = [];
  await page.route('https://fifths.io/api/wants-pro', (route) => {
    const h = route.request().headers();
    if (route.request().method() === 'POST') wantsPro.push({ auth: h.authorization, apikey: h.apikey });
    return route.fulfill({ json: { ok: true }, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, apikey' } });
  });
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });

  await openApp(page, `${ACCOUNTS_APP}/paywall`);
  await page.getByRole('button', { name: 'subscribe' }).click();

  const notice = page.getByRole('status');
  await expect(notice).toContainText('Pro opens soon.');
  await expect(notice).toContainText("We'll email you at learner@example.com");
  await expect.poll(() => wantsPro.length).toBe(1);
  expect(wantsPro[0]).toEqual({ auth: 'Bearer e2e-access-token', apikey: 'e2e' });
  expect(dialogs).toEqual([]);
});
