import { test, expect, openApp, ACCOUNTS_APP, signedIn } from './fixtures';

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

// The sign-in wall (ANON_LESSON_LIMIT in App.tsx): two lessons free, then save your progress.
const TWO_DONE = ['found_higher_lower', 'found_same_diff'];
const wall = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: /sign in/i });

test('after two lessons, a signed-out learner saves their progress before a third', async ({ page }) => {
  await openApp(page, `${ACCOUNTS_APP}/path`, TWO_DONE);
  await page.getByRole('button', { name: /continue/i }).first().click();
  await expect(wall(page)).toContainText('Save your progress to keep going.');
  await expect(page).toHaveURL(/path/);

  // "Not now" keeps them on the path, without starting anything.
  await page.getByRole('button', { name: 'not now' }).click();
  await expect(wall(page)).toBeHidden();
  await expect(page).toHaveURL(/path/);

  // Mixed practice is more practice too.
  await page.getByText('Mix it up').click();
  await expect(wall(page)).toContainText('Save your progress to keep going.');
});

test('one lesson in, the next one starts without signing in', async ({ page }) => {
  await openApp(page, `${ACCOUNTS_APP}/path`, ['found_higher_lower']);
  await page.getByRole('button', { name: /continue/i }).first().click();
  await expect(page).toHaveURL(/practice/);
  await expect(wall(page)).toBeHidden();
});

test('a shared link past the free lessons asks to sign in too', async ({ page }) => {
  await openApp(page, `${ACCOUNTS_APP}/?start=found_beating&utm_source=share&utm_campaign=medal`, TWO_DONE);
  await expect(wall(page)).toContainText('Save your progress to keep going.');
});

test('signed-in learners never see the wall, however many lessons they have', async ({ page }) => {
  await signedIn(page);
  await openApp(page, `${ACCOUNTS_APP}/path`, [...TWO_DONE, 'rhy_same_diff', 'found_beating', 'found_consonance']);
  await page.getByRole('button', { name: /continue/i }).first().click();
  await expect(page).toHaveURL(/practice/);
  await expect(wall(page)).toBeHidden();
});

// Production bug, 16 Nov 2026: "next lesson" on the results screen hit the wall, but the
// results screen didn't draw the sign-in sheet, so the button looked dead.
test('finishing the second lesson, "next lesson" opens the sign-in sheet on the results screen', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    Math.random = () => 0;
    localStorage.setItem('fifths.signupPrompted', '1'); // saw the soft ask after lesson one
  });
  await openApp(page, `${ACCOUNTS_APP}/?start=found_same_diff`, ['found_higher_lower']);
  const next = page.getByRole('button', { name: /^next/i });
  const go = page.getByRole('button', { name: /let's go/i });
  await expect(next.or(go).first()).toBeVisible({ timeout: 20_000 });
  if (await next.isVisible()) await next.click();
  await go.click();
  for (let q = 1; q <= 30 && !/results/.test(page.url()); q++) {
    const answer = page.getByRole('button', { name: /^same/i });
    await expect(answer).toBeEnabled({ timeout: 20_000 });
    await answer.click();
    await page.keyboard.press('Enter');
    const counter = page.getByText(new RegExp(`^${q}/\\d+$`));
    await expect.poll(async () => /results/.test(page.url()) || await counter.isVisible(), { timeout: 10_000 }).toBe(true);
    if (/results/.test(page.url())) break;
    await page.keyboard.press('Enter');
  }
  await expect(page).toHaveURL(/results/);
  // Passing it opens the medal, whose "keep going" is "next lesson".
  const mastered = page.getByRole('dialog', { name: /mastery/i });
  await mastered.getByRole('button', { name: /keep going/ }).click();
  const wall = page.getByRole('dialog', { name: /sign in/i });
  await expect(wall).toContainText('Save your progress to keep going.');
  // And the results screen's own button, after "not now".
  await wall.getByRole('button', { name: 'not now' }).click();
  await page.getByRole('button', { name: /next lesson/ }).click();
  await expect(wall).toContainText('Save your progress to keep going.');
});

// "Delete account" in settings (functions/api/delete-account.js does the deleting).
async function fakeDeleteAccount(page: import('@playwright/test').Page, answer: { status: number; json: unknown }) {
  const calls: { auth?: string; apikey?: string }[] = [];
  await page.route('https://fifths.io/api/delete-account', (route) => {
    const h = route.request().headers();
    if (route.request().method() === 'POST') calls.push({ auth: h.authorization, apikey: h.apikey });
    return route.fulfill({ ...answer, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, apikey' } });
  });
  return calls;
}

test('a signed-in learner can delete their account, which signs them out and clears this device', async ({ page }) => {
  await signedIn(page);
  const calls = await fakeDeleteAccount(page, { status: 200, json: { ok: true } });
  await openApp(page, `${ACCOUNTS_APP}/settings`, ['found_higher_lower']);

  await page.getByRole('button', { name: 'delete account' }).click();
  await expect(page.getByText(/this deletes the account for learner@example\.com/)).toBeVisible();
  expect(calls).toEqual([]); // nothing happens before they confirm
  await page.getByRole('button', { name: 'yes — delete my account' }).click();

  await expect(page.getByRole('status')).toHaveText('Your account and everything saved to it are deleted.');
  expect(calls).toEqual([{ auth: 'Bearer e2e-access-token', apikey: 'e2e' }]);
  await expect(page.getByRole('button', { name: 'sign in' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sb-localhost-auth-token'))).toBeNull();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fifths.v1') ?? '{}').completedLevels)).toEqual([]);
});

test('deleting an account says so when it fails, and asks to cancel a live subscription first', async ({ page }) => {
  await signedIn(page);
  let answer = { status: 502, json: { error: 'Server error', step: 'loops' } };
  await page.route('https://fifths.io/api/delete-account', (route) =>
    route.fulfill({ ...answer, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization, apikey' } }));
  await openApp(page, `${ACCOUNTS_APP}/settings`);

  await page.getByRole('button', { name: 'delete account' }).click();
  await page.getByRole('button', { name: 'yes — delete my account' }).click();
  await expect(page.getByRole('alert')).toContainText("Couldn't delete your account just now.");
  await expect(page.getByRole('button', { name: 'sign out' })).toBeVisible(); // still signed in

  answer = { status: 409, json: { error: 'Cancel your subscription first', code: 'subscription_active' } };
  await page.getByRole('button', { name: 'delete account' }).click();
  await page.getByRole('button', { name: 'yes — delete my account' }).click();
  await expect(page.getByText(/your Pro subscription is still active/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'delete account' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'sign out' })).toBeVisible();
});

test('signed out, settings offers no account to delete', async ({ page }) => {
  await openApp(page, `${ACCOUNTS_APP}/settings`);
  await expect(page.getByRole('button', { name: 'reset progress' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'delete account' })).toHaveCount(0);
});
