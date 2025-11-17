-- Check August Dua's profile picture status

-- 1. Check your user record
SELECT 
    'Your profile details' as check_name,
    id,
    first_name,
    last_name,
    email,
    profile_picture_url,
    CASE 
        WHEN profile_picture_url IS NOT NULL AND profile_picture_url != '' 
        THEN '✅ Has profile picture URL'
        ELSE '❌ No profile picture URL'
    END as status
FROM users
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- 2. Check if the column exists and has data
SELECT 
    'Profile picture statistics' as check_name,
    COUNT(*) as total_users,
    COUNT(profile_picture_url) as users_with_url,
    COUNT(*) FILTER (WHERE profile_picture_url IS NOT NULL AND profile_picture_url != '') as users_with_valid_url
FROM users;

-- 3. Sample of users with profile pictures (if any)
SELECT 
    'Users with profile pictures' as check_name,
    id,
    first_name,
    last_name,
    profile_picture_url
FROM users
WHERE profile_picture_url IS NOT NULL 
    AND profile_picture_url != ''
LIMIT 5;

-- 4. Check profile-pictures bucket for your uploads
SELECT 
    'Storage bucket check' as check_name,
    name,
    created_at,
    updated_at,
    owner
FROM storage.objects
WHERE bucket_id = 'profile-pictures'
    AND owner = 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
ORDER BY created_at DESC
LIMIT 5;

SELECT '✅ Diagnostic complete' as status;

