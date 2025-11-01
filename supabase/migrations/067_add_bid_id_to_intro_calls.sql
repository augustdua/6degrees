-- Migration 067: Add bid_id column to intro_calls table
-- Links intro calls to offer bids for the bidding system

-- Add bid_id column (optional, since not all intro calls come from bids)
ALTER TABLE intro_calls 
  ADD COLUMN IF NOT EXISTS bid_id UUID REFERENCES offer_bids(id) ON DELETE SET NULL;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_intro_calls_bid_id ON intro_calls(bid_id);

-- Comment
COMMENT ON COLUMN intro_calls.bid_id IS 'Reference to the offer bid if this intro call was created from a bid approval';

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'intro_calls'
    AND column_name = 'bid_id';

