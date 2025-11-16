-- Check if visibility column exists and what values users have
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'visibility';

-- Check your visibility setting
SELECT 
    id,
    first_name,
    last_name,
    email,
    visibility,
    created_at
FROM users
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- Check how many users have each visibility setting
SELECT 
    COALESCE(visibility, 'NULL') as visibility_value,
    COUNT(*) as user_count
FROM users
GROUP BY visibility
ORDER BY user_count DESC;

-- Check all users to see who should be discoverable
SELECT 
    id,
    first_name,
    last_name,
    email,
    visibility,
    is_profile_public
FROM users
ORDER BY created_at DESC
LIMIT 10;

