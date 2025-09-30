-- Migration: Add chain_paths table for reward distribution
-- Description: Stores all paths from root (creator) to leaf nodes for efficient reward calculation

-- Create chain_paths table
CREATE TABLE IF NOT EXISTS chain_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id UUID NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    path_id TEXT NOT NULL, -- Unique identifier for this path (e.g., "chain_id-leaf_userid")

    -- Path data
    creator_id UUID NOT NULL REFERENCES users(id),
    leaf_userid UUID NOT NULL REFERENCES users(id), -- The leaf node at end of path
    subtree_root_id UUID NOT NULL REFERENCES users(id), -- Direct child of creator (defines subtree)

    -- Ordered array of user IDs from creator to leaf
    path_userids UUID[] NOT NULL,

    -- Ordered array of participant data (full JSONB for reward calculation)
    path_participants JSONB NOT NULL,

    -- Reward calculation fields
    base_reward DECIMAL(20, 8) DEFAULT 0,
    current_reward DECIMAL(20, 8) DEFAULT 0,

    -- Subtree freeze tracking
    subtree_frozen_until TIMESTAMP WITH TIME ZONE, -- When this subtree's freeze expires
    last_child_added_at TIMESTAMP WITH TIME ZONE,  -- When last child was added to this subtree

    -- Path metadata
    path_length INTEGER NOT NULL, -- Number of nodes in path (including creator and leaf)
    is_complete BOOLEAN DEFAULT FALSE, -- True if leaf is the target

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_chain_leaf UNIQUE(chain_id, leaf_userid),
    CONSTRAINT path_length_check CHECK (path_length >= 2) -- At least creator + one other node
);

-- Indexes for efficient queries
CREATE INDEX idx_chain_paths_chain_id ON chain_paths(chain_id);
CREATE INDEX idx_chain_paths_subtree_root ON chain_paths(subtree_root_id);
CREATE INDEX idx_chain_paths_leaf ON chain_paths(leaf_userid);
CREATE INDEX idx_chain_paths_complete ON chain_paths(is_complete) WHERE is_complete = TRUE;
CREATE INDEX idx_chain_paths_frozen ON chain_paths(subtree_frozen_until) WHERE subtree_frozen_until IS NOT NULL;

-- Function to calculate all paths for a chain
CREATE OR REPLACE FUNCTION calculate_chain_paths(p_chain_id UUID)
RETURNS TABLE (
    path_userids UUID[],
    path_participants JSONB,
    subtree_root_id UUID,
    leaf_userid UUID,
    path_length INTEGER
) AS $$
DECLARE
    v_chain RECORD;
    v_creator_id UUID;
    v_participant JSONB;
    v_current_path UUID[];
    v_current_participants JSONB;
BEGIN
    -- Get chain data
    SELECT * INTO v_chain FROM chains WHERE id = p_chain_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Chain not found: %', p_chain_id;
    END IF;

    -- Find creator
    FOR v_participant IN SELECT * FROM jsonb_array_elements(v_chain.participants)
    LOOP
        IF v_participant->>'role' = 'creator' THEN
            v_creator_id := (v_participant->>'userid')::UUID;
            EXIT;
        END IF;
    END LOOP;

    -- Recursive function to build paths (will be implemented in application layer)
    -- For now, this is a placeholder that shows the structure

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chain_paths_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chain_paths_timestamp
    BEFORE UPDATE ON chain_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_chain_paths_updated_at();

-- View for active paths with decay info
CREATE OR REPLACE VIEW active_chain_paths_with_rewards AS
SELECT
    cp.id,
    cp.chain_id,
    cp.path_id,
    cp.creator_id,
    cp.leaf_userid,
    cp.subtree_root_id,
    cp.path_userids,
    cp.path_participants,
    cp.base_reward,
    cp.current_reward,
    cp.subtree_frozen_until,
    cp.last_child_added_at,
    cp.path_length,
    cp.is_complete,
    -- Calculate if subtree is currently frozen
    CASE
        WHEN cp.subtree_frozen_until IS NOT NULL AND cp.subtree_frozen_until > NOW()
        THEN TRUE
        ELSE FALSE
    END AS is_frozen,
    -- Calculate time remaining in freeze (in seconds)
    CASE
        WHEN cp.subtree_frozen_until IS NOT NULL AND cp.subtree_frozen_until > NOW()
        THEN EXTRACT(EPOCH FROM (cp.subtree_frozen_until - NOW()))
        ELSE 0
    END AS freeze_seconds_remaining,
    c.status AS chain_status,
    c.total_reward AS chain_total_reward
FROM chain_paths cp
JOIN chains c ON cp.chain_id = c.id
WHERE c.status = 'active'
ORDER BY cp.created_at DESC;

COMMENT ON TABLE chain_paths IS
'Stores all paths from creator (root) to leaf nodes in chain tree.
Each path represents a potential reward distribution route.
Paths are grouped by subtree_root_id (direct children of creator) for independent freeze mechanics.';

COMMENT ON COLUMN chain_paths.subtree_root_id IS
'The direct child of the creator that defines this subtree.
All nodes in a subtree share the same freeze status.';

COMMENT ON COLUMN chain_paths.path_userids IS
'Ordered array of user UUIDs from creator to leaf: [creator_id, child1_id, ..., leaf_id]';

COMMENT ON COLUMN chain_paths.path_participants IS
'Ordered JSONB array of full participant objects for reward calculation with decay/freeze data';

COMMENT ON VIEW active_chain_paths_with_rewards IS
'View showing active paths with calculated freeze status for reward distribution.';