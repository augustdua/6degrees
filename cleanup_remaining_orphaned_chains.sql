-- CLEANUP REMAINING ORPHANED CHAINS
-- This script will identify and clean up the 2 remaining orphaned chains

-- Step 1: Identify the specific orphaned chains
SELECT 
  'IDENTIFYING REMAINING ORPHANED CHAINS' as step,
  c.id as chain_id,
  c.request_id,
  c.status as chain_status,
  c.participants,
  c.total_reward,
  c.created_at as chain_created_at,
  cr.status as request_status,
  cr.deleted_at,
  cr.target,
  cr.creator_id,
  CASE 
    WHEN cr.id IS NULL THEN 'Request does not exist'
    WHEN cr.status = 'deleted' THEN 'Request is deleted'
    WHEN cr.deleted_at IS NOT NULL THEN 'Request has deleted_at timestamp'
    ELSE 'Unknown reason'
  END as orphan_reason
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id
WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL
ORDER BY c.created_at DESC;

-- Step 2: Clean up the remaining orphaned chains
DELETE FROM chains 
WHERE request_id IN (
  SELECT id FROM connection_requests 
  WHERE status = 'deleted' OR deleted_at IS NOT NULL
) OR request_id NOT IN (
  SELECT id FROM connection_requests
);

-- Step 3: Clean up any rewards associated with these chains
DELETE FROM rewards 
WHERE chain_id IN (
  SELECT c.id FROM chains c
  LEFT JOIN connection_requests cr ON c.request_id = cr.id
  WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL
);

-- Step 4: Clean up any target claims associated with these requests
DELETE FROM target_claims 
WHERE request_id IN (
  SELECT id FROM connection_requests 
  WHERE status = 'deleted' OR deleted_at IS NOT NULL
) OR request_id NOT IN (
  SELECT id FROM connection_requests
);

-- Step 5: Clean up any link clicks associated with these requests
DELETE FROM link_clicks 
WHERE request_id IN (
  SELECT id FROM connection_requests 
  WHERE status = 'deleted' OR deleted_at IS NOT NULL
) OR request_id NOT IN (
  SELECT id FROM connection_requests
);

-- Step 6: Verify cleanup
SELECT 
  'POST-CLEANUP VERIFICATION' as step,
  COUNT(*) as remaining_orphaned_chains
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id
WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL;

-- Step 7: Show remaining valid chains
SELECT 
  'REMAINING VALID CHAINS' as step,
  COUNT(*) as valid_chains_count
FROM chains c
INNER JOIN connection_requests cr ON c.request_id = cr.id
WHERE cr.status != 'deleted' AND cr.deleted_at IS NULL;

-- Step 8: Detailed view of remaining valid chains
SELECT 
  c.id as chain_id,
  c.request_id,
  c.status as chain_status,
  jsonb_array_length(c.participants) as participant_count,
  c.total_reward,
  c.created_at as chain_created_at,
  cr.target,
  cr.status as request_status,
  cr.creator_id,
  u.first_name || ' ' || u.last_name as creator_name
FROM chains c
INNER JOIN connection_requests cr ON c.request_id = cr.id
LEFT JOIN users u ON cr.creator_id = u.id
ORDER BY c.created_at DESC;
