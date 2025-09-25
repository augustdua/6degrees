-- Step 3: Create send_chain_invite function
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
                'You have been invited to join a connection chain for ' || v_request.target,
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