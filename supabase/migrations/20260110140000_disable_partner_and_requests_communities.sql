-- Disable deprecated communities:
-- - zaurq-partners (partner concept removed)
-- - requests (request forum removed)
--
-- This migration is written defensively to work across older schemas.

DO $$
BEGIN
  IF to_regclass('public.forum_communities') IS NULL THEN
    RAISE NOTICE 'Skipping disable_partner_and_requests_communities: public.forum_communities does not exist.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'forum_communities'
      AND column_name = 'is_active'
  ) THEN
    UPDATE public.forum_communities
      SET is_active = false
    WHERE slug IN ('zaurq-partners', 'requests');
  ELSE
    -- If is_active doesn't exist, remove them outright.
    DELETE FROM public.forum_communities
    WHERE slug IN ('zaurq-partners', 'requests');
  END IF;
END $$;


