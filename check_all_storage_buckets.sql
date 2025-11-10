-- Check all Storage Buckets in Supabase
-- Run this in Supabase SQL Editor

-- 1. List all storage buckets
SELECT 
  id,
  name,
  owner,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY created_at DESC;

-- 2. Count objects in each bucket
SELECT 
  bucket_id,
  COUNT(*) as total_files,
  SUM(metadata->>'size')::bigint as total_size_bytes,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size_human
FROM storage.objects
GROUP BY bucket_id
ORDER BY total_files DESC;

-- 3. Show all RLS policies for storage.objects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 4. Check sample files from each bucket (limit 5 per bucket)
SELECT 
  bucket_id,
  name as file_path,
  metadata->>'size' as file_size,
  metadata->>'mimetype' as mime_type,
  created_at
FROM storage.objects
WHERE bucket_id IN (SELECT name FROM storage.buckets)
ORDER BY bucket_id, created_at DESC
LIMIT 20;








