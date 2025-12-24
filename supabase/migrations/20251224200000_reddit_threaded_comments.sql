-- Threaded external (Reddit) comments: store external author + parent mapping
-- This supports stable pseudonymous author display and nested replies like Reddit.

BEGIN;

ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS external_author_id TEXT,
  ADD COLUMN IF NOT EXISTS external_author_name TEXT,
  ADD COLUMN IF NOT EXISTS external_parent_id TEXT;

-- Helpful indexes for backfill + thread reconstruction
CREATE INDEX IF NOT EXISTS idx_forum_comments_external_parent_id
  ON public.forum_comments(external_source, external_parent_id);

CREATE INDEX IF NOT EXISTS idx_forum_comments_external_author_id
  ON public.forum_comments(external_source, external_author_id);

COMMIT;


