-- Create inviter connection server-side during signup.
-- This makes referrals reliable even if frontend redemption doesn't run.

BEGIN;

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
  v_inviter_raw TEXT;
  v_inviter_id UUID;
BEGIN
  -- Avatar URL
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Upgrade Google avatar to 512px if present
  IF v_avatar_url IS NOT NULL AND v_avatar_url ILIKE '%googleusercontent.com%' THEN
    v_avatar_url := regexp_replace(v_avatar_url, '=s[0-9]+-c', '=s512-c');
    IF v_avatar_url NOT LIKE '%=s512-c%' THEN
      v_avatar_url := v_avatar_url || '=s512-c';
    END IF;
  END IF;

  -- Birthday (safe parse)
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

  -- Referral: inviter id (safe parse)
  v_inviter_raw := COALESCE(NULLIF(NEW.raw_user_meta_data->>'invited_by_user_id', ''), NULL);
  v_inviter_id := NULL;
  IF v_inviter_raw IS NOT NULL AND v_inviter_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    v_inviter_id := v_inviter_raw::uuid;
  END IF;

  IF v_inviter_id = NEW.id THEN
    v_inviter_id := NULL;
  END IF;

  -- Create/Update user profile
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    profile_picture_url,
    birthday_date,
    birthday_visibility,
    invited_by_user_id,
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
    v_inviter_id,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), public.users.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), public.users.last_name),
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    profile_picture_url = COALESCE(public.users.profile_picture_url, EXCLUDED.profile_picture_url),
    birthday_date = COALESCE(public.users.birthday_date, EXCLUDED.birthday_date),
    birthday_visibility = COALESCE(public.users.birthday_visibility, EXCLUDED.birthday_visibility),
    invited_by_user_id = COALESCE(public.users.invited_by_user_id, EXCLUDED.invited_by_user_id);

  -- Create mutual connection if inviter exists (best-effort, non-fatal)
  IF v_inviter_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM auth.users au WHERE au.id = v_inviter_id) THEN
      PERFORM public.create_user_connection(v_inviter_id, NEW.id, NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';


