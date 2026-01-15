-- Add work address + geocode fields to seed profiles (for Discover People map view)

BEGIN;

ALTER TABLE public.seed_profiles
  ADD COLUMN IF NOT EXISTS work_address TEXT,
  ADD COLUMN IF NOT EXISTS work_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS work_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS work_geocoded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS work_geocode_provider TEXT,
  ADD COLUMN IF NOT EXISTS work_geocode_precision TEXT;

CREATE INDEX IF NOT EXISTS idx_seed_profiles_work_lat_lng ON public.seed_profiles(work_lat, work_lng);
CREATE INDEX IF NOT EXISTS idx_seed_profiles_work_address ON public.seed_profiles(work_address);

COMMIT;

NOTIFY pgrst, 'reload schema';


