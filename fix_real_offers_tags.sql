-- Fix real offers and requests to have proper tags and is_demo flags

-- 1. Update all NULL is_demo to false for real offers/requests
UPDATE offers
SET is_demo = false
WHERE is_demo IS NULL;

UPDATE connection_requests
SET is_demo = false
WHERE is_demo IS NULL;

-- 2. Update offers without tags to have 'Other' tag so they show up in UI
UPDATE offers
SET tags = '["Other"]'::jsonb
WHERE (tags IS NULL OR tags = '[]'::jsonb OR tags = 'null'::jsonb)
  AND is_demo = false;

-- 3. Update requests without tags to have 'Other' tag so they show up in UI
UPDATE connection_requests
SET tags = '["Other"]'::jsonb
WHERE (tags IS NULL OR tags = '[]'::jsonb OR tags = 'null'::jsonb)
  AND is_demo = false;

-- 4. Check results
SELECT 
  'Offers - Real' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE tags IS NOT NULL AND tags != '[]'::jsonb) as with_tags,
  COUNT(*) FILTER (WHERE tags IS NULL OR tags = '[]'::jsonb) as without_tags
FROM offers
WHERE is_demo = false
UNION ALL
SELECT 
  'Offers - Demo' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE tags IS NOT NULL AND tags != '[]'::jsonb) as with_tags,
  COUNT(*) FILTER (WHERE tags IS NULL OR tags = '[]'::jsonb) as without_tags
FROM offers
WHERE is_demo = true
UNION ALL
SELECT 
  'Requests - Real' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE tags IS NOT NULL AND tags != '[]'::jsonb) as with_tags,
  COUNT(*) FILTER (WHERE tags IS NULL OR tags = '[]'::jsonb) as without_tags
FROM connection_requests
WHERE is_demo = false
UNION ALL
SELECT 
  'Requests - Demo' as category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE tags IS NOT NULL AND tags != '[]'::jsonb) as with_tags,
  COUNT(*) FILTER (WHERE tags IS NULL OR tags = '[]'::jsonb) as without_tags
FROM connection_requests
WHERE is_demo = true;

