-- Restructure Communities: Convert BIP, Wins, Failures to tags under General
-- Keep only: General, Market Research, Predictions, Daily Standups, Pain Points

-- Step 1: Ensure General community exists and is active
UPDATE forum_communities 
SET is_active = true 
WHERE slug = 'general';

-- Step 2: Mark these communities as INACTIVE (they become tags instead)
UPDATE forum_communities 
SET is_active = false 
WHERE slug IN ('build-in-public', 'wins', 'failures', 'network', 'market-gaps');

-- Step 3: Move posts from Build in Public → General with tag
DO $$
DECLARE
  general_id UUID;
  source_id UUID;
BEGIN
  SELECT id INTO general_id FROM forum_communities WHERE slug = 'general';
  
  -- Build in Public → General + tag
  SELECT id INTO source_id FROM forum_communities WHERE slug = 'build-in-public';
  IF general_id IS NOT NULL AND source_id IS NOT NULL THEN
    UPDATE forum_posts 
    SET tags = array_append(COALESCE(tags, '{}'), 'build-in-public'),
        community_id = general_id
    WHERE community_id = source_id
      AND NOT ('build-in-public' = ANY(COALESCE(tags, '{}')));
  END IF;
  
  -- Wins → General + tag
  SELECT id INTO source_id FROM forum_communities WHERE slug = 'wins';
  IF general_id IS NOT NULL AND source_id IS NOT NULL THEN
    UPDATE forum_posts 
    SET tags = array_append(COALESCE(tags, '{}'), 'wins'),
        community_id = general_id
    WHERE community_id = source_id
      AND NOT ('wins' = ANY(COALESCE(tags, '{}')));
  END IF;
  
  -- Failures → General + tag
  SELECT id INTO source_id FROM forum_communities WHERE slug = 'failures';
  IF general_id IS NOT NULL AND source_id IS NOT NULL THEN
    UPDATE forum_posts 
    SET tags = array_append(COALESCE(tags, '{}'), 'failures'),
        community_id = general_id
    WHERE community_id = source_id
      AND NOT ('failures' = ANY(COALESCE(tags, '{}')));
  END IF;
  
  -- Network → General + tag
  SELECT id INTO source_id FROM forum_communities WHERE slug = 'network';
  IF general_id IS NOT NULL AND source_id IS NOT NULL THEN
    UPDATE forum_posts 
    SET tags = array_append(COALESCE(tags, '{}'), 'network'),
        community_id = general_id
    WHERE community_id = source_id
      AND NOT ('network' = ANY(COALESCE(tags, '{}')));
  END IF;
  
  -- Market Gaps → General + tag (if not already done)
  SELECT id INTO source_id FROM forum_communities WHERE slug = 'market-gaps';
  IF general_id IS NOT NULL AND source_id IS NOT NULL THEN
    UPDATE forum_posts 
    SET tags = array_append(COALESCE(tags, '{}'), 'market-gaps'),
        community_id = general_id
    WHERE community_id = source_id
      AND NOT ('market-gaps' = ANY(COALESCE(tags, '{}')));
  END IF;
END $$;

-- Step 4: Verify active communities (should only be these 5)
-- SELECT slug, name, is_active FROM forum_communities ORDER BY is_active DESC, name;

-- Expected active communities:
-- 1. general
-- 2. market-research  
-- 3. predictions
-- 4. daily-standups
-- 5. pain-points

