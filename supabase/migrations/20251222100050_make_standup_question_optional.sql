-- Make standup question fields optional for simplified standups
-- Created: 2025-12-22

-- Make question fields nullable (for simplified standups that only have yesterday/today)
ALTER TABLE daily_standups ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE daily_standups ALTER COLUMN question_text DROP NOT NULL;
ALTER TABLE daily_standups ALTER COLUMN answer DROP NOT NULL;

-- Add default values
ALTER TABLE daily_standups ALTER COLUMN question_id SET DEFAULT NULL;
ALTER TABLE daily_standups ALTER COLUMN question_text SET DEFAULT NULL;
ALTER TABLE daily_standups ALTER COLUMN answer SET DEFAULT NULL;

-- Drop the foreign key constraint on question_id since we may use placeholder values
ALTER TABLE daily_standups DROP CONSTRAINT IF EXISTS daily_standups_question_id_fkey;

COMMENT ON COLUMN daily_standups.question_id IS 'Question ID (optional for simplified standups)';
COMMENT ON COLUMN daily_standups.question_text IS 'Question text snapshot (optional for simplified standups)';
COMMENT ON COLUMN daily_standups.answer IS 'Answer to question (optional for simplified standups)';

