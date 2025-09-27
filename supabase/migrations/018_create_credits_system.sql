-- Create credits system tables

-- User credits table to track current credit balance
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_credits INTEGER NOT NULL DEFAULT 0,
    earned_credits INTEGER NOT NULL DEFAULT 0,
    spent_credits INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Credit transactions table to track all credit movements
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'spent')),
    source VARCHAR(50) NOT NULL CHECK (source IN ('join_chain', 'others_joined', 'unlock_chain', 'bonus', 'initial_bonus')),
    description TEXT NOT NULL,
    chain_id UUID REFERENCES chains(id) ON DELETE SET NULL,
    request_id UUID REFERENCES connection_requests(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who joined your chain
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chain likes table to track user likes on chains
CREATE TABLE IF NOT EXISTS chain_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chain_id UUID NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, chain_id)
);

-- Feed access table to track which completed chains users have unlocked
CREATE TABLE IF NOT EXISTS unlocked_chains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chain_id UUID NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
    credits_spent INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, chain_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_chain_id ON credit_transactions(chain_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chain_likes_user_id ON chain_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_chain_likes_chain_id ON chain_likes(chain_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_chains_user_id ON unlocked_chains(user_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_chains_chain_id ON unlocked_chains(chain_id);

-- Create trigger to update user_credits when transactions are added
CREATE OR REPLACE FUNCTION update_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update user_credits record
    INSERT INTO user_credits (user_id, total_credits, earned_credits, spent_credits, updated_at)
    VALUES (
        NEW.user_id,
        CASE WHEN NEW.transaction_type = 'earned' THEN NEW.amount ELSE -NEW.amount END,
        CASE WHEN NEW.transaction_type = 'earned' THEN NEW.amount ELSE 0 END,
        CASE WHEN NEW.transaction_type = 'spent' THEN NEW.amount ELSE 0 END,
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_credits = user_credits.total_credits + CASE WHEN NEW.transaction_type = 'earned' THEN NEW.amount ELSE -NEW.amount END,
        earned_credits = user_credits.earned_credits + CASE WHEN NEW.transaction_type = 'earned' THEN NEW.amount ELSE 0 END,
        spent_credits = user_credits.spent_credits + CASE WHEN NEW.transaction_type = 'spent' THEN NEW.amount ELSE 0 END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_user_credits ON credit_transactions;
CREATE TRIGGER trigger_update_user_credits
    AFTER INSERT ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_credits();

-- Function to award initial credits to new users
CREATE OR REPLACE FUNCTION award_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 10 initial credits to new users
    INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        source,
        description
    ) VALUES (
        NEW.id,
        10,
        'earned',
        'initial_bonus',
        'Welcome bonus for joining 6Degree'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS trigger_award_initial_credits ON auth.users;
CREATE TRIGGER trigger_award_initial_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION award_initial_credits();

-- RLS Policies
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_chains ENABLE ROW LEVEL SECURITY;

-- User credits policies
CREATE POLICY "Users can view their own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits via trigger only" ON user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Credit transactions policies
CREATE POLICY "Users can view their own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" ON credit_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chain likes policies
CREATE POLICY "Users can view all chain likes" ON chain_likes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own likes" ON chain_likes
    FOR ALL USING (auth.uid() = user_id);

-- Unlocked chains policies
CREATE POLICY "Users can view their own unlocked chains" ON unlocked_chains
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock chains" ON unlocked_chains
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_credits TO authenticated;
GRANT SELECT, INSERT ON credit_transactions TO authenticated;
GRANT SELECT, INSERT, DELETE ON chain_likes TO authenticated;
GRANT SELECT, INSERT ON unlocked_chains TO authenticated;