-- Create function to get profile collage organizations
-- This includes both user's own organizations AND organizations from their featured connections
CREATE OR REPLACE FUNCTION get_profile_collage_organizations(p_user_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'organizations', COALESCE(json_agg(
        json_build_object(
          'id', org_data.id,
          'name', org_data.name,
          'logo_url', org_data.logo_url,
          'source', org_data.source,
          'user_id', org_data.user_id
        )
      ), '[]'::json)
    )
    FROM (
      -- User's own organizations
      SELECT DISTINCT
        o.id,
        o.name,
        o.logo_url,
        'own' as source,
        p_user_id as user_id
      FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = p_user_id
        AND uo.is_current = true
      
      UNION
      
      -- Organizations from featured connections
      SELECT DISTINCT
        o.id,
        o.name,
        o.logo_url,
        'featured_connection' as source,
        fc_uo.user_id as user_id
      FROM user_featured_connections fc
      JOIN user_organizations fc_uo ON fc_uo.user_id = fc.featured_user_id
      JOIN organizations o ON fc_uo.organization_id = o.id
      WHERE fc.user_id = p_user_id
        AND fc.featured_user_id IS NOT NULL
        AND fc_uo.is_current = true
      
      ORDER BY source DESC  -- 'own' comes before 'featured_connection' alphabetically reversed
      LIMIT 7  -- Collage shows max 7 organizations
    ) org_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_profile_collage_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_collage_organizations(UUID) TO anon;

-- Update get_public_profile to include collage organizations
CREATE OR REPLACE FUNCTION get_public_profile(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_collage_orgs JSON;
BEGIN
  -- Get collage organizations
  SELECT get_profile_collage_organizations(p_user_id) INTO v_collage_orgs;
  
  SELECT json_build_object(
    'user', (
      SELECT json_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'bio', u.bio,
        'linkedin_url', u.linkedin_url,
        'profile_picture_url', u.profile_picture_url,
        'is_profile_public', COALESCE(u.is_profile_public, true),
        'social_capital_score', COALESCE(u.social_capital_score, 0),
        'social_capital_score_updated_at', u.social_capital_score_updated_at
      )
      FROM users u
      WHERE u.id = p_user_id
    ),
    'organizations', (
      -- Keep original organizations list for compatibility
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', o.id,
          'name', o.name,
          'logo_url', o.logo_url,
          'position', uo.position,
          'is_current', uo.is_current,
          'organization_type', uo.organization_type
        )
        ORDER BY uo.is_current DESC, uo.start_date DESC
      ), '[]'::json)
      FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = p_user_id
    ),
    'collage_organizations', (v_collage_orgs->'organizations'),
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
        )
        ORDER BY fc.display_order
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

