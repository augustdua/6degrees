-- Fix the discover_users overload that still uses avatar_url
-- There are 2 overloads with different parameter orders
-- This fixes the one with (p_limit, p_offset, p_search, ...)

DROP FUNCTION IF EXISTS discover_users(INTEGER, INTEGER, TEXT, TEXT, TEXT, BOOLEAN) CASCADE;

CREATE FUNCTION discover_users(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_exclude_connected BOOLEAN DEFAULT TRUE
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
    u.profile_picture_url as avatar_url,  -- FIXED: was u.avatar_url
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

GRANT EXECUTE ON FUNCTION discover_users(INTEGER, INTEGER, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

SELECT '✅ Fixed both discover_users overloads' as status;

