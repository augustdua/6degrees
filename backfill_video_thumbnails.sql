-- Backfill video_thumbnail_url for all existing requests with videos
-- This sets the thumbnail to the video URL itself; platforms will extract frames

UPDATE connection_requests
SET video_thumbnail_url = video_url,
    updated_at = NOW()
WHERE video_url IS NOT NULL 
  AND video_thumbnail_url IS NULL;

-- Verify the update
SELECT 
  id,
  target,
  video_url,
  video_thumbnail_url,
  heygen_video_id
FROM connection_requests
WHERE video_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

