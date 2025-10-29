-- Migration: Add Multi-Currency Support (EUR + INR)
-- Adds currency columns to offers, offer_bids, and users tables

-- ============================================================================
-- PART 1: Add currency support to offers table
-- ============================================================================

-- Add currency column to offers
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR' CHECK (currency IN ('INR', 'EUR'));

-- Add EUR price column
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS asking_price_eur NUMERIC(10,2) CHECK (asking_price_eur >= 10);

-- Backfill currency for existing offers
UPDATE offers
SET currency = 'INR'
WHERE currency IS NULL;

-- Backfill EUR prices by converting existing INR prices (EUR = INR ÷ 83)
UPDATE offers
SET asking_price_eur = ROUND(asking_price_inr / 83.0, 2)
WHERE asking_price_eur IS NULL;

-- Create index for currency queries
CREATE INDEX IF NOT EXISTS idx_offers_currency ON offers(currency);

-- ============================================================================
-- PART 2: Add currency preference to users table
-- ============================================================================

-- Add preferred currency column to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'INR' CHECK (preferred_currency IN ('INR', 'EUR'));

-- Set all existing users to INR as default
UPDATE users
SET preferred_currency = 'INR'
WHERE preferred_currency IS NULL;

-- ============================================================================
-- PART 3: Add currency support to offer_bids table
-- ============================================================================

-- Add EUR amount column
ALTER TABLE offer_bids
ADD COLUMN IF NOT EXISTS bid_amount_eur NUMERIC(10,2);

-- Add currency column
ALTER TABLE offer_bids
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR' CHECK (currency IN ('INR', 'EUR'));

-- Backfill existing bids with INR currency
UPDATE offer_bids
SET currency = 'INR'
WHERE currency IS NULL;

-- Backfill EUR amounts for existing bids (assuming they were in INR)
UPDATE offer_bids
SET bid_amount_eur = ROUND(bid_amount_inr / 83.0, 2)
WHERE bid_amount_eur IS NULL AND bid_amount_inr IS NOT NULL;

-- ============================================================================
-- PART 4: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN offers.currency IS 'Native currency of the offer (INR or EUR). Indicates which price is the source of truth.';
COMMENT ON COLUMN offers.asking_price_eur IS 'Asking price in EUR. Auto-converted if offer is created in INR.';
COMMENT ON COLUMN users.preferred_currency IS 'User''s preferred display currency. Auto-detected on signup based on browser locale.';
COMMENT ON COLUMN offer_bids.currency IS 'Currency in which the bid was placed.';
COMMENT ON COLUMN offer_bids.bid_amount_eur IS 'Bid amount in EUR.';

-- ============================================================================
-- Verification queries (commented out - uncomment to test)
-- ============================================================================

-- Verify offers have currency and EUR prices:
-- SELECT id, title, currency, asking_price_inr, asking_price_eur 
-- FROM offers LIMIT 10;

-- Verify users have preferred currency:
-- SELECT id, email, preferred_currency 
-- FROM users LIMIT 10;

-- Verify bids have currency:
-- SELECT id, currency, bid_amount_inr, bid_amount_eur 
-- FROM offer_bids LIMIT 10;

