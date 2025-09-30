-- Script to manually populate paths for existing chains
-- Run this ONCE after migration to backfill existing chains

-- This will be replaced by API calls, but can be used for initial backfill

-- Check existing chains that need paths
SELECT
    c.id as chain_id,
    c.request_id,
    c.status,
    jsonb_array_length(c.participants) as participant_count,
    (SELECT COUNT(*) FROM chain_paths WHERE chain_id = c.id) as existing_paths
FROM chains c
WHERE c.status = 'active'
ORDER BY c.created_at;

-- Note: Path building requires application logic (DFS traversal)
-- Use the API endpoint instead:
-- POST /api/paths/{chainId}/update for each chain_id above