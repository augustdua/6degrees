-- Check Row Level Security policies on chains table
-- This might be blocking chain creation

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'chains';

-- 2. Check all policies on chains table
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

-- 3. Try to check what user context Supabase is using
SELECT 
  current_user,
  session_user,
  current_role;

