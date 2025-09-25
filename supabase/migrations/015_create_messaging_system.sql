-- Create messaging system tables and functions
-- This migration adds the complete messaging functionality

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    user2_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure user1_id < user2_id for consistency
    CONSTRAINT valid_user_order CHECK (user1_id < user2_id),
    CONSTRAINT no_self_conversation CHECK (user1_id != user2_id)
);

-- Create unique index to prevent duplicate conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_users 
ON public.conversations (user1_id, user2_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON public.messages(sent_at DESC);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their conversations" ON public.conversations
FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
);

CREATE POLICY "Users can create conversations" ON public.conversations
FOR INSERT WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = conversation_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
);

CREATE POLICY "Users can send messages in their conversations" ON public.messages
FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = conversation_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
);

CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (
    sender_id = auth.uid()
);

-- Function to get or create a conversation between two users
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
    v_user1_id UUID;
    v_user2_id UUID;
BEGIN
    -- Get authenticated user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF v_user_id = p_other_user_id THEN
        RAISE EXCEPTION 'Cannot create conversation with yourself';
    END IF;
    
    -- Order user IDs consistently
    SELECT LEAST(v_user_id, p_other_user_id), GREATEST(v_user_id, p_other_user_id)
    INTO v_user1_id, v_user2_id;
    
    -- Try to get existing conversation
    SELECT id INTO v_conversation_id
    FROM public.conversations
    WHERE user1_id = v_user1_id AND user2_id = v_user2_id;
    
    -- If conversation doesn't exist, create it
    IF v_conversation_id IS NULL THEN
        INSERT INTO public.conversations (user1_id, user2_id)
        VALUES (v_user1_id, v_user2_id)
        RETURNING id INTO v_conversation_id;
    END IF;
    
    RETURN v_conversation_id;
END;
$$;

-- Function to send a message
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
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id
        AND (user1_id = v_user_id OR user2_id = v_user_id)
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

-- Function to get user conversations with last message info
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
        CASE 
            WHEN c.user1_id = v_user_id THEN c.user2_id
            ELSE c.user1_id
        END as other_user_id,
        CASE 
            WHEN c.user1_id = v_user_id THEN CONCAT(u2.first_name, ' ', u2.last_name)
            ELSE CONCAT(u1.first_name, ' ', u1.last_name)
        END as other_user_name,
        CASE 
            WHEN c.user1_id = v_user_id THEN u2.avatar_url
            ELSE u1.avatar_url
        END as other_user_avatar,
        lm.content as last_message_content,
        lm.sender_id as last_message_sender_id,
        lm.sent_at as last_message_sent_at,
        COALESCE(unread.unread_count, 0) as unread_count,
        c.updated_at
    FROM public.conversations c
    LEFT JOIN public.users u1 ON c.user1_id = u1.id
    LEFT JOIN public.users u2 ON c.user2_id = u2.id
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
    WHERE c.user1_id = v_user_id OR c.user2_id = v_user_id
    ORDER BY c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Function to get messages for a conversation
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
    read_at TIMESTAMP WITH TIME ZONE,
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
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id
        AND (user1_id = v_user_id OR user2_id = v_user_id)
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
        m.read_at,
        (m.sender_id = v_user_id) as is_own_message
    FROM public.messages m
    JOIN public.users u ON m.sender_id = u.id
    WHERE m.conversation_id = p_conversation_id
    AND (p_before_message_id IS NULL OR m.sent_at < (
        SELECT sent_at FROM public.messages WHERE id = p_before_message_id
    ))
    ORDER BY m.sent_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
    p_conversation_id UUID
)
RETURNS BOOLEAN
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
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id
        AND (user1_id = v_user_id OR user2_id = v_user_id)
    ) THEN
        RAISE EXCEPTION 'You are not part of this conversation';
    END IF;
    
    -- Mark all messages in this conversation as read for this user
    UPDATE public.messages
    SET read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != v_user_id
    AND read_at IS NULL;
    
    RETURN TRUE;
END;
$$;

-- Function to get total unread count for a user
CREATE OR REPLACE FUNCTION get_total_unread_count()
RETURNS BIGINT
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
    
    RETURN (
        SELECT COUNT(*)
        FROM public.messages m
        JOIN public.conversations c ON m.conversation_id = c.id
        WHERE (c.user1_id = v_user_id OR c.user2_id = v_user_id)
        AND m.sender_id != v_user_id
        AND m.read_at IS NULL
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_unread_count() TO authenticated;

-- Create trigger to update updated_at on conversations
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();

-- Create trigger to update updated_at on messages
CREATE TRIGGER trg_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
