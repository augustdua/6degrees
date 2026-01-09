-- Migration: Intro Requests v2 (offer-independent)
-- Goal: Remove dependency on offers/Apollo and support "Inbox + Find a bridge" intro workflow.

DO $$
BEGIN
  IF to_regclass('public.intro_requests') IS NULL THEN
    RAISE NOTICE 'Skipping 112_intro_requests_v2_offer_independent.sql: public.intro_requests does not exist (use 20260109091000_create_intro_requests_v2.sql for fresh DBs).';
    RETURN;
  END IF;

  -- 1) Make offer_id optional for back-compat during migration
  ALTER TABLE public.intro_requests
    ALTER COLUMN offer_id DROP NOT NULL;

  -- 2) Add connector + target fields for the new workflow
  ALTER TABLE public.intro_requests
    ADD COLUMN IF NOT EXISTS connector_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_name TEXT,
    ADD COLUMN IF NOT EXISTS target_company TEXT,
    ADD COLUMN IF NOT EXISTS target_role TEXT,
    ADD COLUMN IF NOT EXISTS target_linkedin_url TEXT,
    ADD COLUMN IF NOT EXISTS request_note TEXT,
    ADD COLUMN IF NOT EXISTS connector_note TEXT;

  -- 3) Update status constraint to support new states
  -- (Constraint name is usually intro_requests_status_check from the inline CHECK.)
  ALTER TABLE public.intro_requests
    DROP CONSTRAINT IF EXISTS intro_requests_status_check;

  ALTER TABLE public.intro_requests
    ADD CONSTRAINT intro_requests_status_check
    CHECK (
      status IN (
        'pending',
        'asked_question',
        'accepted',
        'rejected',
        'completed',
        -- legacy states kept for existing rows until offers are fully dropped:
        'enriched',
        'contacted'
      )
    );

  -- 4) Helpful indexes
  CREATE INDEX IF NOT EXISTS idx_intro_requests_connector_user_id ON public.intro_requests(connector_user_id);
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';


