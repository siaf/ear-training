# Loops MJML templates

12 brand-aligned MJML email templates, each packaged as a `.zip` ready to upload into Loops via **Code → Upload custom email**.

## Folder layout

```
loops-templates/
├── _zips/                    ← upload these to Loops
│   ├── magic-link.zip        (20 KB)
│   ├── confirm-signup.zip    (20 KB)
│   ├── welcome.zip           (92 KB)
│   └── ... (12 total)
├── magic-link/               ← editable source per template
│   ├── index.mjml
│   └── img/
│       └── logo.png
├── welcome/
│   ├── index.mjml
│   └── img/
│       ├── logo.png
│       └── mascot.png        ← contextual mascot (Fable, Pulse, etc.)
└── ... (12 folders)
```

Each template has its own `img/` folder containing only the assets it needs (Loops auto-hosts them after upload).

## How to upload to Loops

For each template:

1. Loops dashboard → **Transactional → New** (or open an existing template to replace its body)
2. Click the **Code** styling option in the editor → reveals the file picker
3. Drag & drop the matching `.zip` from `_zips/` → click **Upload**
4. Set the **Subject** + **Sender details** in the Loops template settings:
   - From: `Fifths <hello@fifths.io>`
   - Reply-to: `hello@fifths.io`
5. Add the **Data variables** listed in the table below
6. **Publish** the template
7. Copy the resulting `transactionalId` for use elsewhere (Supabase JSON payloads, app event triggers, etc.)

## Templates

**Loops has 3 email types — pick the right type when creating the template:**
- **Transactional**: 1:1 system-sent emails (auth, billing). Loops blocks `{unsubscribe_link}` here (you can't unsubscribe from a magic link).
- **Loops** (event-triggered): lifecycle/marketing triggered by audience events. REQUIRES `{unsubscribe_link}`.
- **Campaigns**: one-off broadcasts (not used by us yet).

### Upload as **Transactional → New** (no unsubscribe link)

| Zip | Purpose | Trigger | Mascot | Required `{DATA_VARIABLE:*}` |
|---|---|---|---|---|
| `magic-link.zip` | Supabase magic-link sign-in | Supabase Auth `magic_link` | Fable (portrait) | `confirmationUrl` |
| `confirm-signup.zip` | First-time signup confirmation | Supabase Auth `signup` | Fable (happy) | `confirmationUrl` |
| `payment-failed.zip` | Stripe charge failure | RevenueCat webhook `BILLING_ISSUE` (not yet wired — see TODO.md) | Major (curious) | `nextRetryDate`, `updateUrl` |
| `cancelled.zip` | Subscription cancellation | RevenueCat webhook `CANCELLATION` (not yet wired — see TODO.md) | Fable (content) | `accessUntilDate`, `resubUrl` |

**Trial templates removed** — Fifths doesn't currently use a free trial (the generous free tier serves the same role). If trials are added later, regenerate `trial-ending` and `trial-converted` MJML from the brand pattern.

### Upload as **Loop → New** (with `{unsubscribe_link}`, uses `{EVENT_PROPERTY:*}` syntax)

⚠️ **Important syntax note for Loop emails**: when you set up the Loop in Loops' UI, you may need to swap `{DATA_VARIABLE:foo}` → `{EVENT_PROPERTY:foo}` in the MJML. Loops sometimes auto-converts on import, but verify in the template editor before publishing.

| Zip | Purpose | Trigger | Mascot | Required event properties |
|---|---|---|---|---|
| `welcome.zip` | Welcome on first sign-in | Loops audience event `user.created` (or app-side `welcome`) | Fable (excited) | none — static copy |
| `day-1-reactivation.zip` | 24h post-signup, no session yet | Loops time-based automation | Fable (curious) | none |
| `first-insight.zip` | After first practice session | App-side custom event `first_session_completed` | Noir (listening) | `topInterval`, `accuracy`, `weakestInterval` |
| `streak-break.zip` | 24h after last session, streak ≥ 2 | Cloudflare Worker cron → Loops event | Pulse (curious) | `streakDays`, `appUrl` |
| `weekly-digest.zip` | Sundays | CF Worker cron → Loops event | Pulse (happy) | `minutesPracticed`, `streakDays`, `topInterval`, `weakestInterval` |
| `win-back.zip` | 14d / 30d / 60d inactive | CF Worker cron → Loops event | Fable (content) | `daysSinceLastSession`, `furthestLevel` |

## What's in every template

- **Logo** at top-left (horizontal Fifths wordmark, brand asset from `public/brand/logos/`)
- **Subject + preheader** set via `<mj-title>` and `<mj-preview>` in the MJML head (Loops UI overrides these but the values document intent)
- **Heading** with serif italic accent on the key word (matches the brand voice on landing pages)
- **Body** in second-person warm copy (no marketing jargon)
- **CTA button** in coral pill matching the app's `Bean` component
- **Footer** with: contextual note → personal sign-off → brand line → `{unsubscribe_link}` (REQUIRED by Loops)

## Brand tokens used (matches `src/tokens.css` and `site/styles.css`)

| Role | Hex |
|---|---|
| Page bg | `#fff8ef` (paper) |
| Card bg | `#ffffff` |
| Subtle bg | `#fef1dd` (page-2) |
| Ink-1 (heading) | `#2a1d3a` |
| Ink-2 (body) | `#54466b` |
| Ink-3 (small) | `#8a7b9d` |
| Hairline | `#ebe1ef` |
| Coral (CTA) | `#ff8a6b` |
| Coral-ink (accent) | `#c64632` |
| Mint (success) | `#d5f0e1` / ink `#2f7a5a` |
| Lavender | `#e4daff` / ink `#5b3fb3` |
| Butter (warning) | `#fff0c1` / ink `#9a6f00` |
| Sky (info) | `#dcecff` / ink `#2867b2` |
| Coral-soft (alert) | `#ffe1d4` / ink `#c64632` |

Fonts: web-safe stack with `Georgia` falling back to `DM Serif Display` for italic accent text. No custom font loading — keeps deliverability high and avoids flash-of-unstyled-text.

## Mascot meaning (per the brand kit)

| Mascot | Use for |
|---|---|
| **Fable** (fox) | Encouragement, "hand on your shoulder" |
| **Pulse** (heart) | Streaks, daily practice rhythm |
| **Major** (note) | Helpful clarification, billing flows |
| **Noir** (silhouette) | Insight, data, "listening to your ear" |

## Loops dynamic-tag syntax recap

- **Transactional** emails (these): `{DATA_VARIABLE:variableName}`
- **Loops** (event-triggered audience emails): `{EVENT_PROPERTY:variableName}`
- **Campaigns** (one-off audience sends): `{firstName}` (raw contact properties, no prefix)
- **Unsubscribe link** (every email): `{unsubscribe_link}` — REQUIRED, Loops won't accept the upload without it

Always **camelCase** for variable names.

## Iterating

When you tweak copy or design later:

1. Edit `<template-name>/index.mjml`
2. If you change images, replace files in `<template-name>/img/`
3. Re-zip: `cd loops-templates/<template-name> && zip -rq ../_zips/<template-name>.zip . -x ".*"`
4. Re-upload the zip in Loops (overwrites existing template content)
5. Republish

Or just regenerate everything: `bash /tmp/fifths_loops_zip.sh` (after editing source files).

## Testing each template

After publish in Loops:

1. Click **Send test** in Loops with sample data variable values filled in
2. Check inbox in multiple clients: Gmail (web + iOS Mail), iCloud, Outlook
3. Verify: subject correct, sender = `Fifths <hello@fifths.io>`, body renders without broken images / squashed columns / cut-off text
4. Click the CTA button → confirms URL substitution
5. Confirm the unsubscribe link works (don't actually unsubscribe yourself!)

## Mapping to Supabase auth templates

For `magic-link.zip` and `confirm-signup.zip`, after publishing in Loops you also need to paste a JSON payload into Supabase Auth → Email Templates. The pattern:

```json
{
  "transactionalId": "<id from Loops Publish page>",
  "email": "{{ .Email }}",
  "addToAudience": true,
  "dataVariables": {
    "confirmationUrl": "{{ .ConfirmationURL }}"
  }
}
```

The `addToAudience: true` flag automatically creates a Loops contact when the auth email is sent — handles user-sync without needing a separate Database Webhook.
