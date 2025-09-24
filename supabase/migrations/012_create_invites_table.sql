-- Create invites table for the invitation system
CREATE TABLE IF NOT EXISTS public.invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES public.connection_requests(id) ON DELETE CASCADE NOT NULL,
    inviter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    invitee_email TEXT NOT NULL,
    invitee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    invite_link TEXT NOT NULL UNIQUE,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invites_request_id ON public.invites(request_id);
CREATE INDEX IF NOT EXISTS idx_invites_inviter_id ON public.invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_invitee_id ON public.invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invites_invitee_email ON public.invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON public.invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_invites_invite_link ON public.invites(invite_link);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for invites (drop existing ones first)
DROP POLICY IF EXISTS "Users can view invites they sent" ON public.invites;
DROP POLICY IF EXISTS "Users can view invites sent to them" ON public.invites;
DROP POLICY IF EXISTS "Users can create invites for their requests" ON public.invites;
DROP POLICY IF EXISTS "Users can update invites they sent" ON public.invites;
DROP POLICY IF EXISTS "Users can update invites sent to them" ON public.invites;
DROP POLICY IF EXISTS "Users can delete invites they sent" ON public.invites;

CREATE POLICY "Users can view invites they sent" ON public.invites
    FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view invites sent to them" ON public.invites
    FOR SELECT USING (auth.uid() = invitee_id);

CREATE POLICY "Users can create invites for their requests" ON public.invites
    FOR INSERT WITH CHECK (
        auth.uid() = inviter_id AND
        request_id IN (
            SELECT id FROM public.connection_requests WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can update invites they sent" ON public.invites
    FOR UPDATE USING (auth.uid() = inviter_id);

CREATE POLICY "Users can update invites sent to them" ON public.invites
    FOR UPDATE USING (auth.uid() = invitee_id);

CREATE POLICY "Users can delete invites they sent" ON public.invites
    FOR DELETE USING (auth.uid() = inviter_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_invites_updated_at ON public.invites;
CREATE TRIGGER update_invites_updated_at
    BEFORE UPDATE ON public.invites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically expire invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void AS $$
BEGIN
    UPDATE public.invites
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to create invite notifications
CREATE OR REPLACE FUNCTION create_invite_notification(invite_uuid UUID)
RETURNS void AS $$
DECLARE
    invite_data RECORD;
BEGIN
    -- Get invite data
    SELECT 
        i.invitee_id,
        i.request_id,
        cr.target,
        u.first_name || ' ' || u.last_name as inviter_name
    INTO invite_data
    FROM public.invites i
    JOIN public.connection_requests cr ON i.request_id = cr.id
    JOIN public.users u ON i.inviter_id = u.id
    WHERE i.id = invite_uuid;

    -- Only create notification if invitee exists
    IF invite_data.invitee_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            data
        ) VALUES (
            invite_data.invitee_id,
            'chain_joined',
            'New Connection Invite',
            invite_data.inviter_name || ' invited you to join a connection chain for ' || invite_data.target,
            jsonb_build_object(
                'invite_id', invite_uuid,
                'request_id', invite_data.request_id,
                'inviter_name', invite_data.inviter_name
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the table
COMMENT ON TABLE public.invites IS 'Table storing connection chain invitations between users';
