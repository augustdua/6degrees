-- Seed Profiles (Unclaimed) for pre-created CrossLunch/Zaurq profiles
-- These are NOT authenticated users. They can later be claimed and linked to auth.users/public.users.
--
-- Motivation:
-- - public.users.id must reference auth.users(id)
-- - we still want public profile pages for seed people before they create an account
--
-- This migration introduces:
-- - public.seed_profiles: core unclaimed profile record
-- - public.seed_profile_organizations: work history attached to seed_profiles, reusing organizations table
-- - public.seed_profile_scrape_snapshots: optional raw scrape storage for provenance/debuggability

BEGIN;

-- Core seed profile record
CREATE TABLE IF NOT EXISTS public.seed_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  headline TEXT,
  bio TEXT,
  location TEXT,
  linkedin_url TEXT,
  profile_picture_url TEXT,
  enrichment JSONB NOT NULL DEFAULT '{}'::jsonb,
  source JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'claimed', 'disabled')),
  claimed_user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seed_profiles_status ON public.seed_profiles(status);
CREATE INDEX IF NOT EXISTS idx_seed_profiles_linkedin_url ON public.seed_profiles(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_seed_profiles_email ON public.seed_profiles(email);

-- Work history (ties into existing organizations table)
CREATE TABLE IF NOT EXISTS public.seed_profile_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_profile_id UUID NOT NULL REFERENCES public.seed_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  position TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seed_profile_id, organization_id, position, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_seed_profile_orgs_seed_profile_id ON public.seed_profile_organizations(seed_profile_id);
CREATE INDEX IF NOT EXISTS idx_seed_profile_orgs_org_id ON public.seed_profile_organizations(organization_id);

-- Optional raw scrape snapshots (for provenance/debugging; keep separate from "enrichment")
CREATE TABLE IF NOT EXISTS public.seed_profile_scrape_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_profile_id UUID NOT NULL REFERENCES public.seed_profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_seed_profile_snapshots_seed_profile_id ON public.seed_profile_scrape_snapshots(seed_profile_id);

-- updated_at triggers (reuse existing function if present; otherwise create a local one)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pg_function_is_visible(oid)
  ) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_seed_profiles_updated_at ON public.seed_profiles;
CREATE TRIGGER trg_seed_profiles_updated_at
BEFORE UPDATE ON public.seed_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_seed_profile_orgs_updated_at ON public.seed_profile_organizations;
CREATE TRIGGER trg_seed_profile_orgs_updated_at
BEFORE UPDATE ON public.seed_profile_organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.seed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_profile_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_profile_scrape_snapshots ENABLE ROW LEVEL SECURITY;

-- Public can view unclaimed (and claimed) seed profiles unless disabled.
DROP POLICY IF EXISTS "Public can view seed profiles" ON public.seed_profiles;
CREATE POLICY "Public can view seed profiles" ON public.seed_profiles
  FOR SELECT
  USING (status IN ('unclaimed', 'claimed'));

-- Only service role can insert/update/delete seed profiles for now.
DROP POLICY IF EXISTS "Service role can manage seed profiles" ON public.seed_profiles;
CREATE POLICY "Service role can manage seed profiles" ON public.seed_profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Public can view seed profile orgs when the seed profile is public (not disabled)
DROP POLICY IF EXISTS "Public can view seed profile orgs" ON public.seed_profile_organizations;
CREATE POLICY "Public can view seed profile orgs" ON public.seed_profile_organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.seed_profiles sp
      WHERE sp.id = seed_profile_organizations.seed_profile_id
        AND sp.status IN ('unclaimed', 'claimed')
    )
  );

DROP POLICY IF EXISTS "Service role can manage seed profile orgs" ON public.seed_profile_organizations;
CREATE POLICY "Service role can manage seed profile orgs" ON public.seed_profile_organizations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Snapshots are NOT publicly readable (only service role)
DROP POLICY IF EXISTS "Service role can manage seed profile snapshots" ON public.seed_profile_scrape_snapshots;
CREATE POLICY "Service role can manage seed profile snapshots" ON public.seed_profile_scrape_snapshots
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

NOTIFY pgrst, 'reload schema';


