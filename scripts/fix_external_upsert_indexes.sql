-- Fix external upsert indexes so PostgREST/Supabase `on_conflict=external_source,external_id`
-- works reliably.
--
-- Why: a PARTIAL unique index (with a WHERE clause) is not matched by ON CONFLICT inference
-- unless the INSERT includes the same predicate in the conflict target.
-- Supabase/PostgREST upsert does not include that predicate, so inserts fail with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- Solution: use a normal UNIQUE index on (external_source, external_id).
-- This is safe because Postgres UNIQUE allows multiple NULLs.

BEGIN;

-- forum_posts
DROP INDEX IF EXISTS public.uq_forum_posts_external_source_id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_posts_external_source_id
  ON public.forum_posts(external_source, external_id);

CREATE INDEX IF NOT EXISTS idx_forum_posts_external_source
  ON public.forum_posts(external_source);

-- forum_comments
DROP INDEX IF EXISTS public.uq_forum_comments_external_source_id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_comments_external_source_id
  ON public.forum_comments(external_source, external_id);

CREATE INDEX IF NOT EXISTS idx_forum_comments_external_source
  ON public.forum_comments(external_source);

COMMIT;


