-- Migration 065: Modify existing offer_bids table for simple bidding flow
-- This aligns the existing complex table with our simpler bidding needs

-- 1. Rename columns to match our simpler schema
ALTER TABLE offer_bids RENAME COLUMN buyer_id TO bidder_id;
ALTER TABLE offer_bids RENAME COLUMN offer_creator_id TO creator_id;
ALTER TABLE offer_bids RENAME COLUMN currency TO bid_currency;

-- 2. Add missing columns we need
ALTER TABLE offer_bids ADD COLUMN IF NOT EXISTS bid_message TEXT;
ALTER TABLE offer_bids ADD COLUMN IF NOT EXISTS intro_call_id UUID REFERENCES intro_calls(id) ON DELETE SET NULL;

-- 3. Drop the old foreign key constraints and recreate with new column names
ALTER TABLE offer_bids DROP CONSTRAINT IF EXISTS listing_bids_buyer_id_fkey;
ALTER TABLE offer_bids DROP CONSTRAINT IF EXISTS offer_bids_offer_creator_id_fkey;

-- Recreate foreign keys with new column names
ALTER TABLE offer_bids ADD CONSTRAINT offer_bids_bidder_id_fkey 
  FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE offer_bids ADD CONSTRAINT offer_bids_creator_id_fkey 
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. Update indexes to use new column names
DROP INDEX IF EXISTS idx_offer_bids_buyer;
DROP INDEX IF EXISTS idx_offer_bids_creator;

CREATE INDEX IF NOT EXISTS idx_offer_bids_bidder_id ON offer_bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_offer_bids_creator_id ON offer_bids(creator_id);

-- 5. Update check constraint for bid_currency (allow USD too)
ALTER TABLE offer_bids DROP CONSTRAINT IF EXISTS offer_bids_currency_check;
ALTER TABLE offer_bids ADD CONSTRAINT offer_bids_bid_currency_check 
  CHECK (bid_currency IN ('INR', 'EUR', 'USD'));

-- 6. Update status check constraint to include our simpler statuses
ALTER TABLE offer_bids DROP CONSTRAINT IF EXISTS listing_bids_status_check;
ALTER TABLE offer_bids ADD CONSTRAINT offer_bids_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 
                    -- Keep old statuses for backward compatibility
                    'accepted', 'payment_pending', 'scheduled', 'in_progress', 
                    'completed', 'verified_success', 'verified_failure', 'disputed', 'expired'));

-- 7. Drop and recreate RLS policies with new column names
DROP POLICY IF EXISTS "Buyers can view their own bids" ON offer_bids;
DROP POLICY IF EXISTS "Buyers can create bids" ON offer_bids;
DROP POLICY IF EXISTS "Offer creators can view bids on their offers" ON offer_bids;
DROP POLICY IF EXISTS "Offer creators can update bids on their offers" ON offer_bids;

-- Bidders can view their own bids
CREATE POLICY "Bidders can view their own bids"
  ON offer_bids FOR SELECT
  USING (auth.uid() = bidder_id);

-- Authenticated users can create bids
CREATE POLICY "Authenticated users can create bids"
  ON offer_bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

-- Offer creators can view all bids on their offers
CREATE POLICY "Offer creators can view all bids on their offers"
  ON offer_bids FOR SELECT
  USING (auth.uid() = creator_id);

-- Offer creators can update bid status (approve/reject)
CREATE POLICY "Offer creators can update bid status"
  ON offer_bids FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- 8. Add trigger for updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_offer_bids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offer_bids_updated_at_trigger ON offer_bids;
CREATE TRIGGER offer_bids_updated_at_trigger
    BEFORE UPDATE ON offer_bids
    FOR EACH ROW
    EXECUTE FUNCTION update_offer_bids_updated_at();

-- 9. Add comment to table
COMMENT ON TABLE offer_bids IS 'Bids placed on marketplace offers. Bidders can offer alternative prices for intro calls.';
COMMENT ON COLUMN offer_bids.bidder_id IS 'User who placed the bid';
COMMENT ON COLUMN offer_bids.creator_id IS 'Creator of the offer (receives the bid)';
COMMENT ON COLUMN offer_bids.bid_currency IS 'Currency of the bid (INR, EUR, or USD)';
COMMENT ON COLUMN offer_bids.bid_message IS 'Optional message from bidder explaining their bid';
COMMENT ON COLUMN offer_bids.intro_call_id IS 'Link to intro_call if bid is approved';

