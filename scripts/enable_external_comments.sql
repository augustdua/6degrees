-- Adds minimal columns/indexes to store external (Reddit) comments safely (dedupe).
-- Run via: node scripts/db/run-sql.js -f scripts/enable_external_comments.sql

BEGIN;

ALTER TABLE forum_comments
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Dedupe external comments (e.g., reddit comment id per source)
CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_comments_external_source_id
  ON forum_comments(external_source, external_id)
  WHERE external_source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_comments_external_source
  ON forum_comments(external_source);

COMMIT;


