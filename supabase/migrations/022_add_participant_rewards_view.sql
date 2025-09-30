-- Migration: Add participant rewards calculation as a database view
-- This ensures reward calculations are done efficiently in the database

-- Drop existing view if it exists
DROP VIEW IF EXISTS participant_rewards_with_decay CASCADE;

-- Create a view exposing participant timing signals used for UI timers
-- Joins chains, chain_paths, and participant data to compute:
-- 1) Freeze status and freeze end
-- 2) Grace period end (12h since last activity)
-- 3) Hours since activity and hours of active decay (post grace)
CREATE VIEW participant_rewards_with_decay AS
WITH participant_subtrees AS (
  -- Map each participant to their subtree
  SELECT DISTINCT
    cp.chain_id,
    unnest(cp.path_userids) as participant_id,
    cp.subtree_root_id,
    cp.subtree_frozen_until,
    cp.last_child_added_at
  FROM chain_paths cp
),
participant_info AS (
  -- Get participant details from chains JSONB
  SELECT
    c.id as chain_id,
    c.total_reward,
    jsonb_array_elements(c.participants) as participant_data
  FROM chains c
),
expanded_participants AS (
  -- Expand JSONB to columns
  SELECT
    pi.chain_id,
    pi.total_reward,
    (pi.participant_data->>'userid')::uuid as userid,
    pi.participant_data->>'firstName' as first_name,
    pi.participant_data->>'lastName' as last_name,
    pi.participant_data->>'email' as email,
    pi.participant_data->>'role' as role,
    (pi.participant_data->>'joinedAt')::timestamptz as joined_at,
    jsonb_array_length(c.participants) as participant_count
  FROM participant_info pi
  JOIN chains c ON c.id = pi.chain_id
)
SELECT
  ep.chain_id,
  ep.userid,
  ep.first_name,
  ep.last_name,
  ep.email,
  ep.role,
  ep.joined_at,
  ps.subtree_root_id,
  -- Freeze status
  CASE
    WHEN ps.subtree_frozen_until IS NOT NULL
         AND ps.subtree_frozen_until > NOW()
    THEN true
    ELSE false
  END as is_frozen,
  ps.subtree_frozen_until as freeze_ends_at,
  -- Grace period end (12 hours after last activity)
  (COALESCE(ps.last_child_added_at, ep.joined_at) + interval '12 hours') as grace_ends_at,
  -- Hours since last activity (for debugging)
  EXTRACT(EPOCH FROM (NOW() - COALESCE(ps.last_child_added_at, ep.joined_at))) / 3600 as hours_since_activity,
  -- Hours of active decay (excluding grace period)
  GREATEST(0,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(ps.last_child_added_at, ep.joined_at))) / 3600 - 12
  ) as hours_of_decay
FROM expanded_participants ep
LEFT JOIN participant_subtrees ps
  ON ps.chain_id = ep.chain_id
  AND ps.participant_id = ep.userid;

-- Add comment
COMMENT ON VIEW participant_rewards_with_decay IS
'Exposes participant timing signals for UI timers: freeze state/end, grace end, hours since activity, hours of decay.
Reward distribution is path-based and computed at completion, so this view intentionally omits per-participant dollar amounts.';

-- Grant access
GRANT SELECT ON participant_rewards_with_decay TO authenticated;