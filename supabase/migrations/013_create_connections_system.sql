-- Create user connections table
CREATE TABLE public.user_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'blocked')),
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  connection_request_id UUID REFERENCES public.connection_requests(id), -- Optional reference to the request that created this connection
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Ensure users can't connect to themselves
  CONSTRAINT no_self_connection CHECK (user1_id != user2_id),
  -- Ensure unique connection pairs (bidirectional)
  CONSTRAINT unique_connection UNIQUE (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_connections_user1 ON public.user_connections(user1_id) WHERE status = 'connected';
CREATE INDEX idx_user_connections_user2 ON public.user_connections(user2_id) WHERE status = 'connected';
CREATE INDEX idx_user_connections_request ON public.user_connections(connection_request_id);

-- Enable RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own connections" ON public.user_connections
FOR SELECT USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

CREATE POLICY "System can insert connections" ON public.user_connections
FOR INSERT WITH CHECK (true); -- Will be handled by functions

CREATE POLICY "Users can update their own connections" ON public.user_connections
FOR UPDATE USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Function to create a connection between two users
CREATE OR REPLACE FUNCTION create_user_connection(
  p_user1_id UUID,
  p_user2_id UUID,
  p_connection_request_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_connection_id UUID;
  v_smaller_id UUID;
  v_larger_id UUID;
BEGIN
  -- Validate inputs
  IF p_user1_id IS NULL OR p_user2_id IS NULL THEN
    RAISE EXCEPTION 'Both user IDs are required';
  END IF;

  IF p_user1_id = p_user2_id THEN
    RAISE EXCEPTION 'Users cannot connect to themselves';
  END IF;

  -- Order the IDs to ensure consistency
  SELECT LEAST(p_user1_id, p_user2_id), GREATEST(p_user1_id, p_user2_id)
  INTO v_smaller_id, v_larger_id;

  -- Insert or update the connection
  INSERT INTO public.user_connections (
    user1_id,
    user2_id,
    connection_request_id,
    status
  )
  VALUES (
    v_smaller_id,
    v_larger_id,
    p_connection_request_id,
    'connected'
  )
  ON CONFLICT (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
  DO UPDATE SET
    status = 'connected',
    connected_at = now(),
    connection_request_id = COALESCE(EXCLUDED.connection_request_id, user_connections.connection_request_id),
    updated_at = now()
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$;

-- Function to get a user's connections with profile info
CREATE OR REPLACE FUNCTION get_user_connections(p_user_id UUID)
RETURNS TABLE (
  connection_id UUID,
  connected_user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  linkedin_url TEXT,
  avatar_url TEXT,
  bio TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  connection_request_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id as connection_id,
    CASE
      WHEN uc.user1_id = p_user_id THEN uc.user2_id
      ELSE uc.user1_id
    END as connected_user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.linkedin_url,
    u.avatar_url,
    u.bio,
    uc.connected_at,
    uc.connection_request_id
  FROM public.user_connections uc
  JOIN public.users u ON (
    CASE
      WHEN uc.user1_id = p_user_id THEN u.id = uc.user2_id
      ELSE u.id = uc.user1_id
    END
  )
  WHERE (uc.user1_id = p_user_id OR uc.user2_id = p_user_id)
    AND uc.status = 'connected'
  ORDER BY uc.connected_at DESC;
END;
$$;

-- Update the approve_target_claim function to create connections
CREATE OR REPLACE FUNCTION approve_target_claim(claim_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim RECORD;
  v_request RECORD;
  v_total_reward DECIMAL;
  v_remaining_reward DECIMAL;
  v_claimant_reward DECIMAL;
  v_node RECORD;
  v_node_reward DECIMAL;
  v_total_nodes INTEGER;
  v_connection_id UUID;
BEGIN
  -- Get the claim details
  SELECT tc.*, cr.creator_id, cr.reward, cr.target
  INTO v_claim
  FROM target_claims tc
  JOIN connection_requests cr ON tc.request_id = cr.id
  WHERE tc.id = claim_uuid AND tc.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found or already processed';
  END IF;

  -- Update claim status
  UPDATE target_claims
  SET
    status = 'approved',
    reviewed_by = auth.uid()::text,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = claim_uuid;

  -- Mark the request as completed
  UPDATE connection_requests
  SET
    status = 'completed',
    updated_at = now()
  WHERE id = v_claim.request_id;

  -- Create connection between creator and claimant
  SELECT create_user_connection(
    v_claim.creator_id::UUID,
    v_claim.claimant_id::UUID,
    v_claim.request_id::UUID
  ) INTO v_connection_id;

  -- Calculate rewards (same as before)
  v_total_reward := v_claim.reward;
  v_claimant_reward := v_total_reward * 0.5; -- 50% to claimant
  v_remaining_reward := v_total_reward - v_claimant_reward;

  -- Count chain nodes
  SELECT COUNT(*) INTO v_total_nodes
  FROM chains
  WHERE request_id = v_claim.request_id;

  -- Give reward to the claimant
  INSERT INTO wallet_transactions (
    user_id, type, amount, description, status,
    connection_request_id, metadata
  ) VALUES (
    v_claim.claimant_id, 'credit', v_claimant_reward,
    'Target reached reward', 'completed',
    v_claim.request_id,
    jsonb_build_object('claim_id', claim_uuid, 'reward_type', 'target_reached')
  );

  -- Update claimant wallet
  INSERT INTO wallets (user_id, balance, total_earned)
  VALUES (v_claim.claimant_id, v_claimant_reward, v_claimant_reward)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = wallets.balance + v_claimant_reward,
    total_earned = wallets.total_earned + v_claimant_reward,
    updated_at = now();

  -- Distribute remaining reward among chain nodes
  IF v_total_nodes > 0 THEN
    v_node_reward := v_remaining_reward / v_total_nodes;

    FOR v_node IN
      SELECT user_id, position
      FROM chains
      WHERE request_id = v_claim.request_id
      ORDER BY position
    LOOP
      -- Give reward to chain node
      INSERT INTO wallet_transactions (
        user_id, type, amount, description, status,
        connection_request_id, metadata
      ) VALUES (
        v_node.user_id, 'credit', v_node_reward,
        'Chain participation reward', 'completed',
        v_claim.request_id,
        jsonb_build_object(
          'claim_id', claim_uuid,
          'reward_type', 'chain_participation',
          'chain_position', v_node.position
        )
      );

      -- Update node wallet
      INSERT INTO wallets (user_id, balance, total_earned)
      VALUES (v_node.user_id, v_node_reward, v_node_reward)
      ON CONFLICT (user_id) DO UPDATE SET
        balance = wallets.balance + v_node_reward,
        total_earned = wallets.total_earned + v_node_reward,
        updated_at = now();
    END LOOP;
  END IF;

  -- Create notification for claimant
  INSERT INTO notifications (
    user_id, type, title, message, data
  ) VALUES (
    v_claim.claimant_id, 'claim_approved', 'Claim Approved!',
    'Your target claim has been approved and you have received your reward!',
    jsonb_build_object(
      'claim_id', claim_uuid,
      'reward_amount', v_claimant_reward,
      'connection_id', v_connection_id
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_connection TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_connections TO authenticated;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS trg_user_connections_updated_at ON public.user_connections;
CREATE TRIGGER trg_user_connections_updated_at
BEFORE UPDATE ON public.user_connections
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();