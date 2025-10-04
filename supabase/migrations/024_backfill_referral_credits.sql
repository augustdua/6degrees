-- One-time script to backfill referral credits for existing chain participants
-- This awards credits to everyone who has already referred someone to the chain

DO $$
DECLARE
  v_chain RECORD;
  v_participant JSONB;
  v_parent_user_id UUID;
  v_child_user_id UUID;
  v_request_id UUID;
  v_creator_id UUID := 'dddffff1-bfed-40a6-a99c-28dccb4c5014'; -- August Dua (creator)
  v_credit_amount INT := 5;
  v_awarded_count INT := 0;
BEGIN
  -- Loop through all active chains
  FOR v_chain IN
    SELECT id, request_id, participants
    FROM chains
    WHERE status = 'active'
  LOOP
    v_request_id := v_chain.request_id;

    -- Loop through all participants in this chain
    FOR v_participant IN
      SELECT elem
      FROM jsonb_array_elements(v_chain.participants) elem
      WHERE elem->>'parentUserId' IS NOT NULL
    LOOP
      v_parent_user_id := (v_participant->>'parentUserId')::uuid;
      v_child_user_id := (v_participant->>'userid')::uuid;

      -- Skip if parent is the creator (we don't award credits to creator for their own referrals)
      IF v_parent_user_id = v_creator_id THEN
        CONTINUE;
      END IF;

      -- Check if credit has already been awarded for this referral
      IF NOT EXISTS (
        SELECT 1 FROM credit_transactions
        WHERE user_id = v_parent_user_id
        AND related_user_id = v_child_user_id
        AND source = 'referral_join'
        AND chain_id = v_chain.id
      ) THEN
        -- Award the credit
        INSERT INTO credit_transactions (
          user_id,
          amount,
          transaction_type,
          source,
          description,
          chain_id,
          request_id,
          related_user_id
        ) VALUES (
          v_parent_user_id,
          v_credit_amount,
          'earned',
          'referral_join',
          'Earned from chain referral',
          v_chain.id,
          v_request_id,
          v_child_user_id
        );

        -- Update user_credits
        INSERT INTO user_credits (user_id, total_credits, earned_credits, spent_credits)
        VALUES (v_parent_user_id, v_credit_amount, v_credit_amount, 0)
        ON CONFLICT (user_id)
        DO UPDATE SET
          total_credits = user_credits.total_credits + v_credit_amount,
          earned_credits = user_credits.earned_credits + v_credit_amount,
          updated_at = now();

        v_awarded_count := v_awarded_count + 1;

        RAISE NOTICE 'Awarded % credits to user % for referring user %',
          v_credit_amount, v_parent_user_id, v_child_user_id;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfill complete! Awarded credits for % referrals', v_awarded_count;
END $$;
