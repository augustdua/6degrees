-- Create user_invites table for the platform invite system (4-digit code)
-- This is separate from the existing 'invites' table which is for chain invitations

CREATE TABLE IF NOT EXISTS public.user_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    inviter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    invitee_email TEXT NOT NULL,
    code VARCHAR(4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    invitee_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add invites_remaining and invited_by to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS invites_remaining INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS invited_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invites_inviter_id ON public.user_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_invitee_email ON public.user_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_user_invites_code ON public.user_invites(code);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON public.user_invites(status);
CREATE INDEX IF NOT EXISTS idx_user_invites_expires_at ON public.user_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON public.users(invited_by_user_id);

-- Unique constraint: one pending invite per email at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invites_pending_email 
ON public.user_invites(invitee_email) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their sent invites" ON public.user_invites;
DROP POLICY IF EXISTS "Users can create invites" ON public.user_invites;
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON public.user_invites;
DROP POLICY IF EXISTS "Service role can update invites" ON public.user_invites;

-- RLS policies
CREATE POLICY "Users can view their sent invites" ON public.user_invites
    FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invites" ON public.user_invites
    FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- Allow unauthenticated users to validate codes (needed for signup flow)
CREATE POLICY "Anyone can validate invite codes" ON public.user_invites
    FOR SELECT USING (true);

-- Service role can update invites (for completing signup)
CREATE POLICY "Service role can update invites" ON public.user_invites
    FOR UPDATE USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_invites_updated_at ON public.user_invites;
CREATE TRIGGER update_user_invites_updated_at
    BEFORE UPDATE ON public.user_invites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique 4-digit code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(4) AS $$
DECLARE
    new_code VARCHAR(4);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random 4-digit code
        new_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Check if code exists and is still pending/not expired
        SELECT EXISTS (
            SELECT 1 FROM public.user_invites 
            WHERE code = new_code 
            AND status = 'pending' 
            AND expires_at > NOW()
        ) INTO code_exists;
        
        -- If code doesn't exist, we can use it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old invites
CREATE OR REPLACE FUNCTION expire_old_user_invites()
RETURNS void AS $$
BEGIN
    UPDATE public.user_invites
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to validate invite code and return invite details
CREATE OR REPLACE FUNCTION validate_invite_code(p_code VARCHAR(4))
RETURNS TABLE (
    invite_id UUID,
    invitee_email TEXT,
    inviter_id UUID,
    inviter_first_name TEXT,
    inviter_last_name TEXT,
    inviter_profile_picture_url TEXT
) AS $$
BEGIN
    -- First expire any old invites
    PERFORM expire_old_user_invites();
    
    RETURN QUERY
    SELECT 
        ui.id,
        ui.invitee_email,
        ui.inviter_id,
        u.first_name,
        u.last_name,
        u.profile_picture_url
    FROM public.user_invites ui
    JOIN public.users u ON ui.inviter_id = u.id
    WHERE ui.code = p_code
    AND ui.status = 'pending'
    AND ui.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to complete invite (called after user signup)
CREATE OR REPLACE FUNCTION complete_user_invite(
    p_invite_id UUID,
    p_new_user_id UUID
)
RETURNS void AS $$
DECLARE
    v_inviter_id UUID;
BEGIN
    -- Get inviter ID and update invite
    UPDATE public.user_invites
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        invitee_user_id = p_new_user_id,
        updated_at = NOW()
    WHERE id = p_invite_id
    AND status = 'pending'
    RETURNING inviter_id INTO v_inviter_id;
    
    -- Update new user's invited_by field
    UPDATE public.users
    SET invited_by_user_id = v_inviter_id
    WHERE id = p_new_user_id;
    
    -- Create connection between inviter and invitee using the existing function
    IF v_inviter_id IS NOT NULL THEN
        PERFORM create_user_connection(v_inviter_id, p_new_user_id, NULL);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE public.user_invites IS 'Platform invite system with 4-digit codes for inviting new users';

