-- Adds structured report blocks storage for forum reports.
-- This enables rendering reports as React blocks (Notion-like) instead of raw markdown.

ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS report_blocks JSONB;

-- Optional: quick lookup index (only for rows where blocks exist)
CREATE INDEX IF NOT EXISTS idx_forum_posts_report_blocks_present
  ON forum_posts (id)
  WHERE report_blocks IS NOT NULL;


