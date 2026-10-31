// Fifths — marketing-site JS. Captures UTM params, hijacks form submits,
// opens the survey modal, and POSTs to /waitlist with first-touch attribution.

// Sentry Loader: a tiny stub that pulls in the full SDK only when an error
// happens. The key is the public DSN key, the same one the app ships.
(function sentryLoader() {
  var s = document.createElement('script');
  s.src = 'https://js.sentry-cdn.com/f5f1cd3cbbd39fab5bd1d5a0635b81e6.min.js';
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
})();

// PostHog — privacy-respecting init. Project key is public-safe (phc_ prefix is
// designed for browser exposure). Privacy posture matches /privacy:
//   - ip:false + property_blacklist:['$ip']  → no IP collection
//   - person_profiles:'always'               → anonymous profile per browser (no IP, no PII)
//   - session_recording.maskAllInputs        → input fields never recorded
(function initPostHog() {
  if (typeof window === 'undefined' || window.posthog && window.posthog.__loaded) return;
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify register reset opt_in_capturing opt_out_capturing has_opted_out_capturing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  window.posthog.init('phc_vy9ynWCmqQ27B9FRAvXN6SNay28XjaGHHo3NCvszDF3h', {
    api_host: 'https://us.i.posthog.com',
    defaults: '2026-01-30',
    person_profiles: 'always',
    property_blacklist: ['$ip'],
    ip: false,
    capture_pageview: true,
    capture_pageleave: 'if_capture_pageview',
    cross_subdomain_cookie: true,
    persistence: 'localStorage+cookie',
    session_recording: { maskAllInputs: true },
  });
})();

// Attribution capture + forwarding.
// 1. Capture gclid + UTM params from URL on landing.
// 2. Persist first-touch values to localStorage with a 90-day TTL (matches Google Ads attribution window).
// 3. Stuff them into hidden form fields (existing waitlist behavior).
// 4. Rewrite outbound app.fifths.io links to forward those params, so attribution survives the cross-domain hop.
const ATTR_KEYS = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const ATTR_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const ATTR_STORAGE_KEY = 'fifths.attribution.v1';

function loadStoredAttribution() {
  try {
    const raw = localStorage.getItem(ATTR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.ts !== 'number' || Date.now() - parsed.ts > ATTR_TTL_MS) return null;
    return parsed;
  } catch { return null; }
}

function saveAttribution(values) {
  try {
    localStorage.setItem(ATTR_STORAGE_KEY, JSON.stringify({ ...values, ts: Date.now() }));
  } catch {}
}

const params = new URLSearchParams(window.location.search);
const fresh = {};
for (const k of ATTR_KEYS) {
  const v = params.get(k);
  if (v) fresh[k] = v;
}

// Referer fallback: when a poster forgets `?utm_source=...`, infer the channel
// from document.referrer so Reddit/HN/X/etc. traffic doesn't all collapse into
// `(none)` alongside true direct visits. Only fills utm_source/utm_medium when
// the URL didn't carry them explicitly — explicit values win.
const REFERER_RULES = [
  { pattern: /(^|\.)reddit\.com$/i,         source: 'reddit',         medium: 'organic-social' },
  { pattern: /(^|\.)x\.com$/i,              source: 'twitter',        medium: 'organic-social' },
  { pattern: /(^|\.)twitter\.com$/i,        source: 'twitter',        medium: 'organic-social' },
  { pattern: /(^|\.)news\.ycombinator\.com$/i, source: 'hackernews',  medium: 'organic-social' },
  { pattern: /(^|\.)lobste\.rs$/i,          source: 'lobsters',       medium: 'organic-social' },
  { pattern: /(^|\.)producthunt\.com$/i,    source: 'producthunt',    medium: 'organic-social' },
  { pattern: /(^|\.)youtube\.com$/i,        source: 'youtube',        medium: 'organic-video' },
  { pattern: /(^|\.)youtu\.be$/i,           source: 'youtube',        medium: 'organic-video' },
  { pattern: /(^|\.)tiktok\.com$/i,         source: 'tiktok',         medium: 'organic-video' },
  { pattern: /(^|\.)linkedin\.com$/i,       source: 'linkedin',       medium: 'organic-social' },
  { pattern: /(^|\.)facebook\.com$/i,       source: 'facebook',       medium: 'organic-social' },
  { pattern: /(^|\.)instagram\.com$/i,      source: 'instagram',      medium: 'organic-social' },
  { pattern: /(^|\.)bing\.com$/i,           source: 'bing',           medium: 'organic-search' },
  { pattern: /(^|\.)duckduckgo\.com$/i,     source: 'duckduckgo',     medium: 'organic-search' },
  { pattern: /(^|\.)google\.[a-z.]+$/i,     source: 'google',         medium: 'organic-search' },
  { pattern: /(^|\.)reddit-app\.com$/i,     source: 'reddit',         medium: 'organic-social' },
];
try {
  if (document.referrer) {
    const refUrl = new URL(document.referrer);
    if (!/(^|\.)fifths\.io$/.test(refUrl.hostname)) {
      const rule = REFERER_RULES.find(r => r.pattern.test(refUrl.hostname));
      if (rule) {
        if (!fresh.utm_source) fresh.utm_source = rule.source;
        if (!fresh.utm_medium) fresh.utm_medium = rule.medium;
      } else if (!fresh.utm_source) {
        fresh.utm_source = refUrl.hostname.replace(/^www\./, '');
        if (!fresh.utm_medium) fresh.utm_medium = 'referral';
      }
    }
  }
} catch {}

const stored = loadStoredAttribution() || {};
const attribution = Object.keys(fresh).length > 0 ? { ...stored, ...fresh } : stored;
if (Object.keys(fresh).length > 0) saveAttribution(attribution);

// Forward attribution to PostHog as super-properties so every event carries gclid/utm.
(function registerPostHogAttribution() {
  if (!window.posthog) return;
  const props = {};
  for (const k of ATTR_KEYS) if (attribution[k]) props[k] = attribution[k];
  if (Object.keys(props).length === 0) return;
  try { window.posthog.register(props); } catch {}
})();

(function fillFormFields() {
  const map = {
    'utm-source':   attribution.utm_source   || '',
    'utm-medium':   attribution.utm_medium   || '',
    'utm-campaign': attribution.utm_campaign || '',
    'utm-content':  attribution.utm_content  || '',
    'utm-referrer': document.referrer        || ''
  };
  Object.entries(map).forEach(([cls, val]) => {
    document.querySelectorAll('.' + cls).forEach(el => { el.value = val; });
  });
})();

(function forwardAttributionToApp() {
  const passThrough = ATTR_KEYS.filter(k => attribution[k]);
  if (passThrough.length === 0) return;
  document.querySelectorAll('a[href*="app.fifths.io"]').forEach((a) => {
    try {
      const url = new URL(a.getAttribute('href'), window.location.origin);
      if (!/(^|\.)fifths\.io$/.test(url.hostname)) return;
      for (const k of passThrough) {
        if (!url.searchParams.has(k)) url.searchParams.set(k, attribution[k]);
      }
      a.setAttribute('href', url.toString());
    } catch {}
  });
})();

// Paint the dashboard-mockup heatmap (if present on this page).
(function paintHeatmap() {
  const wrap = document.querySelector('.dash .heatmap'); if (!wrap) return;
  if (wrap.childElementCount > 0) return; // already painted (server-rendered)
  const warm = ['#ff8a6b', '#ffb199', '#ffd1c1', '#ffe1d4'];
  const cool = ['#b6e5cd', '#c8b8ff', '#a8d5ff', '#ffd768'];
  for (let i = 0; i < 144; i++) {
    const d = document.createElement('div');
    const x = i % 12, y = Math.floor(i / 12);
    const confused = Math.abs(x - y) === 3 || (x === 10 && y === 3) || (x === 2 && y === 9);
    const offDiag = x !== y && Math.random() > 0.88;
    if (confused) d.style.background = warm[Math.floor(Math.random() * warm.length)];
    else if (offDiag) d.style.background = cool[Math.floor(Math.random() * cool.length)];
    wrap.appendChild(d);
  }
})();

// Sticky nav border on scroll
(function stickyBorder() {
  const nav = document.querySelector('header.nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Waitlist + survey flow
(function waitlist() {
  const modal = document.getElementById('survey-modal');
  const surveyForm = document.getElementById('survey-form');
  const surveyUI = modal && modal.querySelector('.survey-ui');
  const thanksUI = modal && modal.querySelector('.thanks-ui');
  const closeBtn = modal && modal.querySelector('.modal-close');
  const skipBtn  = modal && modal.querySelector('.modal-skip');

  function openModal() {
    if (!modal) return;
    modal.classList.remove('thanks');
    modal.classList.add('open');
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
  }
  function showThanks() {
    if (!modal) return;
    modal.classList.add('thanks');
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (skipBtn)  skipBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });
  }

  // Same Sentry project as the app (fifths-web), so site failures alert too.
  function reportSiteError(message) {
    console.warn(message);
    try { if (window.Sentry) window.Sentry.captureMessage(message, { level: 'error', tags: { area: 'site' } }); } catch {}
    try { if (window.posthog && window.posthog.captureException) window.posthog.captureException(new Error(message)); } catch {}
  }

  async function postWaitlist(form, extra) {
    const fd = new FormData(form);
    if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    const body = new URLSearchParams();
    fd.forEach((v, k) => body.append(k, typeof v === 'string' ? v : ''));
    try {
      const res = await fetch('/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) reportSiteError('waitlist POST failed: HTTP ' + res.status);
      return res.ok;
    } catch (err) {
      reportSiteError('waitlist POST failed: ' + (err && err.message));
      return false;
    }
  }

  // Hijack hero + bottom forms
  document.querySelectorAll('form.waitlist-form').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailEl = form.querySelector('input[type=email]');
      const email = emailEl ? (emailEl.value || '').trim().toLowerCase() : '';
      if (!email) return;

      const source = form.querySelector('input[name=form_source]')?.value || form.dataset.source || 'hero';
      const button = form.querySelector('button[type=submit]');
      const errorEl = form.parentElement.querySelector('.waitlist-error') || (() => {
        const el = document.createElement('p');
        el.className = 'waitlist-error';
        el.setAttribute('role', 'alert');
        el.style.cssText = 'color:var(--coral-ink,#b3402a);font-size:13px;margin:8px 0 0;text-align:center';
        form.insertAdjacentElement('afterend', el);
        return el;
      })();
      errorEl.textContent = '';
      if (button) button.disabled = true;

      // Wait for the write: this used to open the "you're in" modal before the
      // POST, so every failed signup still looked like a success.
      const ok = await postWaitlist(form);
      if (button) button.disabled = false;
      try {
        if (window.posthog) {
          if (ok) {
            window.posthog.identify(email, { email });
            window.posthog.capture('waitlist_submit', { form_source: source });
          } else {
            window.posthog.capture('waitlist_failed', { form_source: source });
          }
        }
      } catch {}
      if (!ok) {
        errorEl.textContent = "Sorry, that didn't go through. Please try again, or email hello@fifths.io.";
        return;
      }
      try { localStorage.setItem('fifths.waitlist.email', email); } catch {}
      openModal();
    });
  });

  // Survey submit
  if (surveyForm) {
    surveyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let email = '';
      try { email = localStorage.getItem('fifths.waitlist.email') || ''; } catch {}
      await postWaitlist(surveyForm, { form_source: 'survey', email });
      showThanks();
      try {
        if (window.posthog) {
          if (email) window.posthog.identify(email, { email });
          const fd = new FormData(surveyForm);
          window.posthog.capture('survey_submit', {
            use_case: fd.get('use_case') || null,
            concern: fd.get('concern') || null,
          });
        }
      } catch {}
    });
  }
})();
