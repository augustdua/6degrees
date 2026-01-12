-- Offline lunches: store latest user location and lunch suggestions decisions
-- Used by Home "Nearby Lunches" module.

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Latest known location for each user (no history)
CREATE TABLE IF NOT EXISTS public.user_locations (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_meters integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_updated_at ON public.user_locations(updated_at);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can insert their own location" ON public.user_locations;
DROP POLICY IF EXISTS "Users can update their own location" ON public.user_locations;

CREATE POLICY "Users can read their own location"
  ON public.user_locations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location"
  ON public.user_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
  ON public.user_locations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_locations_updated_at ON public.user_locations;
CREATE TRIGGER update_user_locations_updated_at
  BEFORE UPDATE ON public.user_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Suggestions served to the user; user can accept/reject
CREATE TABLE IF NOT EXISTS public.lunch_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  suggested_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  suggested_lat double precision,
  suggested_lng double precision,
  distance_meters integer,
  score numeric,
  reasons text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_lunch_suggestions_user_status ON public.lunch_suggestions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lunch_suggestions_expires_at ON public.lunch_suggestions(expires_at);

-- Only one pending suggestion per user pair at a time
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lunch_suggestions_pending_pair
  ON public.lunch_suggestions(user_id, suggested_user_id)
  WHERE status = 'pending';

ALTER TABLE public.lunch_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their lunch suggestions" ON public.lunch_suggestions;
DROP POLICY IF EXISTS "Users can insert their lunch suggestions" ON public.lunch_suggestions;
DROP POLICY IF EXISTS "Users can update their lunch suggestions" ON public.lunch_suggestions;

CREATE POLICY "Users can read their lunch suggestions"
  ON public.lunch_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow inserts for the authenticated user row (backend service role can also insert)
CREATE POLICY "Users can insert their lunch suggestions"
  ON public.lunch_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow user to update their own suggestions (accept/reject)
CREATE POLICY "Users can update their lunch suggestions"
  ON public.lunch_suggestions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_lunch_suggestions_updated_at ON public.lunch_suggestions;
CREATE TRIGGER update_lunch_suggestions_updated_at
  BEFORE UPDATE ON public.lunch_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


