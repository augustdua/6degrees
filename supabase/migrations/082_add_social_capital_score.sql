-- Add social capital score to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS social_capital_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_capital_score_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_social_capital_score ON users(social_capital_score DESC) WHERE social_capital_score > 0;

-- Create featured_connection_scores table for caching individual connection scores
CREATE TABLE IF NOT EXISTS featured_connection_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  featured_connection_id UUID NOT NULL REFERENCES user_featured_connections(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  position TEXT NOT NULL,
  organization_domain TEXT,
  organization_score INTEGER NOT NULL CHECK (organization_score >= 0 AND organization_score <= 50),
  role_score INTEGER NOT NULL CHECK (role_score >= 0 AND role_score <= 50),
  total_score INTEGER GENERATED ALWAYS AS (organization_score + role_score) STORED,
  ai_reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, featured_connection_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_featured_connection_scores_user_id ON featured_connection_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_featured_connection_scores_connection_id ON featured_connection_scores(featured_connection_id);

-- Enable Row Level Security
ALTER TABLE featured_connection_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for featured_connection_scores
-- Users can view their own connection scores
CREATE POLICY "Users can view their own connection scores"
  ON featured_connection_scores
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own connection scores
CREATE POLICY "Users can insert their own connection scores"
  ON featured_connection_scores
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own connection scores
CREATE POLICY "Users can update their own connection scores"
  ON featured_connection_scores
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own connection scores
CREATE POLICY "Users can delete their own connection scores"
  ON featured_connection_scores
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger for featured_connection_scores
CREATE OR REPLACE FUNCTION update_featured_connection_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_featured_connection_scores_timestamp
  BEFORE UPDATE ON featured_connection_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_connection_scores_updated_at();

-- Create RPC function to calculate social capital score
CREATE OR REPLACE FUNCTION calculate_social_capital_score(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_score INTEGER;
  v_breakdown JSON;
BEGIN
  -- Sum all connection scores
  SELECT COALESCE(SUM(total_score), 0)
  INTO v_total_score
  FROM featured_connection_scores
  WHERE user_id = p_user_id;
  
  -- Get breakdown of all scores
  SELECT COALESCE(json_agg(
    json_build_object(
      'connectionId', featured_connection_id,
      'organizationName', organization_name,
      'position', position,
      'organizationScore', organization_score,
      'roleScore', role_score,
      'totalScore', total_score,
      'reasoning', ai_reasoning
    )
  ), '[]'::json)
  INTO v_breakdown
  FROM featured_connection_scores
  WHERE user_id = p_user_id;
  
  -- Update user's social capital score
  UPDATE users
  SET 
    social_capital_score = v_total_score,
    social_capital_score_updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Return score and breakdown
  RETURN json_build_object(
    'score', v_total_score,
    'breakdown', v_breakdown,
    'updatedAt', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_social_capital_score(UUID) TO authenticated;

-- Update get_public_profile to include social capital score
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
        'is_profile_public', COALESCE(u.is_profile_public, true),
        'social_capital_score', COALESCE(u.social_capital_score, 0),
        'social_capital_score_updated_at', u.social_capital_score_updated_at
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

