-- Standup Streak Tracking
-- Created: 2025-12-22
--
-- Adds streak tracking to users table for daily standup completion

-- Add streak columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS standup_current_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS standup_max_streak INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS standup_last_completed_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS standup_skipped_today BOOLEAN DEFAULT false;

-- Add index for efficient streak queries
CREATE INDEX IF NOT EXISTS idx_users_standup_streak ON users(standup_current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_users_standup_last_date ON users(standup_last_completed_date);

-- Add comments for documentation
COMMENT ON COLUMN users.standup_current_streak IS 'Current consecutive days of standup completion';
COMMENT ON COLUMN users.standup_max_streak IS 'Maximum streak ever achieved by this user';
COMMENT ON COLUMN users.standup_last_completed_date IS 'Last date (local) the user completed a standup';
COMMENT ON COLUMN users.standup_skipped_today IS 'Whether user skipped today standup (resets daily)';

-- Function to calculate and update streak on standup submission
CREATE OR REPLACE FUNCTION update_user_standup_streak()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_local_date DATE;
  v_last_date DATE;
  v_current_streak INT;
  v_max_streak INT;
BEGIN
  v_user_id := NEW.user_id;
  v_local_date := NEW.local_date;
  
  -- Get current streak data
  SELECT 
    standup_last_completed_date,
    standup_current_streak,
    standup_max_streak
  INTO v_last_date, v_current_streak, v_max_streak
  FROM users
  WHERE id = v_user_id;
  
  -- Initialize if null
  v_current_streak := COALESCE(v_current_streak, 0);
  v_max_streak := COALESCE(v_max_streak, 0);
  
  -- Calculate new streak
  IF v_last_date IS NULL THEN
    -- First standup ever
    v_current_streak := 1;
  ELSIF v_local_date = v_last_date THEN
    -- Same day, no change (upsert on same day)
    NULL;
  ELSIF v_local_date = v_last_date + INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    v_current_streak := v_current_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    v_current_streak := 1;
  END IF;
  
  -- Update max streak if current exceeds it
  IF v_current_streak > v_max_streak THEN
    v_max_streak := v_current_streak;
  END IF;
  
  -- Update user record
  UPDATE users SET
    standup_current_streak = v_current_streak,
    standup_max_streak = v_max_streak,
    standup_last_completed_date = v_local_date,
    standup_skipped_today = false
  WHERE id = v_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update streak on standup insert
DROP TRIGGER IF EXISTS trigger_update_standup_streak ON daily_standups;
CREATE TRIGGER trigger_update_standup_streak
  AFTER INSERT ON daily_standups
  FOR EACH ROW
  EXECUTE FUNCTION update_user_standup_streak();

