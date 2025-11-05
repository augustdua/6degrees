-- Add currency column to connection_requests table
-- All existing rewards are in INR based on the amounts (50, 100, 1000, etc.)

-- Add currency column
ALTER TABLE connection_requests
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';

-- Set all existing requests to INR
UPDATE connection_requests
SET currency = 'INR'
WHERE currency IS NULL;

-- Verify the update
SELECT 
  id,
  target,
  reward,
  currency,
  target_organization_id
FROM connection_requests
WHERE status IN ('pending', 'active')
ORDER BY created_at DESC;


