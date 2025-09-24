-- Function to complete chain and distribute rewards
CREATE OR REPLACE FUNCTION complete_chain_and_distribute_rewards(chain_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    chain_record RECORD;
    participant JSONB;
    participant_wallet_id UUID;
    creator_wallet_id UUID;
    reward_per_person DECIMAL(10,2);
    creator_user_id UUID;
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

    -- Calculate reward per person
    reward_per_person := chain_record.total_reward / jsonb_array_length(chain_record.participants);

    -- Deduct total reward from creator's wallet
    UPDATE public.wallets
    SET balance = balance - chain_record.total_reward,
        total_spent = total_spent + chain_record.total_reward
    WHERE id = creator_wallet_id;

    -- Create debit transaction for creator
    INSERT INTO public.transactions (wallet_id, amount, type, description, status, reference_id)
    VALUES (
        creator_wallet_id,
        chain_record.total_reward,
        'debit',
        'Payment for completed chain',
        'completed',
        chain_uuid
    );

    -- Distribute rewards to all participants
    FOR participant IN SELECT * FROM jsonb_array_elements(chain_record.participants)
    LOOP
        -- Get participant's wallet
        SELECT id INTO participant_wallet_id
        FROM public.wallets
        WHERE user_id = (participant->>'userid')::UUID;

        -- Credit reward to participant's wallet
        UPDATE public.wallets
        SET balance = balance + reward_per_person,
            total_earned = total_earned + reward_per_person
        WHERE id = participant_wallet_id;

        -- Create credit transaction for participant
        INSERT INTO public.transactions (wallet_id, amount, type, description, status, reference_id)
        VALUES (
            participant_wallet_id,
            reward_per_person,
            'credit',
            'Reward from completed chain',
            'completed',
            chain_uuid
        );
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

-- Function to ensure all users have wallets (backfill)
CREATE OR REPLACE FUNCTION ensure_all_users_have_wallets()
RETURNS INTEGER AS $$
DECLARE
    created_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Create wallets for users who don't have one
    FOR user_record IN
        SELECT u.id
        FROM public.users u
        LEFT JOIN public.wallets w ON u.id = w.user_id
        WHERE w.id IS NULL
    LOOP
        INSERT INTO public.wallets (user_id, balance, total_earned, total_spent, currency)
        VALUES (user_record.id, 100.00, 0, 0, 'USD'); -- Give new users $100 to start

        created_count := created_count + 1;
    END LOOP;

    RETURN created_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Give all existing users a starting balance
SELECT ensure_all_users_have_wallets();