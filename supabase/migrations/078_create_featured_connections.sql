-- Create user_featured_connections table for profile collage feature
-- This allows users to showcase their top professional connections on their profile

CREATE TABLE IF NOT EXISTS user_featured_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  featured_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  featured_email TEXT, -- for invites to non-users
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either featured_user_id or featured_email is set, but not both
  CONSTRAINT featured_connection_check CHECK (
    (featured_user_id IS NOT NULL AND featured_email IS NULL) OR
    (featured_user_id IS NULL AND featured_email IS NOT NULL)
  ),
  
  -- Prevent duplicate featured connections
  CONSTRAINT unique_featured_user UNIQUE(user_id, featured_user_id),
  CONSTRAINT unique_featured_email UNIQUE(user_id, featured_email)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_featured_connections_user_id ON user_featured_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_featured_connections_featured_user_id ON user_featured_connections(featured_user_id);
CREATE INDEX IF NOT EXISTS idx_featured_connections_order ON user_featured_connections(user_id, display_order);

-- Enable Row Level Security
ALTER TABLE user_featured_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own featured connections
CREATE POLICY "Users can view their own featured connections"
  ON user_featured_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Everyone can view featured connections for any user (for public profiles)
CREATE POLICY "Anyone can view featured connections"
  ON user_featured_connections
  FOR SELECT
  USING (true);

-- Users can insert their own featured connections
CREATE POLICY "Users can insert their own featured connections"
  ON user_featured_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own featured connections
CREATE POLICY "Users can update their own featured connections"
  ON user_featured_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own featured connections
CREATE POLICY "Users can delete their own featured connections"
  ON user_featured_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to get public profile data
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
        )
        ORDER BY uo.is_current DESC, uo.start_date DESC
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_public_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_profile(UUID) TO anon;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_featured_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_featured_connections_timestamp
  BEFORE UPDATE ON user_featured_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_connections_updated_at();


