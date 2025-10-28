-- Fix: Remove the conversation_participants check that breaks direct messages
-- We only need the simple policy for direct messages with receiver_id

-- Drop the problematic policy that checks conversation_participants
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- Keep only the simple policy that allows sending if sender_id = auth.uid()
-- This works for both conversation_id and receiver_id messages
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
TO public
WITH CHECK (sender_id = auth.uid());

COMMENT ON POLICY "Users can send messages" ON messages IS 
'Allows users to send messages (both conversation_id and receiver_id based)';

