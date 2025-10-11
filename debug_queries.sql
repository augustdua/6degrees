-- ===========================================
-- DIAGNOSTIC SQL QUERIES FOR CHAIN CREATION
-- ===========================================
-- Run these in Supabase SQL Editor

-- 1. Check the most recent request you created
SELECT 
  id,
  creator_id,
  target,
  reward,
  status,
  credit_cost,
  target_cash_reward,
  created_at
FROM connection_requests
WHERE creator_id = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4'
ORDER BY created_at DESC
LIMIT 3;

-- 2. Check if chains exist for those requests
SELECT 
  c.id as chain_id,
  c.request_id,
  c.total_reward,
  c.status as chain_status,
  c.participants,
  c.created_at,
  r.target,
  r.reward as request_reward,
  r.credit_cost,
  r.target_cash_reward
FROM chains c
JOIN connection_requests r ON c.request_id = r.id
WHERE r.creator_id = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4'
ORDER BY c.created_at DESC
LIMIT 3;

-- 3. Check all constraints on chains table
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.chains'::regclass;

-- 4. Check the most recent requests WITHOUT chains (orphaned requests)
SELECT 
  r.id,
  r.target,
  r.reward,
  r.credit_cost,
  r.target_cash_reward,
  r.created_at,
  (SELECT COUNT(*) FROM chains WHERE request_id = r.id) as chain_count
FROM connection_requests r
WHERE r.creator_id = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4'
  AND r.status != 'deleted'
  AND r.deleted_at IS NULL
ORDER BY r.created_at DESC
LIMIT 5;

-- 5. Try to manually create a chain for the latest request (TEST QUERY)
-- First, get the latest request ID:
-- UNCOMMENT AND RUN THIS AFTER YOU SEE THE RESULTS OF QUERY #1
/*
INSERT INTO chains (
  request_id,
  participants,
  total_reward,
  status
)
VALUES (
  'YOUR_REQUEST_ID_HERE',  -- Replace with actual request ID from query #1
  '[{
    "userid": "4e9c9044-72e9-410c-abcb-a1ee8eb96ff4",
    "email": "august@grapherly.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "creator",
    "joinedAt": "2025-10-11T16:20:00.000Z",
    "rewardAmount": 0,
    "shareableLink": "https://share.6degree.app/r/test-link",
    "parentUserId": null
  }]'::jsonb,
  100,  -- This should be target_cash_reward
  'active'
)
RETURNING *;
*/

