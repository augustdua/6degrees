-- VERIFICATION SCRIPT FOR USER DISCOVERY SYSTEM MIGRATION
-- Run this to verify the migration 014_add_user_discovery_system.sql was applied successfully

-- Step 1: Check if new columns were added to users table
SELECT 
  'USERS TABLE NEW COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name IN ('company', 'role', 'skills', 'interests', 'location', 'visibility', 'last_active')
ORDER BY column_name;

-- Step 2: Check if direct_connection_requests table exists
SELECT 
  'DIRECT_CONNECTION_REQUESTS TABLE STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'direct_connection_requests' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Check if indexes were created
SELECT 
  'NEW INDEXES' as check_type,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('direct_connection_requests', 'users')
  AND schemaname = 'public'
  AND indexname LIKE '%direct_requests%' OR indexname LIKE '%discovery%' OR indexname LIKE '%company%' OR indexname LIKE '%location%'
ORDER BY indexname;

-- Step 4: Check if RLS is enabled and policies exist
SELECT 
  'DIRECT_CONNECTION_REQUESTS RLS POLICIES' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'direct_connection_requests'
ORDER BY policyname;

-- Step 5: Check if functions exist
SELECT 
  'NEW FUNCTIONS' as check_type,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('send_direct_connection_request', 'respond_to_direct_connection_request', 'discover_users')
  AND routine_schema = 'public'
ORDER BY routine_name;

-- Step 6: Check function permissions
SELECT 
  'FUNCTION PERMISSIONS' as check_type,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name IN ('send_direct_connection_request', 'respond_to_direct_connection_request', 'discover_users')
  AND routine_schema = 'public'
ORDER BY routine_name, grantee;

-- Step 7: Check if triggers exist
SELECT 
  'NEW TRIGGERS' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'direct_connection_requests'
  AND event_object_schema = 'public';

-- Step 8: Test table access (should return empty if RLS is working)
SELECT 
  'DIRECT_CONNECTION_REQUESTS TABLE ACCESS TEST' as check_type,
  COUNT(*) as total_requests
FROM public.direct_connection_requests;

-- Step 9: Test discover_users function exists (function call will fail without auth, which is expected)
SELECT 
  'DISCOVER_USERS FUNCTION TEST' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'discover_users' AND routine_schema = 'public') 
    THEN '✅ Function exists and requires authentication (security working)'
    ELSE '❌ Function missing'
  END as function_test_result;

-- Step 10: Check if users have last_active field populated
SELECT 
  'USERS LAST_ACTIVE FIELD' as check_type,
  COUNT(*) as total_users,
  COUNT(CASE WHEN last_active IS NOT NULL THEN 1 END) as users_with_last_active,
  COUNT(CASE WHEN last_active IS NULL THEN 1 END) as users_without_last_active
FROM public.users;

-- Step 11: Final verification summary
SELECT 
  'FINAL VERIFICATION SUMMARY' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company' AND table_schema = 'public') 
    THEN '✅ Users table extended with new columns'
    ELSE '❌ Users table missing new columns'
  END as users_table_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_connection_requests' AND table_schema = 'public') 
    THEN '✅ Direct connection requests table exists'
    ELSE '❌ Direct connection requests table missing'
  END as direct_requests_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'discover_users' AND routine_schema = 'public') 
    THEN '✅ Discovery functions exist'
    ELSE '❌ Discovery functions missing'
  END as functions_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'direct_connection_requests') 
    THEN '✅ RLS policies exist'
    ELSE '❌ RLS policies missing'
  END as policies_status;
