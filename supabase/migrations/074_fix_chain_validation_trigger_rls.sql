-- Fix chain validation trigger to work with Row-Level Security
-- The trigger needs SECURITY DEFINER to bypass RLS policies

-- Drop and recreate the validation function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION validate_chain_request()
RETURNS TRIGGER
SECURITY DEFINER  -- ⚠️ This makes the function run with the privileges of the function owner, bypassing RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the request exists and is not deleted
  -- This query now bypasses RLS policies
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
$$;

-- Add comment explaining the SECURITY DEFINER usage
COMMENT ON FUNCTION validate_chain_request() IS 
'Validates that chains reference active, non-deleted requests. Uses SECURITY DEFINER to bypass RLS policies.';

-- Verify the change
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER (bypasses RLS)' ELSE 'SECURITY INVOKER (respects RLS)' END as security_mode
FROM pg_proc
WHERE proname = 'validate_chain_request';






