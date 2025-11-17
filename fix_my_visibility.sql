-- Check and fix August Dua's visibility to ensure profile is discoverable

-- Step 1: Check current visibility
SELECT 
    id,
    first_name,
    last_name,
    email,
    visibility,
    created_at,
    CASE 
        WHEN visibility = 'public' THEN '✅ Already public - discoverable'
        WHEN visibility IS NULL THEN '⚠️ NULL - should default to public'
        WHEN visibility = 'connections' THEN '⚠️ Only visible to connections'
        WHEN visibility = 'private' THEN '❌ Private - not discoverable'
        ELSE '❓ Unknown visibility value'
    END as status
FROM users
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- Step 2: Ensure visibility is set to 'public' (if it's not already)
UPDATE users
SET visibility = 'public'
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
  AND (visibility IS NULL OR visibility != 'public');

-- Step 3: Verify the update
SELECT 
    id,
    first_name,
    last_name,
    visibility,
    '✅ Profile is now public and discoverable!' as result
FROM users
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

