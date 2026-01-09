-- Create intro_requests table (v2, offer-independent) for fresh databases.
-- Needed because older migration 091_apollo_integration.sql depended on public.offers (now removed).

BEGIN;

CREATE TABLE IF NOT EXISTS public.intro_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Legacy: kept nullable for back-compat with older data exports.
  offer_id UUID,

  -- Core participants
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connector_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Offer-independent target fields
  target_name TEXT,
  target_company TEXT,
  target_role TEXT,
  target_linkedin_url TEXT,

  -- Notes for the workflow
  request_note TEXT,
  connector_note TEXT,

  -- Status lifecycle
  status TEXT DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'asked_question',
      'accepted',
      'rejected',
      'completed',
      -- legacy states kept for older rows if they exist:
      'enriched',
      'contacted'
    )
  ),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_intro_requests_requester_id ON public.intro_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_connector_user_id ON public.intro_requests(connector_user_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_status ON public.intro_requests(status);
CREATE INDEX IF NOT EXISTS idx_intro_requests_created_at ON public.intro_requests(created_at DESC);

-- RLS
ALTER TABLE public.intro_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own intro requests" ON public.intro_requests;
CREATE POLICY "Users can view own intro requests"
  ON public.intro_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = connector_user_id);

DROP POLICY IF EXISTS "Users can create intro requests" ON public.intro_requests;
CREATE POLICY "Users can create intro requests"
  ON public.intro_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update own intro requests" ON public.intro_requests;
CREATE POLICY "Users can update own intro requests"
  ON public.intro_requests
  FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = connector_user_id);

DROP POLICY IF EXISTS "Service role has full access to intro_requests" ON public.intro_requests;
CREATE POLICY "Service role has full access to intro_requests"
  ON public.intro_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

GRANT ALL ON public.intro_requests TO authenticated;
GRANT ALL ON public.intro_requests TO service_role;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_intro_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS intro_requests_updated_at ON public.intro_requests;
CREATE TRIGGER intro_requests_updated_at
  BEFORE UPDATE ON public.intro_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_intro_requests_updated_at();

COMMIT;

NOTIFY pgrst, 'reload schema';


