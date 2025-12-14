-- Enable News as a forum post type + Threaded comments
--
-- This script:
-- 1) Adds 'news' to forum_posts.post_type CHECK constraint
-- 2) Adds metadata columns for news posts + uniqueness on news_url
-- 3) Adds parent_comment_id to forum_comments for threaded replies
--
-- Run:
--   node scripts/db/run-sql.js scripts/enable_news_posts_and_threaded_comments.sql

BEGIN;

-- ============================================================================
-- 1) forum_posts: allow post_type='news'
-- ============================================================================
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_post_type_check;
ALTER TABLE forum_posts
  ADD CONSTRAINT forum_posts_post_type_check
  CHECK (
    post_type = ANY (
      ARRAY[
        'regular'::text,
        'request'::text,
        'win'::text,
        'failure'::text,
        'bip_day'::text,
        'research_report'::text,
        'prediction'::text,
        'pain_point'::text,
        'news'::text
      ]
    )
  );

-- ============================================================================
-- 2) forum_posts: news metadata columns
-- ============================================================================
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS news_url TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS news_source TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS news_published_at TIMESTAMPTZ;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS news_image_url TEXT;

-- Unique constraint so we can upsert news by URL (multiple NULLs allowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'forum_posts_news_url_key'
  ) THEN
    ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_news_url_key UNIQUE (news_url);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_forum_posts_post_type ON forum_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_forum_posts_news_published_at ON forum_posts(news_published_at DESC) WHERE news_published_at IS NOT NULL;

-- ============================================================================
-- 3) forum_comments: threaded replies
-- ============================================================================
ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_forum_comments_parent_comment_id ON forum_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post_parent_created ON forum_comments(post_id, parent_comment_id, created_at DESC);

COMMIT;


