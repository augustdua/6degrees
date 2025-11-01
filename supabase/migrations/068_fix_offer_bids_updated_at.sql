-- Migration 068: Fix offer_bids updated_at trigger issue
-- Error: record "new" has no field "updated_at"
-- The trigger from migration 065 expects updated_at column which might not exist

-- Option 1: Check if updated_at column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'offer_bids' 
    AND column_name = 'updated_at'
  ) THEN
    -- Add updated_at column if it doesn't exist
    ALTER TABLE offer_bids ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Update existing rows to have created_at as updated_at
    UPDATE offer_bids SET updated_at = created_at WHERE updated_at IS NULL;
    
    RAISE NOTICE 'Added updated_at column to offer_bids';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Recreate the trigger function (in case it was problematic)
CREATE OR REPLACE FUNCTION update_offer_bids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS offer_bids_updated_at_trigger ON offer_bids;
CREATE TRIGGER offer_bids_updated_at_trigger
    BEFORE UPDATE ON offer_bids
    FOR EACH ROW
    EXECUTE FUNCTION update_offer_bids_updated_at();

-- Verify
SELECT 
    'Migration 068 complete' as status,
    column_name,
    data_type
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'offer_bids'
    AND column_name = 'updated_at';

