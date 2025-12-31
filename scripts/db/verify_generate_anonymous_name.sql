-- Verify: generate_anonymous_name() + handle_new_user trigger are installed correctly.
-- NOTE: This is intentionally a SINGLE SQL statement so scripts/db/run-sql.js prints the result.

SELECT
  -- Functions exist?
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_anonymous_name'
  ) AS has_public_generate_anonymous_name,
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) AS has_public_handle_new_user,

  -- Trigger wired correctly?
  EXISTS (
    SELECT 1
    FROM pg_trigger tg
    JOIN pg_class cls ON cls.oid = tg.tgrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    JOIN pg_namespace pns ON pns.oid = p.pronamespace
    WHERE ns.nspname = 'auth'
      AND cls.relname = 'users'
      AND tg.tgname = 'on_auth_user_created'
      AND pns.nspname = 'public'
      AND p.proname = 'handle_new_user'
  ) AS trigger_points_to_public_handle_new_user,

  -- handle_new_user calls schema-qualified name generator?
  (position('public.generate_anonymous_name' in pg_get_functiondef('public.handle_new_user'::regproc)) > 0)
    AS handle_new_user_calls_public_generate_anonymous_name,

  -- Sample output
  public.generate_anonymous_name() AS sample_name;


