-- Simple SQL approach to populate paths for existing chains
-- This creates a basic path structure for chains with simple parent-child relationships

-- First, let's see what we're working with
SELECT
    c.id as chain_id,
    c.status,
    c.total_reward,
    jsonb_array_length(c.participants) as participant_count,
    c.participants
FROM chains c
WHERE c.status = 'active'
ORDER BY jsonb_array_length(c.participants) ASC;

-- For each chain, we need to:
-- 1. Find the creator (role = 'creator')
-- 2. Find leaf nodes (participants with no children pointing to them)
-- 3. Build paths from creator to each leaf

-- Note: This SQL approach works for simple chains but complex trees
-- should use the TypeScript script (npm run populate-paths)

-- You can manually insert paths for simple chains like this example:
-- (Replace the UUIDs with actual values from your chains)

/*
INSERT INTO chain_paths (
    chain_id,
    path_id,
    creator_id,
    leaf_userid,
    subtree_root_id,
    path_userids,
    path_participants,
    base_reward,
    current_reward,
    path_length,
    is_complete
)
SELECT
    c.id as chain_id,
    c.id || '-' || (p->>'userid') as path_id,
    (SELECT p2->>'userid' FROM jsonb_array_elements(c.participants) p2 WHERE p2->>'role' = 'creator') as creator_id,
    (p->>'userid')::uuid as leaf_userid,
    COALESCE(
        (p->>'userid')::uuid,
        (SELECT p2->>'userid' FROM jsonb_array_elements(c.participants) p2 WHERE p2->>'role' = 'creator')
    ) as subtree_root_id,
    ARRAY[(SELECT p2->>'userid' FROM jsonb_array_elements(c.participants) p2 WHERE p2->>'role' = 'creator')::uuid, (p->>'userid')::uuid] as path_userids,
    jsonb_build_array(
        (SELECT p2 FROM jsonb_array_elements(c.participants) p2 WHERE p2->>'role' = 'creator'),
        p
    ) as path_participants,
    c.total_reward / jsonb_array_length(c.participants) as base_reward,
    c.total_reward / jsonb_array_length(c.participants) as current_reward,
    2 as path_length,
    (p->>'role' = 'target') as is_complete
FROM chains c
CROSS JOIN LATERAL jsonb_array_elements(c.participants) p
WHERE c.status = 'active'
    AND p->>'role' != 'creator'
    AND NOT EXISTS (
        SELECT 1 FROM chain_paths cp WHERE cp.chain_id = c.id
    );
*/

-- The above INSERT works for simple 2-level chains (creator -> child)
-- For complex trees with multiple levels, use: npm run populate-paths