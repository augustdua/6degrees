-- Track when the user last answered/swiped a prompt (personality or opinion swipe)
-- Cooldown should be based on this timestamp after the first prompt.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS prompt_last_answered_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.prompt_last_answered_at IS 'Last time the user answered a prompt (personality response or opinion swipe). Used for prompt cooldown.';

COMMIT;


