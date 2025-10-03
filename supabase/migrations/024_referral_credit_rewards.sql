-- Implement Referral Credit Rewards System
-- Users earn credits for link clicks and successful joins

-- 1. Add referrer tracking to link_clicks table
ALTER TABLE link_clicks
ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS credit_awarded BOOLEAN DEFAULT FALSE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_link_clicks_referrer_user_id ON link_clicks(referrer_user_id);

-- 2. Function to find the link owner (referrer) from a shareable link
CREATE OR REPLACE FUNCTION get_link_owner(p_shareable_link TEXT)
RETURNS UUID AS $$
DECLARE
    v_owner_id UUID;
    v_request_id UUID;
    v_chain RECORD;
BEGIN
    -- First, try to find if this is the original request link
    SELECT creator_id INTO v_owner_id
    FROM connection_requests
    WHERE shareable_link = p_shareable_link;

    IF v_owner_id IS NOT NULL THEN
        RETURN v_owner_id;
    END IF;

    -- If not, search in chain participants' shareable links
    FOR v_chain IN
        SELECT id, participants
        FROM chains
    LOOP
        -- Search through participants array for matching shareableLink
        SELECT (participant->>'userid')::UUID INTO v_owner_id
        FROM jsonb_array_elements(v_chain.participants) AS participant
        WHERE participant->>'shareableLink' = p_shareable_link;

        IF v_owner_id IS NOT NULL THEN
            RETURN v_owner_id;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to award credits for link clicks
CREATE OR REPLACE FUNCTION award_click_credits()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_credits_today INTEGER;
    v_click_reward INTEGER := 2; -- 2 credits per click
    v_daily_click_limit INTEGER := 50; -- Max 50 click credits per day
BEGIN
    -- Find who owns this link
    v_referrer_id := get_link_owner(
        'https://6degrees.app/r/' ||
        substring(
            (SELECT shareable_link FROM connection_requests WHERE id = NEW.request_id),
            'https?://[^/]+/r/(.+)'
        )
    );

    -- If we can't find the referrer, try extracting from the request
    IF v_referrer_id IS NULL THEN
        SELECT creator_id INTO v_referrer_id
        FROM connection_requests
        WHERE id = NEW.request_id;
    END IF;

    IF v_referrer_id IS NOT NULL THEN
        -- Check daily click credit limit
        SELECT COALESCE(SUM(amount), 0) INTO v_credits_today
        FROM credit_transactions
        WHERE user_id = v_referrer_id
        AND source = 'link_click'
        AND created_at >= CURRENT_DATE;

        -- Only award if under daily limit
        IF v_credits_today < v_daily_click_limit THEN
            -- Award credits to referrer
            INSERT INTO credit_transactions (
                user_id,
                amount,
                transaction_type,
                source,
                description,
                request_id
            ) VALUES (
                v_referrer_id,
                v_click_reward,
                'credit',
                'link_click',
                'Earned from link click',
                NEW.request_id
            );

            -- Update user credits
            UPDATE user_credits
            SET credits = credits + v_click_reward,
                updated_at = NOW()
            WHERE user_id = v_referrer_id;

            -- Mark click as credited
            NEW.credit_awarded := TRUE;
            NEW.referrer_user_id := v_referrer_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to automatically award credits when links are clicked
DROP TRIGGER IF EXISTS trigger_award_click_credits ON link_clicks;
CREATE TRIGGER trigger_award_click_credits
    BEFORE INSERT ON link_clicks
    FOR EACH ROW
    EXECUTE FUNCTION award_click_credits();

-- 5. Function to award credits for successful joins
CREATE OR REPLACE FUNCTION award_join_credits(
    p_chain_id UUID,
    p_new_user_id UUID,
    p_parent_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_join_reward INTEGER := 20; -- 20 credits per successful join
    v_request_id UUID;
BEGIN
    -- Validate inputs
    IF p_parent_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Get request ID from chain
    SELECT request_id INTO v_request_id
    FROM chains
    WHERE id = p_chain_id;

    -- Award credits to the parent (referrer)
    INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        source,
        description,
        chain_id,
        request_id
    ) VALUES (
        p_parent_user_id,
        v_join_reward,
        'credit',
        'referral_join',
        'Earned from successful referral join',
        p_chain_id,
        v_request_id
    );

    -- Update user credits
    UPDATE user_credits
    SET credits = credits + v_join_reward,
        updated_at = NOW()
    WHERE user_id = p_parent_user_id;

    -- If user_credits record doesn't exist, create it
    INSERT INTO user_credits (user_id, credits)
    VALUES (p_parent_user_id, v_join_reward)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. Update credit_transactions source enum to include new types
ALTER TABLE credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_source_check;
ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_source_check
CHECK (source IN (
    'join_chain',
    'others_joined',
    'unlock_chain',
    'bonus',
    'initial_bonus',
    'purchase',
    'path_reward',
    'create_request',
    'link_click',      -- NEW: Credits for link clicks
    'referral_join'    -- NEW: Credits for successful referrals
));

-- 7. Create a view to see referral stats
CREATE OR REPLACE VIEW referral_stats AS
SELECT
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    COALESCE(click_credits.total, 0) as total_click_credits,
    COALESCE(click_credits.count, 0) as total_clicks,
    COALESCE(join_credits.total, 0) as total_join_credits,
    COALESCE(join_credits.count, 0) as total_joins
FROM users u
LEFT JOIN (
    SELECT
        user_id,
        SUM(amount) as total,
        COUNT(*) as count
    FROM credit_transactions
    WHERE source = 'link_click'
    GROUP BY user_id
) click_credits ON u.id = click_credits.user_id
LEFT JOIN (
    SELECT
        user_id,
        SUM(amount) as total,
        COUNT(*) as count
    FROM credit_transactions
    WHERE source = 'referral_join'
    GROUP BY user_id
) join_credits ON u.id = join_credits.user_id;

-- Grant access to the view
GRANT SELECT ON referral_stats TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION get_link_owner IS 'Finds the user who owns a shareable link (referrer)';
COMMENT ON FUNCTION award_click_credits IS 'Awards 2 credits per link click, max 50 credits/day';
COMMENT ON FUNCTION award_join_credits IS 'Awards 20 credits when someone joins via your referral link';
COMMENT ON VIEW referral_stats IS 'Summary of referral earnings per user';
