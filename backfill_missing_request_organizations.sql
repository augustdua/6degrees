-- Backfill missing target organizations for active requests
-- Based on context from the target field

-- 1. Create organization for Bubble N Tea (Asian Cafe/Franchise)
INSERT INTO organizations (id, name, domain, logo_url, industry, description, website)
VALUES (
  gen_random_uuid(),
  'Bubble Tea Franchise',
  'bubbletea.com',
  'https://img.logo.dev/bubbletea.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
  'Food & Beverage',
  'Asian bubble tea and cafe franchise opportunities',
  'https://bubbletea.com'
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Note the ID returned above and update this request:
-- UPDATE connection_requests 
-- SET target_organization_id = '<UUID_FROM_ABOVE>'
-- WHERE id = '5089ed4e-f0fe-4545-916b-8d3d4e768565';

-- 2. Create organization for Quantitative Finance roles
INSERT INTO organizations (id, name, domain, logo_url, industry, description, website)
VALUES (
  gen_random_uuid(),
  'Quantitative Finance Firms',
  'quantfinance.com',
  'https://img.logo.dev/janestreet.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
  'Financial Services',
  'Leading quantitative trading and investment firms',
  'https://www.janestreet.com'
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Note the ID returned above and update this request:
-- UPDATE connection_requests 
-- SET target_organization_id = '<UUID_FROM_ABOVE>'
-- WHERE id = '3a17b7f8-ed63-42b5-87d9-70991ed76c0c';

-- 3. Create organization for Brand Strategy
INSERT INTO organizations (id, name, domain, logo_url, industry, description, website)
VALUES (
  gen_random_uuid(),
  'Brand Strategy Agencies',
  'brandstrategy.com',
  'https://img.logo.dev/landor.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
  'Marketing & Consulting',
  'Leading brand strategy and consulting firms',
  'https://landor.com'
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Note the ID returned above and update this request:
-- UPDATE connection_requests 
-- SET target_organization_id = '<UUID_FROM_ABOVE>'
-- WHERE id = 'c76429d5-2e21-4ae8-954d-692388e25da3';

-- ============================================
-- ALTERNATIVE: If you want more specific orgs
-- ============================================

-- For Bubble Tea - use actual Gong Cha or Chatime
-- INSERT INTO organizations (id, name, domain, logo_url, industry, website)
-- VALUES (
--   gen_random_uuid(),
--   'Gong Cha',
--   'gongcha.com',
--   'https://img.logo.dev/gongcha.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
--   'Food & Beverage',
--   'https://www.gongcha.com'
-- );

-- For Quant - use Jane Street, Citadel, or Two Sigma
-- INSERT INTO organizations (id, name, domain, logo_url, industry, website)
-- VALUES (
--   gen_random_uuid(),
--   'Jane Street',
--   'janestreet.com',
--   'https://img.logo.dev/janestreet.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
--   'Financial Services',
--   'https://www.janestreet.com'
-- );

-- For Brand Strategy - use Landor, Interbrand, or Siegel+Gale
-- INSERT INTO organizations (id, name, domain, logo_url, industry, website)
-- VALUES (
--   gen_random_uuid(),
--   'Landor',
--   'landor.com',
--   'https://img.logo.dev/landor.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
--   'Marketing & Consulting',
--   'https://landor.com'
-- );

-- ============================================
-- Verify the updates
-- ============================================
SELECT 
  cr.id,
  cr.target,
  cr.target_organization_id,
  o.name as organization_name,
  o.logo_url
FROM connection_requests cr
LEFT JOIN organizations o ON cr.target_organization_id = o.id
WHERE cr.status IN ('pending', 'active')
ORDER BY cr.created_at DESC;
























