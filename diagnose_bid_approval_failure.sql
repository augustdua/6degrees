-- Diagnostic SQL for Bid Approval Failure
-- Error: record "new" has no field "updated_at"
-- Issue: Intros being created even when bid update fails

-- 1. Check if updated_at column exists in offer_bids
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'offer_bids'
    AND column_name = 'updated_at';

-- Expected: Should return 1 row if column exists

-- 2. Check all columns in offer_bids
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'offer_bids'
ORDER BY 
    ordinal_position;

-- 3. Check triggers on offer_bids table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'offer_bids'
ORDER BY 
    trigger_name;

-- Expected: Should see offer_bids_updated_at_trigger if it exists

-- 4. Check the trigger function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'update_offer_bids_updated_at';

-- 5. Check recent intro_calls (to see if they're being created)
SELECT 
    id,
    offer_id,
    bid_id,
    buyer_id,
    creator_id,
    target_id,
    status,
    created_at
FROM 
    intro_calls
ORDER BY 
    created_at DESC
LIMIT 5;

-- 6. Check recent offer_bids to see their status
SELECT 
    id,
    offer_id,
    bidder_id,
    creator_id,
    bid_amount_inr,
    status,
    intro_call_id,
    created_at,
    accepted_at
FROM 
    offer_bids
ORDER BY 
    created_at DESC
LIMIT 5;

-- 7. Check if intro_calls were created for failed bids
-- (intro_calls exist but offer_bids status is still 'pending')
SELECT 
    ob.id as bid_id,
    ob.status as bid_status,
    ob.intro_call_id,
    ic.id as intro_call_id_actual,
    ic.status as intro_status,
    ic.created_at as intro_created_at
FROM 
    offer_bids ob
    LEFT JOIN intro_calls ic ON ob.intro_call_id = ic.id
WHERE 
    ob.status = 'pending'
    AND ic.id IS NOT NULL
ORDER BY 
    ob.created_at DESC
LIMIT 5;

-- Expected: Should show bids still pending but have intro_calls created

-- 8. SOLUTION: Drop the problematic trigger (if updated_at doesn't exist)
-- Run this ONLY if column doesn't exist:
/*
DROP TRIGGER IF EXISTS offer_bids_updated_at_trigger ON offer_bids;
DROP FUNCTION IF EXISTS update_offer_bids_updated_at();
*/

-- 9. If updated_at column doesn't exist, you can add it:
/*
ALTER TABLE offer_bids ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
*/

-- 10. Summary check
SELECT 
    'updated_at column exists' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'updated_at'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status
UNION ALL
SELECT 
    'Trigger exists' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'offer_bids' AND trigger_name = 'offer_bids_updated_at_trigger'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status
UNION ALL
SELECT 
    'Orphaned intro_calls (created but bid not updated)' AS check_item,
    CAST(COUNT(*) AS TEXT) AS status
FROM 
    offer_bids ob
    JOIN intro_calls ic ON ob.intro_call_id = ic.id
WHERE 
    ob.status = 'pending';

