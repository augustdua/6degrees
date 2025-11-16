-- Test if August's profile is discoverable by another user
-- Run this as another user (e.g., Praveen Kumar)

-- First, check August's visibility settings
SELECT 
    id,
    first_name,
    last_name,
    visibility,
    is_profile_public
FROM users
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- Test discover_users function as Praveen Kumar (example)
SELECT * FROM discover_users(
    p_limit => 100,
    p_offset => 0,
    p_search => 'August',
    p_company => NULL,
    p_location => NULL,
    p_exclude_connected => FALSE
);

-- Check if August appears in general discovery (first 20 users)
SELECT * FROM discover_users(20, 0, NULL, NULL, NULL, TRUE)
WHERE user_id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

