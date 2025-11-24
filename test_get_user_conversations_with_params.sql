-- Test the corrected get_user_conversations function with all parameters specified

-- Test with explicit limit and offset parameters
SELECT * FROM get_user_conversations('dddffff1-bfed-40a6-a99c-28dccb4c5014'::uuid, 50, 0);

-- Check the function signatures to confirm both exist
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_user_conversations'
ORDER BY pg_get_function_arguments(p.oid);

