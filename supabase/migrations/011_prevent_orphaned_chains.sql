-- Migration to prevent orphaned chains in the future
-- This migration adds constraints and triggers to automatically clean up chains
-- when their associated requests are deleted

-- Step 1: Create a function to validate chain requests
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

-- Step 2: Create trigger to validate chain requests before insert/update
DROP TRIGGER IF EXISTS trigger_validate_chain_request ON chains;
CREATE TRIGGER trigger_validate_chain_request
  BEFORE INSERT OR UPDATE ON chains
  FOR EACH ROW
  EXECUTE FUNCTION validate_chain_request();

-- Step 3: Create a function to automatically clean up chains when requests are deleted
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

-- Step 4: Create trigger to automatically clean up when requests are deleted
DROP TRIGGER IF EXISTS trigger_cleanup_chains_on_request_delete ON connection_requests;
CREATE TRIGGER trigger_cleanup_chains_on_request_delete
  AFTER UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_chains_on_request_delete();

-- Step 5: Create a function to clean up orphaned chains (for manual cleanup)
CREATE OR REPLACE FUNCTION cleanup_orphaned_chains()
RETURNS TABLE(
  cleaned_chains INTEGER,
  cleaned_rewards INTEGER,
  cleaned_target_claims INTEGER,
  cleaned_link_clicks INTEGER
) AS $$
DECLARE
  chains_deleted INTEGER := 0;
  rewards_deleted INTEGER := 0;
  claims_deleted INTEGER := 0;
  clicks_deleted INTEGER := 0;
BEGIN
  -- Delete orphaned chains
  DELETE FROM chains 
  WHERE request_id IN (
    SELECT id FROM connection_requests 
    WHERE status = 'deleted' OR deleted_at IS NOT NULL
  );
  GET DIAGNOSTICS chains_deleted = ROW_COUNT;
  
  -- Delete associated rewards
  DELETE FROM rewards 
  WHERE chain_id IN (
    SELECT c.id FROM chains c
    LEFT JOIN connection_requests cr ON c.request_id = cr.id
    WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL
  );
  GET DIAGNOSTICS rewards_deleted = ROW_COUNT;
  
  -- Delete associated target claims
  DELETE FROM target_claims 
  WHERE request_id IN (
    SELECT id FROM connection_requests 
    WHERE status = 'deleted' OR deleted_at IS NOT NULL
  );
  GET DIAGNOSTICS claims_deleted = ROW_COUNT;
  
  -- Delete associated link clicks
  DELETE FROM link_clicks 
  WHERE request_id IN (
    SELECT id FROM connection_requests 
    WHERE status = 'deleted' OR deleted_at IS NOT NULL
  );
  GET DIAGNOSTICS clicks_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT chains_deleted, rewards_deleted, claims_deleted, clicks_deleted;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Add comment explaining the cleanup function
COMMENT ON FUNCTION cleanup_orphaned_chains() IS 
'Manually clean up orphaned chains and related data. Returns counts of cleaned records.';

-- Step 7: Create a view to easily identify orphaned chains
CREATE OR REPLACE VIEW orphaned_chains_view AS
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
WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL;

-- Step 8: Add comment for the view
COMMENT ON VIEW orphaned_chains_view IS 
'View showing chains that reference deleted or non-existent requests.';
