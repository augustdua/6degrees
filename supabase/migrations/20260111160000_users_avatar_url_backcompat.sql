-- Back-compat fix: ensure public.users has BOTH avatar_url and profile_picture_url.
-- Some trigger/functions (e.g. handle_new_user) still write avatar_url.
-- If avatar_url is missing, Supabase Auth callback can fail with:
--   ERROR: column "avatar_url" of relation "users" does not exist (SQLSTATE 42703)

DO $$
BEGIN
  -- Ensure profile_picture_url exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN profile_picture_url TEXT;
  END IF;

  -- Ensure avatar_url exists (back-compat)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Backfill avatar_url from profile_picture_url (and vice versa) for existing rows.
UPDATE public.users
SET
  avatar_url = COALESCE(avatar_url, profile_picture_url),
  profile_picture_url = COALESCE(profile_picture_url, avatar_url)
WHERE
  avatar_url IS NULL
  OR profile_picture_url IS NULL;

-- Keep the two columns in sync going forward.
CREATE OR REPLACE FUNCTION public.sync_user_avatar_urls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If either is set, mirror to the other.
  NEW.avatar_url := COALESCE(NEW.avatar_url, NEW.profile_picture_url);
  NEW.profile_picture_url := COALESCE(NEW.profile_picture_url, NEW.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_avatar_urls ON public.users;
CREATE TRIGGER trg_sync_user_avatar_urls
BEFORE INSERT OR UPDATE OF avatar_url, profile_picture_url ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_avatar_urls();

NOTIFY pgrst, 'reload schema';


