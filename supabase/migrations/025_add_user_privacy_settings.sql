-- Migration: Add privacy settings to users
-- Allows users to choose if their profile is public or private
-- Private profiles will hide name/email in chain visualizations but show organizations

-- Add is_profile_public column (defaults to true for existing users)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN DEFAULT true NOT NULL;

-- Add comment
COMMENT ON COLUMN users.is_profile_public IS 'If false, user name and email are hidden in chain visualizations (organizations remain visible)';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_is_profile_public ON users(is_profile_public);
