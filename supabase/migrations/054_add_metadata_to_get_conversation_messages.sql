-- Migration: Add metadata field to get_conversation_messages function
-- This fixes the issue where offer approval buttons weren't working
-- because the metadata field (containing offer_id) wasn't being returned

DROP FUNCTION IF EXISTS get_conversation_messages(UUID, INTEGER, UUID);

CREATE FUNCTION get_conversation_messages(
    p_conversation_id UUID,  -- This is actually the other user's ID now
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
    metadata JSONB  -- Added this critical field
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
    
    -- Load direct messages between me and the other user
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        CONCAT(u.first_name, ' ', u.last_name) as sender_name,
        u.avatar_url as sender_avatar,
        m.content,
        m.created_at as sent_at,
        m.edited_at as read_at,
        (m.sender_id = v_user_id) as is_own_message,
        COALESCE(m.message_type, 'text') as message_type,
        m.metadata  -- Added this field
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

COMMENT ON FUNCTION get_conversation_messages IS 'Get messages in a direct message thread with metadata for interactive messages';


