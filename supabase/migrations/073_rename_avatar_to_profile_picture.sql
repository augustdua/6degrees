-- Migration: Rename avatar_url to profile_picture_url
-- This separates user profile pictures from HeyGen video avatars

-- First check if the column exists
DO $$
BEGIN
    -- Only rename if avatar_url exists and profile_picture_url doesn't
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'avatar_url'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'profile_picture_url'
    ) THEN
        -- Rename the column
        ALTER TABLE public.users 
        RENAME COLUMN avatar_url TO profile_picture_url;
        
        -- Add comment for clarity
        EXECUTE 'COMMENT ON COLUMN public.users.profile_picture_url IS ''URL to user profile picture stored in profile-pictures bucket (not HeyGen video avatar)''';
        
        RAISE NOTICE 'Successfully renamed avatar_url to profile_picture_url';
    ELSE
        RAISE NOTICE 'Column already renamed or profile_picture_url already exists';
    END IF;
END $$;

-- Verify the result
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'profile_picture_url'
        ) THEN 'SUCCESS: profile_picture_url column exists'
        ELSE 'ERROR: profile_picture_url column does not exist'
    END as migration_status;


