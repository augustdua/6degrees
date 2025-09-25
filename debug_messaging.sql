-- Debug messaging system - create a version that provides better error info

CREATE OR REPLACE FUNCTION get_or_create_conversation_debug(
  p_other_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_conversation_id UUID;
  v_connection_exists BOOLEAN;
  v_result JSONB;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not authenticated', 'success', false);
  END IF;

  IF v_current_user_id = p_other_user_id THEN
    RETURN jsonb_build_object('error', 'Cannot create conversation with yourself', 'success', false);
  END IF;

  -- Check if users are connected with debug info
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE ((user1_id = v_current_user_id AND user2_id = p_other_user_id) OR
           (user1_id = p_other_user_id AND user2_id = v_current_user_id))
    AND status = 'connected'
  ) INTO v_connection_exists;

  IF NOT v_connection_exists THEN
    RETURN jsonb_build_object(
      'error', 'Users must be connected to start a conversation',
      'success', false,
      'current_user_id', v_current_user_id,
      'other_user_id', p_other_user_id,
      'debug_connection_check', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user1_id', user1_id,
            'user2_id', user2_id,
            'status', status
          )
        )
        FROM public.user_connections
        WHERE (user1_id = v_current_user_id OR user2_id = v_current_user_id OR
               user1_id = p_other_user_id OR user2_id = p_other_user_id)
      )
    );
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

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', v_conversation_id,
    'current_user_id', v_current_user_id,
    'other_user_id', p_other_user_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation_debug TO authenticated, anon, service_role;