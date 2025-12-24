-- Coworking / GrindHouse sessions + bookings (Daily.co backed)

CREATE TABLE IF NOT EXISTS public.coworking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  room_name TEXT NOT NULL,
  room_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (starts_at),
  UNIQUE (room_name)
);

CREATE INDEX IF NOT EXISTS idx_coworking_sessions_starts_at ON public.coworking_sessions(starts_at);

CREATE TABLE IF NOT EXISTS public.coworking_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.coworking_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coworking_bookings_user_id ON public.coworking_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_coworking_bookings_session_id ON public.coworking_bookings(session_id);

ALTER TABLE public.coworking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coworking_bookings ENABLE ROW LEVEL SECURITY;

-- Sessions: readable by any authenticated user
DROP POLICY IF EXISTS "Authenticated can read coworking sessions" ON public.coworking_sessions;
CREATE POLICY "Authenticated can read coworking sessions"
  ON public.coworking_sessions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Bookings: user can read/create/delete their own bookings
DROP POLICY IF EXISTS "Users can read own coworking bookings" ON public.coworking_bookings;
CREATE POLICY "Users can read own coworking bookings"
  ON public.coworking_bookings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own coworking bookings" ON public.coworking_bookings;
CREATE POLICY "Users can create own coworking bookings"
  ON public.coworking_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own coworking bookings" ON public.coworking_bookings;
CREATE POLICY "Users can delete own coworking bookings"
  ON public.coworking_bookings
  FOR DELETE
  USING (auth.uid() = user_id);


