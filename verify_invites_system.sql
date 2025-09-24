-- VERIFICATION SCRIPT FOR INVITES SYSTEM
-- Run this to verify the invites table and system are working correctly

-- Step 1: Check if invites table exists and has correct structure
SELECT 
  'INVITES TABLE STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invites' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check if all indexes were created
SELECT 
  'INVITES INDEXES' as check_type,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'invites' 
  AND schemaname = 'public';

-- Step 3: Check if RLS is enabled and policies exist
SELECT 
  'INVITES RLS POLICIES' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'invites'
ORDER BY policyname;

-- Step 4: Check if triggers exist
SELECT 
  'INVITES TRIGGERS' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'invites'
  AND event_object_schema = 'public';

-- Step 5: Check if functions exist
SELECT 
  'INVITES FUNCTIONS' as check_type,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('expire_old_invites', 'create_invite_notification')
  AND routine_schema = 'public';

-- Step 6: Test table permissions (should return empty if RLS is working)
SELECT 
  'INVITES TABLE ACCESS TEST' as check_type,
  COUNT(*) as total_invites
FROM public.invites;

-- Step 7: Check if we can insert a test invite (this will fail if user is not authenticated, which is expected)
-- Uncomment the following lines to test insert permissions:
/*
INSERT INTO public.invites (
  request_id,
  inviter_id,
  invitee_email,
  invite_link,
  expires_at
) VALUES (
  (SELECT id FROM public.connection_requests LIMIT 1),
  (SELECT id FROM public.users LIMIT 1),
  'test@example.com',
  'https://example.com/test',
  NOW() + INTERVAL '7 days'
);
*/

-- Step 8: Check for any existing invites data
SELECT 
  'EXISTING INVITES DATA' as check_type,
  COUNT(*) as total_invites,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invites,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_invites,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_invites,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_invites
FROM public.invites;

-- Step 9: Test the expire function (should not error)
SELECT expire_old_invites() as expire_function_test;

-- Step 10: Final verification summary
SELECT 
  'FINAL VERIFICATION SUMMARY' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invites' AND table_schema = 'public') 
    THEN '✅ Invites table exists'
    ELSE '❌ Invites table missing'
  END as table_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invites') 
    THEN '✅ RLS policies exist'
    ELSE '❌ RLS policies missing'
  END as policies_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'expire_old_invites' AND routine_schema = 'public') 
    THEN '✅ Helper functions exist'
    ELSE '❌ Helper functions missing'
  END as functions_status;
