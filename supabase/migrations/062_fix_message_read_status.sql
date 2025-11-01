-- Fix message read status tracking
-- The issue: edited_at was being used as a proxy for read_at, but that's incorrect
-- Solution: Use read_at properly and create mark_direct_messages_read function

-- Step 1: Ensure read_at column exists with correct structure
DO $$ 
BEGIN
  -- Add read_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 2: Create proper index for read_at queries
CREATE INDEX IF NOT EXISTS idx_messages_read_status 
  ON messages(receiver_id, read_at) 
  WHERE read_at IS NULL;

-- Step 3: Fix get_user_conversations to use read_at correctly
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
    
    -- Show ONLY receiver_id based direct messages
    RETURN QUERY
    SELECT 
        NULL::UUID as conversation_id,  -- Always NULL for direct messages
        other.id as other_user_id,
        CONCAT(other.first_name, ' ', other.last_name) as other_user_name,
        other.avatar_url as other_user_avatar,
        last_msg.content as last_message_content,
        last_msg.sender_id as last_message_sender_id,
        last_msg.created_at as last_message_sent_at,
        COALESCE(unread_msgs.unread_count, 0) as unread_count,
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
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT as unread_count
        FROM messages
        WHERE sender_id = conversations.other_user_id
          AND receiver_id = v_user_id
          AND read_at IS NULL  -- FIXED: Use read_at instead of edited_at
    ) unread_msgs ON TRUE
    ORDER BY last_msg.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_conversations(INTEGER, INTEGER) TO authenticated;

-- Step 4: Create mark_direct_messages_read function
DROP FUNCTION IF EXISTS mark_direct_messages_read(UUID) CASCADE;

CREATE FUNCTION mark_direct_messages_read(
    p_other_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_updated_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Mark all unread messages from the other user as read
    UPDATE messages
    SET read_at = NOW()
    WHERE sender_id = p_other_user_id
      AND receiver_id = v_user_id
      AND read_at IS NULL;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Marked % messages as read from user %', v_updated_count, p_other_user_id;
    
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_direct_messages_read(UUID) TO authenticated;

-- Step 5: Update get_conversation_messages to return read_at correctly
DROP FUNCTION IF EXISTS get_conversation_messages(UUID, INTEGER, UUID) CASCADE;

CREATE FUNCTION get_conversation_messages(
    p_conversation_id UUID,  -- This is actually the other user's ID
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
    
    -- Load direct messages between me and the other user
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        CONCAT(u.first_name, ' ', u.last_name) as sender_name,
        u.avatar_url as sender_avatar,
        m.content,
        m.created_at as sent_at,
        m.read_at,  -- FIXED: Return actual read_at instead of edited_at
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

-- Step 6: Add comments for clarity
COMMENT ON FUNCTION get_user_conversations IS 'Get direct message conversations with correct unread counts using read_at';
COMMENT ON FUNCTION get_conversation_messages IS 'Get messages in a direct message thread with proper read_at timestamps';
COMMENT ON FUNCTION mark_direct_messages_read IS 'Mark all messages from another user as read';
COMMENT ON COLUMN messages.read_at IS 'Timestamp when the message was read by the recipient';

-- Step 7: Create helper function to get unread message count for sidebar
CREATE OR REPLACE FUNCTION get_unread_messages_count()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    RETURN (
        SELECT COUNT(*)
        FROM messages
        WHERE receiver_id = v_user_id
          AND read_at IS NULL
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_unread_messages_count() TO authenticated;

COMMENT ON FUNCTION get_unread_messages_count IS 'Get total count of unread messages for the current user';

