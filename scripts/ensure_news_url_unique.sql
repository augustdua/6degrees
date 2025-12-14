-- Ensures news sync upserts work reliably by deduping on news_url.
-- Run via: node scripts/db/run-sql.js -f scripts/ensure_news_url_unique.sql

ALTER TABLE forum_posts
  ADD COLUMN IF NOT EXISTS news_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_forum_posts_news_url
  ON forum_posts(news_url)
  WHERE news_url IS NOT NULL;


