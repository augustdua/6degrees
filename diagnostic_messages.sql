-- Diagnostic SQL to check message read status and notification system
-- Run these queries to understand what's happening with your messages

-- ========================================
-- 1. Check messages table structure
-- ========================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- ========================================
-- 2. Check your recent messages and their read status
-- ========================================
-- Replace 'YOUR_USER_ID' with your actual user ID
SELECT 
    m.id,
    m.created_at,
    sender.email as sender_email,
    sender.first_name || ' ' || sender.last_name as sender_name,
    receiver.email as receiver_email,
    receiver.first_name || ' ' || receiver.last_name as receiver_name,
    m.content,
    m.read_at,
    CASE WHEN m.read_at IS NULL THEN 'UNREAD' ELSE 'READ' END as status,
    m.message_type
FROM messages m
LEFT JOIN users sender ON m.sender_id = sender.id
LEFT JOIN users receiver ON m.receiver_id = receiver.id
WHERE m.sender_id IN (
    SELECT id FROM users WHERE email LIKE '%YOUR_EMAIL_DOMAIN%'
)
OR m.receiver_id IN (
    SELECT id FROM users WHERE email LIKE '%YOUR_EMAIL_DOMAIN%'
)
ORDER BY m.created_at DESC
LIMIT 20;

-- ========================================
-- 3. Count unread messages by receiver
-- ========================================
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as user_name,
    COUNT(*) as unread_count
FROM messages m
JOIN users u ON m.receiver_id = u.id
WHERE m.read_at IS NULL
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY unread_count DESC;

-- ========================================
-- 4. Check conversations with unread counts
-- ========================================
-- This should match what get_user_conversations returns
SELECT 
    conversations.other_user_id,
    other.email as other_email,
    other.first_name || ' ' || other.last_name as other_name,
    last_msg.content as last_message,
    last_msg.created_at as last_message_time,
    unread_msgs.unread_count
FROM (
    SELECT DISTINCT
        CASE 
            WHEN sender_id = auth.uid() THEN receiver_id
            ELSE sender_id
        END as other_user_id
    FROM messages
    WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())
      AND receiver_id IS NOT NULL
) conversations
JOIN users other ON conversations.other_user_id = other.id
LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM messages
    WHERE (
        (sender_id = auth.uid() AND receiver_id = conversations.other_user_id)
        OR
        (sender_id = conversations.other_user_id AND receiver_id = auth.uid())
    )
    ORDER BY created_at DESC
    LIMIT 1
) last_msg ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*)::BIGINT as unread_count
    FROM messages
    WHERE sender_id = conversations.other_user_id
      AND receiver_id = auth.uid()
      AND read_at IS NULL
) unread_msgs ON TRUE
ORDER BY last_msg.created_at DESC;

-- ========================================
-- 5. Check if read_at and edited_at are being confused
-- ========================================
SELECT 
    COUNT(*) FILTER (WHERE read_at IS NULL) as messages_with_null_read_at,
    COUNT(*) FILTER (WHERE read_at IS NOT NULL) as messages_with_read_at,
    COUNT(*) FILTER (WHERE edited_at IS NULL) as messages_with_null_edited_at,
    COUNT(*) FILTER (WHERE edited_at IS NOT NULL) as messages_with_edited_at,
    COUNT(*) as total_messages
FROM messages
WHERE receiver_id IS NOT NULL;

-- ========================================
-- 6. Test the functions work correctly
-- ========================================
-- Get your conversations (should show unread counts)
SELECT * FROM get_user_conversations(50, 0);

-- Get total unread count
SELECT get_unread_messages_count() as my_unread_count;

-- ========================================
-- 7. Check indexes for performance
-- ========================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'messages'
ORDER BY indexname;

-- ========================================
-- 8. Check if mark_direct_messages_read exists
-- ========================================
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    prosrc as source_code
FROM pg_proc
WHERE proname LIKE '%mark%message%read%'
ORDER BY proname;

-- ========================================
-- QUICK FIX COMMANDS (if needed)
-- ========================================

-- To manually mark messages as read from a specific user:
-- SELECT mark_direct_messages_read('OTHER_USER_UUID_HERE');

-- To mark all your unread messages as read (for testing):
-- UPDATE messages SET read_at = NOW() WHERE receiver_id = auth.uid() AND read_at IS NULL;

-- To check a specific message:
-- SELECT * FROM messages WHERE id = 'MESSAGE_UUID_HERE';

