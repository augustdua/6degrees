-- Update get_profile_collage_organizations to show ONLY featured connections' organizations
-- Removes user's own organizations from the collage
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
      -- Organizations from featured connections ONLY
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
      
      ORDER BY o.name  -- Alphabetical order
      LIMIT 7  -- Collage shows max 7 organizations
    ) org_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

