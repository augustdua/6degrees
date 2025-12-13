-- Forum Tags Restructure Migration
-- Created: December 2024
-- Restructures communities to use tags, adds voting columns, and Pain Points support

-- ============================================================================
-- 1. Add tags column to forum_posts
-- ============================================================================
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for tag-based queries
CREATE INDEX IF NOT EXISTS idx_forum_posts_tags ON forum_posts USING GIN(tags);

-- ============================================================================
-- 2. Add upvotes and downvotes columns for proper sorting
-- ============================================================================
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS upvotes INT DEFAULT 0;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS downvotes INT DEFAULT 0;

-- Index for sorting by score
CREATE INDEX IF NOT EXISTS idx_forum_posts_vote_score ON forum_posts((upvotes - downvotes) DESC);

-- ============================================================================
-- 3. Create post_votes table for tracking individual votes
-- ============================================================================
CREATE TABLE IF NOT EXISTS forum_post_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One vote per user per post
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_post_votes_post_id ON forum_post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_votes_user_id ON forum_post_votes(user_id);

-- Enable RLS
ALTER TABLE forum_post_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_post_votes
CREATE POLICY "Users can create own votes" ON forum_post_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes" ON forum_post_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON forum_post_votes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read votes" ON forum_post_votes
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to forum_post_votes" ON forum_post_votes
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 4. Add Pain Points specific columns to forum_posts
-- ============================================================================
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2);
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS pain_points JSONB;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS sources TEXT[] DEFAULT '{}';

-- Update post_type constraint to include pain_point
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS forum_posts_post_type_check;
ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_post_type_check 
  CHECK (post_type IN ('regular', 'request', 'win', 'failure', 'bip_day', 'research_report', 'prediction', 'pain_point'));

-- Index for brand-based queries
CREATE INDEX IF NOT EXISTS idx_forum_posts_brand_name ON forum_posts(brand_name) WHERE brand_name IS NOT NULL;

-- ============================================================================
-- 5. Add new communities: Daily Standups and Pain Points
-- ============================================================================
INSERT INTO forum_communities (name, slug, description, icon, color) VALUES
('Daily Standups', 'daily-standups', 'Share your daily progress, blockers, and goals', '📅', '#06B6D4'),
('Pain Points', 'pain-points', 'D2C brand pain point analysis from Reddit and social media', '🔍', '#F97316')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 6. Map existing posts to tags based on community
-- ============================================================================
-- Build in Public -> tag: build-in-public
UPDATE forum_posts 
SET tags = array_append(COALESCE(tags, '{}'), 'build-in-public')
WHERE community_id IN (SELECT id FROM forum_communities WHERE slug = 'build-in-public')
  AND NOT ('build-in-public' = ANY(COALESCE(tags, '{}')));

-- Wins -> tag: wins
UPDATE forum_posts 
SET tags = array_append(COALESCE(tags, '{}'), 'wins')
WHERE community_id IN (SELECT id FROM forum_communities WHERE slug = 'wins')
  AND NOT ('wins' = ANY(COALESCE(tags, '{}')));

-- Failures -> tag: failures
UPDATE forum_posts 
SET tags = array_append(COALESCE(tags, '{}'), 'failures')
WHERE community_id IN (SELECT id FROM forum_communities WHERE slug = 'failures')
  AND NOT ('failures' = ANY(COALESCE(tags, '{}')));

-- Network -> tag: network (will become part of General)
UPDATE forum_posts 
SET tags = array_append(COALESCE(tags, '{}'), 'network')
WHERE community_id IN (SELECT id FROM forum_communities WHERE slug = 'network')
  AND NOT ('network' = ANY(COALESCE(tags, '{}')));

-- ============================================================================
-- 7. Create 'General' community and migrate old posts
-- ============================================================================
INSERT INTO forum_communities (name, slug, description, icon, color) VALUES
('General', 'general', 'General community discussions - tag your posts with build-in-public, wins, failures, or network', '💬', '#6366F1')
ON CONFLICT (slug) DO NOTHING;

-- Get the General community ID
DO $$
DECLARE
  general_id UUID;
  build_in_public_id UUID;
  network_id UUID;
  wins_id UUID;
  failures_id UUID;
BEGIN
  SELECT id INTO general_id FROM forum_communities WHERE slug = 'general';
  SELECT id INTO build_in_public_id FROM forum_communities WHERE slug = 'build-in-public';
  SELECT id INTO network_id FROM forum_communities WHERE slug = 'network';
  SELECT id INTO wins_id FROM forum_communities WHERE slug = 'wins';
  SELECT id INTO failures_id FROM forum_communities WHERE slug = 'failures';
  
  -- Move posts from old communities to General
  IF general_id IS NOT NULL THEN
    -- Build in Public posts
    IF build_in_public_id IS NOT NULL THEN
      UPDATE forum_posts 
      SET community_id = general_id
      WHERE community_id = build_in_public_id;
    END IF;
    
    -- Network posts
    IF network_id IS NOT NULL THEN
      UPDATE forum_posts 
      SET community_id = general_id
      WHERE community_id = network_id;
    END IF;
    
    -- Wins posts
    IF wins_id IS NOT NULL THEN
      UPDATE forum_posts 
      SET community_id = general_id
      WHERE community_id = wins_id;
    END IF;
    
    -- Failures posts
    IF failures_id IS NOT NULL THEN
      UPDATE forum_posts 
      SET community_id = general_id
      WHERE community_id = failures_id;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 8. Soft-delete old communities (mark as inactive instead of deleting)
-- ============================================================================
ALTER TABLE forum_communities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE forum_communities 
SET is_active = false 
WHERE slug IN ('build-in-public', 'network', 'wins', 'failures');

-- ============================================================================
-- 9. Create saved_posts table for bookmark functionality
-- ============================================================================
CREATE TABLE IF NOT EXISTS forum_saved_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_saved_posts_user_id ON forum_saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_saved_posts_post_id ON forum_saved_posts(post_id);

-- Enable RLS
ALTER TABLE forum_saved_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can save posts" ON forum_saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON forum_saved_posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own saved posts" ON forum_saved_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to forum_saved_posts" ON forum_saved_posts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 10. Helper function to calculate hot score (Reddit-style)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_hot_score(
  p_upvotes INT,
  p_downvotes INT,
  p_comment_count INT,
  p_created_at TIMESTAMPTZ
)
RETURNS DECIMAL AS $$
DECLARE
  score INT;
  order_val DECIMAL;
  sign_val INT;
  seconds DECIMAL;
BEGIN
  score := p_upvotes - p_downvotes + (p_comment_count * 2);
  
  IF score > 0 THEN
    sign_val := 1;
  ELSIF score < 0 THEN
    sign_val := -1;
  ELSE
    sign_val := 0;
  END IF;
  
  order_val := LOG(GREATEST(ABS(score), 1));
  seconds := EXTRACT(EPOCH FROM (p_created_at - '2024-01-01'::TIMESTAMPTZ)) / 45000;
  
  RETURN ROUND(sign_val * order_val + seconds, 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 11. Trigger to update upvotes/downvotes counts
-- ============================================================================
CREATE OR REPLACE FUNCTION update_post_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE forum_posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
    ELSE
      UPDATE forum_posts SET downvotes = downvotes + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE forum_posts SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.post_id;
    ELSE
      UPDATE forum_posts SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE forum_posts 
      SET upvotes = upvotes + 1, 
          downvotes = GREATEST(downvotes - 1, 0) 
      WHERE id = NEW.post_id;
    ELSE
      UPDATE forum_posts 
      SET upvotes = GREATEST(upvotes - 1, 0), 
          downvotes = downvotes + 1 
      WHERE id = NEW.post_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_post_vote_counts ON forum_post_votes;
CREATE TRIGGER trigger_update_post_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON forum_post_votes
  FOR EACH ROW EXECUTE FUNCTION update_post_vote_counts();

-- ============================================================================
-- 12. Backfill existing reaction counts to upvotes (👍 = upvote)
-- ============================================================================
UPDATE forum_posts fp
SET upvotes = COALESCE((
  SELECT COUNT(*) 
  FROM forum_reactions fr 
  WHERE fr.target_type = 'post' 
    AND fr.target_id = fp.id 
    AND fr.emoji = '👍'
), 0)
WHERE upvotes = 0;

