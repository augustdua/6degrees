-- Add invite-related functionality to existing tables

-- Add invite notification type
ALTER TABLE public.notifications
    DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('chain_joined', 'target_claim', 'chain_approved', 'chain_rejected', 'reward_received', 'invite_received', 'invite_accepted', 'invite_rejected'));

-- Create invites table
CREATE TABLE public.invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES public.connection_requests(id) ON DELETE CASCADE NOT NULL,
    inviter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    invitee_email TEXT NOT NULL,
    invitee_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL if user doesn't exist yet
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    invite_link TEXT NOT NULL UNIQUE,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for invites
CREATE INDEX idx_invites_request_id ON public.invites(request_id);
CREATE INDEX idx_invites_inviter_id ON public.invites(inviter_id);
CREATE INDEX idx_invites_invitee_id ON public.invites(invitee_id);
CREATE INDEX idx_invites_invitee_email ON public.invites(invitee_email);
CREATE INDEX idx_invites_status ON public.invites(status);
CREATE INDEX idx_invites_invite_link ON public.invites(invite_link);
CREATE INDEX idx_invites_expires_at ON public.invites(expires_at);

-- Create trigger for invites updated_at
CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON public.invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Invites policies
CREATE POLICY "Users can view invites they sent" ON public.invites
    FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view invites sent to them" ON public.invites
    FOR SELECT USING (auth.uid() = invitee_id OR auth.user_email() = invitee_email);

CREATE POLICY "Users can create invites" ON public.invites
    FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update invites they received" ON public.invites
    FOR UPDATE USING (auth.uid() = invitee_id OR auth.user_email() = invitee_email);

-- Function to create invite notification
CREATE OR REPLACE FUNCTION create_invite_notification(
    invite_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    invite_record RECORD;
    request_record RECORD;
BEGIN
    -- Get invite details
    SELECT * INTO invite_record
    FROM public.invites
    WHERE id = invite_uuid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    -- Get request details
    SELECT * INTO request_record
    FROM public.connection_requests
    WHERE id = invite_record.request_id;

    -- If invitee is a registered user, create notification
    IF invite_record.invitee_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            invite_record.invitee_id,
            'invite_received',
            'New Connection Invite',
            'You have been invited to join a connection chain for: ' || request_record.target,
            jsonb_build_object(
                'invite_id', invite_uuid,
                'request_id', invite_record.request_id,
                'invite_link', invite_record.invite_link
            )
        );
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invite
CREATE OR REPLACE FUNCTION accept_invite(invite_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    invite_record RECORD;
    chain_record RECORD;
    new_link_id TEXT;
    new_shareable_link TEXT;
    updated_participants JSONB;
    user_record RECORD;
BEGIN
    -- Get current user
    SELECT * INTO user_record
    FROM public.users
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get invite details
    SELECT * INTO invite_record
    FROM public.invites
    WHERE id = invite_uuid AND status = 'pending' AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found, already processed, or expired';
    END IF;

    -- Check if invite is for current user
    IF invite_record.invitee_id != auth.uid() AND invite_record.invitee_email != auth.user_email() THEN
        RAISE EXCEPTION 'This invite is not for you';
    END IF;

    -- Get chain details
    SELECT * INTO chain_record
    FROM public.chains
    WHERE request_id = invite_record.request_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Chain not found or not active';
    END IF;

    -- Check if user is already in chain
    IF chain_record.participants @> jsonb_build_array(jsonb_build_object('userid', auth.uid()::text)) THEN
        RAISE EXCEPTION 'You are already part of this chain';
    END IF;

    -- Update invite status
    UPDATE public.invites
    SET status = 'accepted',
        invitee_id = auth.uid(),
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = invite_uuid;

    -- Add user to chain participants
    updated_participants := chain_record.participants || jsonb_build_array(
        jsonb_build_object(
            'userid', auth.uid()::text,
            'email', user_record.email,
            'firstName', user_record.first_name,
            'lastName', user_record.last_name,
            'role', 'forwarder',
            'joinedAt', NOW()::text,
            'rewardAmount', 0
        )
    );

    -- Update chain
    UPDATE public.chains
    SET participants = updated_participants,
        updated_at = NOW()
    WHERE id = chain_record.id;

    -- Generate new shareable link
    new_link_id := extract(epoch from now())::text || '-' || substr(md5(random()::text), 1, 15);
    new_shareable_link := 'http://localhost:5173/r/' || new_link_id;

    -- Create notification for inviter
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
        invite_record.inviter_id,
        'invite_accepted',
        'Invite Accepted!',
        user_record.first_name || ' ' || user_record.last_name || ' joined your connection chain',
        jsonb_build_object(
            'invite_id', invite_uuid,
            'chain_id', chain_record.id,
            'new_participant_id', auth.uid()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_shareable_link', new_shareable_link,
        'chain_id', chain_record.id,
        'participants_count', jsonb_array_length(updated_participants)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject invite
CREATE OR REPLACE FUNCTION reject_invite(invite_uuid UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    invite_record RECORD;
    user_record RECORD;
BEGIN
    -- Get current user
    SELECT * INTO user_record
    FROM public.users
    WHERE id = auth.uid();

    -- Get invite details
    SELECT * INTO invite_record
    FROM public.invites
    WHERE id = invite_uuid AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found or already processed';
    END IF;

    -- Check if invite is for current user
    IF invite_record.invitee_id != auth.uid() AND invite_record.invitee_email != auth.user_email() THEN
        RAISE EXCEPTION 'This invite is not for you';
    END IF;

    -- Update invite status
    UPDATE public.invites
    SET status = 'rejected',
        invitee_id = auth.uid(),
        updated_at = NOW()
    WHERE id = invite_uuid;

    -- Create notification for inviter
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
        invite_record.inviter_id,
        'invite_rejected',
        'Invite Declined',
        COALESCE(user_record.first_name || ' ' || user_record.last_name, 'Someone') || ' declined your connection invite',
        jsonb_build_object(
            'invite_id', invite_uuid,
            'reason', reason
        )
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's pending invites
CREATE OR REPLACE FUNCTION get_user_pending_invites(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    invite_id UUID,
    request_id UUID,
    inviter_name TEXT,
    inviter_email TEXT,
    target TEXT,
    message TEXT,
    reward DECIMAL(10,2),
    invite_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id as invite_id,
        i.request_id,
        (u.first_name || ' ' || u.last_name) as inviter_name,
        u.email as inviter_email,
        cr.target,
        cr.message,
        cr.reward,
        i.message as invite_message,
        i.created_at,
        i.expires_at
    FROM public.invites i
    JOIN public.users u ON u.id = i.inviter_id
    JOIN public.connection_requests cr ON cr.id = i.request_id
    WHERE (i.invitee_id = user_uuid OR (i.invitee_id IS NULL AND i.invitee_email = (SELECT email FROM auth.users WHERE id = user_uuid)))
      AND i.status = 'pending'
      AND i.expires_at > NOW()
    ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;