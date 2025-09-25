-- Step 4: Create respond_to_chain_invite function
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

    -- If accepted, join the chain (placeholder for now)
    IF p_response = 'accepted' THEN
        -- This would integrate with existing chain joining system
        NULL;
    END IF;

    RETURN TRUE;
END;
$$;