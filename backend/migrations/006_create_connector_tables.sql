-- Migration: Create Connector Game Tables
-- Description: Stores jobs, embeddings, and graph connections for the networking game

-- ============================================
-- 1. Jobs Table (Core job information)
-- ============================================
CREATE TABLE IF NOT EXISTS connector_jobs (
    id SERIAL PRIMARY KEY,
    job_title VARCHAR(255) NOT NULL,
    industry_name VARCHAR(255) NOT NULL,
    sector_name VARCHAR(255) NOT NULL,
    job_description TEXT,
    key_skills TEXT,
    responsibilities TEXT,
    is_custom BOOLEAN DEFAULT FALSE,
    is_playable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Make combination of title + industry + sector unique (allows same title in different industries)
    UNIQUE(job_title, industry_name, sector_name)
);

-- Index for faster job lookups
CREATE INDEX idx_connector_jobs_title ON connector_jobs(job_title);
CREATE INDEX idx_connector_jobs_industry ON connector_jobs(industry_name);
CREATE INDEX idx_connector_jobs_sector ON connector_jobs(sector_name);
CREATE INDEX idx_connector_jobs_playable ON connector_jobs(is_playable) WHERE is_playable = TRUE;
CREATE INDEX idx_connector_jobs_composite ON connector_jobs(job_title, industry_name, sector_name);

-- ============================================
-- 2. Job Embeddings Table (ML vectors)
-- NOTE: Embeddings stored as JSON for now (pgvector extension not enabled)
-- ============================================
CREATE TABLE IF NOT EXISTS connector_job_embeddings (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES connector_jobs(id) ON DELETE CASCADE,
    embedding_json JSONB,  -- Store embedding as JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id)
);

-- Index for job_id lookups
CREATE INDEX idx_connector_embeddings_job ON connector_job_embeddings(job_id);

-- ============================================
-- 3. Graph Connections Table (Career paths)
-- ============================================
CREATE TABLE IF NOT EXISTS connector_graph_edges (
    id SERIAL PRIMARY KEY,
    source_job_id INTEGER NOT NULL REFERENCES connector_jobs(id) ON DELETE CASCADE,
    target_job_id INTEGER NOT NULL REFERENCES connector_jobs(id) ON DELETE CASCADE,
    weight DECIMAL(5,4) DEFAULT 1.0,  -- Connection strength (for future weighted pathfinding)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_job_id, target_job_id)
);

-- Indexes for fast graph traversal
CREATE INDEX idx_connector_edges_source ON connector_graph_edges(source_job_id);
CREATE INDEX idx_connector_edges_target ON connector_graph_edges(target_job_id);
CREATE INDEX idx_connector_edges_bidirectional ON connector_graph_edges(source_job_id, target_job_id);

-- ============================================
-- 4. Job Processing Queue (for async job addition)
-- ============================================
CREATE TABLE IF NOT EXISTS connector_job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
    progress INTEGER DEFAULT 0,  -- 0-100
    status_message TEXT,
    error_message TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Index for queue processing
CREATE INDEX idx_connector_queue_status ON connector_job_queue(status) WHERE status = 'pending';
CREATE INDEX idx_connector_queue_user ON connector_job_queue(created_by);

-- ============================================
-- 5. Game Statistics (optional - for analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS connector_game_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    start_job_id INTEGER REFERENCES connector_jobs(id) ON DELETE SET NULL,
    target_job_id INTEGER REFERENCES connector_jobs(id) ON DELETE SET NULL,
    path_length INTEGER,
    moves_taken INTEGER,
    hearts_remaining INTEGER,
    score INTEGER,
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Index for user stats
CREATE INDEX idx_connector_stats_user ON connector_game_stats(user_id);
CREATE INDEX idx_connector_stats_completed ON connector_game_stats(completed) WHERE completed = TRUE;

-- ============================================
-- 6. Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_connector_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connector_jobs_updated_at
    BEFORE UPDATE ON connector_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_connector_updated_at();

CREATE TRIGGER update_connector_queue_updated_at
    BEFORE UPDATE ON connector_job_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_connector_updated_at();

-- ============================================
-- 7. Helper Functions
-- ============================================

-- Function to get all neighbors of a job (for graph traversal)
CREATE OR REPLACE FUNCTION get_job_neighbors(job_id_param INTEGER)
RETURNS TABLE(neighbor_id INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT target_job_id FROM connector_graph_edges WHERE source_job_id = job_id_param
    UNION
    SELECT source_job_id FROM connector_graph_edges WHERE target_job_id = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to check if two jobs are connected
CREATE OR REPLACE FUNCTION are_jobs_connected(job1_id INTEGER, job2_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM connector_graph_edges
        WHERE (source_job_id = job1_id AND target_job_id = job2_id)
           OR (source_job_id = job2_id AND target_job_id = job1_id)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Comments for documentation
-- ============================================
COMMENT ON TABLE connector_jobs IS 'Stores all job titles and metadata for the Connector game';
COMMENT ON TABLE connector_job_embeddings IS 'ML embeddings for job similarity calculations';
COMMENT ON TABLE connector_graph_edges IS 'Graph connections between jobs for pathfinding';
COMMENT ON TABLE connector_job_queue IS 'Queue for processing custom job additions with OpenAI';
COMMENT ON TABLE connector_game_stats IS 'Player game statistics and history';

COMMENT ON COLUMN connector_jobs.is_custom IS 'TRUE if job was added by a user (vs seeded data)';
COMMENT ON COLUMN connector_jobs.is_playable IS 'FALSE if job is isolated (no connections)';
COMMENT ON COLUMN connector_graph_edges.weight IS 'Connection strength (1.0 = direct connection)';
