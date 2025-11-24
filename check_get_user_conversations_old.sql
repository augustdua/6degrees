-- Check the existing get_user_conversations function (the one with p_limit and p_offset)
SELECT pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_user_conversations'
  AND pg_get_function_arguments(p.oid) LIKE '%p_limit%';

