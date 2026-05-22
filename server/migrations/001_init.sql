-- BOTIFY X Client Panel — schema
-- NOTE: This service shares DATABASE_URL with the Admin Dashboard.
-- The Admin Dashboard migration creates panel_users and runtime_events.
-- We only ensure runtime_events exists (safe no-op if admin ran first).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- panel_users is created by Admin Dashboard migration.
-- If running Client Panel standalone (no admin DB), create it here:
CREATE TABLE IF NOT EXISTS panel_users (
  id             SERIAL PRIMARY KEY,
  username       VARCHAR(80) UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  session_id     TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  runtime_status VARCHAR(20) NOT NULL DEFAULT 'created',
  expiry_date    TIMESTAMPTZ,
  plan           VARCHAR(50) NOT NULL DEFAULT 'basic',
  panel_token    UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE panel_users ADD COLUMN IF NOT EXISTS runtime_status VARCHAR(20) NOT NULL DEFAULT 'created';

CREATE TABLE IF NOT EXISTS runtime_events (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES panel_users(id) ON DELETE CASCADE,
  event      VARCHAR(30) NOT NULL,
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_events_user_id ON runtime_events(user_id);
CREATE INDEX IF NOT EXISTS idx_panel_users_panel_token ON panel_users(panel_token);
CREATE INDEX IF NOT EXISTS idx_panel_users_session_id  ON panel_users(session_id);
