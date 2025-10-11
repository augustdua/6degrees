-- Add HeyGen photo avatar fields to users table
-- This allows users to have a personal cartoon avatar generated from their photo

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS heygen_avatar_group_id TEXT,
ADD COLUMN IF NOT EXISTS heygen_avatar_photo_id TEXT,
ADD COLUMN IF NOT EXISTS heygen_avatar_style JSONB DEFAULT '{
  "age": "Young Adult",
  "gender": "Man",
  "ethnicity": "South Asian",
  "style": "Cartoon",
  "appearance": "Flat-shaded cartoon portrait, bold outlines, cel-shaded lighting, saturated colors, minimal texture, soft gradient background, friendly expression"
}'::jsonb,
ADD COLUMN IF NOT EXISTS heygen_avatar_image_key TEXT,
ADD COLUMN IF NOT EXISTS heygen_avatar_preview_url TEXT,
ADD COLUMN IF NOT EXISTS heygen_avatar_trained BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS heygen_avatar_training_started_at TIMESTAMP WITH TIME ZONE;

-- Add index for quick lookups by avatar group
CREATE INDEX IF NOT EXISTS idx_users_heygen_avatar_group_id ON public.users(heygen_avatar_group_id) WHERE heygen_avatar_group_id IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN public.users.heygen_avatar_group_id IS 'HeyGen avatar group ID (trained model from user photo)';
COMMENT ON COLUMN public.users.heygen_avatar_photo_id IS 'HeyGen talking photo ID (specific look/outfit) used for video generation';
COMMENT ON COLUMN public.users.heygen_avatar_style IS 'User avatar style preferences (age, gender, ethnicity, cartoon style)';
COMMENT ON COLUMN public.users.heygen_avatar_image_key IS 'HeyGen image key from original photo generation';
COMMENT ON COLUMN public.users.heygen_avatar_preview_url IS 'Preview URL of user cartoon avatar';
COMMENT ON COLUMN public.users.heygen_avatar_trained IS 'Whether the avatar group has been trained and is ready to use';
COMMENT ON COLUMN public.users.heygen_avatar_training_started_at IS 'Timestamp when avatar training was initiated';
