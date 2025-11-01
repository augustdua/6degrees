-- Diagnostic SQL for Bid Approval Issue
-- Bid ID: 0aa7b954-94a7-4acf-a5ec-67aefbcfc8e9
-- Error: "Failed to create intro call"

-- 1. Check the bid details
SELECT 
    ob.*,
    o.title as offer_title,
    o.connection_user_id,
    o.offer_creator_id as offer_creator
FROM 
    offer_bids ob
    JOIN offers o ON ob.offer_id = o.id
WHERE 
    ob.id = '0aa7b954-94a7-4acf-a5ec-67aefbcfc8e9';

-- Check: Does the offer have a connection_user_id (target person)?

-- 2. Check intro_calls table structure
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

-- Check if all required columns exist: offer_id, bid_id, buyer_id, creator_id, target_id, status

-- 3. Check if there's a foreign key constraint issue
SELECT
    tc.constraint_name,
    tc.constraint_type,
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
    tc.table_name = 'intro_calls'
    AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Check RLS policies on intro_calls (might be blocking insert)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    with_check
FROM
    pg_policies
WHERE
    schemaname = 'public'
    AND tablename = 'intro_calls'
    AND cmd = 'INSERT'
ORDER BY
    policyname;

-- 5. Try to manually insert a test intro_call (to see what error we get)
-- DO NOT RUN THIS - JUST FOR REFERENCE
/*
INSERT INTO intro_calls (
    offer_id,
    bid_id,
    buyer_id,
    creator_id,
    target_id,
    status
) VALUES (
    'b1c7a849-b848-47de-89e9-92b75bd95660',
    '0aa7b954-94a7-4acf-a5ec-67aefbcfc8e9',
    '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4',
    'dddffff1-bfed-40a6-a99c-28dccb4c5014',
    'TARGET_USER_ID_FROM_OFFER',
    'pending'
);
*/

