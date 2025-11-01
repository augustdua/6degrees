-- Diagnostic SQL for Bid Message Issue
-- Bid ID: 7a245e6d-1890-4bb1-a731-d4a48ad3511d
-- Offer ID: c8dc2fe9-5b52-4f1b-bf52-9930ae58f3bb
-- Bidder ID: 4e9c9044-72e9-410c-abcb-a1ee8eb96ff4
-- Creator ID: dddffff1-bfed-40a6-a99c-28dccb4c5014

-- 1. Check if the bid exists in offer_bids table
SELECT 
    id,
    offer_id,
    bidder_id,
    creator_id,
    bid_amount_inr,
    bid_currency,
    bid_message,
    status,
    created_at
FROM 
    offer_bids
WHERE 
    id = '7a245e6d-1890-4bb1-a731-d4a48ad3511d';

-- Expected: 1 row showing the bid

-- 2. Check if any message exists with this bid_id in metadata
SELECT 
    id,
    sender_id,
    receiver_id,
    content,
    message_type,
    metadata,
    created_at
FROM 
    messages
WHERE 
    metadata->>'bid_id' = '7a245e6d-1890-4bb1-a731-d4a48ad3511d';

-- Expected: 1 row (the bid request message). If 0 rows, message was not created.

-- 3. Check all messages between bidder and creator
SELECT 
    id,
    sender_id,
    receiver_id,
    content,
    message_type,
    metadata,
    created_at
FROM 
    messages
WHERE 
    (sender_id = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4' AND receiver_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014')
    OR
    (sender_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' AND receiver_id = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4')
ORDER BY 
    created_at DESC
LIMIT 10;

-- Check if any messages exist between these two users

-- 4. Check message_type constraint to see if 'offer_bid_request' is allowed
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM
    pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
WHERE
    rel.relname = 'messages'
    AND con.conname LIKE '%message_type%'
    AND con.contype = 'c';

-- Check if 'offer_bid_request' is in the allowed values

-- 5. Check all allowed message types (from constraint definition)
-- Manual check: Does the constraint include 'offer_bid_request', 'offer_bid_approved', 'offer_bid_rejected'?

-- 6. Try to manually insert a test message (to see if constraint blocks it)
-- DO NOT RUN THIS IN PRODUCTION - JUST FOR TESTING
/*
INSERT INTO messages (
    sender_id,
    receiver_id,
    content,
    message_type,
    metadata
) VALUES (
    '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4',
    'dddffff1-bfed-40a6-a99c-28dccb4c5014',
    'Test bid message',
    'offer_bid_request',
    jsonb_build_object('bid_id', '7a245e6d-1890-4bb1-a731-d4a48ad3511d')
);
*/

-- 7. Check the offer details
SELECT 
    id,
    title,
    offer_creator_id,
    connection_user_id,
    status,
    asking_price_inr
FROM 
    offers
WHERE 
    id = 'c8dc2fe9-5b52-4f1b-bf52-9930ae58f3bb';

-- 8. Check backend logs - but this is SQL, so we'll check if there are any RLS policies blocking inserts
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
    AND tablename = 'messages'
    AND cmd = 'INSERT'
ORDER BY
    policyname;

-- Check if RLS policies might be blocking the message insert

-- 9. Check if the user accounts exist and have correct IDs
SELECT 
    id,
    email,
    first_name,
    last_name
FROM 
    users
WHERE 
    id IN ('4e9c9044-72e9-410c-abcb-a1ee8eb96ff4', 'dddffff1-bfed-40a6-a99c-28dccb4c5014');

-- Expected: 2 rows (bidder and creator)

-- 10. Summary: Common issues
/*
POSSIBLE CAUSES:
1. Message type constraint doesn't include 'offer_bid_request'
   - Fix: Add message type to constraint (migration)

2. RLS policy blocking insert
   - Fix: Check RLS policies for messages table

3. Backend error not caught (check Railway logs)
   - The message insert failed silently

4. Metadata structure issue
   - Check if metadata is properly formatted as JSONB
*/

