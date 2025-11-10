-- Add Telegram integration support
-- This migration adds fields for Telegram bot integration and notifications

-- Add Telegram fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS telegram_first_name TEXT,
ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id 
ON public.users(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.telegram_chat_id IS 'Telegram chat ID for bot notifications';
COMMENT ON COLUMN public.users.telegram_notifications_enabled IS 'Whether user wants to receive Telegram notifications';

-- Add metadata to messages table to track message source
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN public.messages.metadata IS 'Additional metadata like source (telegram, web, mobile)';

-- Create table for temporary Telegram link tokens
CREATE TABLE IF NOT EXISTS public.telegram_link_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  telegram_username TEXT,
  telegram_first_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false
);

CREATE INDEX idx_telegram_link_tokens_token ON public.telegram_link_tokens(token);
CREATE INDEX idx_telegram_link_tokens_expires ON public.telegram_link_tokens(expires_at);

-- RLS for telegram_link_tokens
ALTER TABLE public.telegram_link_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage tokens
CREATE POLICY "Service role can manage link tokens" 
ON public.telegram_link_tokens
FOR ALL 
USING (true);

-- Create table to track active Telegram conversation context
-- This allows users to reply directly from Telegram
CREATE TABLE IF NOT EXISTS public.telegram_conversation_context (
  telegram_chat_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  active_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_telegram_context_user 
ON public.telegram_conversation_context(user_id);

CREATE INDEX idx_telegram_context_activity
ON public.telegram_conversation_context(last_activity);

-- RLS for telegram_conversation_context
ALTER TABLE public.telegram_conversation_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own telegram context" 
ON public.telegram_conversation_context
FOR ALL 
USING (user_id = auth.uid());

-- Function to clean up old context (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_telegram_context()
RETURNS void 
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM telegram_conversation_context
  WHERE last_activity < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired link tokens
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_tokens()
RETURNS void
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM telegram_link_tokens
  WHERE expires_at < now() OR (used = true AND created_at < now() - interval '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Create notification queue table for Telegram messages
-- This decouples notification sending from the main transaction
CREATE TABLE IF NOT EXISTS public.telegram_notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_chat_id TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'message', 'approval', 'rejection', 'bid', 'connection_request'
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_telegram_queue_status ON public.telegram_notification_queue(status, created_at);
CREATE INDEX idx_telegram_queue_chat_id ON public.telegram_notification_queue(telegram_chat_id);

-- RLS for notification queue
ALTER TABLE public.telegram_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notification queue" 
ON public.telegram_notification_queue
FOR ALL 
USING (true);

-- Trigger function to queue Telegram notification on new message
CREATE OR REPLACE FUNCTION queue_telegram_notification_on_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  recipient_telegram_chat_id TEXT;
  recipient_notifications_enabled BOOLEAN;
  sender_name TEXT;
  conversation_users UUID[];
BEGIN
  -- Get conversation participants
  SELECT ARRAY[user1_id, user2_id] INTO conversation_users
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Determine recipient (the user who didn't send)
  recipient_id := CASE 
    WHEN conversation_users[1] = NEW.sender_id THEN conversation_users[2]
    ELSE conversation_users[1]
  END;
  
  -- Get recipient's Telegram settings and sender's name
  SELECT 
    u1.telegram_chat_id,
    u1.telegram_notifications_enabled,
    COALESCE(u2.first_name || ' ' || COALESCE(u2.last_name, ''), u2.first_name, 'Someone')
  INTO 
    recipient_telegram_chat_id, 
    recipient_notifications_enabled,
    sender_name
  FROM users u1
  CROSS JOIN users u2
  WHERE u1.id = recipient_id 
    AND u2.id = NEW.sender_id;
  
  -- Queue notification if Telegram is linked and enabled
  IF recipient_telegram_chat_id IS NOT NULL AND recipient_notifications_enabled THEN
    INSERT INTO telegram_notification_queue (
      telegram_chat_id,
      notification_type,
      payload
    ) VALUES (
      recipient_telegram_chat_id,
      'message',
      json_build_object(
        'sender_name', sender_name,
        'message', NEW.content,
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sent_at', NEW.sent_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_new_message_queue_telegram ON messages;

CREATE TRIGGER on_new_message_queue_telegram
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_telegram_notification_on_message();

-- Verification query
SELECT 
  'Telegram support migration completed' as status,
  (SELECT COUNT(*) FROM users WHERE telegram_chat_id IS NOT NULL) as linked_users_count,
  (SELECT COUNT(*) FROM telegram_notification_queue WHERE status = 'pending') as pending_notifications;






