-- Test People Discovery Issue (SQL Editor - No Auth Required)
-- This simulates what discover_users does without requiring authentication

-- Replace this with your actual user ID
DO $$
DECLARE
    v_test_user_id UUID := 'dddffff1-bfed-40a6-a99c-28dccb4c5014'; -- August's user ID
BEGIN
    RAISE NOTICE 'Testing as user: %', v_test_user_id;
END $$;

-- 1. Count total discoverable users (excluding the test user)
SELECT 
    'Test 1: Total discoverable users' as test_name,
    COUNT(*) as user_count
FROM users u
WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
    AND (u.visibility = 'public' OR u.visibility IS NULL);

-- 2. Count users that are NOT connections (what the old page was showing)
SELECT 
    'Test 2: Users that are NOT connections' as test_name,
    COUNT(*) as user_count
FROM users u
WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
    AND (u.visibility = 'public' OR u.visibility IS NULL)
    AND NOT EXISTS(
        SELECT 1 FROM user_connections uc
        WHERE ((uc.user1_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' AND uc.user2_id = u.id) OR
               (uc.user1_id = u.id AND uc.user2_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014'))
        AND uc.status = 'connected'
    );

-- 3. Count users that ARE connections (these were being hidden)
SELECT 
    'Test 3: Users that ARE connections (were being hidden)' as test_name,
    COUNT(*) as user_count
FROM users u
WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
    AND (u.visibility = 'public' OR u.visibility IS NULL)
    AND EXISTS(
        SELECT 1 FROM user_connections uc
        WHERE ((uc.user1_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' AND uc.user2_id = u.id) OR
               (uc.user1_id = u.id AND uc.user2_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014'))
        AND uc.status = 'connected'
    );

-- 4. Sample of users with their connection status
SELECT 
    'Test 4: Sample users with connection status' as test_name,
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.company,
    u.visibility,
    CASE 
        WHEN EXISTS(
            SELECT 1 FROM user_connections uc
            WHERE ((uc.user1_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' AND uc.user2_id = u.id) OR
                   (uc.user1_id = u.id AND uc.user2_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014'))
            AND uc.status = 'connected'
        ) THEN '✓ Connected'
        ELSE '✗ Not connected'
    END as connection_status,
    u.last_active
FROM users u
WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
    AND (u.visibility = 'public' OR u.visibility IS NULL)
ORDER BY u.last_active DESC NULLS LAST
LIMIT 10;

-- 5. Check avatar/profile picture data
SELECT 
    'Test 5: Profile picture availability' as test_name,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE profile_picture_url IS NOT NULL) as users_with_pictures,
    COUNT(*) FILTER (WHERE profile_picture_url IS NULL) as users_without_pictures
FROM users u
WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
    AND (u.visibility = 'public' OR u.visibility IS NULL);

-- 6. Test pagination (first 20 vs next 20)
SELECT 
    'Test 6a: First 20 users (what page 1 should show)' as test_name,
    u.id,
    u.first_name,
    u.last_name,
    CASE 
        WHEN EXISTS(
            SELECT 1 FROM user_connections uc
            WHERE ((uc.user1_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' AND uc.user2_id = u.id) OR
                   (uc.user1_id = u.id AND uc.user2_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014'))
            AND uc.status = 'connected'
        ) THEN true
        ELSE false
    END as is_connected
FROM users u
WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
    AND (u.visibility = 'public' OR u.visibility IS NULL)
ORDER BY u.last_active DESC NULLS LAST, u.created_at DESC
LIMIT 20;

SELECT 
    'Test 6b: Next 20 users (what page 2 should show)' as test_name,
    u.id,
    u.first_name,
    u.last_name,
    CASE 
        WHEN EXISTS(
            SELECT 1 FROM user_connections uc
            WHERE ((uc.user1_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' AND uc.user2_id = u.id) OR
                   (uc.user1_id = u.id AND uc.user2_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014'))
            AND uc.status = 'connected'
        ) THEN true
        ELSE false
    END as is_connected
FROM users u
WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
    AND (u.visibility = 'public' OR u.visibility IS NULL)
ORDER BY u.last_active DESC NULLS LAST, u.created_at DESC
LIMIT 20 OFFSET 20;

-- 7. Check for any users that might be duplicated
WITH numbered_users AS (
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY u.created_at) as row_num
    FROM users u
    WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
        AND (u.visibility = 'public' OR u.visibility IS NULL)
)
SELECT 
    'Test 7: Check for duplicate user IDs' as test_name,
    COUNT(*) FILTER (WHERE row_num > 1) as duplicate_count
FROM numbered_users;

SELECT '✅ All diagnostic tests completed' as status;
SELECT 'The frontend fixes ensure all users are shown (not just non-connections)' as fix_summary;

