-- Update create_request_with_credits function to support target organization

CREATE OR REPLACE FUNCTION create_request_with_credits(
    p_creator_id UUID,
    p_target TEXT,
    p_message TEXT,
    p_credit_cost INTEGER,
    p_target_cash_reward NUMERIC(10,2),
    p_shareable_link TEXT,
    p_target_organization_id UUID DEFAULT NULL
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
        status,
        target_organization_id
    ) VALUES (
        p_creator_id,
        p_target,
        p_message,
        p_credit_cost, -- Store in reward for backward compatibility
        p_credit_cost,
        p_target_cash_reward,
        p_shareable_link,
        'active',
        p_target_organization_id
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
        -p_credit_cost,
        'debit',
        'request_creation',
        'Credits deducted for creating connection request',
        v_request_id
    );

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
