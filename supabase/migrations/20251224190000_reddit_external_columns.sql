-- Ensure external import columns + indexes exist for Reddit posts/comments
-- This makes comment backfill + upserts safe across environments.

BEGIN;

-- forum_posts: external identifiers for imported content (e.g., reddit)
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_posts_external_source_id
  ON public.forum_posts(external_source, external_id);

CREATE INDEX IF NOT EXISTS idx_forum_posts_external_source
  ON public.forum_posts(external_source);

-- forum_comments: external identifiers for imported comments (e.g., reddit comment id)
ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Columns used by the app code (safe no-ops if already present)
ALTER TABLE public.forum_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_comments_external_source_id
  ON public.forum_comments(external_source, external_id);

CREATE INDEX IF NOT EXISTS idx_forum_comments_external_source
  ON public.forum_comments(external_source);

COMMIT;


