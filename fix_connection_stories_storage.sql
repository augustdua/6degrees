-- Fix Connection Stories Storage Bucket Setup
-- Run this in Supabase SQL Editor

-- 1. Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'connection-stories',
  'connection-stories',
  true,  -- Public so images load without signed URLs
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Drop existing policies to recreate them fresh
DROP POLICY IF EXISTS "Users can upload connection story photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view connection story photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their connection story photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their connection story photos" ON storage.objects;

-- 3. Create upload policy - users can upload to their own folder
CREATE POLICY "Users can upload connection story photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'connection-stories' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Create view policy - anyone can view photos (public bucket)
CREATE POLICY "Anyone can view connection story photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'connection-stories');

-- 5. Create update policy - users can update their own photos
CREATE POLICY "Users can update their connection story photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'connection-stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Create delete policy - users can delete their own photos
CREATE POLICY "Users can delete their connection story photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'connection-stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'connection-stories';

