-- Add LinkedIn integration fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS linkedin_id TEXT,
ADD COLUMN IF NOT EXISTS linkedin_headline TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_picture TEXT,
ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for LinkedIn ID lookups
CREATE INDEX IF NOT EXISTS idx_users_linkedin_id ON public.users(linkedin_id);

-- Add unique constraint to prevent duplicate LinkedIn connections
ALTER TABLE public.users ADD CONSTRAINT unique_linkedin_id UNIQUE (linkedin_id);

-- Update RLS policies to allow LinkedIn data updates
CREATE POLICY "Users can update their own LinkedIn data" ON public.users
FOR UPDATE USING (auth.uid() = id);