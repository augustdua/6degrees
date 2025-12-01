-- Protect custom profile pictures from being overwritten by Google Auth
-- This trigger prevents a Google URL from overwriting a Supabase Storage URL

CREATE OR REPLACE FUNCTION public.protect_profile_picture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the new URL is from Google (low res) AND the old URL was a custom Supabase upload
  -- Then keep the OLD URL
  IF (NEW.profile_picture_url ILIKE '%googleusercontent.com%' OR NEW.avatar_url ILIKE '%googleusercontent.com%') 
     AND 
     (OLD.profile_picture_url ILIKE '%supabase.co%' OR OLD.avatar_url ILIKE '%supabase.co%') THEN
     
     -- Keep the old custom picture
     NEW.profile_picture_url := OLD.profile_picture_url;
     NEW.avatar_url := OLD.avatar_url;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS protect_profile_picture_trigger ON public.users;
CREATE TRIGGER protect_profile_picture_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_picture();

