-- Fix notifications table to support connection request types
-- Run this SQL in your Supabase dashboard

-- First, let's check what notification types are currently allowed
-- SELECT column_name, check_clause
-- FROM information_schema.check_constraints cc
-- JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
-- WHERE ccu.table_name = 'notifications' AND ccu.column_name = 'type';

-- Option 1: Add the missing notification types to the existing constraint
-- Drop the existing constraint first
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recreate with all needed notification types
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'invite_sent', 'invite_accepted', 'invite_declined',
  'chain_joined', 'chain_completed', 'chain_failed',
  'reward_earned', 'target_claimed', 'claim_approved', 'claim_rejected',
  'connection_request', 'connection_accepted', 'connection_rejected'
));

-- Option 2: Alternative - Remove notifications from the functions entirely for now
-- Update the send_direct_connection_request function without notifications
CREATE OR REPLACE FUNCTION send_direct_connection_request(
  p_receiver_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_sender_id UUID;
BEGIN
  -- Get authenticated user ID
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF v_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'Cannot send connection request to yourself';
  END IF;

  -- Check if users are already connected
  IF EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE (user1_id = v_sender_id AND user2_id = p_receiver_id)
       OR (user1_id = p_receiver_id AND user2_id = v_sender_id)
    AND status = 'connected'
  ) THEN
    RAISE EXCEPTION 'Users are already connected';
  END IF;

  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM public.direct_connection_requests
    WHERE ((sender_id = v_sender_id AND receiver_id = p_receiver_id)
           OR (sender_id = p_receiver_id AND receiver_id = v_sender_id))
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Connection request already exists';
  END IF;

  -- Create the request
  INSERT INTO public.direct_connection_requests (
    sender_id,
    receiver_id,
    message,
    status
  )
  VALUES (
    v_sender_id,
    p_receiver_id,
    p_message,
    'pending'
  )
  RETURNING id INTO v_request_id;

  -- Update sender's last_active
  UPDATE public.users
  SET last_active = now(), updated_at = now()
  WHERE id = v_sender_id;

  RETURN v_request_id;
END;
$$;

-- Update the respond_to_direct_connection_request function without notifications
CREATE OR REPLACE FUNCTION respond_to_direct_connection_request(
  p_request_id UUID,
  p_response TEXT -- 'accepted' or 'rejected'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_user_id UUID;
  v_connection_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF p_response NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid response. Must be "accepted" or "rejected"';
  END IF;

  -- Get the request
  SELECT * INTO v_request
  FROM public.direct_connection_requests
  WHERE id = p_request_id
    AND receiver_id = v_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Update request status
  UPDATE public.direct_connection_requests
  SET
    status = p_response,
    updated_at = now()
  WHERE id = p_request_id;

  -- If accepted, create the connection
  IF p_response = 'accepted' THEN
    SELECT create_user_connection(
      v_request.sender_id,
      v_request.receiver_id,
      NULL -- No connection request ID for direct connections
    ) INTO v_connection_id;
  END IF;

  -- Update receiver's last_active
  UPDATE public.users
  SET last_active = now(), updated_at = now()
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

-- Grant permissions again to be sure
GRANT EXECUTE ON FUNCTION send_direct_connection_request TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_direct_connection_request TO authenticated;