-- Fix the approve_target_claim function to use existing tables and fix column references
CREATE OR REPLACE FUNCTION approve_target_claim(claim_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim RECORD;
  v_request RECORD;
  v_total_reward DECIMAL;
  v_total_participants INTEGER;
  v_total_shares INTEGER;
  v_share_value DECIMAL;
  v_shares INTEGER;
  v_reward_amount DECIMAL;
  v_connection_id UUID;
  v_participant_user_id UUID;
  v_participant_wallet_id UUID;
  v_claimant_wallet_id UUID;
  i INTEGER;
  v_reviewer_id UUID;
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

  -- Handle authentication - use creator_id if no auth.uid()
  v_reviewer_id := COALESCE(auth.uid(), v_claim.creator_id::UUID);

  -- Update claim status
  UPDATE target_claims
  SET
    status = 'approved',
    reviewed_by = v_reviewer_id,
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

  -- Count chain participants
  SELECT COUNT(*) INTO v_total_participants
  FROM chains
  WHERE request_id = v_claim.request_id;

  -- Add the target claimant as the final participant
  v_total_participants := v_total_participants + 1;

  -- Calculate total shares using the formula: L(L+1)/2
  v_total_shares := (v_total_participants * (v_total_participants + 1)) / 2;

  -- Calculate value per share: Budget B / Total Shares
  v_total_reward := v_claim.reward;
  v_share_value := v_total_reward / v_total_shares;

  -- Distribute rewards to chain participants (closer to target = more shares)
  FOR i IN 1..(v_total_participants - 1) LOOP
    -- Get participant user_id from chains table
    SELECT user_id INTO v_participant_user_id
    FROM chains
    WHERE request_id = v_claim.request_id
    ORDER BY position
    LIMIT 1 OFFSET (i - 1);

    -- Get participant's wallet
    SELECT id INTO v_participant_wallet_id
    FROM wallets
    WHERE user_id = v_participant_user_id;

    -- Shares increase as we get closer to target
    -- Position 1 gets 1 share, position 2 gets 2 shares, etc.
    v_shares := i;
    v_reward_amount := v_share_value * v_shares;

    -- Create transaction for chain participant using existing transactions table
    INSERT INTO transactions (
      wallet_id, amount, type, description, status, reference_id
    ) VALUES (
      v_participant_wallet_id, v_reward_amount, 'credit',
      'Chain participation reward (position ' || i || ')', 'completed',
      v_claim.request_id
    );

    -- Update participant wallet
    UPDATE wallets
    SET balance = balance + v_reward_amount,
        total_earned = total_earned + v_reward_amount,
        updated_at = now()
    WHERE id = v_participant_wallet_id;
  END LOOP;

  -- Give reward to the target claimant (gets the most shares = L)
  v_shares := v_total_participants;
  v_reward_amount := v_share_value * v_shares;

  -- Get claimant's wallet
  SELECT id INTO v_claimant_wallet_id
  FROM wallets
  WHERE user_id = v_claim.claimant_id;

  -- Create transaction for claimant using existing transactions table
  INSERT INTO transactions (
    wallet_id, amount, type, description, status, reference_id
  ) VALUES (
    v_claimant_wallet_id, v_reward_amount, 'credit',
    'Target reached reward (' || v_shares || ' shares)', 'completed',
    v_claim.request_id
  );

  -- Update claimant wallet
  UPDATE wallets
  SET balance = balance + v_reward_amount,
      total_earned = total_earned + v_reward_amount,
      updated_at = now()
  WHERE id = v_claimant_wallet_id;

  -- Create notification for claimant
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

  -- Create notifications for chain participants
  FOR i IN 1..(v_total_participants - 1) LOOP
    -- Get participant user_id from chains table
    SELECT user_id INTO v_participant_user_id
    FROM chains
    WHERE request_id = v_claim.request_id
    ORDER BY position
    LIMIT 1 OFFSET (i - 1);

    v_shares := i;
    v_reward_amount := v_share_value * v_shares;

    INSERT INTO notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_participant_user_id, 'reward_received', 'Chain Reward Received!',
      'You received ' || v_shares || ' shares worth $' || v_reward_amount || ' for being in position ' || i || ' of the chain!',
      jsonb_build_object(
        'claim_id', claim_uuid,
        'reward_amount', v_reward_amount,
        'chain_position', i,
        'shares', v_shares,
        'total_participants', v_total_participants
      )
    );
  END LOOP;
END;
$$;

