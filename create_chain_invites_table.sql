-- Create chain_invites table for managing invitations between platform users
-- Apply this to your Supabase database

-- Create chain_invites table
CREATE TABLE IF NOT EXISTS public.chain_invites (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.connection_requests(id) ON DELETE CASCADE,
    chain_id UUID REFERENCES public.chains(id) ON DELETE CASCADE,
    shareable_link TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate invites
    UNIQUE(user_id, request_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chain_invites_user_id ON public.chain_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_chain_invites_request_id ON public.chain_invites(request_id);
CREATE INDEX IF NOT EXISTS idx_chain_invites_status ON public.chain_invites(status);
CREATE INDEX IF NOT EXISTS idx_chain_invites_created_at ON public.chain_invites(created_at DESC);

-- Enable RLS
ALTER TABLE public.chain_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own invites" ON public.chain_invites;
CREATE POLICY "Users can view their own invites" ON public.chain_invites
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Request creators can create invites" ON public.chain_invites;
CREATE POLICY "Request creators can create invites" ON public.chain_invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.connection_requests
            WHERE id = request_id AND creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own invites" ON public.chain_invites;
CREATE POLICY "Users can update their own invites" ON public.chain_invites
    FOR UPDATE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_chain_invites_updated_at
    BEFORE UPDATE ON public.chain_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to send platform user invites
CREATE OR REPLACE FUNCTION send_chain_invite(
    p_user_ids UUID[],
    p_request_id UUID,
    p_message TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_id UUID;
    v_request RECORD;
    v_user_id UUID;
    v_shareable_link TEXT;
    v_invite_count INTEGER := 0;
BEGIN
    v_sender_id := auth.uid();

    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get request details and verify ownership
    SELECT * INTO v_request
    FROM public.connection_requests
    WHERE id = p_request_id AND creator_id = v_sender_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or not owned by user';
    END IF;

    -- Generate base shareable link
    v_shareable_link := v_request.shareable_link;

    -- Send invites to each user
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        -- Skip if user is the sender
        IF v_user_id = v_sender_id THEN
            CONTINUE;
        END IF;

        -- Create invite (ON CONFLICT DO NOTHING prevents duplicates)
        INSERT INTO public.chain_invites (
            user_id,
            request_id,
            shareable_link,
            message,
            status
        )
        VALUES (
            v_user_id,
            p_request_id,
            v_shareable_link,
            p_message,
            'pending'
        )
        ON CONFLICT (user_id, request_id) DO NOTHING;

        -- Count successful inserts
        IF FOUND THEN
            v_invite_count := v_invite_count + 1;

            -- Create notification
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                data
            )
            VALUES (
                v_user_id,
                'chain_invited',
                'New Chain Invitation',
                'You''ve been invited to join a connection chain for ' || v_request.target,
                jsonb_build_object(
                    'request_id', p_request_id,
                    'invite_message', p_message,
                    'target', v_request.target,
                    'reward', v_request.reward
                )
            );
        END IF;
    END LOOP;

    RETURN v_invite_count;
END;
$$;

-- Function to respond to chain invite
CREATE OR REPLACE FUNCTION respond_to_chain_invite(
    p_invite_id UUID,
    p_response TEXT -- 'accepted' or 'rejected'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    IF p_response NOT IN ('accepted', 'rejected') THEN
        RAISE EXCEPTION 'Invalid response. Must be "accepted" or "rejected"';
    END IF;

    -- Get invite details
    SELECT * INTO v_invite
    FROM public.chain_invites
    WHERE id = p_invite_id AND user_id = v_user_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found or already processed';
    END IF;

    -- Update invite status
    UPDATE public.chain_invites
    SET status = p_response, updated_at = NOW()
    WHERE id = p_invite_id;

    -- If accepted, join the chain
    IF p_response = 'accepted' THEN
        -- Use existing joinChain logic here
        -- This would integrate with your existing chain joining system
        NULL; -- Placeholder
    END IF;

    RETURN TRUE;
END;
$$;

-- Update notification types to include chain_invited
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'chain_joined', 'target_claim', 'chain_approved', 'chain_rejected',
  'reward_received', 'invite_received', 'invite_accepted', 'invite_rejected',
  'reward_earned', 'target_claimed', 'claim_approved', 'claim_rejected',
  'connection_request', 'connection_accepted', 'connection_rejected',
  'invite_sent', 'invite_declined', 'chain_completed', 'chain_failed',
  'chain_invited'
));

-- Grant permissions
GRANT ALL ON TABLE public.chain_invites TO authenticated;
GRANT EXECUTE ON FUNCTION send_chain_invite TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_chain_invite TO authenticated;