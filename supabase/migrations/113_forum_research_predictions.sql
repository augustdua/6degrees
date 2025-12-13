-- Forum Research & Predictions Migration
-- Created: December 2024
-- Adds Market Research and Predictions communities with specialized features

-- ============================================================================
-- 1. Add new communities: Market Research and Predictions
-- ============================================================================
INSERT INTO forum_communities (name, slug, description, icon, color) VALUES
('Market Research', 'market-research', 'In-depth case studies, market analysis, and industry deep dives', '📊', '#3B82F6'),
('Predictions', 'predictions', 'Make predictions about startups, markets, and trends. Vote Yes/No!', '🎯', '#EC4899')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. Extend post_type to include research_report and prediction
-- ============================================================================
-- Drop and recreate the constraint to add new types
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_post_type_check;
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_post_type_check 
  CHECK (post_type IN ('regular', 'request', 'win', 'failure', 'bip_day', 'research_report', 'prediction'));

-- ============================================================================
-- 3. Add prediction-specific columns to forum_posts
-- ============================================================================
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS resolution_date DATE;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS resolution_source TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS prediction_category TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS initial_probability DECIMAL(3,2);
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS resolved_outcome BOOLEAN;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS company TEXT;

-- Add check constraint for prediction_category
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_prediction_category_check
  CHECK (prediction_category IS NULL OR prediction_category IN ('funding', 'expansion', 'regulatory', 'competition', 'leadership', 'ipo', 'acquisition', 'other'));

-- Index for prediction resolution queries
CREATE INDEX IF NOT EXISTS idx_forum_posts_resolution_date ON forum_posts(resolution_date) WHERE resolution_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_posts_resolved_outcome ON forum_posts(resolved_outcome) WHERE resolved_outcome IS NOT NULL;

-- ============================================================================
-- 4. Create prediction_votes table
-- ============================================================================
CREATE TABLE IF NOT EXISTS prediction_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote BOOLEAN NOT NULL, -- true = Yes, false = No
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One vote per user per prediction
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_prediction_votes_post_id ON prediction_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_prediction_votes_user_id ON prediction_votes(user_id);

-- Enable RLS
ALTER TABLE prediction_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prediction_votes
CREATE POLICY "Users can create own votes" ON prediction_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes" ON prediction_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON prediction_votes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read votes" ON prediction_votes
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to prediction_votes" ON prediction_votes
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 5. Create research_suggestions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS research_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_text TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_suggestions_user_id ON research_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_suggestions_status ON research_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_research_suggestions_created_at ON research_suggestions(created_at DESC);

-- Enable RLS
ALTER TABLE research_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for research_suggestions
CREATE POLICY "Users can create suggestions" ON research_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own suggestions" ON research_suggestions
  FOR SELECT USING (auth.uid() = user_id OR status = 'approved' OR status = 'completed');

CREATE POLICY "Service role full access to research_suggestions" ON research_suggestions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 6. Helper function to get prediction vote counts
-- ============================================================================
CREATE OR REPLACE FUNCTION get_prediction_vote_counts(p_post_id UUID)
RETURNS TABLE (
  yes_count BIGINT,
  no_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE vote = true) as yes_count,
    COUNT(*) FILTER (WHERE vote = false) as no_count,
    COUNT(*) as total_count
  FROM prediction_votes
  WHERE post_id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Add system user for automated posts (if not exists)
-- ============================================================================
-- We'll use a service role insert for automated posts, so user_id can be nullable
-- for system-generated content. But to maintain FK constraint, we need a system user.
-- This should already exist or be handled by the Python script using an admin user_id.


