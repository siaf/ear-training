import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'

// Mobile (Capacitor) loads assets from the app bundle, so base must be `./`.
// Cloudflare Pages at app.fifths.io serves from root, so base must be `/`.
// GitHub Pages serves under /ear-training/ so default web builds keep that prefix.
const isMobileBuild = process.env.CAPACITOR_BUILD === '1'
const isWebAppBuild = process.env.WEB_APP_BUILD === '1'

// Rewrite directory-style requests (e.g. /brand/) to their index.html so the
// SPA fallback doesn't swallow them. Cloudflare Pages does this natively in prod.
function staticDirIndex(): PluginOption {
  return {
    name: 'static-dir-index',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && /\/brand\/?($|\?)/.test(req.url)) {
          req.url = req.url.replace(/\/brand\/?($|\?)/, '/brand/index.html$1')
        }
        next()
      })
    },
  }
}

// A build for app.fifths.io without its service keys still loads and plays lessons, so
// nothing looks wrong: but sign-in, sync, analytics, error reports and checkout are all
// silently off. That shipped once (17 Nov 2026, from a checkout missing .env.local), so
// `npm run build:web` refuses to build without them, or with the sandbox RevenueCat key.
const RELEASE_KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_POSTHOG_KEY', 'VITE_SENTRY_DSN', 'VITE_REVENUECAT_WEB_KEY']
function requireReleaseKeys(): PluginOption {
  return {
    name: 'require-release-keys',
    apply: 'build',
    configResolved(config) {
      if (!isWebAppBuild) return
      const env = loadEnv(config.mode, process.cwd(), 'VITE_')
      const missing = RELEASE_KEYS.filter((key) => !env[key])
      if (missing.length) {
        throw new Error(`build:web is missing ${missing.join(', ')}. Copy .env.local and .env.production.local into this checkout first.`)
      }
      if (env.VITE_REVENUECAT_WEB_KEY.startsWith('rcb_sb_')) {
        throw new Error('build:web has the sandbox RevenueCat key (rcb_sb_…). The production key belongs in .env.production.local.')
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), staticDirIndex(), requireReleaseKeys()],
  base: isMobileBuild ? './' : isWebAppBuild ? '/' : '/ear-training/',
  // The app sends PostHog to /ingest on its own origin (src/lib/posthog.ts). In production
  // functions/ingest forwards it; in dev this does, with the same split as that function.
  server: {
    proxy: {
      '^/ingest/(static|array)/': {
        target: 'https://us-assets.i.posthog.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ''),
      },
      '/ingest': {
        target: 'https://us.i.posthog.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ''),
      },
    },
  },
})
