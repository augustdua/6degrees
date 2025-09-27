-- Migration: Clean up orphaned connection requests without chains
--
-- Problem: Some connection_requests exist without associated chains
-- Analysis: connection_requests should be for chain-seeking only
-- Solution: Mark these orphaned requests as failed/deleted
--
-- These appear to be incomplete chain requests that failed to create chains properly

BEGIN;

-- Step 1: Log what we're about to clean up
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM connection_requests cr
  LEFT JOIN chains c ON cr.id = c.request_id
  WHERE c.id IS NULL AND cr.deleted_at IS NULL;

  RAISE NOTICE 'Found % orphaned connection_requests without chains', orphaned_count;
END $$;

-- Step 2: Show the orphaned requests for review
SELECT
  cr.id,
  cr.target,
  LEFT(cr.message, 50) as message_preview,
  cr.status,
  cr.created_at
FROM connection_requests cr
LEFT JOIN chains c ON cr.id = c.request_id
WHERE c.id IS NULL
  AND cr.deleted_at IS NULL
ORDER BY cr.created_at DESC;

-- Step 3: Mark orphaned connection_requests as deleted
-- These are requests that never got chains created, so they're incomplete
UPDATE connection_requests
SET
  status = 'cancelled',
  deleted_at = NOW(),
  updated_at = NOW()
WHERE id IN (
  SELECT cr.id
  FROM connection_requests cr
  LEFT JOIN chains c ON cr.id = c.request_id
  WHERE c.id IS NULL
    AND cr.deleted_at IS NULL
);

-- Step 4: Verify the cleanup
DO $$
DECLARE
  remaining_orphaned INTEGER;
  total_active INTEGER;
  total_with_chains INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_orphaned
  FROM connection_requests cr
  LEFT JOIN chains c ON cr.id = c.request_id
  WHERE c.id IS NULL AND cr.deleted_at IS NULL;

  SELECT COUNT(*) INTO total_active
  FROM connection_requests cr
  WHERE cr.deleted_at IS NULL;

  SELECT COUNT(*) INTO total_with_chains
  FROM connection_requests cr
  JOIN chains c ON cr.id = c.request_id
  WHERE cr.deleted_at IS NULL;

  RAISE NOTICE 'Cleanup completed:';
  RAISE NOTICE '- Remaining orphaned requests: %', remaining_orphaned;
  RAISE NOTICE '- Total active connection_requests: %', total_active;
  RAISE NOTICE '- Active requests with chains: %', total_with_chains;

  IF remaining_orphaned = 0 AND total_active = total_with_chains THEN
    RAISE NOTICE '✅ SUCCESS: All active connection_requests now have chains';
  ELSE
    RAISE WARNING '❌ ISSUE: Data inconsistency detected';
  END IF;
END $$;

COMMIT;

-- Expected result: Only chain-based connection_requests remain active
-- Feed should now show only proper chain connections
-- Direct social connections should use direct_connection_requests table