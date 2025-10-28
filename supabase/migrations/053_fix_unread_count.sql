-- Fix: Remove fake unread counts from get_user_conversations
-- The old function was counting all messages as unread
-- For now, set unread_count to 0 (proper read receipts will be implemented later)

DROP FUNCTION IF EXISTS get_user_conversations CASCADE;

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
    
    -- Show ONLY receiver_id based direct messages
    RETURN QUERY
    SELECT 
        NULL::UUID as conversation_id,
        other.id as other_user_id,
        CONCAT(other.first_name, ' ', other.last_name) as other_user_name,
        other.avatar_url as other_user_avatar,
        last_msg.content as last_message_content,
        last_msg.sender_id as last_message_sender_id,
        last_msg.created_at as last_message_sent_at,
        0::BIGINT as unread_count,  -- Fixed: No fake notifications
        last_msg.created_at as updated_at
    FROM (
        -- Get all unique users we've messaged with
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
    ORDER BY last_msg.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_conversations(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_user_conversations IS 'Get direct message conversations - unread count set to 0 until read receipts implemented';

