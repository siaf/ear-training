import { defineConfig, devices } from '@playwright/test';

// E2E_PORT_BASE moves all three servers, for when something else is using 5190–5192.
const PORT_BASE = Number(process.env.E2E_PORT_BASE ?? 5190);
const APP_PORT = PORT_BASE;
const SITE_PORT = PORT_BASE + 1;
const ACCOUNTS_PORT = PORT_BASE + 2;

// Vite prefers real environment variables over .env.local, so these blanks switch
// off Supabase, PostHog and Sentry in the app under test. Tests must never reach
// production services. The RevenueCat key is fake; e2e/fixtures.ts answers its calls.
const offlineEnv = {
  WEB_APP_BUILD: '1',
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_PUBLISHABLE_KEY: '',
  VITE_POSTHOG_KEY: '',
  VITE_SENTRY_DSN: '',
  VITE_GOOGLE_ADS_ID: '',
  VITE_REVENUECAT_WEB_KEY: 'rcb_sb_e2e_fake',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', use: { ...devices['iPhone 14'] } },
  ],
  webServer: [
    {
      command: `npx vite --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}`,
      env: offlineEnv,
      // Never reuse: a dev server someone left running has the real keys.
      reuseExistingServer: false,
    },
    {
      // Sign-in prompts only appear when Supabase is configured. Nothing listens on this
      // address: a signed-out visitor makes no Supabase calls, and tests that fake a
      // signed-in learner answer it with page.route. Not a port WebKit refuses (like 9).
      command: `npx vite --port ${ACCOUNTS_PORT} --strictPort`,
      url: `http://localhost:${ACCOUNTS_PORT}`,
      // Courses still being built stay locked here, as learners see them (the main app server
      // previews them, like local dev).
      env: { ...offlineEnv, VITE_SUPABASE_URL: 'http://localhost:5199', VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e', VITE_COURSE_PREVIEW: 'off' },
      reuseExistingServer: false,
    },
    {
      command: `python3 -m http.server ${SITE_PORT} --directory site`,
      url: `http://localhost:${SITE_PORT}/tools/`,
      reuseExistingServer: false,
    },
  ],
});
