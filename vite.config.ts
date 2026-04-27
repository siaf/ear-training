import { defineConfig, type PluginOption } from 'vite'
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

export default defineConfig({
  plugins: [react(), staticDirIndex()],
  base: isMobileBuild ? './' : isWebAppBuild ? '/' : '/ear-training/',
})
