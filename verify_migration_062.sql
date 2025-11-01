-- ========================================
-- VERIFICATION SQL FOR MIGRATION 062
-- Run these queries to verify the fix is working
-- ========================================

-- ========================================
-- 1. Check that mark_direct_messages_read function exists
-- ========================================
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'mark_direct_messages_read';
-- EXPECTED: Should return 1 row with function_name = 'mark_direct_messages_read'

-- ========================================
-- 2. Check get_unread_messages_count function exists
-- ========================================
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_unread_messages_count';
-- EXPECTED: Should return 1 row

-- ========================================
-- 3. Test get_unread_messages_count (should show your 14 unread)
-- ========================================
SELECT get_unread_messages_count() as total_unread_messages;
-- EXPECTED: Should return 14 (or whatever your current unread count is)

-- ========================================
-- 4. Test get_user_conversations (should show unread counts per conversation)
-- ========================================
SELECT 
    other_user_id,
    other_user_name,
    other_user_email,
    last_message_content,
    last_message_sent_at,
    unread_count
FROM get_user_conversations(50, 0);
-- EXPECTED: Should show conversations with correct unread_count values

-- ========================================
-- 5. Verify the index for read_at exists
-- ========================================
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages' 
  AND indexname LIKE '%read%';
-- EXPECTED: Should show idx_messages_read_status or similar

-- ========================================
-- 6. Count total unread messages manually (should match function result)
-- ========================================
SELECT COUNT(*) as manual_unread_count
FROM messages
WHERE receiver_id = auth.uid()
  AND read_at IS NULL;
-- EXPECTED: Should match the result from get_unread_messages_count()

-- ========================================
-- 7. Show breakdown of unread messages by sender
-- ========================================
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as sender_name,
    COUNT(*) as unread_from_this_person
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.receiver_id = auth.uid()
  AND m.read_at IS NULL
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY unread_from_this_person DESC;
-- EXPECTED: Should show the same breakdown as before (10, 2, 1, 1)

-- ========================================
-- 8. Test that get_conversation_messages returns read_at correctly
-- ========================================
-- Replace 'OTHER_USER_ID' with an actual user ID from your conversations
-- SELECT 
--     message_id,
--     sender_name,
--     content,
--     sent_at,
--     read_at,
--     CASE WHEN read_at IS NULL THEN 'UNREAD' ELSE 'READ' END as status
-- FROM get_conversation_messages('OTHER_USER_ID', 10, NULL);
-- EXPECTED: Should show read_at timestamps correctly

-- ========================================
-- 9. Check function source code contains 'read_at' not 'edited_at'
-- ========================================
SELECT 
    proname as function_name,
    CASE 
        WHEN prosrc LIKE '%edited_at%' AND prosrc NOT LIKE '%read_at%' THEN '❌ STILL USING edited_at'
        WHEN prosrc LIKE '%read_at%' THEN '✅ CORRECTLY USING read_at'
        ELSE '❓ UNCLEAR'
    END as status,
    CASE 
        WHEN prosrc LIKE '%edited_at%' THEN 'WARNING: Found edited_at in code'
        ELSE 'OK'
    END as warning
FROM pg_proc
WHERE proname IN ('get_user_conversations', 'get_conversation_messages', 'mark_direct_messages_read');
-- EXPECTED: All should show '✅ CORRECTLY USING read_at'

-- ========================================
-- 10. FINAL CHECK: Compare function result with manual count
-- ========================================
SELECT 
    'get_unread_messages_count()' as method,
    get_unread_messages_count() as count
UNION ALL
SELECT 
    'Manual COUNT(*)' as method,
    COUNT(*)::BIGINT as count
FROM messages
WHERE receiver_id = auth.uid()
  AND read_at IS NULL;
-- EXPECTED: Both rows should show the SAME number

-- ========================================
-- SUCCESS CRITERIA:
-- ========================================
-- ✅ mark_direct_messages_read function exists
-- ✅ get_unread_messages_count returns correct number (14)
-- ✅ get_user_conversations shows unread_count for each conversation
-- ✅ Manual count matches function count
-- ✅ Functions use 'read_at' not 'edited_at'
-- ✅ Indexes exist for performance

-- ========================================
-- IF ALL CHECKS PASS:
-- Your frontend notification badges should now work!
-- Try sending a message from your other account and check if badge appears
-- ========================================

