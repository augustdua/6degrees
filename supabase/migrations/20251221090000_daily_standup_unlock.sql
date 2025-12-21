-- Daily Standup Unlock + Life Questions
-- Created: 2025-12-21
--
-- Adds:
-- - life_questions: versioned bank of life questions
-- - user_life_question_state: per-user non-repeating shuffle state + today's assignment
-- - daily_standups: persisted daily standup submissions (yesterday/today + life question answer)

-- ============================================================================
-- 1. Life question bank
-- ============================================================================
CREATE TABLE IF NOT EXISTS life_questions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category ~ '^[A-J]$'),
  text TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE life_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read life questions" ON life_questions
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to life_questions" ON life_questions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 2. Per-user question assignment + non-repeating shuffle state
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_life_question_state (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  remaining_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Assigned question for the current local day (set by backend when gating)
  assigned_local_date DATE,
  assigned_question_id TEXT REFERENCES life_questions(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_life_question_state_version ON user_life_question_state(version);

ALTER TABLE user_life_question_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own question state" ON user_life_question_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own question state" ON user_life_question_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question state" ON user_life_question_state
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own question state" ON user_life_question_state
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_life_question_state" ON user_life_question_state
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- updated_at trigger for user_life_question_state
CREATE OR REPLACE FUNCTION update_user_life_question_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_life_question_state_timestamp ON user_life_question_state;
CREATE TRIGGER update_user_life_question_state_timestamp
  BEFORE UPDATE ON user_life_question_state
  FOR EACH ROW
  EXECUTE FUNCTION update_user_life_question_state_updated_at();

-- ============================================================================
-- 3. Daily standup submissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- "Day" is defined in the user's local timezone at submission time
  local_date DATE NOT NULL,
  timezone TEXT NOT NULL,

  -- Standup content
  yesterday TEXT NOT NULL,
  today TEXT NOT NULL,

  -- Life question (snapshot for audit/versioning)
  question_id TEXT NOT NULL REFERENCES life_questions(id),
  question_text TEXT NOT NULL,
  answer TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, local_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_standups_user_id ON daily_standups(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_standups_user_local_date ON daily_standups(user_id, local_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_standups_created_at ON daily_standups(created_at DESC);

ALTER TABLE daily_standups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own daily standups" ON daily_standups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily standups" ON daily_standups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily standups" ON daily_standups
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily standups" ON daily_standups
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to daily_standups" ON daily_standups
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- updated_at trigger for daily_standups
CREATE OR REPLACE FUNCTION update_daily_standups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_standups_timestamp ON daily_standups;
CREATE TRIGGER update_daily_standups_timestamp
  BEFORE UPDATE ON daily_standups
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_standups_updated_at();


