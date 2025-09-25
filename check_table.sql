-- Check if chain_invites table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'chain_invites'
) as table_exists;