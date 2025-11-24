-- Create version of discover_users that accepts user_id as parameter
-- This is needed for backend API calls where auth.uid() returns NULL

CREATE OR REPLACE FUNCTION discover_users(
  p_user_id UUID,
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
  -- Use the provided user_id instead of auth.uid()
  v_current_user_id := p_user_id;

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.profile_picture_url AS avatar_url,
    u.bio,
    u.company,
    u.role,
    u.location,
    u.linkedin_url,
    u.skills,
    u.interests,
    COALESCE(
      (SELECT COUNT(*)::INTEGER
       FROM user_connections uc1
       INNER JOIN user_connections uc2
         ON (uc1.user2_id = uc2.user2_id OR uc1.user2_id = uc2.user1_id OR uc1.user1_id = uc2.user2_id OR uc1.user1_id = uc2.user1_id)
       WHERE (uc1.user1_id = v_current_user_id OR uc1.user2_id = v_current_user_id)
         AND (uc2.user1_id = u.id OR uc2.user2_id = u.id)
         AND uc1.status = 'accepted'
         AND uc2.status = 'accepted'
         AND uc1.id != uc2.id
      ), 0
    ) AS mutual_connections,
    u.last_active,
    COALESCE(
      EXISTS(
        SELECT 1
        FROM user_connections
        WHERE ((user1_id = v_current_user_id AND user2_id = u.id)
           OR (user2_id = v_current_user_id AND user1_id = u.id))
          AND status = 'accepted'
      ), FALSE
    ) AS is_connected,
    COALESCE(
      EXISTS(
        SELECT 1
        FROM user_connections
        WHERE ((user1_id = v_current_user_id AND user2_id = u.id)
           OR (user2_id = v_current_user_id AND user1_id = u.id))
          AND status = 'pending'
      ), FALSE
    ) AS has_pending_request
  FROM users u
  WHERE u.id != v_current_user_id
    AND u.visibility = 'public'
    AND (p_search IS NULL OR (u.first_name ILIKE '%' || p_search || '%' OR u.last_name ILIKE '%' || p_search || '%'))
    AND (p_company IS NULL OR u.company ILIKE '%' || p_company || '%')
    AND (p_location IS NULL OR u.location ILIKE '%' || p_location || '%')
    AND (
      NOT p_exclude_connected OR NOT EXISTS(
        SELECT 1
        FROM user_connections
        WHERE ((user1_id = v_current_user_id AND user2_id = u.id)
           OR (user2_id = v_current_user_id AND user1_id = u.id))
          AND status = 'accepted'
      )
    )
  ORDER BY u.last_active DESC NULLS LAST, u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION discover_users(UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION discover_users(UUID, INTEGER, INTEGER, TEXT, TEXT, TEXT, BOOLEAN) TO anon;

