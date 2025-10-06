-- Add target organization to connection requests
-- This allows users to specify which organization their target works at

ALTER TABLE connection_requests
ADD COLUMN target_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_connection_requests_target_organization
ON connection_requests(target_organization_id)
WHERE target_organization_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN connection_requests.target_organization_id IS 'The organization where the target person works';
