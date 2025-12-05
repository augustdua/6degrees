-- Add missing columns for structured data
-- metric_value, metric_label for Build in Public sorting
-- lessons_learned for Failures

ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS metric_value NUMERIC;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS metric_label TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS lessons_learned TEXT;

