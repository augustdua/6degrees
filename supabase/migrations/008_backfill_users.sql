-- Backfill users table for any auth.users that don't have corresponding public.users records
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    avatar_url,
    linkedin_url,
    created_at,
    updated_at
)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', 'User') as first_name,
    COALESCE(au.raw_user_meta_data->>'last_name', '') as last_name,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    au.raw_user_meta_data->>'linkedin_url' as linkedin_url,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;