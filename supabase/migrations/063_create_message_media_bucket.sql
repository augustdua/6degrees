-- Create storage bucket for message media (photos, videos, files)
-- This allows users to share media in direct messages

-- ========================================
-- 1. Create the bucket
-- ========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-media',
  'message-media',
  false, -- Private bucket, requires authentication
  52428800, -- 50MB max file size
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. Storage Policies
-- ========================================

-- Policy: Users can upload media to their own folders
CREATE POLICY "Users can upload message media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view media from conversations they're part of
CREATE POLICY "Users can view message media from their conversations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-media' AND (
    -- Can see own uploads
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Can see media sent to them (folder name = sender_id)
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.sender_id::text = (storage.foldername(name))[1]
        AND m.receiver_id = auth.uid()
        AND m.metadata->>'media_url' = storage.objects.name
    )
    OR
    -- Can see media they received (folder name = own user_id from recipient perspective)
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.receiver_id::text = (storage.foldername(name))[1]
        AND m.sender_id = auth.uid()
        AND m.metadata->>'media_url' = storage.objects.name
    )
  )
);

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update their own message media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete their own message media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================================
-- 3. Add media_type and media_url to messages (if not exists)
-- ========================================
DO $$ 
BEGIN
  -- Add media_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_type TEXT;
    COMMENT ON COLUMN messages.media_type IS 'Type of media: image, video, document, audio';
  END IF;

  -- Add media_size column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'media_size'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_size BIGINT;
    COMMENT ON COLUMN messages.media_size IS 'Size of media file in bytes';
  END IF;
END $$;

-- ========================================
-- 4. Create index for media queries
-- ========================================
CREATE INDEX IF NOT EXISTS idx_messages_media_type 
  ON messages(media_type) 
  WHERE media_type IS NOT NULL;

-- ========================================
-- 5. Update message_type constraint to include media types
-- ========================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_type_check'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT messages_type_check;
  END IF;
  
  ALTER TABLE messages ADD CONSTRAINT messages_type_check 
    CHECK (message_type IN (
      'text', 
      'image',
      'video',
      'document',
      'audio',
      'offer_approval_request', 
      'offer_approval_response',
      'intro_call_request',
      'intro_call_approved',
      'intro_call_rejected'
    ));
END $$;

-- ========================================
-- USAGE INSTRUCTIONS:
-- ========================================
-- File path structure: message-media/{user_id}/{timestamp}_{filename}
-- Example: message-media/123e4567-e89b-12d3-a456-426614174000/1699123456789_photo.jpg
-- 
-- To upload from frontend:
-- const filePath = `${user.id}/${Date.now()}_${file.name}`;
-- await supabase.storage.from('message-media').upload(filePath, file);
-- 
-- Store in message metadata:
-- metadata: {
--   media_url: filePath,
--   media_name: file.name,
--   media_size: file.size
-- }

