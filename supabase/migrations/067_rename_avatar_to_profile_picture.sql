-- Migration: Rename avatar_url to profile_picture_url
-- This separates user profile pictures from HeyGen video avatars

-- Rename the column in users table
ALTER TABLE public.users 
RENAME COLUMN avatar_url TO profile_picture_url;

-- Add comment for clarity
COMMENT ON COLUMN public.users.profile_picture_url IS 'URL to user profile picture stored in profile-pictures bucket (not HeyGen video avatar)';

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'profile_picture_url';

SELECT 'Migration complete: avatar_url renamed to profile_picture_url' as status;

