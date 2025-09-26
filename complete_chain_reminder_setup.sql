-- Complete the chain reminder notification setup
-- (Constraint was already fixed in previous step)

-- 1) Add index for better performance on chain reminder queries
CREATE INDEX IF NOT EXISTS idx_notifications_chain_reminder
ON public.notifications (user_id, type, created_at)
WHERE type = 'chain_reminder';

-- 2) Function to find chain tails that need reminders
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
  CROSS JOIN jsonb_array_elements(c.participants) as participant(value)
  WHERE c.status = 'active'
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

-- 3) Function to create chain reminder notifications
CREATE OR REPLACE FUNCTION public.enqueue_chain_tail_reminders(
  min_age_hours int default 1,
  cooldown_hours int default 24
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  cnt int := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.find_unshared_chain_tails(min_age_hours, cooldown_hours)
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      r.user_id,
      'chain_reminder',
      'Keep the chain moving! 🔗',
      'You joined a chain ' || r.hours_since_joined || ' hours ago but nobody has joined after you yet. Share your link to push it forward and increase your payout odds!',
      jsonb_build_object(
        'chain_id', r.chain_id,
        'request_id', r.request_id,
        'hours_since_joined', r.hours_since_joined
      )
    );
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

-- 4) Grant execution permissions
GRANT EXECUTE ON FUNCTION public.find_unshared_chain_tails(int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_chain_tail_reminders(int,int) TO authenticated;

-- 5) Test the functions (run these to verify everything works)
SELECT 'Testing: Finding current dead-end users...' as status;
SELECT * FROM public.find_unshared_chain_tails(0, 0) LIMIT 5;

SELECT 'Testing: Creating test notifications...' as status;
SELECT public.enqueue_chain_tail_reminders(0, 0) as notifications_created;

SELECT 'Verification: Recent chain_reminder notifications...' as status;
SELECT user_id, title, message, data, created_at
FROM public.notifications
WHERE type = 'chain_reminder'
ORDER BY created_at DESC
LIMIT 3;