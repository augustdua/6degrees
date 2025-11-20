-- Update existing offers to set is_demo = false if it's NULL
-- This ensures old offers created before the tagging system are properly marked as real offers

UPDATE offers
SET is_demo = false
WHERE is_demo IS NULL;

-- Update existing requests to set is_demo = false if it's NULL
UPDATE connection_requests
SET is_demo = false
WHERE is_demo IS NULL;

-- Check the results
SELECT 
  'Offers' as table_name,
  COUNT(*) FILTER (WHERE is_demo = true) as demo_count,
  COUNT(*) FILTER (WHERE is_demo = false) as real_count,
  COUNT(*) FILTER (WHERE is_demo IS NULL) as null_count
FROM offers
UNION ALL
SELECT 
  'Requests' as table_name,
  COUNT(*) FILTER (WHERE is_demo = true) as demo_count,
  COUNT(*) FILTER (WHERE is_demo = false) as real_count,
  COUNT(*) FILTER (WHERE is_demo IS NULL) as null_count
FROM connection_requests;

