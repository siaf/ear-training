import { defineConfig, devices } from '@playwright/test';

const APP_PORT = 5190;
const SITE_PORT = 5191;
const ACCOUNTS_PORT = 5192;

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
      // Sign-in prompts only appear when Supabase is configured. This address is never
      // reached: a signed-out visitor makes no Supabase calls.
      command: `npx vite --port ${ACCOUNTS_PORT} --strictPort`,
      url: `http://localhost:${ACCOUNTS_PORT}`,
      env: { ...offlineEnv, VITE_SUPABASE_URL: 'http://localhost:9', VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e' },
      reuseExistingServer: false,
    },
    {
      command: `python3 -m http.server ${SITE_PORT} --directory site`,
      url: `http://localhost:${SITE_PORT}/tools/`,
      reuseExistingServer: false,
    },
  ],
});
