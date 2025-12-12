-- ============================================================================
-- Seed initial curated vocab for explicit profile facets
-- ============================================================================

-- Skills
INSERT INTO public.skills (name) VALUES
  ('Fundraising'),
  ('Sales'),
  ('Business Development'),
  ('Partnerships'),
  ('Growth'),
  ('GTM Strategy'),
  ('Product Management'),
  ('Engineering'),
  ('Design'),
  ('Data Science'),
  ('AI/ML'),
  ('Hiring'),
  ('Community'),
  ('Marketing'),
  ('Operations'),
  ('Strategy'),
  ('Finance'),
  ('Legal'),
  ('Investor Relations')
ON CONFLICT (name) DO NOTHING;

-- Roles
INSERT INTO public.roles (name) VALUES
  ('Founder'),
  ('Operator'),
  ('Investor'),
  ('Engineer'),
  ('Product Manager'),
  ('Designer'),
  ('Sales'),
  ('Growth'),
  ('Marketing'),
  ('Business Development'),
  ('Recruiter'),
  ('Advisor')
ON CONFLICT (name) DO NOTHING;

-- Industries
INSERT INTO public.industries (name) VALUES
  ('SaaS'),
  ('Fintech'),
  ('AI'),
  ('Consumer'),
  ('Marketplace'),
  ('DevTools'),
  ('Healthcare'),
  ('EdTech'),
  ('Climate'),
  ('E-commerce'),
  ('Media'),
  ('Real Estate')
ON CONFLICT (name) DO NOTHING;


