-- Migration: Drop is_playable flag from connector_jobs
-- Rationale: No longer distinguishing playable vs non-playable. Graph uses all nodes.

BEGIN;

-- Drop partial index if present
DROP INDEX IF EXISTS idx_connector_jobs_playable;

-- Drop column if present
ALTER TABLE public.connector_jobs
  DROP COLUMN IF EXISTS is_playable;

COMMIT;



