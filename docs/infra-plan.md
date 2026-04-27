# Fifths — Infrastructure Plan

> **Status**: Locked. Execution deferred until Phase 0 validation (landing + email list + Reddit ads) proves demand.
> **Source of truth for product decisions**: [`docs/product-plan.md`](./product-plan.md).

---

## 1. Stack decisions

| Layer | Service | Locked reason |
|---|---|---|
| **Hosting + domain** | Cloudflare Pages + Workers, domain via Cloudflare Registrar | Free tier is most generous for this scale; Workers handle Stripe/RevenueCat webhooks; Registrar has no markup on `.io` |
| **Auth + DB** | Supabase | Postgres fits the relational schema (§5.1.1 of product plan); built-in auth incl. Apple Sign In; Row Level Security removes need for custom API layer |
| **Payments + entitlements** | RevenueCat on top of Stripe | ~1 day extra vs. direct Stripe; saves 3-5 days when we ship native apps; free up to $2.5K MTR; MRR/churn dashboards out-of-box |
| **Analytics** | Umami (self-hosted on Cloudflare Workers) for now | Privacy-respecting per §9.1; $0 cost; revisit Plausible ($9/mo hosted) if maintenance becomes friction |
| **Email (waitlist + transactional)** | Cloudflare D1 for waitlist store + Resend for transactional | D1 is free below 5GB; Resend is cheapest transactional mail (3K/mo free) |
| **Error reporting** | Sentry (free tier) | Only add after paid users exist; currently [`ErrorBoundary`](../src/components/ErrorBoundary.tsx) is enough for local debugging |

---

## 2. Cost model (month 0 → month 12)

| Phase | Monthly cost |
|---|---|
| **Phase 0** — landing + waitlist, no app backend | **$0** |
| **Phase 1** — auth, cloud sync, free tier only | **$0** |
| **Phase 2** — Pro launches, first 100 subs | **$0** (free tiers cover it) |
| **Phase 3** — 100-300 Pro subs ($500-1,500 MRR) | **$0-$9** (only cost if we switch Umami → Plausible) |
| **Phase 4** — $2.5K+ MTR | **+$99/mo** (RevenueCat starter tier) |
| **Phase 5** — $10K+ MTR | **+1% MTR** (RevenueCat) + Supabase Pro ~$25/mo if row count climbs |

Fifths is designed to be profitable at $500 MRR — infra never eats a meaningful slice of revenue.

---

## 3. Implementation order (maps to product-plan §7)

### Phase 0 — demand validation (next, before infra)
Not infra work. Just:
- Multi-landing-page site ([§8.1](./product-plan.md#81-multi-landing-page-strategy-locked))
- Email waitlist with per-landing attribution (needs a tiny slice of Cloudflare D1)
- Umami analytics

We can carve out a minimal slice of the infra plan to ship Phase 0: **Cloudflare Pages + one D1 table + Umami**. Everything else waits.

### Week 1 — auth + DB
1. Create Supabase project `fifths-prod` (and `fifths-dev`)
2. Schema migration 0001: `users`, `sessions`, `attempts`, `item_mastery`, `insights`, `waitlist_signups`
3. Partition `attempts` by month from day one (§5.1.1 is explicit about this)
4. Define canonical `item_id` values (e.g. `interval:minor_third:ascending:harmonic`) — document in `docs/item-ids.md`
5. Row Level Security policies: user can read/write only own rows
6. Wire `@supabase/supabase-js` in the React app, replace localStorage writes in [`sessionStore.ts`](../src/lib/sessionStore.ts) with dual-write (local + server) during migration, then server-only

### Week 2 — auth UI + payments scaffolding
7. Supabase Auth: email magic link + Apple Sign In + Google OAuth
8. First-login migration: read `fifths.v1` + `fifths.sessions.v1` localStorage, merge into server state, never wipe (§5.3)
9. RevenueCat project `Fifths`, wire `@revenuecat/purchases-js`
10. Stripe account → connect to RevenueCat
11. Create RC offerings: `pro_monthly` ($4.99), `pro_annual` ($39), `lifetime` ($99)
12. RC entitlements: `pro` (all three products), `lifetime_badge` (lifetime only)
13. Feature-gate component: `<Gate feature="dashboard_unlimited">...</Gate>`

### Week 3 — cloud sync + analytics dashboard (product-plan §5.1)
14. `/progress` route replacing current `/stats` — hero, weakness map, progress chart, mastery map, insights feed
15. Post-session job in Supabase function updates `item_mastery` denormalized accuracy
16. Dashboard load budget: <300ms

### Week 4 — paywall wiring + lifetime cap
17. Lifetime-cap atomic counter: Supabase function increments `lifetime_sold_count` in a transaction; rejects if >=100
18. Stripe/RC webhook → Supabase function → update `users.plan`
19. Paywall impression tracking: every gate hit logs `user_id, feature_id, timestamp, context`
20. Checkout survey: "Which feature pushed you to subscribe?" (required, single-select)
21. Cancel survey: "What didn't deliver for you?" (required, free text + tags)

### Week 5 — domain, hosting, marketing site
22. Buy `fifths.io` via Cloudflare Registrar
23. Move app off GitHub Pages → Cloudflare Pages (app on `app.fifths.io`, marketing on `fifths.io`)
24. Multi-landing routes live on `fifths.io/jazz`, `/classical`, `/transcribing`, `/returning`
25. Email capture form per landing → Cloudflare Worker → D1 `waitlist_signups` table → Resend transactional welcome

### Week 6+ — features per product-plan §7
Mic input beta, vocal range, "practice your weak items," advanced chord modules, etc.

---

## 4. Database schema (initial migration)

Per product-plan §5.1.1, canonicalized. Add to `supabase/migrations/0001_init.sql` when we start Week 1.

```sql
-- users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  plan text not null default 'free' check (plan in ('free', 'pro', 'lifetime')),
  plan_expires_at timestamptz,
  vocal_range_low text,   -- e.g. 'C3'
  vocal_range_high text,  -- e.g. 'E5'
  onboarded_at timestamptz
);

-- sessions (one practice sitting)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  mode text not null,          -- 'scale_degree' | 'interval' | 'triad' | ...
  level_id text not null,
  total_q int not null,
  correct_q int not null
);
create index idx_sessions_user_ended on sessions(user_id, ended_at desc);

-- attempts — partitioned by month from day one (§5.1.1)
create table attempts (
  session_id uuid references sessions(id) on delete cascade,
  idx int not null,
  item_type text not null,
  item_id text not null,           -- canonical: 'interval:minor_third:ascending:harmonic'
  root_note text not null,
  scale_degree int,                -- 0-6 or null
  direction text,                  -- 'ascending' | 'descending' | null
  presentation text,               -- 'melodic' | 'harmonic' | null
  user_answer text not null,
  correct_answer text not null,
  is_correct boolean not null,
  response_time_ms int not null,
  created_at timestamptz default now(),
  primary key (session_id, idx)
) partition by range (created_at);
-- Create partitions for the next 12 months at deploy; cron to roll forward.

-- item_mastery — denormalized rolling accuracy
create table item_mastery (
  user_id uuid references users(id) on delete cascade,
  item_id text not null,
  attempts int not null default 0,
  correct int not null default 0,
  last_seen_at timestamptz,
  rolling_accuracy_30d numeric(5,2),
  primary key (user_id, item_id)
);

-- insights — generated observations
create table insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  generated_at timestamptz default now(),
  kind text not null,              -- 'weakness' | 'strength' | 'improvement' | 'habit'
  payload_json jsonb not null,
  dismissed_at timestamptz
);
create index idx_insights_user_recent on insights(user_id, generated_at desc) where dismissed_at is null;

-- lifetime cap counter (atomic)
create table lifetime_stats (
  id int primary key default 1,
  sold_count int not null default 0,
  constraint one_row check (id = 1)
);
insert into lifetime_stats (id) values (1);

-- waitlist (Phase 0 — can migrate later to users table after auth ships)
create table waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  landing_page text not null,    -- '/', '/jazz', '/classical', '/transcribing', '/returning'
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz default now(),
  ip_country text,               -- from Cloudflare header
  converted_user_id uuid references users(id),  -- filled when they later sign up
  unique(email, landing_page)
);
```

---

## 5. Environment variables (target shape)

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # server-only (Workers)

# RevenueCat
VITE_REVENUECAT_PUBLIC_KEY=
REVENUECAT_WEBHOOK_SECRET=  # server-only

# Stripe (RevenueCat talks to it; we still log this in case of direct calls)
STRIPE_SECRET_KEY=           # server-only
STRIPE_WEBHOOK_SECRET=       # server-only

# Resend (transactional email)
RESEND_API_KEY=              # server-only

# Umami
VITE_UMAMI_WEBSITE_ID=
VITE_UMAMI_ENDPOINT=         # e.g. https://analytics.fifths.io/api/send
```

`VITE_*` = baked into the client bundle. Everything else lives only in Cloudflare Worker secrets.

---

## 6. Accounts needed (assign to human when we start)

- [ ] Cloudflare account (free) + `fifths.io` domain via Registrar (~$8/yr for `.io`)
- [ ] Supabase project
- [ ] Stripe account (free, US tax ID needed)
- [ ] RevenueCat account (free)
- [ ] Resend account (free tier)
- [ ] GitHub repo for deployments (already exists)
- [ ] Umami: nothing external — self-host on a Cloudflare Worker

---

## 7. What we explicitly do NOT build at launch

- Custom backend server (Supabase + Cloudflare Workers are enough)
- Custom auth (Supabase Auth covers it)
- Custom MRR/churn dashboards (RevenueCat gives them)
- Google Analytics, Amplitude, PostHog, Mixpanel (Umami replaces all)
- Firebase (wrong data model for our schema)
- Push-notification backend (Capacitor `LocalNotifications` is client-only and enough)
- Own email marketing platform (Resend for transactional; ConvertKit/Mailchimp deferred to post-paywall if newsletter value emerges)

---

## 8. Migration notes for when we start Week 1

1. **Preserve local data.** The `fifths.v1` and `fifths.sessions.v1` localStorage keys are the source of truth for existing testers. Sync on first login, never wipe. See [`src/lib/migrateStorage.ts`](../src/lib/migrateStorage.ts) for the pattern already used for the `overtone.*` → `fifths.*` rename.
2. **Keep offline-first behavior.** Even after Supabase lands, writes must succeed offline and flush on reconnect. Tone.js sample CDN dependency is the real offline risk — see Tier 1 fallback in [`TODO.md`](../TODO.md).
3. **Canonicalize `item_id` before any persistent writes.** Changing the schema after real data exists is painful; §5.1.1 calls it "the single most important design choice."
