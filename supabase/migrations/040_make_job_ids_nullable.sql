-- Migration: Make job IDs nullable in request_connection_paths
-- This allows saving paths even when jobs don't exist in connector_jobs table

-- Make job ID columns nullable
ALTER TABLE public.request_connection_paths
ALTER COLUMN creator_job_id DROP NOT NULL,
ALTER COLUMN target_job_id DROP NOT NULL;

-- Update comments
COMMENT ON COLUMN request_connection_paths.creator_job_id IS 'Optional reference to the creator''s job in connector_jobs. Null if job not in database.';
COMMENT ON COLUMN request_connection_paths.target_job_id IS 'Optional reference to the target''s job in connector_jobs. Null if job not in database.';
