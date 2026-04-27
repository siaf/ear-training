# Fifths — Deploy Checklist

> **When you're ready to ship**, run through this in order. The actual deploy should be delegated to the `cloudflare-pages-deploy` skill — this file is the human-checklist prep.

---

## Phase A — Prerequisites (do these once, ahead of time)

- [ ] **Domain:** `fifths.io` registered via Cloudflare Registrar (~$32/yr for `.io`)
- [ ] **Cloudflare account** logged in, free tier fine
- [ ] **Umami website created**, website ID copied (format: UUID). If self-hosted, also copy the custom endpoint URL.
- [ ] **Wrangler CLI authenticated locally:** `npx wrangler login` (one-time OAuth flow)

## Phase B — Placeholder swaps in the site

- [ ] In all 5 HTML files (`site/index.html`, `site/jazz/index.html`, `site/classical/index.html`, `site/transcribing/index.html`, `site/returning/index.html`): replace `YOUR_UMAMI_WEBSITE_ID` with the real Umami ID.
  - If using a custom Umami endpoint (self-hosted), also update `src` to `https://<your-endpoint>/script.js`.
- [ ] Review + edit copy in each landing HTML file (the user has flagged copy as "needs more work; fine-tune before deploy").
- [ ] Confirm the `_redirects` file has the right subreddits for your planned launch order.

## Phase C — Cloudflare Pages project creation (delegate to `cloudflare-pages-deploy` skill)

Invoke the skill with these inputs:

- **Project name:** `fifths-marketing`
- **Build output dir:** `site`
- **D1 database name:** `fifths`
- **Schema file:** `./schema.sql` (at repo root)
- **Binding variable name:** exactly `DB` (not `db`, not `FIFTHS_DB` — the Function expects `DB`)
- **Custom domain:** `fifths.io` apex + `www.fifths.io` redirect
- **Web Analytics:** toggle ON in the Pages project settings
- **Umami:** already added to HTML; nothing else needed

The skill will handle:
- `wrangler d1 create fifths` → get the database_id
- Update `wrangler.toml` with the real database_id
- `wrangler d1 execute fifths --remote --file=./schema.sql`
- `wrangler pages deploy` from repo root (NOT from inside `site/` — CWD gotcha)
- Binding attachment in dashboard (Production + Preview)
- Custom domain attachment
- End-to-end smoketest

## Phase D — Pre-launch smoketest (verify BEFORE any Reddit post)

Run each of these and confirm:

- [ ] `curl -sI https://fifths.io/` returns 200 with HTML
- [ ] `curl -sI https://fifths.io/jazz/` returns 200
- [ ] `curl -sI https://fifths.io/classical/` returns 200
- [ ] `curl -sI https://fifths.io/transcribing/` returns 200
- [ ] `curl -sI https://fifths.io/returning/` returns 200
- [ ] `curl -sI https://fifths.io/r/sideproject` returns **302** with `Location: /?utm_source=reddit&...`
- [ ] `curl -sI https://fifths.io/wrangler.toml` returns **404** (not 200 — critical)
- [ ] `curl -sI https://fifths.io/functions/waitlist.js` returns **404** (not 200)
- [ ] `curl -sI https://fifths.io/schema.sql` returns **404**
- [ ] `POST /waitlist` with a test email returns `{"ok": true}`:
  ```bash
  curl -i -X POST https://fifths.io/waitlist \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=test+deploy@example.com&form_source=hero&utm_source=smoketest"
  ```
- [ ] D1 console shows the test row
- [ ] Survey POST also works:
  ```bash
  curl -i -X POST https://fifths.io/waitlist \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "email=test+deploy@example.com&form_source=survey&use_case=transcribing&concern=smoketest"
  ```
- [ ] Same test row now has `use_case` and `concern` populated
- [ ] Umami dashboard shows the pageviews
- [ ] Cloudflare Web Analytics dashboard shows the pageviews (may take ~5 min to appear)

## Phase E — Pre-launch cleanup

- [ ] Delete test rows from D1:
  ```sql
  DELETE FROM waitlist WHERE email LIKE '%test%' OR email LIKE '%@example.com';
  DELETE FROM sqlite_sequence WHERE name = 'waitlist';
  ```
- [ ] Final check: `SELECT COUNT(*) FROM waitlist;` returns 0
- [ ] Publish [docs/phase0-playbook.md](./phase0-playbook.md) calendar to your personal calendar (post dates + times)
- [ ] Seed 10-20 friendly early signups from your personal network before the first Reddit post — a page that says "0 on the waitlist" reads worse than one that says nothing

## Phase F — App hosting (SEPARATE, can happen later per infra-plan Week 5)

The React app currently deploys to GitHub Pages at `/ear-training/`. Moving it to `app.fifths.io` is:
- Change [vite.config.ts](../vite.config.ts) base path from `/ear-training/` to `/`
- Create a SECOND Cloudflare Pages project called `fifths-app` from the same repo root
- Build output dir: `dist` (Vite default)
- Build command: `npm run build`
- Custom domain: `app.fifths.io`
- No D1 binding needed for the app itself (that comes in Week 1 of [infra-plan.md](./infra-plan.md) with Supabase)

This doesn't block the marketing launch. Do it when moving off GitHub Pages in Week 5.

---

## If something goes wrong

Common failure modes + fixes are in the `cloudflare-pages-deploy` skill's diagnosis table. Top three:

| Symptom | Likely cause | Fix |
|---|---|---|
| `POST /waitlist` returns 500 | D1 binding not attached to the Production environment | Pages → Settings → Functions → D1 bindings → attach for Production, save, **redeploy** |
| `POST /waitlist` returns 405 | Pages isn't serving functions (stuck on a static-only deploy) | Ensure `site/functions/waitlist.js` exists, redeploy, check build log mentions "Found 1 function" |
| `/r/sideproject` returns 404 | `_redirects` not picked up | Confirm `site/_redirects` is in the deployed assets (check Pages build log for "Uploaded _redirects") |
| Umami not recording | Script tag still has `YOUR_UMAMI_WEBSITE_ID` placeholder | Swap it in all 5 HTML files, redeploy |
