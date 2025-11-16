-- Update get_public_profile to include featured connections' organizations
-- This will make the collage show YOUR orgs + FEATURED CONNECTIONS' orgs

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
      -- Combine user's own orgs + featured connections' orgs (deduplicated)
      SELECT COALESCE(json_agg(
        jsonb_build_object(
          'id', org_data.org_id,
          'name', org_data.org_name,
          'logo_url', org_data.logo_url,
          'position', org_data.position,
          'is_current', org_data.is_current,
          'organization_type', org_data.organization_type,
          'source', org_data.source
        ) ORDER BY 
          org_data.priority,
          org_data.is_current DESC
      ), '[]'::json)
      FROM (
        SELECT DISTINCT ON (o.id)
          o.id as org_id,
          o.name as org_name,
          o.logo_url,
          uo.position,
          uo.is_current,
          uo.organization_type,
          CASE WHEN uo.user_id = p_user_id THEN 'own' ELSE 'featured_connection' END as source,
          CASE WHEN uo.user_id = p_user_id THEN 0 ELSE 1 END as priority
        FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = p_user_id -- User's own organizations
           OR uo.user_id IN ( -- Featured connections' organizations
             SELECT fc.featured_user_id 
             FROM user_featured_connections fc 
             WHERE fc.user_id = p_user_id 
               AND fc.featured_user_id IS NOT NULL
           )
        ORDER BY o.id, CASE WHEN uo.user_id = p_user_id THEN 0 ELSE 1 END
      ) org_data
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

