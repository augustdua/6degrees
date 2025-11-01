-- Check intro_calls table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'intro_calls'
ORDER BY 
    ordinal_position;

-- Check if bid_id column exists
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'intro_calls'
    AND column_name = 'bid_id'
) AS bid_id_exists;

-- Check if buyer_id column exists (used in approveBid)
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'intro_calls'
    AND column_name = 'buyer_id'
) AS buyer_id_exists;

-- Check RLS policies for INSERT
SELECT
    policyname,
    cmd,
    with_check
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename = 'intro_calls'
    AND cmd = 'INSERT';

