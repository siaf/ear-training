-- Waitlist schema for Cloudflare D1 — generic Phase 0 template.
-- Works for any product with zero changes. Run once via the Cloudflare
-- D1 MCP (d1_database_query) or wrangler:
--   wrangler d1 execute <product> --remote --file=./schema.sql
--
-- Design notes:
--   - `email` is UNIQUE. One row per email, ever.
--   - A signup is "the act of leaving an email" — each row is one signup.
--   - Survey answers are optional enrichment stored in the same row
--     (see `use_case`, `concern`, `survey_completed_at`).
--   - First-touch attribution: the UTM params from a visitor's first
--     submission are what get stored. Later visits ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS waitlist (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  email               TEXT    NOT NULL UNIQUE,

  -- where the signup came from: "hero", "bottom", or "survey" (race case)
  form_source         TEXT,

  -- first-touch attribution
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  utm_content         TEXT,
  referrer            TEXT,
  user_agent          TEXT,
  ip_country          TEXT,
  created_at          TEXT    NOT NULL,

  -- optional survey enrichment
  use_case            TEXT,
  concern             TEXT,
  survey_completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at        ON waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_utm_source        ON waitlist(utm_source);
CREATE INDEX IF NOT EXISTS idx_waitlist_utm_campaign      ON waitlist(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_waitlist_survey_completed  ON waitlist(survey_completed_at);
