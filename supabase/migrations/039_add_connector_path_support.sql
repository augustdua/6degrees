-- Migration: Add connector path support to connection requests
-- This enables storing job connections and their calculated paths for visualization

-- Add job reference fields to connection_requests
ALTER TABLE public.connection_requests
ADD COLUMN creator_job_id INTEGER REFERENCES connector_jobs(id) ON DELETE SET NULL,
ADD COLUMN target_job_id INTEGER REFERENCES connector_jobs(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX idx_connection_requests_creator_job ON public.connection_requests(creator_job_id) WHERE creator_job_id IS NOT NULL;
CREATE INDEX idx_connection_requests_target_job ON public.connection_requests(target_job_id) WHERE target_job_id IS NOT NULL;

-- Create table to cache calculated connection paths
CREATE TABLE public.request_connection_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
    creator_job_id INTEGER NOT NULL REFERENCES connector_jobs(id) ON DELETE CASCADE,
    target_job_id INTEGER NOT NULL REFERENCES connector_jobs(id) ON DELETE CASCADE,

    -- Store the calculated path
    path_data JSONB NOT NULL, -- Array of job objects with id, title, industry, sector
    path_length INTEGER NOT NULL,

    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one path per request
    CONSTRAINT unique_path_per_request UNIQUE(request_id)
);

-- Add indexes
CREATE INDEX idx_request_paths_request_id ON public.request_connection_paths(request_id);
CREATE INDEX idx_request_paths_jobs ON public.request_connection_paths(creator_job_id, target_job_id);

-- Enable RLS
ALTER TABLE public.request_connection_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies for request_connection_paths
CREATE POLICY "Users can view paths for visible requests"
    ON public.request_connection_paths FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM connection_requests cr
            WHERE cr.id = request_connection_paths.request_id
            AND (
                cr.status IN ('active', 'pending')
                AND cr.expires_at > NOW()
                AND cr.deleted_at IS NULL
                OR cr.creator_id = auth.uid()
            )
        )
    );

CREATE POLICY "Request creators can insert paths"
    ON public.request_connection_paths FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM connection_requests cr
            WHERE cr.id = request_id
            AND cr.creator_id = auth.uid()
        )
    );

CREATE POLICY "Request creators can update paths"
    ON public.request_connection_paths FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM connection_requests cr
            WHERE cr.id = request_id
            AND cr.creator_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON COLUMN connection_requests.creator_job_id IS 'Reference to the creator''s job role in the connector game';
COMMENT ON COLUMN connection_requests.target_job_id IS 'Reference to the target person''s job role in the connector game';
COMMENT ON TABLE request_connection_paths IS 'Cached connection paths between jobs for visualization';
COMMENT ON COLUMN request_connection_paths.path_data IS 'JSONB array of job objects representing the connection path';
