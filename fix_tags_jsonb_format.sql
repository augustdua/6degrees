-- Fix tags stored as JSONB strings and convert them to proper JSONB arrays
-- This fixes the issue where tags like '["Travel","Sales"]' (string) 
-- need to be converted to ["Travel","Sales"] (array)

-- Fix offers table
UPDATE offers
SET tags = tags::text::jsonb
WHERE jsonb_typeof(tags) = 'string';

-- Fix connection_requests table
UPDATE connection_requests
SET tags = tags::text::jsonb
WHERE jsonb_typeof(tags) = 'string';

-- Verify the fix
SELECT 
    'Offers' as table_name,
    COUNT(*) FILTER (WHERE jsonb_typeof(tags) = 'array') as array_tags,
    COUNT(*) FILTER (WHERE jsonb_typeof(tags) = 'string') as string_tags,
    COUNT(*) FILTER (WHERE jsonb_typeof(tags) IS NULL OR tags IS NULL) as null_tags
FROM offers
UNION ALL
SELECT 
    'Requests' as table_name,
    COUNT(*) FILTER (WHERE jsonb_typeof(tags) = 'array') as array_tags,
    COUNT(*) FILTER (WHERE jsonb_typeof(tags) = 'string') as string_tags,
    COUNT(*) FILTER (WHERE jsonb_typeof(tags) IS NULL OR tags IS NULL) as null_tags
FROM connection_requests;

