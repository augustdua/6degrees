-- Check August Dua's visibility and profile settings
SELECT 
    id,
    first_name,
    last_name,
    email,
    visibility,
    is_profile_public,
    created_at
FROM users
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- Check what the discover_users function logic would see
-- The function filters for users where:
-- 1. visibility = 'public' (or NULL as default is 'public')
-- 2. user is not the current user
-- 3. optionally: not already connected

SELECT 
    'Users that should be discoverable (visibility public):' as info,
    COUNT(*) as count
FROM users
WHERE (visibility = 'public' OR visibility IS NULL);

-- List all discoverable users
SELECT 
    id,
    first_name,
    last_name,
    email,
    COALESCE(visibility, 'public (default)') as visibility_status,
    is_profile_public
FROM users
WHERE (visibility = 'public' OR visibility IS NULL)
ORDER BY created_at DESC;

