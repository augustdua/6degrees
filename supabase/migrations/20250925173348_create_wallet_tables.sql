-- Create wallet table
CREATE TABLE IF NOT EXISTS public.wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'frozen', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Ensure one wallet per user
    UNIQUE(user_id)
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallet(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    reference_id UUID,
    reference_type TEXT CHECK (reference_type IN ('reward_payout', 'connection_fee', 'refund', 'bonus', 'withdrawal')),
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_user_id ON public.wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON public.wallet_transactions(reference_id, reference_type);

-- Enable RLS
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet
CREATE POLICY "Users can view their own wallet" ON public.wallet
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet" ON public.wallet
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their wallet transactions" ON public.wallet_transactions
    FOR SELECT USING (
        wallet_id IN (
            SELECT id FROM public.wallet WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert wallet transactions" ON public.wallet_transactions
    FOR INSERT WITH CHECK (true); -- Allow system/admin inserts

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wallet_updated_at BEFORE UPDATE ON public.wallet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallet (user_id, balance, currency, status)
    VALUES (NEW.id, 0.00, 'USD', 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create wallet when user signs up
CREATE TRIGGER on_user_created
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION create_user_wallet();