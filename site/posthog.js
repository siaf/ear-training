// PostHog snippet — marketing site (fifths.io).
// Mirrors src/lib/posthog.ts so distinct_id stitches across fifths.io ↔ app.fifths.io
// via cross_subdomain_cookie. Loaded via <script defer src="/posthog.js"></script>
// from every marketing page.
//
// Touch this only if you also touch src/lib/posthog.ts — config drift between
// the two will break cross-domain identity.

!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p=t.createElement("script"),p.type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init Ee Vs Ds Es Cs Os Ss Os qs hs us xs ws Is js gs Gs Js cs ps Hs Bs Ms Fs Ws Ys Ks zs Zs Qs Xs ea ta na ra ia oa sa aa ua la ca da fa pa ka ya".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

posthog.init('phc_vy9ynWCmqQ27B9FRAvXN6SNay28XjaGHHo3NCvszDF3h', {
  api_host: 'https://us.i.posthog.com',
  defaults: '2026-01-30',
  person_profiles: 'always',
  property_blacklist: ['$ip'],
  ip: false,
  capture_pageview: true,
  capture_pageleave: 'if_capture_pageview',
  cross_subdomain_cookie: true,
  persistence: 'localStorage+cookie',
  autocapture: { css_selector_allowlist: ['[data-ph-track]'] },
  loaded: function (ph) {
    ph.register({
      $source: 'web',
      $is_native: false,
      $surface: 'marketing'
    });
  }
});
