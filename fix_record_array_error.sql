-- Fix the RECORD[] pseudo-type error in approve_target_claim function
-- PostgreSQL doesn't support RECORD[] arrays directly

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
  i INTEGER;
  v_reviewer_id UUID;
  v_participant_user_id UUID;
  v_participant_position INTEGER;
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

  -- Get total participants count (including the target claimant)
  SELECT COUNT(*) + 1 INTO v_total_participants
  FROM chains
  WHERE request_id = v_claim.request_id;

  -- Calculate total shares and share value
  v_total_shares := (v_total_participants * (v_total_participants + 1)) / 2;
  v_total_reward := v_claim.reward;
  v_share_value := v_total_reward / v_total_shares;

  -- Distribute rewards to existing chain participants
  FOR v_participant_user_id, v_participant_position IN 
    SELECT user_id, position 
    FROM chains 
    WHERE request_id = v_claim.request_id 
    ORDER BY position
  LOOP
    v_shares := v_total_participants - v_participant_position + 1;
    v_reward_amount := v_share_value * v_shares;

    -- Update user wallet
    UPDATE public.wallets
    SET 
      balance = balance + v_reward_amount,
      total_earned = total_earned + v_reward_amount,
      updated_at = now()
    WHERE user_id = v_participant_user_id;

    -- Create transaction record
    INSERT INTO public.transactions (
      wallet_id,
      type,
      amount,
      description,
      created_at
    )
    SELECT 
      w.id,
      'reward',
      v_reward_amount,
      'Chain completion reward - Position ' || v_participant_position,
      now()
    FROM public.wallets w
    WHERE w.user_id = v_participant_user_id;

    -- Create notification
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data,
      created_at
    ) VALUES (
      v_participant_user_id,
      'reward_received',
      'Chain Completed!',
      'You received $' || v_reward_amount || ' for completing the chain',
      jsonb_build_object(
        'chain_id', v_claim.chain_id,
        'amount', v_reward_amount,
        'position', v_participant_position
      ),
      now()
    );
  END LOOP;

  -- Add reward for the target claimant (final position)
  v_shares := 1; -- Target claimant gets the highest reward (position = total_participants)
  v_reward_amount := v_share_value * v_shares;

  -- Update target claimant's wallet
  UPDATE public.wallets
  SET 
    balance = balance + v_reward_amount,
    total_earned = total_earned + v_reward_amount,
    updated_at = now()
  WHERE user_id = v_claim.claimant_id;

  -- Create transaction record for target claimant
  INSERT INTO public.transactions (
    wallet_id,
    type,
    amount,
    description,
    created_at
  )
  SELECT 
    w.id,
    'reward',
    v_reward_amount,
    'Chain completion reward - Target Position',
    now()
  FROM public.wallets w
  WHERE w.user_id = v_claim.claimant_id;

  -- Create notification for target claimant
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data,
    created_at
  ) VALUES (
    v_claim.claimant_id,
    'reward_received',
    'Chain Completed!',
    'You received $' || v_reward_amount || ' for completing the chain as the target',
    jsonb_build_object(
      'chain_id', v_claim.chain_id,
      'amount', v_reward_amount,
      'position', v_total_participants
    ),
    now()
  );

END;
$$;

-- Verify the function was updated
SELECT 
    'FUNCTION_UPDATED' as status,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'approve_target_claim' 
AND routine_schema = 'public';
