-- Verify profile-pictures bucket and RLS policies setup
-- Run this in Supabase SQL Editor

-- 1. Check if profile-pictures bucket exists and is configured correctly
SELECT 
  name as bucket_name,
  public as is_public,
  file_size_limit / 1024 / 1024 as max_size_mb,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'profile-pictures';

-- Expected: 1 row, public=true, max_size_mb around 5

-- 2. Check all RLS policies for profile-pictures bucket
SELECT 
  policyname as policy_name,
  cmd as command,
  roles as applied_to,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING check'
    ELSE 'No USING check'
  END as using_expression_status,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK'
    ELSE 'No WITH CHECK'
  END as with_check_status
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (
    policyname LIKE '%profile picture%' 
    OR policyname LIKE '%profile-picture%'
    OR qual::text LIKE '%profile-pictures%'
  )
ORDER BY cmd;

-- Expected: 4 policies (INSERT, SELECT, UPDATE, DELETE)
-- INSERT, UPDATE, DELETE should have applied_to = {authenticated}
-- SELECT should have applied_to = {public} or {authenticated}

-- 3. Check if users table has avatar_url column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'avatar_url';

-- Expected: 1 row showing avatar_url column exists

-- 4. Count existing files in profile-pictures bucket (if any)
SELECT 
  COUNT(*) as total_files,
  COUNT(DISTINCT (storage.foldername(name))[1]) as unique_users
FROM storage.objects
WHERE bucket_id = 'profile-pictures';

-- Expected: Shows how many profile pictures exist

-- 5. Sample existing profile pictures (if any)
SELECT 
  name as file_path,
  (storage.foldername(name))[1] as user_id_folder,
  metadata->>'size' as size_bytes,
  metadata->>'mimetype' as mime_type,
  created_at
FROM storage.objects
WHERE bucket_id = 'profile-pictures'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- Expected: rls_enabled = true

-- 7. Summary
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'profile-pictures' AND public = true) 
    THEN '✅ Bucket exists and is public'
    ELSE '❌ Bucket missing or not public'
  END as bucket_status,
  
  (SELECT COUNT(*) FROM pg_policies 
   WHERE tablename = 'objects' 
   AND schemaname = 'storage' 
   AND qual::text LIKE '%profile-pictures%') as total_policies,
   
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies 
          WHERE tablename = 'objects' 
          AND schemaname = 'storage' 
          AND qual::text LIKE '%profile-pictures%') >= 4
    THEN '✅ All 4 policies exist'
    ELSE '⚠️ Missing policies'
  END as policies_status;








