-- Migration: Remove reward decay logic from database
-- Description: Drop decay-related views/columns/indexes and clean up comments.
--              Preserve subtree and path data structures.

-- 1) Drop decay-related views if they exist
DROP VIEW IF EXISTS participant_rewards_with_decay CASCADE;
DROP VIEW IF EXISTS active_chain_paths_with_rewards CASCADE;
DROP VIEW IF EXISTS active_chains_with_decay CASCADE;

-- 2) Drop freeze/decay tracking columns from chain_paths if they exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chain_paths' AND column_name = 'subtree_frozen_until'
  ) THEN
    EXECUTE 'ALTER TABLE chain_paths DROP COLUMN subtree_frozen_until';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chain_paths' AND column_name = 'last_child_added_at'
  ) THEN
    EXECUTE 'ALTER TABLE chain_paths DROP COLUMN last_child_added_at';
  END IF;
END $$;

-- 3) Drop index related to freeze tracking if it exists
DROP INDEX IF EXISTS idx_chain_paths_frozen;

-- 4) Clean up comments that reference decay/freeze mechanics
COMMENT ON TABLE chain_paths IS
'Stores all paths from creator (root) to leaf nodes in chain tree.
Each path represents a potential reward distribution route.
Paths are grouped by subtree_root_id (direct children of creator) for analytics and grouping.';

COMMENT ON COLUMN chain_paths.subtree_root_id IS
'The direct child of the creator that defines this subtree.';

COMMENT ON COLUMN chain_paths.path_participants IS
'Ordered JSONB array of full participant objects for reward calculation.';

-- Replace participants column comment to remove decay/freeze fields
COMMENT ON COLUMN chains.participants IS
'JSONB array of participants. Each participant object contains:
- userid: string
- email: string
- firstName: string
- lastName: string
- role: creator | forwarder | target | connector
- joinedAt: ISO timestamp
- rewardAmount: number
- shareableLink: string (optional)
- parentUserId: string (optional)';


