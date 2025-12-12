-- ============================================================================
-- Explicit profile facets for networking (curated vocab + user selections)
-- ============================================================================

-- Reference vocab tables (curated lists)
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User facet joins
CREATE TABLE IF NOT EXISTS public.user_skills (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  years INT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.user_industries (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES public.industries(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, industry_id)
);

-- Explicit intent: needs & offerings (free text)
CREATE TABLE IF NOT EXISTS public.user_needs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  need_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_offerings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  offering_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_industries_user_id ON public.user_industries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_needs_user_id_created ON public.user_needs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_offerings_user_id_created ON public.user_offerings(user_id, created_at DESC);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_offerings ENABLE ROW LEVEL SECURITY;

-- Vocab: anyone can read
DROP POLICY IF EXISTS "Anyone can read skills" ON public.skills;
CREATE POLICY "Anyone can read skills" ON public.skills
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read roles" ON public.roles;
CREATE POLICY "Anyone can read roles" ON public.roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read industries" ON public.industries;
CREATE POLICY "Anyone can read industries" ON public.industries
  FOR SELECT USING (true);

-- User joins: users can read/write only their own
DROP POLICY IF EXISTS "Users can read own user_skills" ON public.user_skills;
CREATE POLICY "Users can read own user_skills" ON public.user_skills
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own user_skills" ON public.user_skills;
CREATE POLICY "Users can upsert own user_skills" ON public.user_skills
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own user_roles" ON public.user_roles;
CREATE POLICY "Users can read own user_roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own user_roles" ON public.user_roles;
CREATE POLICY "Users can upsert own user_roles" ON public.user_roles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own user_industries" ON public.user_industries;
CREATE POLICY "Users can read own user_industries" ON public.user_industries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert own user_industries" ON public.user_industries;
CREATE POLICY "Users can upsert own user_industries" ON public.user_industries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Needs/offers: users can read/write only their own
DROP POLICY IF EXISTS "Users can read own user_needs" ON public.user_needs;
CREATE POLICY "Users can read own user_needs" ON public.user_needs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can write own user_needs" ON public.user_needs;
CREATE POLICY "Users can write own user_needs" ON public.user_needs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own user_offerings" ON public.user_offerings;
CREATE POLICY "Users can read own user_offerings" ON public.user_offerings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can write own user_offerings" ON public.user_offerings;
CREATE POLICY "Users can write own user_offerings" ON public.user_offerings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role bypass
DROP POLICY IF EXISTS "Service role full access skills" ON public.skills;
CREATE POLICY "Service role full access skills" ON public.skills
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access roles" ON public.roles;
CREATE POLICY "Service role full access roles" ON public.roles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access industries" ON public.industries;
CREATE POLICY "Service role full access industries" ON public.industries
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access user_skills" ON public.user_skills;
CREATE POLICY "Service role full access user_skills" ON public.user_skills
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access user_roles" ON public.user_roles;
CREATE POLICY "Service role full access user_roles" ON public.user_roles
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access user_industries" ON public.user_industries;
CREATE POLICY "Service role full access user_industries" ON public.user_industries
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access user_needs" ON public.user_needs;
CREATE POLICY "Service role full access user_needs" ON public.user_needs
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access user_offerings" ON public.user_offerings;
CREATE POLICY "Service role full access user_offerings" ON public.user_offerings
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');


