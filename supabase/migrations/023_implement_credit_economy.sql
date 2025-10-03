-- Implement Credit-Based Economy System
-- Users buy credits with money, spend credits to create requests
-- Path participants win credits, only target gets cash payout

-- 1. Add credit_cost field to connection_requests
ALTER TABLE connection_requests
ADD COLUMN IF NOT EXISTS credit_cost INTEGER CHECK (credit_cost >= 10 AND credit_cost <= 1000);

-- 2. Add target_cash_reward field to connection_requests
ALTER TABLE connection_requests
ADD COLUMN IF NOT EXISTS target_cash_reward NUMERIC(10,2) CHECK (target_cash_reward >= 10 AND target_cash_reward <= 10000);

-- 3. Update credit_transactions source enum to include new types
ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_source_check;
ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_source_check
CHECK (source IN ('join_chain', 'others_joined', 'unlock_chain', 'bonus', 'initial_bonus', 'purchase', 'path_reward', 'create_request'));

-- 4. Create purchased_credits table to track credit purchases
CREATE TABLE IF NOT EXISTS purchased_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
    price_paid NUMERIC(10,2) NOT NULL CHECK (price_paid > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(50),
    payment_reference TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_purchased_credits_user_id ON purchased_credits(user_id);
CREATE INDEX idx_purchased_credits_created_at ON purchased_credits(created_at DESC);

-- RLS policies for purchased_credits
ALTER TABLE purchased_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON purchased_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" ON purchased_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Function to distribute CREDITS (not cash) to winning path participants
CREATE OR REPLACE FUNCTION complete_chain_and_distribute_credits(chain_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    chain_record RECORD;
    request_record RECORD;
    participant JSONB;
    participant_user_id UUID;
    target_user_id UUID;
    credits_per_participant INTEGER;
    total_participants INTEGER;
    total_credits_pool INTEGER;
BEGIN
    -- Get chain details
    SELECT * INTO chain_record
    FROM chains
    WHERE id = chain_uuid AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Chain not found or not active';
    END IF;

    -- Get request details
    SELECT * INTO request_record
    FROM connection_requests
    WHERE id = chain_record.request_id;

    -- Get the target user (last person in chain)
    SELECT (participants->-1->>'userid')::UUID INTO target_user_id
    FROM chains
    WHERE id = chain_uuid;

    -- Calculate total participants (excluding target)
    total_participants := jsonb_array_length(chain_record.participants) - 1;

    IF total_participants > 0 THEN
        -- Use credit_cost if available, otherwise use reward field as fallback
        total_credits_pool := COALESCE(request_record.credit_cost, request_record.reward::INTEGER);
        credits_per_participant := total_credits_pool / total_participants;

        -- Distribute credits to all participants EXCEPT the target
        FOR participant IN SELECT * FROM jsonb_array_elements(chain_record.participants)
        LOOP
            participant_user_id := (participant->>'userid')::UUID;

            -- Skip the target user
            IF participant_user_id != target_user_id THEN
                -- Award credits to participant
                INSERT INTO credit_transactions (
                    user_id,
                    amount,
                    transaction_type,
                    source,
                    description,
                    chain_id,
                    request_id
                ) VALUES (
                    participant_user_id,
                    credits_per_participant,
                    'earned',
                    'path_reward',
                    'Credits earned from winning path',
                    chain_uuid,
                    chain_record.request_id
                );
            END IF;
        END LOOP;
    END IF;

    -- Pay cash to target ONLY (if target_cash_reward is set)
    IF request_record.target_cash_reward IS NOT NULL AND request_record.target_cash_reward > 0 THEN
        -- Get or create target's wallet
        INSERT INTO wallets (user_id, balance, total_earned, currency)
        VALUES (target_user_id, 0, 0, 'INR')
        ON CONFLICT (user_id) DO NOTHING;

        -- Credit cash to target's wallet
        UPDATE wallets
        SET balance = balance + request_record.target_cash_reward,
            total_earned = total_earned + request_record.target_cash_reward,
            updated_at = NOW()
        WHERE user_id = target_user_id;

        -- Create transaction record
        INSERT INTO transactions (
            wallet_id,
            amount,
            type,
            description,
            status,
            reference_id
        ) VALUES (
            (SELECT id FROM wallets WHERE user_id = target_user_id),
            request_record.target_cash_reward,
            'credit',
            'Cash reward for being the target',
            'completed',
            chain_uuid
        );
    END IF;

    -- Update chain status
    UPDATE chains
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = chain_uuid;

    -- Update request status
    UPDATE connection_requests
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = chain_record.request_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to handle request creation with credit deduction
CREATE OR REPLACE FUNCTION create_request_with_credits(
    p_creator_id UUID,
    p_target TEXT,
    p_message TEXT,
    p_credit_cost INTEGER,
    p_target_cash_reward NUMERIC(10,2),
    p_shareable_link TEXT
)
RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_user_credits INTEGER;
BEGIN
    -- Check user has enough credits
    SELECT total_credits INTO v_user_credits
    FROM user_credits
    WHERE user_id = p_creator_id;

    IF v_user_credits IS NULL OR v_user_credits < p_credit_cost THEN
        RAISE EXCEPTION 'Insufficient credits. You have % credits but need %', COALESCE(v_user_credits, 0), p_credit_cost;
    END IF;

    -- Create the request
    INSERT INTO connection_requests (
        creator_id,
        target,
        message,
        reward,
        credit_cost,
        target_cash_reward,
        shareable_link,
        status
    ) VALUES (
        p_creator_id,
        p_target,
        p_message,
        p_credit_cost, -- Store in reward for backward compatibility
        p_credit_cost,
        p_target_cash_reward,
        p_shareable_link,
        'active'
    ) RETURNING id INTO v_request_id;

    -- Deduct credits from user
    INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        source,
        description,
        request_id
    ) VALUES (
        p_creator_id,
        p_credit_cost,
        'spent',
        'create_request',
        'Credits spent to create connection request',
        v_request_id
    );

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON purchased_credits TO authenticated;
GRANT EXECUTE ON FUNCTION create_request_with_credits TO authenticated;
GRANT EXECUTE ON FUNCTION complete_chain_and_distribute_credits TO authenticated;

-- Add comment
COMMENT ON TABLE purchased_credits IS 'Tracks credit purchases made by users with real money';
COMMENT ON FUNCTION complete_chain_and_distribute_credits IS 'Distributes credits to path participants and cash only to target';
COMMENT ON FUNCTION create_request_with_credits IS 'Creates a request and deducts credits from user balance';
