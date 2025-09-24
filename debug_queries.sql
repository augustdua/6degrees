-- Debug queries to check database state
-- Run these in your Supabase SQL editor

-- 1. Check if chains table exists and has data
SELECT 
  id, 
  request_id, 
  participants, 
  status, 
  total_reward,
  created_at
FROM chains 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check connection_requests table
SELECT 
  id, 
  creator_id, 
  target, 
  message, 
  reward, 
  status,
  expires_at,
  shareable_link
FROM connection_requests 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check users table
SELECT 
  id, 
  first_name, 
  last_name, 
  email
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check RLS policies on chains table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'chains';

-- 5. Check RLS policies on connection_requests table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'connection_requests';

-- 6. Test a specific chain query (replace with actual IDs)
-- SELECT 
--   c.id,
--   c.request_id,
--   c.participants,
--   c.status,
--   cr.target,
--   cr.message,
--   u.first_name as creator_name
-- FROM chains c
-- LEFT JOIN connection_requests cr ON c.request_id = cr.id
-- LEFT JOIN users u ON cr.creator_id = u.id
-- WHERE c.id = 'your-chain-id-here';
