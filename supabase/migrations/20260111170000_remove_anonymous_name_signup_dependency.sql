-- Remove anonymous-name dependency from signup trigger.
-- We no longer use forum anonymous identities, but an older migration overwrote
-- public.handle_new_user() to call generate_anonymous_name(), which can break /callback.

BEGIN;

-- Disable the anonymous-name auto-fill trigger (if it exists).
DROP TRIGGER IF EXISTS trigger_set_anonymous_name ON public.users;

-- (Optional cleanup) Drop the trigger function if present. We keep the column as-is for safety.
DROP FUNCTION IF EXISTS public.set_anonymous_name();

-- Re-define signup trigger function WITHOUT anonymous_name.
-- Keep avatar/profile picture back-compat + birthday fields safe parsing.
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
  -- Get the avatar URL from metadata (Supabase provider convention)
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

  -- Create (or update) user profile in public.users table.
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.users.last_name),
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    profile_picture_url = COALESCE(public.users.profile_picture_url, EXCLUDED.profile_picture_url),
    birthday_date = COALESCE(public.users.birthday_date, EXCLUDED.birthday_date),
    birthday_visibility = COALESCE(public.users.birthday_visibility, EXCLUDED.birthday_visibility);

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';


