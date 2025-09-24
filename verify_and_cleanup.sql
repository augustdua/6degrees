-- VERIFICATION QUERIES
-- Run these to check if the migration worked

-- 1. Check chains table policies (should show new permissive policies)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'chains'
ORDER BY policyname;

-- 2. Check current chains (should show fewer chains after cleanup)
SELECT 
  id, 
  request_id, 
  participants, 
  status, 
  total_reward,
  created_at,
  jsonb_array_length(participants) as participant_count
FROM chains 
ORDER BY request_id, created_at;

-- 3. Check for any remaining duplicate chains per request
SELECT 
  request_id,
  COUNT(*) as chain_count,
  STRING_AGG(id::text, ', ') as chain_ids
FROM chains 
GROUP BY request_id
HAVING COUNT(*) > 1
ORDER BY chain_count DESC;

-- 4. Check connection_requests with their associated chains
SELECT 
  cr.id as request_id,
  cr.target,
  cr.status as request_status,
  cr.creator_id,
  u.first_name || ' ' || u.last_name as creator_name,
  COUNT(c.id) as chain_count,
  STRING_AGG(c.id::text, ', ') as chain_ids
FROM connection_requests cr
LEFT JOIN users u ON cr.creator_id = u.id
LEFT JOIN chains c ON cr.id = c.request_id
GROUP BY cr.id, cr.target, cr.status, cr.creator_id, u.first_name, u.last_name
ORDER BY cr.created_at DESC;

-- CLEANUP QUERIES (run these if needed)
-- Only run these if verification shows problems

-- 5. Manual cleanup of duplicate chains (if automatic cleanup didn't work)
-- This keeps the chain with the most participants for each request
WITH ranked_chains AS (
  SELECT 
    id,
    request_id,
    participants,
    jsonb_array_length(participants) as participant_count,
    ROW_NUMBER() OVER (
      PARTITION BY request_id 
      ORDER BY jsonb_array_length(participants) DESC, created_at ASC
    ) as rn
  FROM chains
)
DELETE FROM chains 
WHERE id IN (
  SELECT id FROM ranked_chains WHERE rn > 1
);

-- 6. Check for chains with incomplete participant data
SELECT 
  id,
  request_id,
  participants,
  jsonb_array_length(participants) as participant_count
FROM chains 
WHERE participants IS NULL 
   OR jsonb_array_length(participants) = 0
   OR EXISTS (
     SELECT 1 
     FROM jsonb_array_elements(participants) p 
     WHERE p->>'userid' IS NULL 
        OR p->>'email' IS NULL
   );

-- 7. Fix chains with incomplete participant data (if any found)
-- This adds missing fields to participants
UPDATE chains 
SET participants = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'userid', COALESCE(p->>'userid', ''),
      'email', COALESCE(p->>'email', ''),
      'firstName', COALESCE(p->>'firstName', ''),
      'lastName', COALESCE(p->>'lastName', ''),
      'role', COALESCE(p->>'role', 'forwarder'),
      'joinedAt', COALESCE(p->>'joinedAt', NOW()::text),
      'rewardAmount', COALESCE((p->>'rewardAmount')::numeric, 0)
    )
  )
  FROM jsonb_array_elements(participants) p
)
WHERE participants IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(participants) p 
    WHERE p->>'userid' IS NULL 
       OR p->>'email' IS NULL
  );

-- 8. Final verification - should show clean data
SELECT 
  'FINAL VERIFICATION' as check_type,
  COUNT(*) as total_chains,
  COUNT(DISTINCT request_id) as unique_requests,
  AVG(jsonb_array_length(participants)) as avg_participants_per_chain
FROM chains;
