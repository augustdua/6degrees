-- Fix messaging functions to match actual database schema
-- The schema uses conversations + conversation_participants, not user1_id/user2_id

-- Fix the get_user_conversations function
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
        c.id as conversation_id,
        other_user.id as other_user_id,
        CONCAT(other_user.first_name, ' ', other_user.last_name) as other_user_name,
        other_user.avatar_url as other_user_avatar,
        lm.content as last_message_content,
        lm.sender_id as last_message_sender_id,
        lm.sent_at as last_message_sent_at,
        COALESCE(unread.unread_count, 0) as unread_count,
        c.updated_at
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = v_user_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != v_user_id
    JOIN public.users other_user ON cp2.user_id = other_user.id
    LEFT JOIN LATERAL (
        SELECT content, sender_id, sent_at
        FROM public.messages
        WHERE conversation_id = c.id
        ORDER BY sent_at DESC
        LIMIT 1
    ) lm ON TRUE
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as unread_count
        FROM public.messages
        WHERE conversation_id = c.id
        AND sender_id != v_user_id
        AND read_at IS NULL
    ) unread ON TRUE
    ORDER BY c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Fix the get_or_create_conversation function
CREATE OR REPLACE FUNCTION get_or_create_conversation(
    p_other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_conversation_id UUID;
BEGIN
    -- Get authenticated user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF v_user_id = p_other_user_id THEN
        RAISE EXCEPTION 'Cannot create conversation with yourself';
    END IF;
    
    -- Try to get existing conversation
    SELECT c.id INTO v_conversation_id
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = v_user_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = p_other_user_id;
    
    -- If conversation doesn't exist, create it
    IF v_conversation_id IS NULL THEN
        -- Create conversation
        INSERT INTO public.conversations (created_by)
        VALUES (v_user_id)
        RETURNING id INTO v_conversation_id;
        
        -- Add both participants
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES (v_conversation_id, v_user_id), (v_conversation_id, p_other_user_id);
    END IF;
    
    RETURN v_conversation_id;
END;
$$;

-- Fix the mark_conversation_read function
CREATE OR REPLACE FUNCTION mark_conversation_read(
    p_conversation_id UUID
)
RETURNS VOID
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
    
    -- Verify user is part of this conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'You are not part of this conversation';
    END IF;
    
    -- Update last_read_at for the user
    UPDATE public.conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;
    
    -- Mark messages as read
    UPDATE public.messages
    SET read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != v_user_id
    AND read_at IS NULL;
END;
$$;

-- Fix the send_message function to work with the correct schema
CREATE OR REPLACE FUNCTION send_message(
    p_conversation_id UUID,
    p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_message_id UUID;
BEGIN
    -- Get authenticated user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF p_content IS NULL OR TRIM(p_content) = '' THEN
        RAISE EXCEPTION 'Message content cannot be empty';
    END IF;
    
    -- Verify user is part of this conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'You are not part of this conversation';
    END IF;
    
    -- Insert the message
    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (p_conversation_id, v_user_id, TRIM(p_content))
    RETURNING id INTO v_message_id;
    
    -- Update conversation's updated_at
    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN v_message_id;
END;
$$;

-- Fix the get_conversation_messages function
CREATE OR REPLACE FUNCTION get_conversation_messages(
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
    edited_at TIMESTAMP WITH TIME ZONE,
    is_own_message BOOLEAN
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
    
    -- Verify user is part of this conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = p_conversation_id
        AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'You are not part of this conversation';
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id as message_id,
        m.sender_id,
        CONCAT(u.first_name, ' ', u.last_name) as sender_name,
        u.avatar_url as sender_avatar,
        m.content,
        m.sent_at,
        m.edited_at,
        (m.sender_id = v_user_id) as is_own_message
    FROM public.messages m
    JOIN public.users u ON m.sender_id = u.id
    WHERE m.conversation_id = p_conversation_id
    AND (p_before_message_id IS NULL OR m.id < p_before_message_id)
    ORDER BY m.sent_at DESC
    LIMIT p_limit;
END;
$$;
