-- Add user discovery and social networking features
-- Migration 014: User Discovery System

-- Extend users table with professional and discovery fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'connections', 'private'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create direct connection requests table
CREATE TABLE public.direct_connection_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Prevent self-requests and duplicates
  CONSTRAINT no_self_requests CHECK (sender_id != receiver_id),
  CONSTRAINT unique_pending_request UNIQUE (sender_id, receiver_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for efficient querying
CREATE INDEX idx_direct_requests_receiver ON public.direct_connection_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX idx_direct_requests_sender ON public.direct_connection_requests(sender_id);
CREATE INDEX idx_users_discovery ON public.users(visibility, last_active) WHERE visibility IN ('public', 'connections');
CREATE INDEX idx_users_company ON public.users(company) WHERE company IS NOT NULL;
CREATE INDEX idx_users_location ON public.users(location) WHERE location IS NOT NULL;

-- Enable RLS on direct connection requests
ALTER TABLE public.direct_connection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for direct connection requests
CREATE POLICY "Users can view requests they sent or received" ON public.direct_connection_requests
FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can create direct connection requests" ON public.direct_connection_requests
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND sender_id != receiver_id
);

CREATE POLICY "Users can update requests they sent or received" ON public.direct_connection_requests
FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Function to send a direct connection request
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

  -- Create notification for receiver
  INSERT INTO notifications (
    user_id, type, title, message, data
  ) VALUES (
    p_receiver_id, 'connection_request', 'New Connection Request',
    'Someone wants to connect with you',
    jsonb_build_object(
      'request_id', v_request_id,
      'sender_id', v_sender_id
    )
  );

  -- Update sender's last_active
  UPDATE public.users
  SET last_active = now(), updated_at = now()
  WHERE id = v_sender_id;

  RETURN v_request_id;
END;
$$;

-- Function to respond to a direct connection request
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

    -- Create notification for sender
    INSERT INTO notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_request.sender_id, 'connection_accepted', 'Connection Request Accepted!',
      'Your connection request has been accepted',
      jsonb_build_object(
        'connection_id', v_connection_id,
        'accepter_id', v_user_id
      )
    );
  ELSE
    -- Create notification for sender about rejection (optional)
    INSERT INTO notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_request.sender_id, 'connection_rejected', 'Connection Request Declined',
      'Your connection request was declined',
      jsonb_build_object(
        'request_id', p_request_id
      )
    );
  END IF;

  -- Update receiver's last_active
  UPDATE public.users
  SET last_active = now(), updated_at = now()
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

-- Function to discover users (with privacy controls)
CREATE OR REPLACE FUNCTION discover_users(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_exclude_connected BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  company TEXT,
  role TEXT,
  location TEXT,
  linkedin_url TEXT,
  skills TEXT[],
  interests TEXT[],
  mutual_connections INTEGER,
  last_active TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN,
  has_pending_request BOOLEAN
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
    u.id as user_id,
    u.first_name,
    u.last_name,
    CASE
      WHEN u.visibility = 'public' OR
           EXISTS(SELECT 1 FROM public.user_connections uc
                  WHERE ((uc.user1_id = v_current_user_id AND uc.user2_id = u.id) OR
                         (uc.user1_id = u.id AND uc.user2_id = v_current_user_id))
                  AND uc.status = 'connected')
      THEN u.email
      ELSE NULL
    END as email,
    u.avatar_url,
    u.bio,
    u.company,
    u.role,
    u.location,
    u.linkedin_url,
    u.skills,
    u.interests,
    -- Count mutual connections
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.user_connections uc1
      JOIN public.user_connections uc2 ON (
        (uc1.user1_id = uc2.user1_id OR uc1.user1_id = uc2.user2_id OR
         uc1.user2_id = uc2.user1_id OR uc1.user2_id = uc2.user2_id)
        AND uc1.id != uc2.id
      )
      WHERE ((uc1.user1_id = v_current_user_id OR uc1.user2_id = v_current_user_id) AND
             (uc2.user1_id = u.id OR uc2.user2_id = u.id))
        AND uc1.status = 'connected' AND uc2.status = 'connected'
    ), 0) as mutual_connections,
    u.last_active,
    -- Check if already connected
    EXISTS(
      SELECT 1 FROM public.user_connections uc
      WHERE ((uc.user1_id = v_current_user_id AND uc.user2_id = u.id) OR
             (uc.user1_id = u.id AND uc.user2_id = v_current_user_id))
      AND uc.status = 'connected'
    ) as is_connected,
    -- Check if has pending connection request
    EXISTS(
      SELECT 1 FROM public.direct_connection_requests dcr
      WHERE ((dcr.sender_id = v_current_user_id AND dcr.receiver_id = u.id) OR
             (dcr.sender_id = u.id AND dcr.receiver_id = v_current_user_id))
      AND dcr.status = 'pending'
    ) as has_pending_request
  FROM public.users u
  WHERE u.id != v_current_user_id
    AND (u.visibility = 'public' OR
         (u.visibility = 'connections' AND EXISTS(
           SELECT 1 FROM public.user_connections uc
           WHERE ((uc.user1_id = v_current_user_id AND uc.user2_id = u.id) OR
                  (uc.user1_id = u.id AND uc.user2_id = v_current_user_id))
           AND uc.status = 'connected'
         )))
    -- Apply search filters
    AND (p_search IS NULL OR
         (u.first_name || ' ' || u.last_name) ILIKE '%' || p_search || '%' OR
         u.bio ILIKE '%' || p_search || '%' OR
         u.company ILIKE '%' || p_search || '%' OR
         u.role ILIKE '%' || p_search || '%')
    AND (p_company IS NULL OR u.company ILIKE '%' || p_company || '%')
    AND (p_location IS NULL OR u.location ILIKE '%' || p_location || '%')
    -- Optionally exclude already connected users
    AND (NOT p_exclude_connected OR NOT EXISTS(
      SELECT 1 FROM public.user_connections uc
      WHERE ((uc.user1_id = v_current_user_id AND uc.user2_id = u.id) OR
             (uc.user1_id = u.id AND uc.user2_id = v_current_user_id))
      AND uc.status = 'connected'
    ))
  ORDER BY
    -- Prioritize users with mutual connections
    mutual_connections DESC,
    -- Then by recent activity
    u.last_active DESC NULLS LAST,
    -- Then by creation date
    u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_direct_connection_request TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_direct_connection_request TO authenticated;
GRANT EXECUTE ON FUNCTION discover_users TO authenticated;

-- Add updated_at trigger for direct_connection_requests
CREATE TRIGGER trg_direct_connection_requests_updated_at
BEFORE UPDATE ON public.direct_connection_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update existing users' last_active field
UPDATE public.users SET last_active = updated_at WHERE last_active IS NULL;