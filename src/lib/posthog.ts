import posthog from 'posthog-js'
import { isNative, platform } from './native'

const OPT_OUT_KEY = 'fifths.posthog.optOut'

let initialised = false

export function initPostHog(): void {
  if (initialised) return
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined
  if (!key) return

  posthog.init(key, {
    api_host: host || 'https://us.i.posthog.com',
    defaults: '2026-01-30',
    // Profiles for signed-out learners too: most people never sign in, and
    // retention and cohort reports need a profile per learner.
    person_profiles: 'always',
    property_blacklist: ['$ip'],
    ip: false,
    // The app is a single-page app: count each screen change as a pageview.
    capture_pageview: 'history_change',
    capture_pageleave: 'if_capture_pageview',
    cross_subdomain_cookie: true,
    persistence: 'localStorage+cookie',
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: 'input, textarea, [data-ph-mask]',
    },
    autocapture: {
      css_selector_allowlist: ['[data-ph-track]'],
    },
    loaded: (ph) => {
      const release = import.meta.env.VITE_RELEASE_SHA as string | undefined
      ph.register({
        $source: isNative() ? platform() : 'web',
        $is_native: isNative(),
        ...(release ? { release } : {}),
      })
      if (localStorage.getItem(OPT_OUT_KEY) === '1') ph.opt_out_capturing()
    },
  })
  initialised = true
}

export function setAnalyticsOptOut(optOut: boolean): void {
  if (optOut) {
    localStorage.setItem(OPT_OUT_KEY, '1')
    if (initialised) posthog.opt_out_capturing()
  } else {
    localStorage.removeItem(OPT_OUT_KEY)
    if (initialised) posthog.opt_in_capturing()
  }
}

export function isAnalyticsOptedOut(): boolean {
  return localStorage.getItem(OPT_OUT_KEY) === '1'
}

export function phRegister(props: Record<string, unknown>): void {
  if (!initialised) return
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== null && v !== '') clean[k] = v
  if (Object.keys(clean).length === 0) return
  posthog.register(clean)
}

export function phCapture(event: string, props: Record<string, unknown> = {}): void {
  if (!initialised) return
  posthog.capture(event, props)
}

export function phIdentify(distinctId: string, props: Record<string, unknown> = {}): void {
  if (!initialised) return
  posthog.identify(distinctId, props)
}

export function phReset(): void {
  if (!initialised) return
  posthog.reset()
}

export { posthog }
