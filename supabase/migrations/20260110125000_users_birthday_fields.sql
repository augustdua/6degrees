-- Add birthday fields to users and capture during signup.
-- Users provide birthday in-app; used for "Moments" reminders for connections.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Add columns
-- ----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS birthday_date DATE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS birthday_visibility TEXT DEFAULT 'connections';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_birthday_visibility_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_birthday_visibility_check
  CHECK (birthday_visibility IN ('private', 'connections', 'public'));

CREATE INDEX IF NOT EXISTS idx_users_birthday_md
  ON public.users ((EXTRACT(MONTH FROM birthday_date)), (EXTRACT(DAY FROM birthday_date)))
  WHERE birthday_date IS NOT NULL;

COMMENT ON COLUMN public.users.birthday_date IS 'User birthday (date). Stored for reminders; year is optional by user choice.';
COMMENT ON COLUMN public.users.birthday_visibility IS 'Who can see birthday: private, connections, public.';

-- ----------------------------------------------------------------------------
-- 2) Update signup trigger (handle_new_user) to persist birthday from auth metadata
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avatar_url TEXT;
  v_birthday_date DATE;
  v_birthday_visibility TEXT;
  v_bday_raw TEXT;
BEGIN
  -- Get the avatar URL from metadata
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- If it's a Google profile picture, upgrade to high resolution (512px)
  IF v_avatar_url IS NOT NULL AND v_avatar_url ILIKE '%googleusercontent.com%' THEN
    v_avatar_url := regexp_replace(v_avatar_url, '=s[0-9]+-c', '=s512-c');
    IF v_avatar_url NOT LIKE '%=s512-c%' THEN
      v_avatar_url := v_avatar_url || '=s512-c';
    END IF;
  END IF;

  -- Birthday: accept only YYYY-MM-DD from metadata to avoid breaking signup
  v_bday_raw := COALESCE(NULLIF(NEW.raw_user_meta_data->>'birthday_date', ''), NULL);
  IF v_bday_raw IS NOT NULL AND v_bday_raw ~ '^\d{4}-\d{2}-\d{2}$' THEN
    v_birthday_date := v_bday_raw::date;
  ELSE
    v_birthday_date := NULL;
  END IF;

  v_birthday_visibility := COALESCE(NULLIF(NEW.raw_user_meta_data->>'birthday_visibility', ''), 'connections');
  IF v_birthday_visibility NOT IN ('private', 'connections', 'public') THEN
    v_birthday_visibility := 'connections';
  END IF;

  -- Create user profile in public.users table
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    profile_picture_url,
    birthday_date,
    birthday_visibility,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_avatar_url,
    v_avatar_url,
    v_birthday_date,
    v_birthday_visibility,
    NOW()
  );

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';


