-- Check if respond_to_direct_connection_request function exists
SELECT 
  'FUNCTION_EXISTS_CHECK' as check_type,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'respond_to_direct_connection_request'
  AND routine_schema = 'public';

-- Check function permissions
SELECT 
  'FUNCTION_PERMISSIONS' as check_type,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name = 'respond_to_direct_connection_request'
  AND routine_schema = 'public';

-- Check if there are any connection requests to respond to
SELECT 
  'CONNECTION_REQUESTS_DATA' as check_type,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests
FROM public.direct_connection_requests;
