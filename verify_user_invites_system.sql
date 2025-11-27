-- =====================================================
-- VERIFICATION SCRIPT: Premium Invite Onboarding System
-- Run this after applying migration 085_create_user_invites_system.sql
-- =====================================================

-- 1. Verify user_invites table exists with correct columns
SELECT 
    '1. user_invites table' as check_name,
    CASE WHEN COUNT(*) = 8 THEN '✅ PASS' ELSE '❌ FAIL - Expected 8 columns' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_invites';

-- Show columns for manual verification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_invites'
ORDER BY ordinal_position;

-- 2. Verify users table has new columns
SELECT 
    '2. users.invites_remaining column' as check_name,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'invites_remaining';

SELECT 
    '3. users.invited_by_user_id column' as check_name,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'invited_by_user_id';

-- 3. Verify functions exist
SELECT 
    '4. generate_invite_code function' as check_name,
    CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_proc 
WHERE proname = 'generate_invite_code';

SELECT 
    '5. validate_invite_code function' as check_name,
    CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_proc 
WHERE proname = 'validate_invite_code';

SELECT 
    '6. complete_user_invite function' as check_name,
    CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_proc 
WHERE proname = 'complete_user_invite';

SELECT 
    '7. expire_old_user_invites function' as check_name,
    CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_proc 
WHERE proname = 'expire_old_user_invites';

-- 4. Verify RLS is enabled
SELECT 
    '8. RLS enabled on user_invites' as check_name,
    CASE WHEN relrowsecurity THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_class 
WHERE relname = 'user_invites';

-- 5. Verify RLS policies exist
SELECT 
    '9. RLS policies on user_invites' as check_name,
    CASE WHEN COUNT(*) >= 3 THEN '✅ PASS' ELSE '❌ FAIL - Expected at least 3 policies' END as status
FROM pg_policies 
WHERE tablename = 'user_invites';

-- Show policies for manual verification
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_invites';

-- 6. Verify indexes exist
SELECT 
    '10. Indexes on user_invites' as check_name,
    CASE WHEN COUNT(*) >= 5 THEN '✅ PASS' ELSE '❌ FAIL - Expected at least 5 indexes' END as status
FROM pg_indexes 
WHERE tablename = 'user_invites';

-- 7. Test generate_invite_code function
SELECT 
    '11. generate_invite_code() works' as check_name,
    CASE 
        WHEN LENGTH(generate_invite_code()) = 4 THEN '✅ PASS - Generated: ' || generate_invite_code()
        ELSE '❌ FAIL' 
    END as status;

-- 8. Verify trigger exists
SELECT 
    '12. updated_at trigger on user_invites' as check_name,
    CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_trigger 
WHERE tgname = 'update_user_invites_updated_at';

-- 9. Check default value for invites_remaining
SELECT 
    '13. Default invites_remaining = 6' as check_name,
    CASE WHEN column_default = '6' THEN '✅ PASS' ELSE '❌ FAIL - Default is: ' || COALESCE(column_default, 'NULL') END as status
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'invites_remaining';

-- 10. Verify status check constraint
SELECT 
    '14. Status check constraint' as check_name,
    CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public' 
AND constraint_name LIKE '%user_invites%status%';

-- =====================================================
-- FUNCTIONAL TEST: Create and validate a test invite
-- =====================================================

-- Note: This requires a valid user ID to test fully
-- Uncomment and replace with a real user ID to test

/*
-- Get a test user ID
SELECT id, email, first_name, invites_remaining 
FROM users 
LIMIT 1;

-- Test creating an invite (replace USER_ID with actual ID)
-- INSERT INTO user_invites (inviter_id, invitee_email, code, status)
-- VALUES ('USER_ID', 'test@example.com', generate_invite_code(), 'pending')
-- RETURNING *;

-- Test validating the code
-- SELECT * FROM validate_invite_code('YOUR_CODE');

-- Clean up test data
-- DELETE FROM user_invites WHERE invitee_email = 'test@example.com';
*/

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT '========================================' as "";
SELECT 'VERIFICATION COMPLETE' as summary;
SELECT 'Check all items above show ✅ PASS' as note;
SELECT '========================================' as "";

