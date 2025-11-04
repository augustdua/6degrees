-- Fix all SQL functions that reference avatar_url (now profile_picture_url)
-- This fixes the 400 errors when loading messages and requests

-- Fix get_user_conversations function
DROP FUNCTION IF EXISTS get_user_conversations(INTEGER, INTEGER) CASCADE;

CREATE FUNCTION get_user_conversations(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    conversation_id UUID,
    other_user_id UUID,
    other_user_name TEXT,
    other_user_avatar TEXT,
    last_message_content TEXT,
    last_message_sender_id UUID,
    last_message_sent_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        NULL::UUID as conversation_id,
        other.id as other_user_id,
        CONCAT(other.first_name, ' ', other.last_name) as other_user_name,
        other.profile_picture_url as other_user_avatar,  -- FIXED: Changed from avatar_url
        last_msg.content as last_message_content,
        last_msg.sender_id as last_message_sender_id,
        last_msg.created_at as last_message_sent_at,
        COALESCE(unread_msgs.unread_count, 0) as unread_count,
        last_msg.created_at as updated_at
    FROM (
        SELECT DISTINCT
            CASE 
                WHEN sender_id = v_user_id THEN receiver_id
                ELSE sender_id
            END as other_user_id
        FROM messages
        WHERE (sender_id = v_user_id OR receiver_id = v_user_id)
          AND receiver_id IS NOT NULL
    ) conversations
    JOIN users other ON conversations.other_user_id = other.id
    LEFT JOIN LATERAL (
        SELECT content, sender_id, created_at, message_type
        FROM messages
        WHERE (
            (sender_id = v_user_id AND receiver_id = conversations.other_user_id)
            OR
            (sender_id = conversations.other_user_id AND receiver_id = v_user_id)
        )
        ORDER BY created_at DESC
        LIMIT 1
    ) last_msg ON TRUE
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT as unread_count
        FROM messages
        WHERE sender_id = conversations.other_user_id
          AND receiver_id = v_user_id
          AND read_at IS NULL
    ) unread_msgs ON TRUE
    ORDER BY last_msg.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_conversations(INTEGER, INTEGER) TO authenticated;

-- Fix get_conversation_messages function
DROP FUNCTION IF EXISTS get_conversation_messages(UUID, INTEGER, UUID) CASCADE;

CREATE FUNCTION get_conversation_messages(
    p_conversation_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    sender_name TEXT,
    sender_avatar TEXT,
    content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_own_message BOOLEAN,
    message_type TEXT,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        CONCAT(u.first_name, ' ', u.last_name) as sender_name,
        u.profile_picture_url as sender_avatar,  -- FIXED: Changed from avatar_url
        m.content,
        m.created_at as sent_at,
        m.read_at,
        (m.sender_id = v_user_id) as is_own_message,
        COALESCE(m.message_type, 'text') as message_type,
        m.metadata
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (
        (m.sender_id = v_user_id AND m.receiver_id = p_conversation_id)
        OR
        (m.sender_id = p_conversation_id AND m.receiver_id = v_user_id)
    )
    AND (p_before_message_id IS NULL OR m.created_at < (
        SELECT created_at FROM messages WHERE id = p_before_message_id
    ))
    ORDER BY m.created_at ASC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, INTEGER, UUID) TO authenticated;

SELECT 'Fixed avatar_url → profile_picture_url in SQL functions' as status;

