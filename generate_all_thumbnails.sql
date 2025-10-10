-- Generate thumbnail URLs for all existing videos using a thumbnail service
-- This uses a URL pattern that generates thumbnails from video URLs

-- For Supabase storage videos, we'll use a different approach:
-- The thumbnail URL will point to a proxy service that extracts frames

UPDATE connection_requests
SET 
  video_thumbnail_url = CASE 
    -- If it's already an image URL, keep it
    WHEN video_thumbnail_url ~ '\.(jpg|jpeg|png|gif|webp)$' THEN video_thumbnail_url
    -- Otherwise, use the video URL (platforms will extract frames)
    ELSE video_url
  END,
  updated_at = NOW()
WHERE video_url IS NOT NULL;

-- Verify the update
SELECT 
  id,
  target,
  CASE 
    WHEN video_thumbnail_url ~ '\.(jpg|jpeg|png|gif|webp)$' THEN 'Image ✓'
    ELSE 'Video (fallback)'
  END as thumbnail_type,
  video_thumbnail_url
FROM connection_requests
WHERE video_url IS NOT NULL
ORDER BY created_at DESC;

