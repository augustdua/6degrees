-- Clean up orphaned requests (requests without chains)
-- These were created but failed during chain creation due to the constraint bug

-- First, let's see what we're about to delete
SELECT 
  r.id,
  r.target,
  r.created_at,
  r.status,
  (SELECT COUNT(*) FROM chains WHERE request_id = r.id) as chain_count
FROM connection_requests r
WHERE r.creator_id = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4'
  AND r.status != 'deleted'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM chains WHERE request_id = r.id
  )
ORDER BY r.created_at DESC;

-- Uncomment the below to actually delete them after reviewing:

-- Delete orphaned requests
DELETE FROM connection_requests
WHERE creator_id = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4'
  AND status != 'deleted'
  AND deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM chains WHERE request_id = connection_requests.id
  );

-- Verify they're gone
SELECT 
  COUNT(*) as remaining_orphaned_requests
FROM connection_requests r
WHERE r.creator_id = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4'
  AND r.status != 'deleted'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM chains WHERE request_id = r.id
  );


