-- Create Mafias Feature Tables
-- Subscription-based professional groups with founding member revenue sharing

-- Create mafias table
CREATE TABLE IF NOT EXISTS public.mafias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
    slug TEXT UNIQUE NOT NULL CHECK (length(slug) >= 3 AND length(slug) <= 100),
    description TEXT NOT NULL CHECK (length(description) >= 10 AND length(description) <= 1000),
    cover_image_url TEXT,
    monthly_price_usd NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (monthly_price_usd >= 0),
    monthly_price_inr NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (monthly_price_inr >= 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    founding_members_limit INTEGER NOT NULL DEFAULT 10 CHECK (founding_members_limit >= 1 AND founding_members_limit <= 10),
    member_count INTEGER DEFAULT 0 NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mafia_members table
CREATE TABLE IF NOT EXISTS public.mafia_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mafia_id UUID NOT NULL REFERENCES public.mafias(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'founding', 'paid')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subscription_status TEXT CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
    next_payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one membership per user per mafia
    UNIQUE(mafia_id, user_id)
);

-- Create mafia_subscriptions table (transaction log)
CREATE TABLE IF NOT EXISTS public.mafia_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mafia_id UUID NOT NULL REFERENCES public.mafias(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
    revenue_split_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mafia_invite_tokens table for founding member invites
CREATE TABLE IF NOT EXISTS public.mafia_invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mafia_id UUID NOT NULL REFERENCES public.mafias(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
    current_uses INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add mafia_id to conversations table for group chats
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS mafia_id UUID REFERENCES public.mafias(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mafias_creator_id ON public.mafias(creator_id);
CREATE INDEX IF NOT EXISTS idx_mafias_status ON public.mafias(status);
CREATE INDEX IF NOT EXISTS idx_mafias_created_at ON public.mafias(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mafia_members_mafia_id ON public.mafia_members(mafia_id);
CREATE INDEX IF NOT EXISTS idx_mafia_members_user_id ON public.mafia_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mafia_members_role ON public.mafia_members(role);
CREATE INDEX IF NOT EXISTS idx_mafia_members_next_payment ON public.mafia_members(next_payment_date) WHERE role = 'paid' AND subscription_status = 'active';

CREATE INDEX IF NOT EXISTS idx_mafia_subscriptions_mafia_id ON public.mafia_subscriptions(mafia_id);
CREATE INDEX IF NOT EXISTS idx_mafia_subscriptions_user_id ON public.mafia_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_mafia_subscriptions_payment_date ON public.mafia_subscriptions(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_mafia_subscriptions_revenue_split ON public.mafia_subscriptions(revenue_split_completed) WHERE revenue_split_completed = FALSE;

CREATE INDEX IF NOT EXISTS idx_mafia_invite_tokens_token ON public.mafia_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_mafia_invite_tokens_mafia_id ON public.mafia_invite_tokens(mafia_id);

CREATE INDEX IF NOT EXISTS idx_conversations_mafia_id ON public.conversations(mafia_id) WHERE mafia_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.mafias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mafia_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mafia_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mafia_invite_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mafias
CREATE POLICY "Anyone can view active mafias" ON public.mafias
    FOR SELECT USING (status = 'active');

CREATE POLICY "Authenticated users can create mafias" ON public.mafias
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their mafias" ON public.mafias
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their mafias" ON public.mafias
    FOR DELETE USING (auth.uid() = creator_id);

-- RLS Policies for mafia_members
CREATE POLICY "Members can view their mafia memberships" ON public.mafia_members
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.mafia_members mm
            WHERE mm.mafia_id = mafia_members.mafia_id
            AND mm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join mafias" ON public.mafia_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave mafias" ON public.mafia_members
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update member roles" ON public.mafia_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.mafia_members admin
            WHERE admin.mafia_id = mafia_members.mafia_id
            AND admin.user_id = auth.uid()
            AND admin.role = 'admin'
        )
    );

-- RLS Policies for mafia_subscriptions
CREATE POLICY "Users can view their subscription history" ON public.mafia_subscriptions
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.mafia_members mm
            WHERE mm.mafia_id = mafia_subscriptions.mafia_id
            AND mm.user_id = auth.uid()
            AND mm.role IN ('admin', 'founding')
        )
    );

-- RLS Policies for mafia_invite_tokens
CREATE POLICY "Anyone can view valid invite tokens" ON public.mafia_invite_tokens
    FOR SELECT USING (expires_at > NOW() AND (max_uses IS NULL OR current_uses < max_uses));

CREATE POLICY "Admins can create invite tokens" ON public.mafia_invite_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.mafia_members mm
            WHERE mm.mafia_id = mafia_invite_tokens.mafia_id
            AND mm.user_id = auth.uid()
            AND mm.role = 'admin'
        )
    );

-- Create updated_at trigger for mafias
CREATE OR REPLACE FUNCTION update_mafias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mafias_updated_at
    BEFORE UPDATE ON public.mafias
    FOR EACH ROW
    EXECUTE FUNCTION update_mafias_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.mafias IS 'Subscription-based professional group communities';
COMMENT ON TABLE public.mafia_members IS 'Membership records for mafias with roles and subscription tracking';
COMMENT ON TABLE public.mafia_subscriptions IS 'Transaction log for monthly subscription payments';
COMMENT ON TABLE public.mafia_invite_tokens IS 'Invite tokens for founding member recruitment';
COMMENT ON COLUMN public.conversations.mafia_id IS 'Links group chat conversations to mafias';

