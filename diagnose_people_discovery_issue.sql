-- Comprehensive diagnostic for People page discovery issue
-- Issue: Only handful of profiles visible despite ~50 public users

-- 1. Count total users by visibility
SELECT 
    'Total users by visibility' as check_name,
    COALESCE(visibility, 'NULL (defaults to public)') as visibility_status,
    COUNT(*) as user_count
FROM users
GROUP BY visibility
ORDER BY user_count DESC;

-- 2. Check users that SHOULD be discoverable (public or NULL)
SELECT 
    'Users that should be discoverable' as check_name,
    COUNT(*) as count,
    string_agg(first_name || ' ' || last_name, ', ' ORDER BY created_at DESC) as user_names
FROM users
WHERE (visibility = 'public' OR visibility IS NULL);

-- 3. Sample of discoverable users with key fields
SELECT 
    'Sample discoverable users' as check_name,
    id,
    first_name,
    last_name,
    email,
    visibility,
    company,
    role,
    location,
    bio,
    created_at,
    last_active
FROM users
WHERE (visibility = 'public' OR visibility IS NULL)
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if users have required fields that might be filtering them
SELECT 
    'Users missing key profile fields' as check_name,
    COUNT(CASE WHEN first_name IS NULL OR first_name = '' THEN 1 END) as missing_first_name,
    COUNT(CASE WHEN last_name IS NULL OR last_name = '' THEN 1 END) as missing_last_name,
    COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as missing_email,
    COUNT(*) as total_public_users
FROM users
WHERE (visibility = 'public' OR visibility IS NULL);

-- 5. Test discover_users function with August's perspective
-- (This would need to be run in an authenticated context)
-- For now, let's check what the WHERE clause would filter

-- Simulate the discover_users WHERE clause logic
SELECT 
    'Users that pass discover_users filters' as check_name,
    COUNT(*) as count
FROM users u
WHERE u.id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'  -- Exclude August
    AND (u.visibility = 'public' OR u.visibility IS NULL);  -- Must be public

-- 6. Check for users with NULL or empty names
SELECT 
    'Users with incomplete profiles' as check_name,
    id,
    first_name,
    last_name,
    email,
    visibility,
    created_at
FROM users
WHERE (visibility = 'public' OR visibility IS NULL)
    AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '')
ORDER BY created_at DESC;

-- 7. Check if there are any users with last_active = NULL that might be filtered
SELECT 
    'Users with NULL last_active' as check_name,
    COUNT(*) as count,
    COUNT(CASE WHEN visibility = 'public' OR visibility IS NULL THEN 1 END) as public_with_null_last_active
FROM users
WHERE last_active IS NULL;

-- 8. Verify August's user record isn't causing issues
SELECT 
    'August Dua profile check' as check_name,
    id,
    first_name,
    last_name,
    email,
    visibility,
    company,
    role,
    bio,
    last_active,
    created_at
FROM users
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

