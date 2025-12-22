-- Personality prompt cooldown (once per 24 hours)
-- Created: 2025-12-22
--
-- Tracks when we last *prompted* a user with a personality question so we can
-- enforce a 24h cooldown across devices/sessions.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS personality_last_prompted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_personality_last_prompted_at
  ON users(personality_last_prompted_at DESC);

COMMENT ON COLUMN users.personality_last_prompted_at IS 'Last time the user was shown a personality question prompt (cooldown: 24h)';


