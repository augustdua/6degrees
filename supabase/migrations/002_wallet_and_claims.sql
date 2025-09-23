-- Create wallets table
CREATE TABLE public.wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
    total_earned DECIMAL(10,2) DEFAULT 0 CHECK (total_earned >= 0),
    total_spent DECIMAL(10,2) DEFAULT 0 CHECK (total_spent >= 0),
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    reference_id UUID, -- Chain ID or Request ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create target claims table
CREATE TABLE public.target_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES public.connection_requests(id) ON DELETE CASCADE NOT NULL,
    chain_id UUID REFERENCES public.chains(id) ON DELETE CASCADE NOT NULL,
    claimant_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    target_name TEXT NOT NULL,
    target_email TEXT NOT NULL,
    target_company TEXT NOT NULL,
    target_role TEXT NOT NULL,
    message TEXT,
    contact_preference TEXT NOT NULL CHECK (contact_preference IN ('email', 'linkedin', 'phone')),
    contact_info TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('chain_joined', 'target_claim', 'chain_approved', 'chain_rejected', 'reward_received')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data like chain_id, request_id, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_target_claims_request_id ON public.target_claims(request_id);
CREATE INDEX idx_target_claims_chain_id ON public.target_claims(chain_id);
CREATE INDEX idx_target_claims_claimant_id ON public.target_claims(claimant_id);
CREATE INDEX idx_target_claims_status ON public.target_claims(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_target_claims_updated_at BEFORE UPDATE ON public.target_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view their own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (
        wallet_id IN (
            SELECT id FROM public.wallets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create transactions for their wallet" ON public.transactions
    FOR INSERT WITH CHECK (
        wallet_id IN (
            SELECT id FROM public.wallets WHERE user_id = auth.uid()
        )
    );

-- Target claims policies
CREATE POLICY "Users can view claims for their requests" ON public.target_claims
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM public.connection_requests WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can create claims" ON public.target_claims
    FOR INSERT WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Request creators can update claims" ON public.target_claims
    FOR UPDATE USING (
        request_id IN (
            SELECT id FROM public.connection_requests WHERE creator_id = auth.uid()
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance, total_earned, total_spent, currency)
    VALUES (NEW.id, 0, 0, 0, 'USD');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet when user is created
CREATE TRIGGER create_wallet_on_user_insert
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_new_user();

-- Function to process target claim approval
CREATE OR REPLACE FUNCTION approve_target_claim(claim_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    claim_record RECORD;
    chain_record RECORD;
    participant JSONB;
    reward_per_person DECIMAL(10,2);
BEGIN
    -- Get claim details
    SELECT * INTO claim_record
    FROM public.target_claims
    WHERE id = claim_uuid AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Claim not found or not pending';
    END IF;
    
    -- Get chain details
    SELECT * INTO chain_record
    FROM public.chains
    WHERE id = claim_record.chain_id;
    
    -- Calculate reward per person
    reward_per_person := chain_record.total_reward / jsonb_array_length(chain_record.participants);
    
    -- Update claim status
    UPDATE public.target_claims
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = claim_uuid;
    
    -- Complete the chain
    PERFORM complete_chain_and_distribute_rewards(claim_record.chain_id);
    
    -- Create notifications for all participants
    FOR participant IN SELECT * FROM jsonb_array_elements(chain_record.participants)
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            (participant->>'userId')::UUID,
            'chain_approved',
            'Chain Completed!',
            'Your chain has been completed and you have received a reward of $' || reward_per_person,
            jsonb_build_object('chain_id', claim_record.chain_id, 'amount', reward_per_person)
        );
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject target claim
CREATE OR REPLACE FUNCTION reject_target_claim(claim_uuid UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    claim_record RECORD;
BEGIN
    -- Get claim details
    SELECT * INTO claim_record
    FROM public.target_claims
    WHERE id = claim_uuid AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Claim not found or not pending';
    END IF;
    
    -- Update claim status
    UPDATE public.target_claims
    SET status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        rejection_reason = reason,
        updated_at = NOW()
    WHERE id = claim_uuid;
    
    -- Create notification for claimant
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
        claim_record.claimant_id,
        'chain_rejected',
        'Target Claim Rejected',
        'Your target claim has been rejected. The chain remains active.',
        jsonb_build_object('claim_id', claim_uuid, 'reason', reason)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
