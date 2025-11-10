-- Update get_user_conversations to include mafia group chats
-- Drop and recreate the function to include mafia conversations

DROP FUNCTION IF EXISTS get_user_conversations(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_user_conversations(
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
  updated_at TIMESTAMP WITH TIME ZONE,
  is_group BOOLEAN,
  mafia_id UUID,
  mafia_name TEXT,
  mafia_cover_image TEXT,
  member_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  WITH user_conversations AS (
    -- Direct message conversations (existing logic)
    SELECT DISTINCT
      c.id as conversation_id,
      CASE
        WHEN c.user1_id = current_user_id THEN c.user2_id
        ELSE c.user1_id
      END as other_user_id,
      CASE
        WHEN c.user1_id = current_user_id THEN
          COALESCE(u2.first_name || ' ' || u2.last_name, u2.email)
        ELSE
          COALESCE(u1.first_name || ' ' || u1.last_name, u1.email)
      END as other_user_name,
      CASE
        WHEN c.user1_id = current_user_id THEN u2.profile_picture_url
        ELSE u1.profile_picture_url
      END as other_user_avatar,
      m.content as last_message_content,
      m.sender_id as last_message_sender_id,
      m.sent_at as last_message_sent_at,
      COALESCE(
        (SELECT COUNT(*)
         FROM public.messages m2
         WHERE m2.conversation_id = c.id
           AND m2.sender_id != current_user_id
           AND m2.read_at IS NULL),
        0
      ) as unread_count,
      c.updated_at,
      FALSE as is_group,
      NULL::UUID as mafia_id,
      NULL::TEXT as mafia_name,
      NULL::TEXT as mafia_cover_image,
      0::BIGINT as member_count
    FROM public.conversations c
    LEFT JOIN public.users u1 ON u1.id = c.user1_id
    LEFT JOIN public.users u2 ON u2.id = c.user2_id
    LEFT JOIN LATERAL (
      SELECT content, sender_id, sent_at
      FROM public.messages
      WHERE conversation_id = c.id
      ORDER BY sent_at DESC
      LIMIT 1
    ) m ON TRUE
    WHERE c.mafia_id IS NULL  -- Only direct messages
      AND (c.user1_id = current_user_id OR c.user2_id = current_user_id)

    UNION ALL

    -- Mafia group conversations
    SELECT DISTINCT
      c.id as conversation_id,
      NULL::UUID as other_user_id,  -- No single "other user" for groups
      m.name as other_user_name,     -- Use mafia name
      m.cover_image_url as other_user_avatar,  -- Use mafia cover image
      msg.content as last_message_content,
      msg.sender_id as last_message_sender_id,
      msg.sent_at as last_message_sent_at,
      COALESCE(
        (SELECT COUNT(*)
         FROM public.messages m2
         LEFT JOIN public.conversation_participants cp_sender ON cp_sender.user_id = m2.sender_id AND cp_sender.conversation_id = m2.conversation_id
         WHERE m2.conversation_id = c.id
           AND m2.sender_id != current_user_id
           AND (
             -- Message sent after user last read
             m2.sent_at > COALESCE(
               (SELECT last_read_at FROM public.conversation_participants WHERE conversation_id = c.id AND user_id = current_user_id),
               '1970-01-01'::TIMESTAMP WITH TIME ZONE
             )
           )),
        0
      ) as unread_count,
      c.updated_at,
      TRUE as is_group,
      m.id as mafia_id,
      m.name as mafia_name,
      m.cover_image_url as mafia_cover_image,
      (SELECT COUNT(*) FROM public.mafia_members WHERE mafia_id = m.id) as member_count
    FROM public.conversations c
    INNER JOIN public.mafias m ON m.id = c.mafia_id
    INNER JOIN public.conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = current_user_id
    LEFT JOIN LATERAL (
      SELECT content, sender_id, sent_at
      FROM public.messages
      WHERE conversation_id = c.id
      ORDER BY sent_at DESC
      LIMIT 1
    ) msg ON TRUE
    WHERE c.mafia_id IS NOT NULL  -- Only mafia conversations
  )
  SELECT *
  FROM user_conversations
  ORDER BY 
    COALESCE(last_message_sent_at, updated_at) DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_conversations(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_user_conversations IS 'Get all conversations for the current user including both direct messages and mafia group chats';


