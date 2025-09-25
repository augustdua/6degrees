-- Fix target claim approval database function
-- This addresses PostgreSQL error 23502 (not_null_violation)

-- Step 1: Make reviewed_by nullable to handle anonymous users
ALTER TABLE public.target_claims 
ALTER COLUMN reviewed_by DROP NOT NULL;

-- Step 2: Update the approve_target_claim function with better error handling
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
  v_reviewer_id TEXT;
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
  v_reviewer_id := COALESCE(auth.uid()::text, v_claim.creator_id::text);

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

  -- Get all chain participants (including the target claimant)
  SELECT ARRAY(
    SELECT ROW(user_id, position)::RECORD
    FROM chains
    WHERE request_id = v_claim.request_id
    ORDER BY position
  ) INTO v_chain_participants;

  -- Add the target claimant as the final participant
  v_chain_participants := v_chain_participants || ARRAY[ROW(v_claim.claimant_id::UUID, array_length(v_chain_participants, 1) + 1)::RECORD];

  -- Calculate total participants and shares
  v_total_participants := array_length(v_chain_participants, 1);
  v_total_shares := (v_total_participants * (v_total_participants + 1)) / 2;
  v_total_reward := v_claim.reward;
  v_share_value := v_total_reward / v_total_shares;

  -- Distribute rewards to chain participants
  FOR i IN 1..v_total_participants LOOP
    v_participant := v_chain_participants[i];
    v_shares := v_total_participants - i + 1;
    v_reward_amount := v_share_value * v_shares;

    -- Update user wallet
    UPDATE public.wallets
    SET 
      balance = balance + v_reward_amount,
      total_earned = total_earned + v_reward_amount,
      updated_at = now()
    WHERE user_id = (v_participant).user_id;

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
      'Chain completion reward - Position ' || i,
      now()
    FROM public.wallets w
    WHERE w.user_id = (v_participant).user_id;

    -- Create notification
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data,
      created_at
    ) VALUES (
      (v_participant).user_id,
      'reward_received',
      'Chain Completed!',
      'You received $' || v_reward_amount || ' for completing the chain',
      jsonb_build_object(
        'chain_id', v_claim.chain_id,
        'amount', v_reward_amount,
        'position', i
      ),
      now()
    );
  END LOOP;

END;
$$;

-- Step 3: Add RLS policy for anonymous users to view shareable links
CREATE POLICY "Anonymous users can view active requests via shareable link" ON public.connection_requests
    FOR SELECT USING (
        status = 'active' 
        AND expires_at > NOW() 
        AND deleted_at IS NULL
        AND shareable_link IS NOT NULL
    );

-- Step 4: Verify the changes
SELECT 
    'VERIFICATION' as check_type,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'target_claims' 
AND column_name = 'reviewed_by'
AND table_schema = 'public';

SELECT 
    'POLICIES_CHECK' as check_type,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE tablename = 'connection_requests'
ORDER BY policyname;
