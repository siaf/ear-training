import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { initNative } from './lib/native'
import { initBilling } from './lib/billing'
import { migrateBrandStorage } from './lib/migrateStorage'
import { captureAttribution, getStoredAttribution } from './lib/attribution'
import { initPostHog, phRegister } from './lib/posthog'
import { redactAuthDeep } from './lib/redactAuth'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE_SHA as string | undefined,
    sendDefaultPii: true,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Sign-in returns with tokens in the address, which events, breadcrumbs and replays all copy.
    beforeSend: (event) => redactAuthDeep(event),
    beforeSendTransaction: (event) => redactAuthDeep(event),
    beforeBreadcrumb: (breadcrumb) => redactAuthDeep(breadcrumb),
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        beforeAddRecordingEvent: (event) => redactAuthDeep(event),
      }),
      // Audio and lesson code logs failures with console.error; send those too.
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
    ],
  })
}

migrateBrandStorage()
initPostHog()
captureAttribution()
phRegister(getStoredAttribution() as Record<string, unknown>)
initNative().catch((err) => console.warn('initNative failed', err))
initBilling().catch((err) => console.warn('initBilling failed', err))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
