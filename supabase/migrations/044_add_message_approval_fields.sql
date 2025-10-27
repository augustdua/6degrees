-- Add fields to messages table to support offer approval requests
-- This adds support for direct messages without requiring conversation_id

-- Make conversation_id nullable (for direct messages)
ALTER TABLE public.messages 
  ALTER COLUMN conversation_id DROP NOT NULL;

-- Add receiver_id for direct messaging
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'receiver_id'
  ) THEN
    ALTER TABLE public.messages 
      ADD COLUMN receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add message_type for special messages like offer approvals
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'message_type'
  ) THEN
    ALTER TABLE public.messages 
      ADD COLUMN message_type TEXT DEFAULT 'regular' CHECK (message_type IN ('regular', 'offer_approval_request', 'offer_approved', 'offer_rejected', 'system'));
  END IF;
END $$;

-- Add metadata for storing offer-related data
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.messages 
      ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add created_at for consistency (rename sent_at)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'created_at'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'sent_at'
    ) THEN
      ALTER TABLE public.messages RENAME COLUMN sent_at TO created_at;
    ELSE
      ALTER TABLE public.messages 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- Create index on receiver_id for direct messages
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);

-- Create index on message_type
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type) WHERE message_type != 'regular';

-- Update RLS policies to support both conversation-based and direct messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view their messages" ON public.messages
FOR SELECT USING (
  -- Can view if part of conversation
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ))
  OR
  -- Can view if direct message sender or receiver
  (receiver_id IS NOT NULL AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  (
    -- Can send to conversation if part of it
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    ))
    OR
    -- Can send direct message to any user they're connected with or for offer approvals
    (receiver_id IS NOT NULL AND (
      -- Connected users
      EXISTS (
        SELECT 1 FROM public.user_connections
        WHERE status = 'connected'
        AND ((user1_id = auth.uid() AND user2_id = receiver_id) 
          OR (user2_id = auth.uid() AND user1_id = receiver_id))
      )
      OR
      -- System can send offer approval requests
      message_type IN ('offer_approval_request', 'offer_approved', 'offer_rejected')
    ))
  )
);

-- Add constraint: must have either conversation_id or receiver_id
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_conversation_or_receiver_check;

ALTER TABLE public.messages 
  ADD CONSTRAINT messages_conversation_or_receiver_check 
  CHECK (
    (conversation_id IS NOT NULL AND receiver_id IS NULL) OR
    (conversation_id IS NULL AND receiver_id IS NOT NULL)
  );

-- Update content length constraint for special messages
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_content_check;

ALTER TABLE public.messages 
  ADD CONSTRAINT messages_content_check 
  CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 5000);

COMMENT ON COLUMN public.messages.receiver_id IS 'Direct message recipient (used when conversation_id is null)';
COMMENT ON COLUMN public.messages.message_type IS 'Type of message: regular, offer_approval_request, offer_approved, offer_rejected, system';
COMMENT ON COLUMN public.messages.metadata IS 'Additional data for special message types (e.g., offer_id, actions)';

