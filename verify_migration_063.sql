-- ========================================
-- VERIFICATION SQL FOR MIGRATION 063
-- Media Sharing and Emoji Support
-- ========================================

-- ========================================
-- 1. Check if media_type column exists
-- ========================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages' 
  AND column_name IN ('media_type', 'media_size')
ORDER BY column_name;
-- EXPECTED: Should return 2 rows (media_type TEXT, media_size BIGINT)

-- ========================================
-- 2. Check message_type constraint (MOST IMPORTANT)
-- ========================================
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'messages'::regclass
  AND conname LIKE '%type%';
-- EXPECTED: Should show constraint allowing 'image', 'video', 'document'

-- ========================================
-- 3. Check current constraint in detail
-- ========================================
SELECT 
    conname,
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%image%' THEN '✅ Includes image'
        ELSE '❌ Missing image'
    END as has_image,
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%video%' THEN '✅ Includes video'
        ELSE '❌ Missing video'
    END as has_video,
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%document%' THEN '✅ Includes document'
        ELSE '❌ Missing document'
    END as has_document
FROM pg_constraint
WHERE conrelid = 'messages'::regclass
  AND conname LIKE '%type%check%';
-- EXPECTED: All should show ✅

-- ========================================
-- 4. Check if media index exists
-- ========================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages' 
  AND indexname LIKE '%media%';
-- EXPECTED: Should show idx_messages_media_type

-- ========================================
-- 5. Check storage bucket exists
-- ========================================
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'message-media';
-- EXPECTED: Should return 1 row with public = false, file_size_limit = 52428800

-- ========================================
-- 6. Check storage policies
-- ========================================
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (policyname LIKE '%message%media%' OR policyname LIKE '%message_media%')
ORDER BY policyname;
-- EXPECTED: Should show 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- ========================================
-- 7. Test inserting a media message (DRY RUN)
-- ========================================
-- DO NOT RUN THIS - Just check if it would work
-- EXPLAIN (FORMAT TEXT)
-- INSERT INTO messages (sender_id, receiver_id, content, message_type, media_type, media_size, metadata)
-- VALUES (
--   auth.uid(),
--   'some-user-id',
--   'test.jpg',
--   'image',
--   'image',
--   1024000,
--   '{"media_url": "test/path.jpg"}'::jsonb
-- );

-- ========================================
-- 8. Check all valid message types
-- ========================================
SELECT 
    conname,
    pg_get_constraintdef(oid) as allowed_types
FROM pg_constraint
WHERE conrelid = 'messages'::regclass
  AND conname = 'messages_type_check';
-- EXPECTED: Should show all types including 'image', 'video', 'document'

-- ========================================
-- IF CONSTRAINT IS WRONG, RUN THIS FIX:
-- ========================================
-- This will fix the constraint if migration didn't apply correctly

-- Step 1: Drop old constraint
-- ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
-- ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Step 2: Add new constraint with all types
-- ALTER TABLE messages ADD CONSTRAINT messages_type_check 
--   CHECK (message_type IN (
--     'text', 
--     'image',
--     'video',
--     'document',
--     'audio',
--     'offer_approval_request', 
--     'offer_approval_response',
--     'intro_call_request',
--     'intro_call_approved',
--     'intro_call_rejected'
--   ));

-- ========================================
-- TROUBLESHOOTING
-- ========================================

-- If you see constraint error, the issue is:
-- The messages_type_check constraint doesn't include new media types

-- Solution: Run the fix above to drop and recreate the constraint

