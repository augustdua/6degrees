-- Backfill missing target organizations for active requests
-- Complete automated version

-- 1. Create organization for Boba Bhai and link it
WITH new_org AS (
  INSERT INTO organizations (id, name, domain, logo_url, industry, description, website)
  VALUES (
    gen_random_uuid(),
    'Boba Bhai',
    'bobabhai.com',
    'https://img.logo.dev/bobabhai.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
    'Food & Beverage',
    'Premium bubble tea and Asian cafe chain',
    'https://bobabhai.com'
  )
  ON CONFLICT DO NOTHING
  RETURNING id
)
UPDATE connection_requests
SET target_organization_id = (SELECT id FROM new_org)
WHERE id = '5089ed4e-f0fe-4545-916b-8d3d4e768565'
AND target_organization_id IS NULL;

-- 2. Create organization for Quantitative Finance and link it
WITH new_org AS (
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
  RETURNING id
)
UPDATE connection_requests
SET target_organization_id = (SELECT id FROM new_org)
WHERE id = '3a17b7f8-ed63-42b5-87d9-70991ed76c0c'
AND target_organization_id IS NULL;

-- 3. Create organization for Brand Strategy and link it
WITH new_org AS (
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
  RETURNING id
)
UPDATE connection_requests
SET target_organization_id = (SELECT id FROM new_org)
WHERE id = 'c76429d5-2e21-4ae8-954d-692388e25da3'
AND target_organization_id IS NULL;

-- Verify all active requests now have organizations
SELECT 
  'Summary: Requests WITH organizations' as status,
  COUNT(*) as count
FROM connection_requests
WHERE status IN ('pending', 'active')
  AND target_organization_id IS NOT NULL

UNION ALL

SELECT 
  'Summary: Requests WITHOUT organizations' as status,
  COUNT(*) as count
FROM connection_requests
WHERE status IN ('pending', 'active')
  AND target_organization_id IS NULL;

-- Show all active requests with their organizations
SELECT 
  cr.id,
  cr.target,
  cr.reward,
  cr.target_organization_id,
  o.name as organization_name,
  o.logo_url as organization_logo
FROM connection_requests cr
LEFT JOIN organizations o ON cr.target_organization_id = o.id
WHERE cr.status IN ('pending', 'active')
ORDER BY cr.created_at DESC;

