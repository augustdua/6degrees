-- Migration: Drop offers feature tables
-- This is a forward-only cleanup after the app no longer uses offers.

-- 1) Detach intro_requests from offers completely
ALTER TABLE public.intro_requests
  DROP CONSTRAINT IF EXISTS intro_requests_offer_id_fkey;

DROP INDEX IF EXISTS public.idx_intro_requests_offer_id;

ALTER TABLE public.intro_requests
  DROP COLUMN IF EXISTS offer_id,
  DROP COLUMN IF EXISTS apollo_person_id,
  DROP COLUMN IF EXISTS enriched_data,
  DROP COLUMN IF EXISTS enriched_at,
  DROP COLUMN IF EXISTS contacted_at,
  DROP COLUMN IF EXISTS completed_at;

-- 2) Drop offer-related tables (order matters for FKs)
DROP TABLE IF EXISTS public.offer_likes CASCADE;
DROP TABLE IF EXISTS public.offer_bids CASCADE;
DROP TABLE IF EXISTS public.offer_connections CASCADE;
DROP TABLE IF EXISTS public.offer_availability CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';


