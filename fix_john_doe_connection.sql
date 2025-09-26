-- Fix John Doe's connection to point to Tanish instead of August
-- Based on the debug data:
-- John's ID: 4e9c9044-72e9-410c-abcb-a1ee8eb96ff4
-- Tanish's ID: 969586e3-241c-4d19-bf4b-31c4f29d155a
-- Chain ID: ccd70ea4-90f4-435b-8093-a869d03b6e98

UPDATE chains
SET participants = (
    SELECT jsonb_agg(
        CASE
            WHEN participant->>'userid' = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4' THEN
                -- Fix John Doe's parentUserId to point to Tanish
                participant || jsonb_build_object('parentUserId', '969586e3-241c-4d19-bf4b-31c4f29d155a')
            ELSE
                -- Keep other participants unchanged
                participant
        END
    )
    FROM jsonb_array_elements(participants) as participant
),
updated_at = NOW()
WHERE id = 'ccd70ea4-90f4-435b-8093-a869d03b6e98';

-- Verify the fix worked
SELECT
    p.value->>'firstName' as name,
    p.value->>'userid' as user_id,
    p.value->>'parentUserId' as parent_user_id,
    CASE
        WHEN p.value->>'userid' = '4e9c9044-72e9-410c-abcb-a1ee8eb96ff4' AND
             p.value->>'parentUserId' = '969586e3-241c-4d19-bf4b-31c4f29d155a' THEN 'FIXED - John -> Tanish'
        WHEN p.value->>'userid' = '969586e3-241c-4d19-bf4b-31c4f29d155a' AND
             p.value->>'parentUserId' = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' THEN 'OK - Tanish -> August'
        WHEN p.value->>'parentUserId' = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' AND
             p.value->>'role' = 'creator' THEN 'OK - August is creator'
        ELSE 'Check connection'
    END as connection_status
FROM chains c
CROSS JOIN LATERAL jsonb_array_elements(c.participants) as p(value)
WHERE c.id = 'ccd70ea4-90f4-435b-8093-a869d03b6e98'
AND (p.value->>'firstName' ILIKE '%john%' OR p.value->>'firstName' ILIKE '%tanish%' OR p.value->>'firstName' ILIKE '%august%')
ORDER BY p.value->>'firstName';