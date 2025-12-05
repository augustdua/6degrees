-- Forum Polls System
-- Each post can have an AI-generated poll with 4 options
-- Users can vote once per poll

-- forum_polls table
CREATE TABLE IF NOT EXISTS forum_polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE UNIQUE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- ["Option 1", "Option 2", "Option 3", "Option 4"]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- forum_poll_votes table (one vote per user per poll)
CREATE TABLE IF NOT EXISTS forum_poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES forum_polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  option_index INT NOT NULL CHECK (option_index >= 0 AND option_index <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_polls_post_id ON forum_polls(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_poll_votes_poll_id ON forum_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_forum_poll_votes_user_id ON forum_poll_votes(user_id);

-- RLS Policies
ALTER TABLE forum_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_poll_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read polls
CREATE POLICY "Anyone can read polls" ON forum_polls
  FOR SELECT USING (true);

-- Authenticated users can create polls
CREATE POLICY "Authenticated users can create polls" ON forum_polls
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Anyone can read votes (for counting)
CREATE POLICY "Anyone can read votes" ON forum_poll_votes
  FOR SELECT USING (true);

-- Users can vote (insert their own vote)
CREATE POLICY "Users can vote on polls" ON forum_poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot change votes (no update policy)

