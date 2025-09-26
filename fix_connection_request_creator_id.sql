-- Fix connection_requests to auto-set creator_id and handle platform invites
-- Following the recommended approach: let DB set creator_id = auth.uid() automatically

-- 1) Create trigger function to set creator_id from auth.uid()
CREATE OR REPLACE FUNCTION public.set_creator_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_id IS NULL THEN
    NEW.creator_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Create the trigger
DROP TRIGGER IF EXISTS trg_set_creator_id ON public.connection_requests;
CREATE TRIGGER trg_set_creator_id
BEFORE INSERT ON public.connection_requests
FOR EACH ROW EXECUTE FUNCTION public.set_creator_id();

-- 3) RLS policies for connection_requests
DROP POLICY IF EXISTS "Creators can insert" ON public.connection_requests;
CREATE POLICY "Creators can insert"
ON public.connection_requests
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Creators can read their own" ON public.connection_requests;
CREATE POLICY "Creators can read their own"
ON public.connection_requests
FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

-- 4) Allow public read access for shareable links (needed for guest users)
DROP POLICY IF EXISTS "Public can read active requests" ON public.connection_requests;
CREATE POLICY "Public can read active requests"
ON public.connection_requests
FOR SELECT
TO anon, authenticated
USING (status = 'active' AND expires_at > NOW());

-- 5) Relax reward constraint for platform invites (can be lower than $10)
ALTER TABLE connection_requests
DROP CONSTRAINT IF EXISTS connection_requests_reward_check;

ALTER TABLE connection_requests
ADD CONSTRAINT connection_requests_reward_check
CHECK (reward >= 0 AND reward <= 10000);

-- 6) Allow shorter target names for platform invites
ALTER TABLE connection_requests
DROP CONSTRAINT IF EXISTS connection_requests_target_check;

ALTER TABLE connection_requests
ADD CONSTRAINT connection_requests_target_check
CHECK (LENGTH(target) >= 2 AND LENGTH(target) <= 200);