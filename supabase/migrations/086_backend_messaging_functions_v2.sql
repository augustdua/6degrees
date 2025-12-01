-- Backend-friendly messaging functions that accept explicit user_id parameter
-- These are needed because the backend uses service role key which doesn't set auth.uid()
-- Note: get_user_conversations already has a version with p_user_id, so we only need v2 for these two

-- V2 version of get_conversation_messages that accepts p_user_id
CREATE OR REPLACE FUNCTION get_conversation_messages_v2(
    p_user_id UUID,
    p_other_user_id UUID,
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
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        CONCAT(u.first_name, ' ', u.last_name) as sender_name,
        u.profile_picture_url as sender_avatar,
        m.content,
        m.created_at as sent_at,
        m.read_at,
        (m.sender_id = p_user_id) as is_own_message,
        COALESCE(m.message_type, 'text') as message_type,
        m.metadata
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (
        (m.sender_id = p_user_id AND m.receiver_id = p_other_user_id)
        OR
        (m.sender_id = p_other_user_id AND m.receiver_id = p_user_id)
    )
    AND (p_before_message_id IS NULL OR m.created_at < (
        SELECT created_at FROM messages WHERE id = p_before_message_id
    ))
    ORDER BY m.created_at ASC
    LIMIT p_limit;
END;
$$;

-- V2 version of mark_direct_messages_read that accepts p_user_id
CREATE OR REPLACE FUNCTION mark_direct_messages_read_v2(
    p_user_id UUID,
    p_other_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required';
    END IF;
    
    -- Mark all unread messages from the other user as read
    UPDATE messages
    SET read_at = NOW()
    WHERE sender_id = p_other_user_id
      AND receiver_id = p_user_id
      AND read_at IS NULL;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_conversation_messages_v2(UUID, UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages_v2(UUID, UUID, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION mark_direct_messages_read_v2(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_direct_messages_read_v2(UUID, UUID) TO service_role;

-- Add comments
COMMENT ON FUNCTION get_conversation_messages_v2 IS 'Backend-friendly version that accepts explicit user_id instead of using auth.uid()';
COMMENT ON FUNCTION mark_direct_messages_read_v2 IS 'Backend-friendly version that accepts explicit user_id instead of using auth.uid()';

SELECT 'Created v2 messaging functions for backend use' as status;

