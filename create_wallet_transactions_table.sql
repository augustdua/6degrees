-- Create wallet_transactions table to match the reward distribution functions
CREATE TABLE public.wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    connection_request_id UUID REFERENCES public.connection_requests(id) ON DELETE CASCADE,
    metadata JSONB, -- Additional data like claim_id, reward_type, shares, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_connection_request_id ON public.wallet_transactions(connection_request_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type);

-- Enable Row Level Security
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create wallet transactions" ON public.wallet_transactions
    FOR INSERT WITH CHECK (true); -- Allow system functions to create transactions

-- Create trigger for updated_at (if needed)
CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at column
ALTER TABLE public.wallet_transactions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

