-- Add video support to connection_requests
ALTER TABLE public.connection_requests
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'ai_generated' CHECK (video_type IN ('ai_generated', 'user_recorded')),
ADD COLUMN IF NOT EXISTS video_duration INTEGER,
ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS heygen_video_id TEXT,
ADD COLUMN IF NOT EXISTS heygen_avatar_id TEXT DEFAULT 'Daisy-inskirt-20220818',
ADD COLUMN IF NOT EXISTS heygen_voice_id TEXT DEFAULT '2d5b0e6cf36f460aa7fc47e3eee4ba54',
ADD COLUMN IF NOT EXISTS video_script TEXT;

-- Create index for video lookups
CREATE INDEX IF NOT EXISTS idx_connection_requests_video_url ON public.connection_requests(video_url) WHERE video_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_connection_requests_heygen_id ON public.connection_requests(heygen_video_id) WHERE heygen_video_id IS NOT NULL;
