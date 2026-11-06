import path from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

export { expect };

export const SITE = 'http://localhost:5191';
const SAMPLE = path.resolve('site/audio/piano/C4.mp3');

// Enough of RevenueCat's response for the SDK to treat this as a free customer.
const FREE_CUSTOMER = {
  request_date: '2026-11-05T00:00:00Z',
  request_date_ms: 1793836800000,
  subscriber: {
    entitlements: {},
    first_seen: '2026-11-05T00:00:00Z',
    last_seen: '2026-11-05T00:00:00Z',
    management_url: null,
    non_subscriptions: {},
    original_app_user_id: 'e2e',
    original_application_version: null,
    original_purchase_date: null,
    other_purchases: {},
    subscriptions: {},
  },
};

type Fixtures = {
  /** Fails the test if the page throws or logs an error. Runs for every test. */
  pageErrors: string[];
};

export const test = base.extend<Fixtures>({
  pageErrors: [
    async ({ page, context }, use) => {
      // Nothing leaves the machine except the React and Tone scripts the tools load.
      await context.route(/^https?:\/\/(?!localhost)/, (route) => {
        const url = route.request().url();
        if (url.includes('unpkg.com')) return route.continue();
        if (url.endsWith('.mp3')) return route.fulfill({ path: SAMPLE, contentType: 'audio/mpeg' });
        if (url.includes('api.revenuecat.com')) return route.fulfill({ json: FREE_CUSTOMER });
        return route.abort();
      });
      await page.addInitScript(() => {
        const w = window as unknown as { __sounds: { synth: number; sample: number } };
        w.__sounds = { synth: 0, sample: 0 };
        const count = (proto: { start: (...args: never[]) => void }, key: 'synth' | 'sample') => {
          const start = proto.start;
          proto.start = function (...args: never[]) {
            w.__sounds[key]++;
            return start.apply(this, args);
          };
        };
        count(OscillatorNode.prototype, 'synth');
        count(AudioBufferSourceNode.prototype, 'sample');
      });

      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        // Blocked network calls are logged as errors; they're expected here.
        if (m.type() === 'error' && !/Failed to load resource|net::|access control|Stripe/i.test(m.text())) {
          errors.push(m.text());
        }
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

/** Load the app as a returning visitor, past onboarding. */
export async function openApp(page: Page, url = '/path') {
  await page.addInitScript(() => {
    if (localStorage.getItem('fifths.v1')) return;
    localStorage.setItem('fifths.v1', JSON.stringify({ hasOnboarded: true, hasEverPracticed: true, completedLevels: [] }));
  });
  await page.goto(url);
}

/** Leave every sample download hanging, like a very slow connection. */
export async function holdSamples(page: Page) {
  await page.route(/\.mp3$/, () => {});
}

export const sounds = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sounds: { synth: number; sample: number } }).__sounds);
