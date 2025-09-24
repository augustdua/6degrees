-- TEST SCRIPT TO VERIFY THE FIX FOR DELETED REQUESTS ISSUE
-- Run this after applying the cleanup script to verify everything works

-- Step 1: Check for any remaining orphaned chains
SELECT 
  'REMAINING ORPHANED CHAINS CHECK' as test_name,
  COUNT(*) as orphaned_chains_count
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id
WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL;

-- Step 2: Show all remaining chains with their request data
SELECT 
  'REMAINING CHAINS WITH VALID REQUESTS' as test_name,
  COUNT(*) as valid_chains_count
FROM chains c
INNER JOIN connection_requests cr ON c.request_id = cr.id
WHERE cr.status != 'deleted' AND cr.deleted_at IS NULL;

-- Step 3: Detailed view of remaining chains
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
ORDER BY c.created_at DESC
LIMIT 10;

-- Step 4: Test the cleanup function (if needed)
-- SELECT * FROM cleanup_orphaned_chains();

-- Step 5: Check the orphaned chains view
SELECT 
  'ORPHANED CHAINS VIEW TEST' as test_name,
  COUNT(*) as orphaned_count
FROM orphaned_chains_view;

-- Step 6: Verify constraint is working (this should fail if constraint is active)
-- INSERT INTO chains (request_id, participants, status, total_reward)
-- VALUES (
--   (SELECT id FROM connection_requests WHERE status = 'deleted' LIMIT 1),
--   '[]'::jsonb,
--   'active',
--   100.00
-- );

-- Step 7: Summary report
SELECT 
  'FINAL SUMMARY' as test_name,
  (SELECT COUNT(*) FROM chains) as total_chains,
  (SELECT COUNT(*) FROM chains c INNER JOIN connection_requests cr ON c.request_id = cr.id WHERE cr.status != 'deleted' AND cr.deleted_at IS NULL) as valid_chains,
  (SELECT COUNT(*) FROM chains c LEFT JOIN connection_requests cr ON c.request_id = cr.id WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL) as orphaned_chains;
