-- Update reward distribution to use linear step-down pattern
-- Rewards increase linearly from first node to target
-- Formula: closest gets L shares, next gets L-1, etc., down to 1 share for the first person
-- Total shares = L(L+1)/2, then scaled to use exact budget B

-- Update the approve_target_claim function with new reward distribution
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

  -- Get all chain participants (including the target claimant)
  SELECT ARRAY(
    SELECT ROW(user_id, position)::RECORD
    FROM chains
    WHERE request_id = v_claim.request_id
    ORDER BY position
  ) INTO v_chain_participants;

  -- Add the target claimant as the final participant
  v_total_participants := array_length(v_chain_participants, 1) + 1;

  -- Calculate total shares using the formula: L(L+1)/2
  v_total_shares := (v_total_participants * (v_total_participants + 1)) / 2;

  -- Calculate value per share: Budget B / Total Shares
  v_total_reward := v_claim.reward;
  v_share_value := v_total_reward / v_total_shares;

  -- Distribute rewards to chain participants (closer to target = more shares)
  FOR i IN 1..array_length(v_chain_participants, 1) LOOP
    v_participant := v_chain_participants[i];

    -- Shares increase as we get closer to target
    -- Position 1 gets 1 share, position 2 gets 2 shares, etc.
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
  FOR i IN 1..array_length(v_chain_participants, 1) LOOP
    v_participant := v_chain_participants[i];
    v_shares := i;
    v_reward_amount := v_share_value * v_shares;

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
  END LOOP;
END;
$$;

-- Also update the standalone complete_chain_and_distribute_rewards function
-- to use the same linear distribution (in case it's used elsewhere)
CREATE OR REPLACE FUNCTION complete_chain_and_distribute_rewards(chain_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    chain_record RECORD;
    participant JSONB;
    participant_wallet_id UUID;
    creator_wallet_id UUID;
    total_reward DECIMAL(10,2);
    creator_user_id UUID;
    total_participants INTEGER;
    total_shares INTEGER;
    share_value DECIMAL(10,2);
    participant_position INTEGER := 1;
    participant_shares INTEGER;
    participant_reward DECIMAL(10,2);
BEGIN
    -- Get chain details
    SELECT * INTO chain_record
    FROM public.chains
    WHERE id = chain_uuid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Chain not found';
    END IF;

    -- Get creator user ID
    SELECT creator_id INTO creator_user_id
    FROM public.connection_requests
    WHERE id = chain_record.request_id;

    -- Get creator wallet
    SELECT id INTO creator_wallet_id
    FROM public.wallets
    WHERE user_id = creator_user_id;

    -- Calculate total participants and shares
    total_participants := jsonb_array_length(chain_record.participants);
    total_shares := (total_participants * (total_participants + 1)) / 2;
    total_reward := chain_record.total_reward;
    share_value := total_reward / total_shares;

    -- Deduct total reward from creator's wallet
    UPDATE public.wallets
    SET balance = balance - total_reward,
        total_spent = total_spent + total_reward
    WHERE id = creator_wallet_id;

    -- Create debit transaction for creator
    INSERT INTO public.transactions (wallet_id, amount, type, description, status, reference_id)
    VALUES (
        creator_wallet_id,
        total_reward,
        'debit',
        'Payment for completed chain with linear reward distribution',
        'completed',
        chain_uuid
    );

    -- Distribute rewards to all participants using linear distribution
    FOR participant IN SELECT * FROM jsonb_array_elements(chain_record.participants)
    LOOP
        -- Get participant's wallet
        SELECT id INTO participant_wallet_id
        FROM public.wallets
        WHERE user_id = (participant->>'userid')::UUID;

        -- Calculate shares for this position (closer to target = more shares)
        participant_shares := participant_position;
        participant_reward := share_value * participant_shares;

        -- Credit reward to participant's wallet
        UPDATE public.wallets
        SET balance = balance + participant_reward,
            total_earned = total_earned + participant_reward
        WHERE id = participant_wallet_id;

        -- Create credit transaction for participant
        INSERT INTO public.transactions (wallet_id, amount, type, description, status, reference_id)
        VALUES (
            participant_wallet_id,
            participant_reward,
            'credit',
            'Linear reward from completed chain (position ' || participant_position || ', ' || participant_shares || ' shares)',
            'completed',
            chain_uuid
        );

        participant_position := participant_position + 1;
    END LOOP;

    -- Update chain status
    UPDATE public.chains
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = chain_uuid;

    -- Update request status
    UPDATE public.connection_requests
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = chain_record.request_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;