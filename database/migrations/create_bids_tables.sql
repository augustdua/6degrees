-- Migration: Create Bids Feature Tables
-- Description: Add tables for connection bids, likes, and responses
-- Date: 2025-01-20

-- Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    connection_type TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bid_likes table for tracking likes on bids
CREATE TABLE IF NOT EXISTS public.bid_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bid_id, user_id)
);

-- Create bid_responses table for tracking responses/contacts on bids
CREATE TABLE IF NOT EXISTS public.bid_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bids_creator_id ON public.bids(creator_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON public.bids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bid_likes_bid_id ON public.bid_likes(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_likes_user_id ON public.bid_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_bid_responses_bid_id ON public.bid_responses(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_responses_responder_id ON public.bid_responses(responder_id);

-- Create updated_at trigger for bids table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bids_updated_at
    BEFORE UPDATE ON public.bids
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bid_responses_updated_at
    BEFORE UPDATE ON public.bid_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bids
CREATE POLICY "Anyone can view active bids" ON public.bids
    FOR SELECT USING (status = 'active');

CREATE POLICY "Users can view their own bids" ON public.bids
    FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "Users can create bids" ON public.bids
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own bids" ON public.bids
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their own bids" ON public.bids
    FOR DELETE USING (creator_id = auth.uid());

-- RLS Policies for bid_likes
CREATE POLICY "Users can view bid likes" ON public.bid_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like/unlike bids" ON public.bid_likes
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for bid_responses
CREATE POLICY "Users can view responses to their bids" ON public.bid_responses
    FOR SELECT USING (
        bid_id IN (
            SELECT id FROM public.bids WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can create responses" ON public.bid_responses
    FOR INSERT WITH CHECK (responder_id = auth.uid());

CREATE POLICY "Users can update their own responses" ON public.bid_responses
    FOR UPDATE USING (responder_id = auth.uid());

-- Insert some sample data for testing (optional - remove in production)
INSERT INTO public.bids (creator_id, title, description, connection_type, price)
SELECT
    u.id,
    'Connect to Tech Executives',
    'I have strong connections in the technology industry, particularly with VPs and Directors at major tech companies. Looking for introductions to finance professionals.',
    'Technology Executives',
    150.00
FROM public.users u
WHERE u.email LIKE '%@%'
LIMIT 1;

INSERT INTO public.bids (creator_id, title, description, connection_type, price)
SELECT
    u.id,
    'Startup Founder Network',
    'Can introduce you to promising early-stage startup founders in AI/ML space. Seeking connections to enterprise sales leaders and business development professionals.',
    'Startup Founders',
    200.00
FROM public.users u
WHERE u.email LIKE '%@%'
LIMIT 1;

-- Grant necessary permissions (adjust based on your database setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bids TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bid_likes TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON bid_responses TO your_app_user;