-- ============================================================================
-- Unified interaction tracking (Forum + Offers)
-- ============================================================================
-- Goal: store raw interaction events in a single table for easy querying and
-- later aggregation into edges for GNN export.
--
-- Target types (initial): forum_post, forum_comment, offer
-- Event types (initial): view, scroll_50, scroll_90, time_spent, reaction,
-- comment, share, click, book_click, bid_click, prompt_submit
-- ============================================================================

CREATE TABLE IF NOT EXISTS interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,

  -- What they interacted with
  -- NOTE: `offer_generation` is used for "For You" prompt submissions (ai_offer_generations.id)
  target_type TEXT NOT NULL CHECK (target_type IN ('forum_post', 'forum_comment', 'offer', 'offer_generation')),
  target_id UUID NOT NULL,

  -- The interaction
  event_type TEXT NOT NULL CHECK (event_type IN (
    'view', 'scroll_50', 'scroll_90', 'time_spent',
    'reaction', 'comment', 'share',
    'click', 'book_click', 'bid_click', 'prompt_submit'
  )),

  -- Optional context
  duration_ms INT,
  position INT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_interactions_event ON interactions(event_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user_target ON interactions(user_id, target_type);

-- RLS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own interactions
DROP POLICY IF EXISTS "Users can insert own interactions" ON interactions;
CREATE POLICY "Users can insert own interactions" ON interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read only their own interactions
DROP POLICY IF EXISTS "Users can read own interactions" ON interactions;
CREATE POLICY "Users can read own interactions" ON interactions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access" ON interactions;
CREATE POLICY "Service role full access" ON interactions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');


