-- Update existing bids tables with RLS and policies
-- Date: 2025-01-20

-- Enable RLS on existing tables
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

CREATE POLICY "Users can view their own responses" ON public.bid_responses
    FOR SELECT USING (responder_id = auth.uid());

CREATE POLICY "Users can create responses" ON public.bid_responses
    FOR INSERT WITH CHECK (responder_id = auth.uid());

CREATE POLICY "Users can update their own responses" ON public.bid_responses
    FOR UPDATE USING (responder_id = auth.uid());