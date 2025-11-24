-- This migration adds a new overload of get_user_conversations that accepts p_user_id parameter
-- This allows it to be called from backend with service role key
-- The function retrieves direct message conversations (not group conversations)

CREATE OR REPLACE FUNCTION get_user_conversations(
  p_user_id UUID,
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
SET search_path = public
AS $$
BEGIN
  -- Validate that user_id is provided
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  RETURN QUERY
  SELECT 
    NULL::UUID as conversation_id,
    other.id as other_user_id,
    CONCAT(other.first_name, ' ', other.last_name) as other_user_name,
    other.profile_picture_url as other_user_avatar,
    last_msg.content as last_message_content,
    last_msg.sender_id as last_message_sender_id,
    last_msg.created_at as last_message_sent_at,
    COALESCE(unread_msgs.unread_count, 0) as unread_count,
    last_msg.created_at as updated_at
  FROM (
    -- Get distinct users you've had direct messages with
    SELECT DISTINCT
      CASE 
        WHEN m.sender_id = p_user_id THEN m.receiver_id
        ELSE m.sender_id
      END as other_user_id
    FROM messages m
    WHERE (m.sender_id = p_user_id OR m.receiver_id = p_user_id)
      AND m.receiver_id IS NOT NULL
      AND m.conversation_id IS NULL  -- Only direct messages
  ) conversations
  JOIN users other ON conversations.other_user_id = other.id
  LEFT JOIN LATERAL (
    -- Get the last message with this user
    SELECT m.content, m.sender_id, m.created_at
    FROM messages m
    WHERE (
      (m.sender_id = p_user_id AND m.receiver_id = conversations.other_user_id)
      OR
      (m.sender_id = conversations.other_user_id AND m.receiver_id = p_user_id)
    )
    AND m.conversation_id IS NULL
    ORDER BY m.created_at DESC
    LIMIT 1
  ) last_msg ON TRUE
  LEFT JOIN LATERAL (
    -- Count unread messages from this user
    SELECT COUNT(*)::BIGINT as unread_count
    FROM messages m
    WHERE m.sender_id = conversations.other_user_id
      AND m.receiver_id = p_user_id
      AND m.read_at IS NULL
      AND m.conversation_id IS NULL
  ) unread_msgs ON TRUE
  WHERE last_msg.content IS NOT NULL
  ORDER BY last_msg.created_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(UUID, INTEGER, INTEGER) TO service_role;

