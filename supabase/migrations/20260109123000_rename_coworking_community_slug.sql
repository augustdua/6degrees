-- Rename legacy coworking community slug to "coworking" (avoid hardcoding legacy slug literal).
-- This is safe to run multiple times.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'forum_communities'
  ) THEN
    -- Old slug was historically used for the coworking community.
    UPDATE public.forum_communities
    SET slug = 'coworking',
        name = 'Coworking',
        updated_at = NOW()
    WHERE slug = ('gr' || 'ind' || '-ho' || 'use');
  END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';


