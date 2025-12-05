-- Investigate User Issues
-- User ID: dddffff1-bfed-40a6-a99c-28dccb4c5014
-- 
-- NOTE: Based on backend logs, the real issue might be Supabase returning 500 errors
-- The logs showed "500 Internal Server Error" from Cloudflare starting at 08:48:44
-- This is a Supabase infrastructure issue, NOT a missing user issue
--
-- Run these queries to verify user exists:

-- 1. QUICK CHECK: Does the user exist in public.users?
SELECT 
  id,
  email,
  first_name,
  last_name,
  created_at,
  updated_at
FROM public.users 
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- 2. Check auth.users too
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- 3. If user exists, check if there are any RLS issues
-- This tests if the service role can read the user
SELECT 
  COUNT(*) as user_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ User exists' ELSE '❌ User NOT found' END as status
FROM public.users 
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- 4. Check database health - simple query timing
SELECT NOW() as current_time, 'Database responding' as status;

-- 5. Check if there are any locks or issues on the users table
SELECT 
  schemaname,
  relname as table_name,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'users';

-- 6. If user is truly missing, this will recreate from auth.users
-- UNCOMMENT ONLY IF QUERY #1 RETURNS NO RESULTS:
/*
INSERT INTO public.users (id, email, first_name, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'first_name', split_part(email, '@', 1)) as first_name,
  created_at,
  NOW()
FROM auth.users
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
ON CONFLICT (id) DO NOTHING;
*/

