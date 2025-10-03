-- Fix: Don't send chain reminders for completed/cancelled requests
-- Also update chains to match their request status

-- 1. Update the notification function to exclude completed requests
CREATE OR REPLACE FUNCTION public.find_unshared_chain_tails(
  min_age_hours int default 1,
  cooldown_hours int default 24
)
RETURNS TABLE (
  user_id uuid,
  chain_id uuid,
  request_id uuid,
  joined_at timestamptz,
  hours_since_joined int
)
LANGUAGE sql
STABLE
AS $$
WITH tails AS (
  SELECT
    c.id as chain_id,
    c.request_id,
    (participant.value->>'userid')::uuid as user_id,
    COALESCE(
      (participant.value->>'joinedAt')::timestamptz,
      c.created_at
    ) as joined_at
  FROM public.chains c
  INNER JOIN public.connection_requests cr ON c.request_id = cr.id
  CROSS JOIN jsonb_array_elements(c.participants) as participant(value)
  WHERE c.status = 'active'
    AND cr.status = 'active'  -- NEW: Only active requests
    AND cr.deleted_at IS NULL  -- NEW: Not deleted
    AND participant.value->>'role' != 'creator'  -- Exclude creators
    -- Check if this user has NO children (no one joined using their link)
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(c.participants) as child(value)
      WHERE child.value->>'parentUserId' = participant.value->>'userid'
    )
),
eligible AS (
  SELECT t.*
  FROM tails t
  -- Tail is old enough
  WHERE t.joined_at < NOW() - (make_interval(hours => min_age_hours))
  -- Haven't recently reminded this tail for this chain
  AND NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = t.user_id
      AND n.data->>'chain_id' = t.chain_id::text
      AND n.type = 'chain_reminder'
      AND n.created_at > NOW() - (make_interval(hours => cooldown_hours))
  )
)
SELECT
  user_id,
  chain_id,
  request_id,
  joined_at,
  FLOOR(EXTRACT(EPOCH FROM (NOW() - joined_at))/3600)::int as hours_since_joined
FROM eligible;
$$;

-- 2. Update existing chains to match their request status
UPDATE chains
SET status = 'completed',
    completed_at = COALESCE(completed_at, NOW())
WHERE status = 'active'
AND request_id IN (
    SELECT id FROM connection_requests
    WHERE status = 'completed'
);

UPDATE chains
SET status = 'failed'
WHERE status = 'active'
AND request_id IN (
    SELECT id FROM connection_requests
    WHERE status IN ('cancelled', 'expired')
    OR deleted_at IS NOT NULL
);

-- 3. Create trigger to keep chain status in sync with request status
CREATE OR REPLACE FUNCTION sync_chain_status_with_request()
RETURNS TRIGGER AS $$
BEGIN
    -- When request is completed, complete the chain
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE chains
        SET status = 'completed',
            completed_at = COALESCE(completed_at, NOW())
        WHERE request_id = NEW.id
        AND status = 'active';
    END IF;

    -- When request is cancelled/expired, fail the chain
    IF NEW.status IN ('cancelled', 'expired') AND OLD.status NOT IN ('cancelled', 'expired') THEN
        UPDATE chains
        SET status = 'failed'
        WHERE request_id = NEW.id
        AND status = 'active';
    END IF;

    -- When request is deleted, fail the chain
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE chains
        SET status = 'failed'
        WHERE request_id = NEW.id
        AND status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_sync_chain_status ON connection_requests;
CREATE TRIGGER trigger_sync_chain_status
    AFTER UPDATE ON connection_requests
    FOR EACH ROW
    EXECUTE FUNCTION sync_chain_status_with_request();

COMMENT ON FUNCTION find_unshared_chain_tails IS 'Find chain participants who need reminders - excludes completed/cancelled requests';
COMMENT ON FUNCTION sync_chain_status_with_request IS 'Keeps chain status in sync with request status';
