-- Fix: Google OAuth signup failing because generate_anonymous_name() is missing / not in search_path.
-- This migration creates the function in the public schema and updates handle_new_user to call it
-- with an explicit schema prefix to avoid search_path issues.

-- 1) Create anonymous-name generator in the correct schema
CREATE OR REPLACE FUNCTION public.generate_anonymous_name()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  adjectives TEXT[] := ARRAY[
    'Swift', 'Brave', 'Silent', 'Wild', 'Golden', 'Shadow', 'Crystal', 'Storm',
    'Mystic', 'Noble', 'Clever', 'Fierce', 'Cosmic', 'Arctic', 'Blazing', 'Lunar',
    'Solar', 'Electric', 'Quantum', 'Neon', 'Cyber', 'Stealth', 'Thunder', 'Velvet',
    'Crimson', 'Emerald', 'Sapphire', 'Ruby', 'Onyx', 'Jade', 'Amber', 'Ivory',
    'Phantom', 'Rogue', 'Echo', 'Zen', 'Nova', 'Apex', 'Prime', 'Alpha'
  ];
  animals TEXT[] := ARRAY[
    'Phoenix', 'Dragon', 'Wolf', 'Falcon', 'Tiger', 'Panther', 'Eagle', 'Hawk',
    'Raven', 'Fox', 'Lion', 'Bear', 'Shark', 'Cobra', 'Viper', 'Jaguar',
    'Leopard', 'Owl', 'Lynx', 'Puma', 'Cheetah', 'Griffin', 'Sphinx', 'Kraken',
    'Hydra', 'Unicorn', 'Pegasus', 'Mantis', 'Scorpion', 'Raptor', 'Mongoose', 'Orca',
    'Dolphin', 'Condor', 'Coyote', 'Raccoon', 'Badger', 'Osprey', 'Sparrow', 'Finch'
  ];
  adj TEXT;
  animal TEXT;
  num INT;
BEGIN
  adj := adjectives[1 + floor(random() * array_length(adjectives, 1))::int];
  animal := animals[1 + floor(random() * array_length(animals, 1))::int];
  num := floor(random() * 9000 + 1000)::int;
  RETURN adj || ' ' || animal || ' #' || num;
END;
$$;

-- 2) Ensure users table has the column (idempotent)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS anonymous_name TEXT;

-- 3) Update handle_new_user trigger function to use explicit schema prefix and never abort auth signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avatar_url TEXT;
  anon_name TEXT;
BEGIN
  -- Generate anonymous name (schema-qualified to avoid search_path issues)
  anon_name := public.generate_anonymous_name();

  -- Get the avatar URL from metadata (OAuth providers)
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- If it's a Google profile picture, upgrade to high resolution (512px)
  IF v_avatar_url IS NOT NULL AND v_avatar_url ILIKE '%googleusercontent.com%' THEN
    v_avatar_url := regexp_replace(v_avatar_url, '=s[0-9]+-c', '=s512-c');
    IF v_avatar_url NOT LIKE '%=s512-c%' THEN
      v_avatar_url := v_avatar_url || '=s512-c';
    END IF;
  END IF;

  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    profile_picture_url,
    anonymous_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_avatar_url,
    v_avatar_url,
    anon_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    -- Don't clobber an existing custom profile picture; only fill if missing
    avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    profile_picture_url = COALESCE(public.users.profile_picture_url, EXCLUDED.profile_picture_url),
    anonymous_name = COALESCE(public.users.anonymous_name, EXCLUDED.anonymous_name),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block auth signups due to profile-table issues
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 4) Ensure trigger points at public.handle_new_user (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5) Permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_anonymous_name() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.generate_anonymous_name() TO postgres;
GRANT EXECUTE ON FUNCTION public.generate_anonymous_name() TO service_role;

NOTIFY pgrst, 'reload schema';


