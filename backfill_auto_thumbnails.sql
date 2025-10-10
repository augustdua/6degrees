-- Automatically generate thumbnails for ALL existing videos using vumbnail.com
-- This service automatically extracts a frame from any video URL

UPDATE connection_requests
SET 
  video_thumbnail_url = 'https://vumbnail.com/' || encode(video_url::bytea, 'escape') || '.jpg',
  updated_at = NOW()
WHERE video_url IS NOT NULL 
  AND (video_thumbnail_url IS NULL OR video_thumbnail_url = video_url);

-- Verify the update
SELECT 
  id,
  target,
  video_url,
  video_thumbnail_url,
  CASE 
    WHEN video_thumbnail_url LIKE 'https://vumbnail.com/%' THEN 'Auto-generated ✓'
    WHEN video_thumbnail_url ~ '\.(jpg|jpeg|png)$' THEN 'Custom image ✓'
    ELSE 'Fallback'
  END as thumbnail_status
FROM connection_requests
WHERE video_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

