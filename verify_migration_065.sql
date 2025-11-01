-- Verification SQL for Migration 065: Modified offer_bids table

-- 1. Check if renamed columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'offer_bids'
    AND column_name IN ('bidder_id', 'creator_id', 'bid_currency', 'bid_message', 'intro_call_id')
ORDER BY 
    column_name;

-- Expected: All 5 columns should exist

-- 2. Check old columns are gone
SELECT 
    column_name
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'offer_bids'
    AND column_name IN ('buyer_id', 'offer_creator_id', 'currency')
ORDER BY 
    column_name;

-- Expected: 0 rows (old columns should be renamed)

-- 3. Check foreign key constraints use new column names
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'offer_bids'
    AND kcu.column_name IN ('bidder_id', 'creator_id', 'intro_call_id')
ORDER BY
    kcu.column_name;

-- Expected: Foreign keys for bidder_id, creator_id, and intro_call_id

-- 4. Check constraint for bid_currency
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM
    pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
WHERE
    rel.relname = 'offer_bids'
    AND con.conname LIKE '%bid_currency%';

-- Expected: CHECK constraint with IN ('INR', 'EUR', 'USD')

-- 5. Check indexes use new column names
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'offer_bids'
    AND (indexname LIKE '%bidder%' OR indexname LIKE '%creator%')
ORDER BY
    indexname;

-- Expected: idx_offer_bids_bidder_id and idx_offer_bids_creator_id

-- 6. Check RLS policies use new column names
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename = 'offer_bids'
ORDER BY
    policyname;

-- Expected: Policies mention bidder_id and creator_id (not buyer_id/offer_creator_id)

-- 7. Test a SELECT query with new column names
SELECT
    id,
    offer_id,
    bidder_id,
    creator_id,
    bid_amount_inr,
    bid_amount_eur,
    bid_currency,
    bid_message,
    status,
    intro_call_id,
    created_at
FROM
    offer_bids
LIMIT 1;

-- Should run without errors

-- 8. Summary checklist
SELECT
    'bidder_id column exists' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'bidder_id'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END AS status
UNION ALL
SELECT
    'creator_id column exists' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'creator_id'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END AS status
UNION ALL
SELECT
    'bid_currency column exists' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'bid_currency'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END AS status
UNION ALL
SELECT
    'bid_message column exists' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'bid_message'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END AS status
UNION ALL
SELECT
    'intro_call_id column exists' AS check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'intro_call_id'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END AS status
UNION ALL
SELECT
    'buyer_id column removed' AS check_item,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'buyer_id'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END AS status
UNION ALL
SELECT
    'offer_creator_id column removed' AS check_item,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'offer_creator_id'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END AS status
UNION ALL
SELECT
    'currency column removed' AS check_item,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'offer_bids' AND column_name = 'currency'
    ) THEN '✓ PASS' ELSE '✗ FAIL' END AS status;

