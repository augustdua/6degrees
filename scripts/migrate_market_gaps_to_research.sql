-- Migrate market-gaps posts to market-research community
-- This consolidates all research content into a single community

-- First, check what we're working with
SELECT 
  fc.slug,
  fc.name,
  COUNT(fp.id) as post_count
FROM forum_communities fc
LEFT JOIN forum_posts fp ON fp.community_id = fc.id
WHERE fc.slug IN ('market-research', 'market-gaps')
GROUP BY fc.id, fc.slug, fc.name;

-- Get the community IDs
SELECT id, slug, name FROM forum_communities WHERE slug IN ('market-research', 'market-gaps');

-- Move all market-gaps posts to market-research community
UPDATE forum_posts
SET community_id = (SELECT id FROM forum_communities WHERE slug = 'market-research')
WHERE community_id = (SELECT id FROM forum_communities WHERE slug = 'market-gaps');

-- Verify the migration
SELECT 
  fc.slug,
  COUNT(fp.id) as post_count
FROM forum_communities fc
LEFT JOIN forum_posts fp ON fp.community_id = fc.id
WHERE fc.slug IN ('market-research', 'market-gaps')
GROUP BY fc.id, fc.slug;

-- Deactivate the market-gaps community so it doesn't show in UI
UPDATE forum_communities 
SET is_active = false 
WHERE slug = 'market-gaps';

-- Also update any posts that still have 'market-gap' post_type to 'research_report'
-- for consistency (optional - keeps historical record if you skip this)
UPDATE forum_posts
SET post_type = 'research_report'
WHERE post_type = 'market-gap';

