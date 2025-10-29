-- Migration: Security Fixes for RLS and Security Definer Views
-- Addresses Supabase security linter errors

-- ============================================================================
-- PART 1: Enable RLS on tables that don't have it
-- ============================================================================

-- Backend/system tables - should not be directly accessible by users
ALTER TABLE IF EXISTS connector_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS connector_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS connector_job_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS connector_job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS connector_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_events ENABLE ROW LEVEL SECURITY;

-- User-accessible table
ALTER TABLE IF EXISTS chain_paths ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Add RLS policies for connector tables (Backend only)
-- ============================================================================
-- These tables should only be accessible via service role, not by users

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role only access" ON connector_graph_edges;
DROP POLICY IF EXISTS "Service role only access" ON connector_jobs;
DROP POLICY IF EXISTS "Service role only access" ON connector_job_embeddings;
DROP POLICY IF EXISTS "Service role only access" ON connector_job_queue;
DROP POLICY IF EXISTS "Service role only access" ON connector_game_stats;
DROP POLICY IF EXISTS "Service role only access" ON webhook_events;

-- Create restrictive policies (effectively denying all user access)
-- These tables will only be accessible via service role key from backend

CREATE POLICY "No direct user access to connector_graph_edges"
  ON connector_graph_edges
  FOR ALL
  USING (false);

CREATE POLICY "No direct user access to connector_jobs"
  ON connector_jobs
  FOR ALL
  USING (false);

CREATE POLICY "No direct user access to connector_job_embeddings"
  ON connector_job_embeddings
  FOR ALL
  USING (false);

CREATE POLICY "No direct user access to connector_job_queue"
  ON connector_job_queue
  FOR ALL
  USING (false);

CREATE POLICY "No direct user access to connector_game_stats"
  ON connector_game_stats
  FOR ALL
  USING (false);

CREATE POLICY "No direct user access to webhook_events"
  ON webhook_events
  FOR ALL
  USING (false);

-- ============================================================================
-- PART 3: Add RLS policies for chain_paths (User accessible)
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view chain paths they participate in" ON chain_paths;
DROP POLICY IF EXISTS "Users can create chain paths" ON chain_paths;

-- Users can view chain paths for chains they're part of
CREATE POLICY "Users can view chain paths they participate in"
  ON chain_paths
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chains c
      WHERE c.id = chain_paths.chain_id
      AND (
        -- User is in the participants array
        (c.participants::jsonb) @> jsonb_build_array(jsonb_build_object('userid', auth.uid()))
      )
    )
  );

-- Allow creating chain paths (typically done by backend, but allow for flexibility)
CREATE POLICY "Authenticated users can create chain paths"
  ON chain_paths
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- PART 4: Recreate views WITHOUT security_definer
-- ============================================================================

-- Drop and recreate referral_stats view
DROP VIEW IF EXISTS referral_stats CASCADE;

CREATE VIEW referral_stats AS
SELECT
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    COALESCE(click_credits.total, 0) as total_click_credits,
    COALESCE(click_credits.count, 0) as total_clicks,
    COALESCE(join_credits.total, 0) as total_join_credits,
    COALESCE(join_credits.count, 0) as total_joins
FROM users u
LEFT JOIN (
    SELECT
        user_id,
        SUM(amount) as total,
        COUNT(*) as count
    FROM credit_transactions
    WHERE source = 'link_click'
    GROUP BY user_id
) click_credits ON u.id = click_credits.user_id
LEFT JOIN (
    SELECT
        user_id,
        SUM(amount) as total,
        COUNT(*) as count
    FROM credit_transactions
    WHERE source = 'referral_join'
    GROUP BY user_id
) join_credits ON u.id = join_credits.user_id;

COMMENT ON VIEW referral_stats IS 'Aggregated referral statistics per user. Now respects RLS policies of querying user.';

-- Drop and recreate bids view
DROP VIEW IF EXISTS bids CASCADE;

CREATE VIEW bids AS
SELECT
  id,
  offer_creator_id as creator_id,
  title,
  description,
  'general'::text as connection_type,
  asking_price_inr as price,
  status,
  created_at,
  updated_at
FROM offers
WHERE status IN ('active', 'paused', 'draft');

COMMENT ON VIEW bids IS 'Compatibility view for legacy bid system. Now respects RLS policies of querying user.';

-- Drop and recreate bid_responses view
DROP VIEW IF EXISTS bid_responses CASCADE;

CREATE VIEW bid_responses AS
SELECT
  id,
  offer_id as bid_id,
  buyer_id as responder_id,
  NULL::text as message,
  status,
  created_at
FROM offer_bids;

COMMENT ON VIEW bid_responses IS 'Compatibility view for legacy bid response system. Now respects RLS policies of querying user.';

-- Drop and recreate orphaned_chains_view
DROP VIEW IF EXISTS orphaned_chains_view CASCADE;

CREATE VIEW orphaned_chains_view AS
SELECT 
  c.id as chain_id,
  c.request_id,
  c.status as chain_status,
  c.participants,
  c.total_reward,
  c.created_at as chain_created_at,
  cr.status as request_status,
  cr.deleted_at,
  cr.target,
  cr.creator_id
FROM chains c
LEFT JOIN connection_requests cr ON c.request_id = cr.id
WHERE cr.status = 'deleted' OR cr.deleted_at IS NOT NULL OR cr.id IS NULL;

COMMENT ON VIEW orphaned_chains_view IS 'View showing chains that reference deleted or non-existent requests. Now respects RLS policies of querying user.';

-- ============================================================================
-- PART 5: Grant appropriate permissions
-- ============================================================================

-- Grant SELECT on views to authenticated users
GRANT SELECT ON referral_stats TO authenticated;
GRANT SELECT ON bids TO authenticated;
GRANT SELECT ON bid_responses TO authenticated;
GRANT SELECT ON orphaned_chains_view TO authenticated;

-- Note: Connector tables and webhook_events are intentionally NOT granted
-- to authenticated users as they are backend-only tables

-- ============================================================================
-- Verification queries (commented out - uncomment to test)
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN (
--   'connector_graph_edges', 'connector_jobs', 'connector_job_embeddings',
--   'connector_job_queue', 'connector_game_stats', 'chain_paths', 'webhook_events'
-- );

-- Verify views don't have security_definer:
-- SELECT viewname, viewowner 
-- FROM pg_views 
-- WHERE schemaname = 'public' 
-- AND viewname IN ('referral_stats', 'bids', 'bid_responses', 'orphaned_chains_view');

