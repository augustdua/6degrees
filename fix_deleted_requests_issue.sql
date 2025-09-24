-- FIX FOR DELETED REQUESTS SHOWING AS "UNKNOWN TARGET"
-- This script addresses the issue where chains reference deleted connection_requests
-- causing the frontend to display "Unknown Target" and "Debug: Missing request data"

-- STEP 1: Identify orphaned chains (chains that reference deleted requests)
SELECT 
  'ORPHANED CHAINS ANALYSIS' as check_type,
  COUNT(*) as total_chains,
  COUNT(CASE WHEN cr.status = 'deleted' OR cr.deleted_at IS NOT NULL THEN 1 END) as orphaned_chains,
  COUNT(CASE WHEN cr.status != 'deleted' AND cr.deleted_at IS NULL THEN 1 END) as valid_chains
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id;

-- STEP 2: Show detailed orphaned chains
SELECT 
  c.id as chain_id,
  c.request_id,
  c.status as chain_status,
  c.participants,
  c.total_reward,
  c.created_at as chain_created_at,
  cr.status as request_status,
  cr.deleted_at,
  cr.target,
  cr.creator_id
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id
WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL
ORDER BY c.created_at DESC;

-- STEP 3: Clean up orphaned chains
-- Option A: Delete orphaned chains completely (RECOMMENDED)
DELETE FROM chains 
WHERE request_id IN (
  SELECT id FROM connection_requests 
  WHERE status = 'deleted' OR deleted_at IS NOT NULL
);

-- Option B: If you want to keep the chains but mark them as failed
-- UPDATE chains 
-- SET status = 'failed', updated_at = NOW()
-- WHERE request_id IN (
--   SELECT id FROM connection_requests 
--   WHERE status = 'deleted' OR deleted_at IS NOT NULL
-- );

-- STEP 4: Clean up any rewards associated with deleted chains
DELETE FROM rewards 
WHERE chain_id IN (
  SELECT c.id FROM chains c
  LEFT JOIN connection_requests cr ON c.request_id = cr.id
  WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL
);

-- STEP 5: Clean up any target claims associated with deleted requests
DELETE FROM target_claims 
WHERE request_id IN (
  SELECT id FROM connection_requests 
  WHERE status = 'deleted' OR deleted_at IS NOT NULL
);

-- STEP 6: Clean up any link clicks associated with deleted requests
DELETE FROM link_clicks 
WHERE request_id IN (
  SELECT id FROM connection_requests 
  WHERE status = 'deleted' OR deleted_at IS NOT NULL
);

-- STEP 7: Verification - should show no orphaned chains
SELECT 
  'POST-CLEANUP VERIFICATION' as check_type,
  COUNT(*) as total_chains,
  COUNT(CASE WHEN cr.status = 'deleted' OR cr.deleted_at IS NOT NULL THEN 1 END) as orphaned_chains,
  COUNT(CASE WHEN cr.status != 'deleted' AND cr.deleted_at IS NULL THEN 1 END) as valid_chains
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id;

-- STEP 8: Create validation function and trigger to prevent future orphaned chains
-- Since CHECK constraints can't use subqueries, we'll use a trigger instead
CREATE OR REPLACE FUNCTION validate_chain_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the request exists and is not deleted
  IF NOT EXISTS (
    SELECT 1 FROM connection_requests 
    WHERE id = NEW.request_id 
    AND status != 'deleted' 
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot create chain for deleted or non-existent request: %', NEW.request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate chain requests before insert/update
DROP TRIGGER IF EXISTS trigger_validate_chain_request ON chains;
CREATE TRIGGER trigger_validate_chain_request
  BEFORE INSERT OR UPDATE ON chains
  FOR EACH ROW
  EXECUTE FUNCTION validate_chain_request();

-- STEP 9: Create a function to automatically clean up chains when requests are deleted
CREATE OR REPLACE FUNCTION cleanup_chains_on_request_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If a request is being soft-deleted, clean up associated chains
  IF NEW.status = 'deleted' OR NEW.deleted_at IS NOT NULL THEN
    -- Delete associated chains
    DELETE FROM chains WHERE request_id = NEW.id;
    
    -- Delete associated rewards (if any remain)
    DELETE FROM rewards WHERE chain_id IN (
      SELECT id FROM chains WHERE request_id = NEW.id
    );
    
    -- Delete associated target claims
    DELETE FROM target_claims WHERE request_id = NEW.id;
    
    -- Delete associated link clicks
    DELETE FROM link_clicks WHERE request_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 10: Create trigger to automatically clean up when requests are deleted
DROP TRIGGER IF EXISTS trigger_cleanup_chains_on_request_delete ON connection_requests;
CREATE TRIGGER trigger_cleanup_chains_on_request_delete
  AFTER UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_chains_on_request_delete();

-- STEP 11: Final verification - show remaining chains with their request data
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
LEFT JOIN connection_requests cr ON c.request_id = cr.id
LEFT JOIN users u ON cr.creator_id = u.id
ORDER BY c.created_at DESC;
