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

// The same customer with an active Pro subscription.
const PRO_CUSTOMER = {
  ...FREE_CUSTOMER,
  subscriber: {
    ...FREE_CUSTOMER.subscriber,
    entitlements: {
      pro: {
        expires_date: '2099-01-01T00:00:00Z',
        grace_period_expires_date: null,
        product_identifier: 'fifths_pro_monthly_999',
        purchase_date: '2026-11-01T00:00:00Z',
      },
    },
    subscriptions: {
      fifths_pro_monthly_999: {
        auto_resume_date: null,
        billing_issues_detected_at: null,
        expires_date: '2099-01-01T00:00:00Z',
        grace_period_expires_date: null,
        is_sandbox: true,
        original_purchase_date: '2026-11-01T00:00:00Z',
        ownership_type: 'PURCHASED',
        period_type: 'normal',
        purchase_date: '2026-11-01T00:00:00Z',
        refunded_at: null,
        store: 'rc_billing',
        store_transaction_id: 'e2e',
        unsubscribe_detected_at: null,
      },
    },
  },
};

/**
 * The app on a server that has accounts switched on, with Supabase at a fake address
 * (playwright.config.ts). Billing only runs for signed-in learners, so Pro tests use it.
 */
export const ACCOUNTS_APP = process.env.ACCOUNTS_APP_URL ?? 'http://localhost:5192';
const FAKE_SUPABASE = /^http:\/\/localhost:5199\//;

export const E2E_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'learner@example.com',
  email_confirmed_at: '2026-11-01T00:00:00Z',
  is_anonymous: false,
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-11-01T00:00:00Z',
};

/**
 * A signed-in learner, as supabase-js stores the session for the fake address. Supabase's
 * server is faked too: it confirms the account (or, with `server: 'rejects'`, refuses the
 * session), and sync gets nothing saved. Call before loading ACCOUNTS_APP.
 */
export async function signedIn(page: Page, { server = 'confirms' as 'confirms' | 'rejects' | 'unconfirmed', email = E2E_USER.email } = {}) {
  const account = { ...E2E_USER, email };
  await page.addInitScript((user) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('sb-localhost-auth-token', JSON.stringify({
      access_token: 'e2e-access-token', refresh_token: 'e2e-refresh', token_type: 'bearer',
      expires_in: 3600, expires_at: now + 3600, user,
    }));
  }, account);
  await page.route(FAKE_SUPABASE, (route) => {
    if (!route.request().url().includes('/auth/v1/user')) return route.fulfill({ json: [] });
    if (server === 'rejects') return route.fulfill({ status: 401, json: { code: 401, msg: 'invalid JWT' } });
    const user = server === 'unconfirmed' ? { ...account, email_confirmed_at: null } : account;
    return route.fulfill({ json: user });
  });
}

/**
 * A signed-in learner whose RevenueCat customer has Pro. Call before loading the app,
 * and load it from ACCOUNTS_APP.
 */
export async function asPro(page: Page) {
  await signedIn(page);
  await page.route(/^https:\/\/api\.revenuecat\.com\//, (route) => route.fulfill({ json: PRO_CUSTOMER }));
}

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

        // Silent tests: everything still plays (and is counted above), but through a gain of
        // zero just before the speakers. Headless browsers on a Mac otherwise play out loud.
        const connect = AudioNode.prototype.connect as (this: AudioNode, ...args: unknown[]) => unknown;
        const disconnect = AudioNode.prototype.disconnect as (this: AudioNode, ...args: unknown[]) => unknown;
        const mutes = new WeakMap<BaseAudioContext, GainNode>();
        const muted = (ctx: BaseAudioContext) => {
          let gain = mutes.get(ctx);
          if (!gain) {
            gain = ctx.createGain();
            gain.gain.value = 0;
            connect.call(gain, ctx.destination);
            mutes.set(ctx, gain);
          }
          return gain;
        };
        const quiet = (target: unknown) => (target instanceof AudioDestinationNode ? muted(target.context) : target);
        AudioNode.prototype.connect = function (this: AudioNode, target: unknown, ...rest: unknown[]) {
          return connect.call(this, quiet(target), ...rest);
        } as typeof AudioNode.prototype.connect;
        AudioNode.prototype.disconnect = function (this: AudioNode, ...args: unknown[]) {
          return args.length ? disconnect.call(this, quiet(args[0]), ...args.slice(1)) : disconnect.call(this);
        } as typeof AudioNode.prototype.disconnect;
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

/** Load the app as a returning visitor, past onboarding, with these lessons done. */
export async function openApp(page: Page, url = '/path', completedLevels: string[] = []) {
  await page.addInitScript((done) => {
    if (localStorage.getItem('fifths.v1')) return;
    localStorage.setItem('fifths.v1', JSON.stringify({ hasOnboarded: true, hasEverPracticed: true, completedLevels: done }));
  }, completedLevels);
  await page.goto(url);
}

/** Leave every sample download hanging, like a very slow connection. */
export async function holdSamples(page: Page) {
  await page.route(/\.mp3$/, () => {});
}

export const sounds = (page: Page) =>
  page.evaluate(() => (window as unknown as { __sounds: { synth: number; sample: number } }).__sounds);

/**
 * Stand in for the microphone. A number makes it hear a steady tone at that pitch (Hz),
 * like someone humming; 'denied' makes it refuse, like a learner blocking the mic.
 */
export async function fakeMic(page: Page, input: number | 'denied') {
  await page.addInitScript((tone) => {
    // WebKit won't start a new audio context outside a click, so play the tone through the
    // app's own context, which the learner's click has already started.
    const contexts: AudioContext[] = [];
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this); }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      if (tone === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
      const ctx = contexts.find((c) => c.state === 'running') ?? new Native();
      const out = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = tone;
      gain.gain.value = 0.3;
      osc.connect(gain).connect(out);
      osc.start();
      return out.stream;
    };
  }, input);
}
