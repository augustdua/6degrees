-- Comprehensive database fixes for target claims and notifications
-- Apply these changes to your Supabase database

-- 1. Fix target claims authentication
-- Create function to set claimant_id to current user
CREATE OR REPLACE FUNCTION set_claimant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set claimant_id to the current authenticated user
    NEW.claimant_id := auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set claimant_id on insert
DROP TRIGGER IF EXISTS trigger_set_claimant_id ON public.target_claims;
CREATE TRIGGER trigger_set_claimant_id
    BEFORE INSERT ON public.target_claims
    FOR EACH ROW
    EXECUTE FUNCTION set_claimant_id();

-- Update RLS policies for target claims
DROP POLICY IF EXISTS "Users can view their own claims" ON public.target_claims;
CREATE POLICY "Users can view their own claims" ON public.target_claims
    FOR SELECT USING (auth.uid() = claimant_id);

DROP POLICY IF EXISTS "Users can create claims" ON public.target_claims;
CREATE POLICY "Users can create claims" ON public.target_claims
    FOR INSERT WITH CHECK (auth.uid() = claimant_id);

-- 2. Fix notifications table constraints
-- Make sure notifications table allows proper null values and has correct structure
ALTER TABLE public.notifications
    ALTER COLUMN data SET DEFAULT '{}'::jsonb,
    ALTER COLUMN read SET DEFAULT false,
    ALTER COLUMN created_at SET DEFAULT now();

-- Ensure notifications have proper indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read) WHERE read = false;

-- 3. Update the approve_target_claim function to use linear rewards and fix notification issues
CREATE OR REPLACE FUNCTION approve_target_claim(claim_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim RECORD;
  v_request RECORD;
  v_total_reward DECIMAL;
  v_chain_participants RECORD[];
  v_total_participants INTEGER;
  v_total_shares INTEGER;
  v_share_value DECIMAL;
  v_participant RECORD;
  v_shares INTEGER;
  v_reward_amount DECIMAL;
  v_connection_id UUID;
  i INTEGER;
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

  -- Get all chain participants
  SELECT ARRAY(
    SELECT ROW(user_id, position)::RECORD
    FROM chains
    WHERE request_id = v_claim.request_id
    ORDER BY position
  ) INTO v_chain_participants;

  -- Add the target claimant as the final participant
  v_total_participants := COALESCE(array_length(v_chain_participants, 1), 0) + 1;

  -- Calculate total shares using the formula: L(L+1)/2
  v_total_shares := (v_total_participants * (v_total_participants + 1)) / 2;

  -- Calculate value per share: Budget B / Total Shares
  v_total_reward := v_claim.reward;
  v_share_value := v_total_reward / v_total_shares;

  -- Distribute rewards to chain participants (closer to target = more shares)
  FOR i IN 1..COALESCE(array_length(v_chain_participants, 1), 0) LOOP
    v_participant := v_chain_participants[i];

    -- Shares increase as we get closer to target
    v_shares := i;
    v_reward_amount := v_share_value * v_shares;

    -- Create transaction for chain participant
    INSERT INTO wallet_transactions (
      user_id, type, amount, description, status,
      connection_request_id, metadata
    ) VALUES (
      v_participant.f1::UUID, 'credit', v_reward_amount,
      'Chain participation reward (position ' || i || ')', 'completed',
      v_claim.request_id,
      jsonb_build_object(
        'claim_id', claim_uuid,
        'reward_type', 'chain_participation',
        'chain_position', i,
        'shares', v_shares,
        'share_value', v_share_value
      )
    );

    -- Update participant wallet
    INSERT INTO wallets (user_id, balance, total_earned)
    VALUES (v_participant.f1::UUID, v_reward_amount, v_reward_amount)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = wallets.balance + v_reward_amount,
      total_earned = wallets.total_earned + v_reward_amount,
      updated_at = now();

    -- Create notification for chain participant (avoid self-notification)
    IF v_participant.f1::UUID != auth.uid() THEN
      INSERT INTO notifications (
        user_id, type, title, message, data
      ) VALUES (
        v_participant.f1::UUID, 'reward_received', 'Chain Reward Received!',
        'You received ' || v_shares || ' shares worth $' || v_reward_amount || ' for being in position ' || i || ' of the chain!',
        jsonb_build_object(
          'claim_id', claim_uuid,
          'reward_amount', v_reward_amount,
          'chain_position', i,
          'shares', v_shares,
          'total_participants', v_total_participants
        )
      );
    END IF;
  END LOOP;

  -- Give reward to the target claimant (gets the most shares = L)
  v_shares := v_total_participants;
  v_reward_amount := v_share_value * v_shares;

  INSERT INTO wallet_transactions (
    user_id, type, amount, description, status,
    connection_request_id, metadata
  ) VALUES (
    v_claim.claimant_id, 'credit', v_reward_amount,
    'Target reached reward (' || v_shares || ' shares)', 'completed',
    v_claim.request_id,
    jsonb_build_object(
      'claim_id', claim_uuid,
      'reward_type', 'target_reached',
      'shares', v_shares,
      'share_value', v_share_value
    )
  );

  -- Update claimant wallet
  INSERT INTO wallets (user_id, balance, total_earned)
  VALUES (v_claim.claimant_id, v_reward_amount, v_reward_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = wallets.balance + v_reward_amount,
    total_earned = wallets.total_earned + v_reward_amount,
    updated_at = now();

  -- Create notification for claimant (avoid self-notification)
  IF v_claim.claimant_id != auth.uid() THEN
    INSERT INTO notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_claim.claimant_id, 'claim_approved', 'Claim Approved!',
      'Your target claim has been approved and you received ' || v_shares || ' shares worth $' || v_reward_amount || '!',
      jsonb_build_object(
        'claim_id', claim_uuid,
        'reward_amount', v_reward_amount,
        'connection_id', v_connection_id,
        'shares', v_shares,
        'total_participants', v_total_participants
      )
    );
  END IF;
END;
$$;

-- 4. Ensure proper RLS policies are in place for all related tables
-- Enable RLS on target_claims if not already enabled
ALTER TABLE public.target_claims ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notifications if not already enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow system functions to insert notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);