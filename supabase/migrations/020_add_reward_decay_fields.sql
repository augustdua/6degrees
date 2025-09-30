-- Migration: Add reward decay and freeze fields to chains table
-- Description: Adds fields to track reward decay mechanics and freeze timers

-- Note: The chains table stores participants as JSONB array
-- We don't need to alter the table structure since participants is already JSONB
-- The new fields (baseReward, lastChildAddedAt, freezeUntil) will be added to the JSONB objects

-- Add a comment to document the new JSONB fields in participants array
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
- parentUserId: string (optional)
- baseReward: number (optional) - Original reward before decay
- lastChildAddedAt: ISO timestamp (optional) - When last child was added
- freezeUntil: ISO timestamp (optional) - Timestamp until which decay is frozen';

-- Create an index on the updated_at field for efficient decay calculations
CREATE INDEX IF NOT EXISTS idx_chains_updated_at ON chains(updated_at);

-- Create an index on status for filtering active chains
CREATE INDEX IF NOT EXISTS idx_chains_status ON chains(status) WHERE status = 'active';

-- Add a helpful view to see chains that need decay updates
CREATE OR REPLACE VIEW active_chains_with_decay AS
SELECT
    c.id,
    c.request_id,
    c.status,
    c.total_reward,
    c.created_at,
    c.updated_at,
    jsonb_array_length(c.participants) as participant_count,
    c.participants
FROM chains c
WHERE c.status = 'active'
ORDER BY c.updated_at DESC;

COMMENT ON VIEW active_chains_with_decay IS
'View of active chains for decay calculation. Frontend/backend should calculate decay in real-time based on participant joinedAt timestamps and freezeUntil fields.';