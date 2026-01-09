-- Fix Forum Sidebar Communities
-- Goal: ensure only the upgraded communities are "active" and returned by /api/forum/communities/active
-- Also adds a stable display_order so the left sidebar ordering is deterministic.
--
-- Expected active communities (in this order):
-- 1) general
-- 2) market-research
-- 3) predictions
-- 5) pain-points

BEGIN;

-- 1) Ensure required columns exist
ALTER TABLE forum_communities
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE forum_communities
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- 2) Backfill NULLs
UPDATE forum_communities
SET is_active = true
WHERE is_active IS NULL;

UPDATE forum_communities
SET display_order = 0
WHERE display_order IS NULL;

-- 3) Ensure the 5 upgraded communities are active
UPDATE forum_communities
SET is_active = true
WHERE slug IN ('general', 'market-research', 'predictions', 'pain-points');

-- 4) Ensure legacy communities are inactive (they are tags under General)
UPDATE forum_communities
SET is_active = false
WHERE slug IN ('build-in-public', 'wins', 'failures', 'network', 'market-gaps');

-- 5) Stable ordering for sidebar
UPDATE forum_communities SET display_order = 10 WHERE slug = 'general';
UPDATE forum_communities SET display_order = 20 WHERE slug = 'market-research';
UPDATE forum_communities SET display_order = 30 WHERE slug = 'predictions';
UPDATE forum_communities SET display_order = 40 WHERE slug = 'pain-points';

-- Push everything else to the bottom (and keep them inactive by default)
UPDATE forum_communities
SET display_order = 999
WHERE slug NOT IN ('general', 'market-research', 'predictions', 'pain-points');

-- 6) Optional sanity output (leave commented if you prefer silent runs)
-- SELECT slug, name, is_active, display_order FROM forum_communities ORDER BY is_active DESC, display_order ASC, name ASC;

COMMIT;

























