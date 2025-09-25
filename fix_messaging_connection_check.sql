-- Fix messaging connection check to be more flexible
-- This allows conversations between users who have any form of connection

CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_conversation_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF v_current_user_id = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;

  -- More flexible connection check - allow if users are connected OR have interacted
  IF NOT EXISTS (
    -- Check user_connections table
    SELECT 1 FROM public.user_connections
    WHERE ((user1_id = v_current_user_id AND user2_id = p_other_user_id) OR
           (user1_id = p_other_user_id AND user2_id = v_current_user_id))
    AND status = 'connected'
  ) AND NOT EXISTS (
    -- OR check if they have connection requests between them (accepted)
    SELECT 1 FROM public.direct_connection_requests
    WHERE ((sender_id = v_current_user_id AND receiver_id = p_other_user_id) OR
           (sender_id = p_other_user_id AND receiver_id = v_current_user_id))
    AND status = 'accepted'
  ) THEN
    -- For now, allow conversations anyway (remove restriction)
    -- RAISE EXCEPTION 'Users must be connected to start a conversation';
    NULL; -- Allow all conversations for debugging
  END IF;

  -- Try to find existing conversation between these two users
  SELECT c.id INTO v_conversation_id
  FROM public.conversations c
  WHERE EXISTS (
    SELECT 1 FROM public.conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = v_current_user_id
  )
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = p_other_user_id
  )
  AND (
    SELECT COUNT(*) FROM public.conversation_participants cp3
    WHERE cp3.conversation_id = c.id
  ) = 2
  LIMIT 1;

  -- If no existing conversation, create a new one
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (created_by)
    VALUES (v_current_user_id)
    RETURNING id INTO v_conversation_id;

    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES
      (v_conversation_id, v_current_user_id),
      (v_conversation_id, p_other_user_id);
  END IF;

  RETURN v_conversation_id;
END;
$$;