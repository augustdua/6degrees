-- Fix remaining 6 SQL functions that still reference avatar_url
-- All of these are user profile picture references (not HeyGen video avatars)

-- 1. Fix get_user_connections
DROP FUNCTION IF EXISTS get_user_connections(UUID) CASCADE;

CREATE FUNCTION get_user_connections(p_user_id UUID)
RETURNS TABLE (
  connection_id UUID,
  connected_user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  linkedin_url TEXT,
  avatar_url TEXT,
  bio TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  connection_request_id UUID,
  connection_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id as connection_id,
    CASE
      WHEN uc.user1_id = p_user_id THEN uc.user2_id
      ELSE uc.user1_id
    END as connected_user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.linkedin_url,
    u.profile_picture_url as avatar_url,  -- FIXED
    u.bio,
    uc.connected_at,
    uc.connection_request_id,
    uc.connection_type
  FROM public.user_connections uc
  JOIN public.users u ON (
    CASE
      WHEN uc.user1_id = p_user_id THEN u.id = uc.user2_id
      ELSE u.id = uc.user1_id
    END
  )
  WHERE (uc.user1_id = p_user_id OR uc.user2_id = p_user_id)
    AND uc.status = 'connected'
  ORDER BY uc.connected_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_connections(UUID) TO authenticated;

-- 2. Fix get_chain_participants
DROP FUNCTION IF EXISTS get_chain_participants(UUID) CASCADE;

CREATE FUNCTION get_chain_participants(p_chain_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role TEXT,
    joined_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM chains c
        WHERE c.id = p_chain_id
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(c.participants) AS participant
            WHERE (participant->>'userid')::uuid = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not part of this chain';
    END IF;

    RETURN QUERY
    SELECT
        (participant->>'userid')::UUID as user_id,
        participant->>'email' as email,
        participant->>'firstName' as first_name,
        participant->>'lastName' as last_name,
        u.profile_picture_url as avatar_url,  -- FIXED
        participant->>'role' as role,
        (participant->>'joinedAt')::TIMESTAMP WITH TIME ZONE as joined_at
    FROM chains c,
         jsonb_array_elements(c.participants) as participant
    LEFT JOIN users u ON u.id = (participant->>'userid')::UUID
    WHERE c.id = p_chain_id
    ORDER BY (participant->>'joinedAt')::TIMESTAMP WITH TIME ZONE ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_chain_participants(UUID) TO authenticated;

-- 3. Fix discover_users (large function, only changing avatar_url line)
DROP FUNCTION IF EXISTS discover_users(TEXT, TEXT, TEXT, BOOLEAN, INTEGER, INTEGER) CASCADE;

CREATE FUNCTION discover_users(
  p_search TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_exclude_connected BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  company TEXT,
  role TEXT,
  location TEXT,
  linkedin_url TEXT,
  skills TEXT[],
  interests TEXT[],
  mutual_connections INTEGER,
  last_active TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN,
  has_pending_request BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    u.id as user_id,
    u.first_name,
    u.last_name,
    CASE
      WHEN u.visibility = 'public' OR
           EXISTS(SELECT 1 FROM public.user_connections uc
                  WHERE ((uc.user1_id = v_current_user_id AND uc.user2_id = u.id) OR
                         (uc.user1_id = u.id AND uc.user2_id = v_current_user_id))
                  AND uc.status = 'connected')
      THEN u.email
      ELSE NULL
    END as email,
    u.profile_picture_url as avatar_url,  -- FIXED
    u.bio,
    u.company,
    u.role,
    u.location,
    u.linkedin_url,
    u.skills,
    u.interests,
    0 as mutual_connections,
    u.last_active,
    COALESCE(EXISTS(
      SELECT 1 FROM public.user_connections uc
      WHERE ((uc.user1_id = v_current_user_id AND uc.user2_id = u.id) OR
             (uc.user1_id = u.id AND uc.user2_id = v_current_user_id))
      AND uc.status = 'connected'
    ), FALSE) as is_connected,
    COALESCE(EXISTS(
      SELECT 1 FROM public.direct_connection_requests dcr
      WHERE ((dcr.sender_id = v_current_user_id AND dcr.receiver_id = u.id) OR
             (dcr.sender_id = u.id AND dcr.receiver_id = v_current_user_id))
      AND dcr.status = 'pending'
    ), FALSE) as has_pending_request
  FROM public.users u
  WHERE u.id != v_current_user_id
    AND (u.visibility = 'public' OR
         (u.visibility = 'connections' AND EXISTS(
           SELECT 1 FROM public.user_connections uc
           WHERE ((uc.user1_id = v_current_user_id AND uc.user2_id = u.id) OR
                  (uc.user1_id = u.id AND uc.user2_id = v_current_user_id))
           AND uc.status = 'connected'
         )))
    AND (p_search IS NULL OR
         (u.first_name || ' ' || u.last_name) ILIKE '%' || p_search || '%' OR
         u.bio ILIKE '%' || p_search || '%' OR
         u.company ILIKE '%' || p_search || '%' OR
         u.role ILIKE '%' || p_search || '%')
    AND (p_company IS NULL OR u.company ILIKE '%' || p_company || '%')
    AND (p_location IS NULL OR u.location ILIKE '%' || p_location || '%')
    AND (NOT p_exclude_connected OR NOT EXISTS(
      SELECT 1 FROM public.user_connections uc
      WHERE ((uc.user1_id = v_current_user_id AND uc.user2_id = u.id) OR
             (uc.user1_id = u.id AND uc.user2_id = v_current_user_id))
      AND uc.status = 'connected'
    ))
  ORDER BY
    u.last_active DESC NULLS LAST,
    u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION discover_users(TEXT, TEXT, TEXT, BOOLEAN, INTEGER, INTEGER) TO authenticated;

-- 4. Fix get_group_chat_messages
DROP FUNCTION IF EXISTS get_group_chat_messages(UUID, INTEGER, UUID) CASCADE;

CREATE FUNCTION get_group_chat_messages(
    p_chain_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    sender_name TEXT,
    avatar_url TEXT,
    content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM chains c
        WHERE c.id = p_chain_id
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(c.participants) AS participant
            WHERE (participant->>'userid')::uuid = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not part of this chain';
    END IF;

    RETURN QUERY
    SELECT
        gm.id,
        gm.sender_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as sender_name,
        u.profile_picture_url as avatar_url,  -- FIXED
        gm.content,
        gm.sent_at,
        gm.edited_at
    FROM group_messages gm
    JOIN users u ON u.id = gm.sender_id
    WHERE gm.chain_id = p_chain_id
    AND (p_before_message_id IS NULL OR gm.sent_at < (
        SELECT gm2.sent_at FROM group_messages gm2 WHERE gm2.id = p_before_message_id
    ))
    ORDER BY gm.sent_at ASC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_group_chat_messages(UUID, INTEGER, UUID) TO authenticated;

-- 5. Fix get_group_chat_messages_with_reactions
DROP FUNCTION IF EXISTS get_group_chat_messages_with_reactions(UUID, INTEGER, UUID) CASCADE;

CREATE FUNCTION get_group_chat_messages_with_reactions(
    p_chain_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    sender_name TEXT,
    avatar_url TEXT,
    content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    reactions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM chains c
        WHERE c.id = p_chain_id
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(c.participants) AS participant
            WHERE (participant->>'userid')::uuid = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not part of this chain';
    END IF;

    RETURN QUERY
    SELECT
        gm.id,
        gm.sender_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as sender_name,
        u.profile_picture_url as avatar_url,  -- FIXED
        gm.content,
        gm.sent_at,
        gm.edited_at,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'emoji', emoji,
                        'count', reaction_count,
                        'users', users_array
                    )
                )
                FROM (
                    SELECT
                        mr.emoji,
                        COUNT(*) as reaction_count,
                        jsonb_agg(
                            jsonb_build_object(
                                'userId', mr.user_id::text,
                                'userName', COALESCE(ru.first_name || ' ' || ru.last_name, ru.email)
                            )
                        ) as users_array
                    FROM message_reactions mr
                    JOIN users ru ON ru.id = mr.user_id
                    WHERE mr.message_id = gm.id
                    GROUP BY mr.emoji
                ) reactions_grouped
            ),
            '[]'::jsonb
        ) as reactions
    FROM group_messages gm
    JOIN users u ON u.id = gm.sender_id
    WHERE gm.chain_id = p_chain_id
    AND (p_before_message_id IS NULL OR gm.sent_at < (
        SELECT gm2.sent_at FROM group_messages gm2 WHERE gm2.id = p_before_message_id
    ))
    ORDER BY gm.sent_at ASC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_group_chat_messages_with_reactions(UUID, INTEGER, UUID) TO authenticated;

-- 6. Fix handle_new_user trigger function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    profile_picture_url,  -- FIXED
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',  -- Note: This comes from OAuth, will be null for most users
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    profile_picture_url = EXCLUDED.profile_picture_url,  -- FIXED
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

SELECT '✅ Fixed all 6 remaining functions to use profile_picture_url' as status;
