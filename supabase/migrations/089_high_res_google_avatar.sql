-- Update handle_new_user to store high-resolution Google profile pictures
-- Google provides low-res (96px) by default. We upgrade to 512px.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avatar_url TEXT;
BEGIN
  -- Get the avatar URL from metadata
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  
  -- If it's a Google profile picture, upgrade to high resolution (512px)
  IF v_avatar_url IS NOT NULL AND v_avatar_url ILIKE '%googleusercontent.com%' THEN
    -- Replace any existing size parameter (=s96-c, =s120-c, etc.) with =s512-c
    -- Pattern: =sXXX-c where XXX is any number
    v_avatar_url := regexp_replace(v_avatar_url, '=s[0-9]+-c', '=s512-c');
    
    -- If no size parameter exists, append it
    IF v_avatar_url NOT LIKE '%=s512-c%' THEN
      v_avatar_url := v_avatar_url || '=s512-c';
    END IF;
  END IF;

  -- Create user profile in public.users table
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    profile_picture_url,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_avatar_url,
    v_avatar_url,  -- Also set profile_picture_url for consistency
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Also update the protect_profile_picture function to upgrade Google URLs when they're set
-- (for cases where user re-authenticates and we allow the Google URL)
CREATE OR REPLACE FUNCTION public.protect_profile_picture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_url TEXT;
BEGIN
  -- If the new URL is from Google AND the old URL was a custom Supabase upload
  -- Then keep the OLD URL (protect custom uploads)
  IF (NEW.profile_picture_url ILIKE '%googleusercontent.com%' OR NEW.avatar_url ILIKE '%googleusercontent.com%') 
     AND 
     (OLD.profile_picture_url ILIKE '%supabase.co%' OR OLD.avatar_url ILIKE '%supabase.co%') THEN
     
     -- Keep the old custom picture
     NEW.profile_picture_url := OLD.profile_picture_url;
     NEW.avatar_url := OLD.avatar_url;
  
  -- If we're accepting a Google URL (no custom upload exists), upgrade it to high-res
  ELSIF NEW.profile_picture_url ILIKE '%googleusercontent.com%' THEN
    v_new_url := NEW.profile_picture_url;
    -- Replace any existing size parameter with 512px
    v_new_url := regexp_replace(v_new_url, '=s[0-9]+-c', '=s512-c');
    -- If no size parameter exists, append it
    IF v_new_url NOT LIKE '%=s512-c%' THEN
      v_new_url := v_new_url || '=s512-c';
    END IF;
    NEW.profile_picture_url := v_new_url;
    NEW.avatar_url := v_new_url;
  END IF;

  RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

NOTIFY pgrst, 'reload schema';

