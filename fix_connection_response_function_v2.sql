-- Fix respond_to_direct_connection_request function (version 2)
-- This function handles responding to direct connection requests

CREATE OR REPLACE FUNCTION public.respond_to_direct_connection_request(
  p_request_id UUID,
  p_response TEXT
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
    -- Insert into user_connections table with proper ordering
    INSERT INTO public.user_connections (
      user1_id,
      user2_id,
      status,
      connection_request_id,
      connected_at,
      created_at,
      updated_at
    )
    VALUES (
      LEAST(v_request.sender_id, v_request.receiver_id),
      GREATEST(v_request.sender_id, v_request.receiver_id),
      'connected',
      NULL, -- Direct connections don't have connection_request_id
      now(),
      now(),
      now()
    )
    ON CONFLICT (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
    DO UPDATE SET
      status = 'connected',
      connected_at = now(),
      updated_at = now()
    RETURNING id INTO v_connection_id;
  END IF;

  -- Update receiver's last_active
  UPDATE public.users
  SET last_active = now(), updated_at = now()
  WHERE id = v_user_id;

  -- Create notification for sender if notifications table exists
  BEGIN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      metadata
    )
    VALUES (
      v_request.sender_id,
      CASE WHEN p_response = 'accepted' THEN 'connection_accepted' ELSE 'connection_rejected' END,
      CASE
        WHEN p_response = 'accepted' THEN 'Connection Accepted!'
        ELSE 'Connection Request Declined'
      END,
      CASE
        WHEN p_response = 'accepted' THEN 'Your connection request has been accepted'
        ELSE 'Your connection request has been declined'
      END,
      json_build_object(
        'request_id', p_request_id,
        'responder_id', v_user_id,
        'response', p_response
      )
    );
  EXCEPTION
    WHEN others THEN
      -- If notifications table doesn't exist or has issues, continue without error
      NULL;
  END;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.respond_to_direct_connection_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_direct_connection_request TO anon;