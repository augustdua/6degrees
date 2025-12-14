-- Adds minimal columns/indexes to store external (Reddit) posts safely (dedupe).
-- Run via: node scripts/db/run-sql.js -f scripts/enable_reddit_import.sql

ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Dedupe external posts (e.g., reddit post id per source)
CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_posts_external_source_id
  ON forum_posts(external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_posts_external_source
  ON forum_posts(external_source);


