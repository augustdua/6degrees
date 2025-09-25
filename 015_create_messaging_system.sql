-- Create messaging system for 6Degrees
-- Migration 015: Messaging System

-- Create conversations table (for organizing messages between users)
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation participants table (many-to-many relationship)
CREATE TABLE public.conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure unique participant per conversation
  CONSTRAINT unique_participant_conversation UNIQUE (conversation_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Soft delete constraint
  CONSTRAINT valid_message_state CHECK (
    (deleted_at IS NULL AND content != '') OR
    (deleted_at IS NOT NULL)
  )
);

-- Create indexes for efficient querying
CREATE INDEX idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, sent_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Participants can update conversation" ON public.conversations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- RLS Policies for conversation participants
CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
    AND cp2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants to conversations they created" ON public.conversation_participants
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own participation" ON public.conversation_participants
FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
FOR SELECT USING (
  deleted_at IS NULL AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (sender_id = auth.uid());

-- Function to create or get conversation between two users
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

  -- Check if users are connected
  IF NOT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE ((user1_id = v_current_user_id AND user2_id = p_other_user_id) OR
           (user1_id = p_other_user_id AND user2_id = v_current_user_id))
    AND status = 'connected'
  ) THEN
    RAISE EXCEPTION 'Users must be connected to start a conversation';
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
  v_current_user_id UUID;
  v_message_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate content
  IF LENGTH(TRIM(p_content)) < 1 OR LENGTH(p_content) > 2000 THEN
    RAISE EXCEPTION 'Message content must be between 1 and 2000 characters';
  END IF;

  -- Check if user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  -- Insert message
  INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES (p_conversation_id, v_current_user_id, TRIM(p_content))
  RETURNING id INTO v_message_id;

  -- Update conversation updated_at
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$;

-- Function to get user's conversations with recent message info
CREATE OR REPLACE FUNCTION get_user_conversations(
  p_limit INTEGER DEFAULT 20,
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
  unread_count INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id as conversation_id,
    other_user.id as other_user_id,
    (other_user.first_name || ' ' || other_user.last_name) as other_user_name,
    other_user.avatar_url as other_user_avatar,
    latest_msg.content as last_message_content,
    latest_msg.sender_id as last_message_sender_id,
    latest_msg.sent_at as last_message_sent_at,
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.messages m2
      WHERE m2.conversation_id = c.id
        AND m2.sent_at > COALESCE(cp_current.last_read_at, '1970-01-01'::timestamptz)
        AND m2.sender_id != v_current_user_id
        AND m2.deleted_at IS NULL
    ), 0) as unread_count,
    c.updated_at
  FROM public.conversations c
  JOIN public.conversation_participants cp_current ON (
    cp_current.conversation_id = c.id AND cp_current.user_id = v_current_user_id
  )
  JOIN public.conversation_participants cp_other ON (
    cp_other.conversation_id = c.id AND cp_other.user_id != v_current_user_id
  )
  JOIN public.users other_user ON other_user.id = cp_other.user_id
  LEFT JOIN LATERAL (
    SELECT content, sender_id, sent_at
    FROM public.messages m
    WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
    ORDER BY m.sent_at DESC
    LIMIT 1
  ) latest_msg ON true
  ORDER BY c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get messages in a conversation
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
  v_current_user_id UUID;
  v_before_sent_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user is participant
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  -- Get timestamp for pagination if before_message_id is provided
  IF p_before_message_id IS NOT NULL THEN
    SELECT sent_at INTO v_before_sent_at
    FROM public.messages
    WHERE id = p_before_message_id;
  END IF;

  RETURN QUERY
  SELECT
    m.id as message_id,
    m.sender_id,
    (u.first_name || ' ' || u.last_name) as sender_name,
    u.avatar_url as sender_avatar,
    m.content,
    m.sent_at,
    m.edited_at,
    (m.sender_id = v_current_user_id) as is_own_message
  FROM public.messages m
  JOIN public.users u ON u.id = m.sender_id
  WHERE m.conversation_id = p_conversation_id
    AND m.deleted_at IS NULL
    AND (v_before_sent_at IS NULL OR m.sent_at < v_before_sent_at)
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
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = v_current_user_id;

  RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION send_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_conversations TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read TO authenticated;

-- Add updated_at triggers
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update notification types to include messaging
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'invite_sent', 'invite_accepted', 'invite_declined',
  'chain_joined', 'chain_completed', 'chain_failed',
  'reward_earned', 'target_claimed', 'claim_approved', 'claim_rejected',
  'connection_request', 'connection_accepted', 'connection_rejected',
  'new_message'
));