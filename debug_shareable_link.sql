-- Debug script to find why shareable link is not working
-- Run this in Supabase SQL Editor

-- 1. Check if the link exists with exact match
SELECT 
    'EXACT_MATCH_CHECK' as check_type,
    id,
    shareable_link,
    status,
    deleted_at,
    expires_at,
    created_at
FROM public.connection_requests 
WHERE shareable_link = 'https://6degree.app/r/1758747360489-ag8g733wm4c';

-- 2. Check if the link exists with partial match (just the ID part)
SELECT 
    'PARTIAL_MATCH_CHECK' as check_type,
    id,
    shareable_link,
    status,
    deleted_at,
    expires_at,
    created_at
FROM public.connection_requests 
WHERE shareable_link LIKE '%1758747360489-ag8g733wm4c%';

-- 3. Check all recent connection requests to see the pattern
SELECT 
    'RECENT_REQUESTS' as check_type,
    id,
    shareable_link,
    status,
    deleted_at,
    expires_at,
    created_at
FROM public.connection_requests 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check if there are any requests with similar link patterns
SELECT 
    'SIMILAR_LINKS' as check_type,
    id,
    shareable_link,
    status,
    deleted_at,
    expires_at,
    created_at
FROM public.connection_requests 
WHERE shareable_link LIKE '%1758747360489%'
ORDER BY created_at DESC;

-- 5. Check if the request exists but with different status
SELECT 
    'ALL_STATUSES' as check_type,
    id,
    shareable_link,
    status,
    deleted_at,
    expires_at,
    created_at
FROM public.connection_requests 
WHERE shareable_link LIKE '%1758747360489-ag8g733wm4c%'
OR shareable_link LIKE '%1758747360489%';

-- 6. Check the chains table for this request ID (if we can find it)
SELECT 
    'CHAIN_CHECK' as check_type,
    id,
    request_id,
    status,
    created_at
FROM public.chains 
WHERE request_id IN (
    SELECT id FROM public.connection_requests 
    WHERE shareable_link LIKE '%1758747360489%'
);

