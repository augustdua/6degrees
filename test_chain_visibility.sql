-- Test chain visibility for participants
-- Run these queries to verify users can see chains they participate in

-- 1. Check current user chains (replace with actual user ID)
-- Replace '6ee02749-b2a1-4151-a7dc-9aff1ed982db' with the user ID you want to test
SELECT 
  c.id,
  c.request_id,
  c.participants,
  c.status,
  c.total_reward,
  c.created_at,
  cr.target,
  cr.message
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id
WHERE c.participants @> '[{"userid": "6ee02749-b2a1-4151-a7dc-9aff1ed982db"}]'::jsonb
ORDER BY c.created_at DESC;

-- 2. Check all chains and their participants
SELECT 
  c.id,
  c.request_id,
  jsonb_array_length(c.participants) as participant_count,
  c.participants,
  cr.target,
  cr.creator_id
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id
ORDER BY c.created_at DESC;

-- 3. Test RLS policies by checking what a specific user can see
-- This simulates what the frontend query would return
-- Replace '6ee02749-b2a1-4151-a7dc-9aff1ed982db' with the user ID you want to test
SET LOCAL "request.jwt.claims" TO '{"sub": "6ee02749-b2a1-4151-a7dc-9aff1ed982db"}';

SELECT 
  c.id,
  c.request_id,
  c.participants,
  c.status,
  c.total_reward,
  c.created_at
FROM chains c
ORDER BY c.created_at DESC;

-- 4. Reset the JWT claims
RESET "request.jwt.claims";

-- 5. Check if there are any chains where the user should be a participant but isn't showing up
-- This helps identify data issues
SELECT 
  c.id,
  c.request_id,
  c.participants,
  CASE 
    WHEN c.participants @> '[{"userid": "6ee02749-b2a1-4151-a7dc-9aff1ed982db"}]'::jsonb 
    THEN 'SHOULD BE VISIBLE'
    ELSE 'NOT VISIBLE'
  END as visibility_status
FROM chains c
ORDER BY c.created_at DESC;
