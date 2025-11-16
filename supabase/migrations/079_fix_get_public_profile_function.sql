-- Fix get_public_profile function to use correct column names
-- The offers table uses 'offer_creator_id', not 'creator_id'

DROP FUNCTION IF EXISTS get_public_profile(UUID);

CREATE OR REPLACE FUNCTION get_public_profile(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'user', (
      SELECT json_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'bio', u.bio,
        'linkedin_url', u.linkedin_url,
        'profile_picture_url', u.profile_picture_url,
        'is_profile_public', COALESCE(u.is_profile_public, true)
      )
      FROM users u
      WHERE u.id = p_user_id
    ),
    'organizations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', o.id,
          'name', o.name,
          'logo_url', o.logo_url,
          'position', uo.position,
          'is_current', uo.is_current,
          'organization_type', uo.organization_type
        ) ORDER BY uo.is_current DESC, uo.start_date DESC
      ), '[]'::json)
      FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = p_user_id
    ),
    'featured_connections', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', fc.id,
          'user_id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'profile_picture_url', u.profile_picture_url,
          'bio', u.bio,
          'display_order', fc.display_order
        ) ORDER BY fc.display_order
      ), '[]'::json)
      FROM user_featured_connections fc
      LEFT JOIN users u ON fc.featured_user_id = u.id
      WHERE fc.user_id = p_user_id AND fc.featured_user_id IS NOT NULL
    ),
    'active_offers_count', (
      SELECT COUNT(*)::integer
      FROM offers
      WHERE offer_creator_id = p_user_id AND status = 'active'
    ),
    'active_requests_count', (
      SELECT COUNT(*)::integer
      FROM connection_requests
      WHERE creator_id = p_user_id AND status = 'active'
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

