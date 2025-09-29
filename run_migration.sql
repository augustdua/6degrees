-- Create missing credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'spent')),
    source VARCHAR(50) NOT NULL CHECK (source IN ('join_chain', 'others_joined', 'unlock_chain', 'bonus', 'initial_bonus')),
    description TEXT NOT NULL,
    chain_id UUID REFERENCES chains(id) ON DELETE SET NULL,
    request_id UUID REFERENCES connection_requests(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view their own transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);