-- Check what message types currently exist in the database
SELECT 
    message_type,
    COUNT(*) as count
FROM 
    messages
WHERE
    message_type IS NOT NULL
GROUP BY 
    message_type
ORDER BY 
    count DESC;

-- Also check current constraint definition
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM
    pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
WHERE
    rel.relname = 'messages'
    AND con.conname LIKE '%message_type%'
    AND con.contype = 'c';

