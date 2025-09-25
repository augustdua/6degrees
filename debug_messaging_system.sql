-- Debug messaging system - check what's actually happening

-- 1. Check if messaging tables exist
SELECT 
  'MESSAGING_TABLES_CHECK' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations' AND table_schema = 'public') 
       THEN '✅ conversations table exists' 
       ELSE '❌ conversations table missing' END as conversations_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') 
       THEN '✅ messages table exists' 
       ELSE '❌ messages table missing' END as messages_status;

-- 2. Check if messaging functions exist
SELECT 
  'MESSAGING_FUNCTIONS_CHECK' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_or_create_conversation', 'send_message', 'get_user_conversations', 'get_conversation_messages', 'mark_conversation_read')
ORDER BY routine_name;

-- 3. Check conversations table structure
SELECT 
  'CONVERSATIONS_TABLE_STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check messages table structure
SELECT 
  'MESSAGES_TABLE_STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check if there are any conversations
SELECT 
  'CONVERSATIONS_DATA' as check_type,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN user1_id = auth.uid() OR user2_id = auth.uid() THEN 1 END) as user_conversations
FROM public.conversations;

-- 6. Check if there are any messages
SELECT 
  'MESSAGES_DATA' as check_type,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN sender_id = auth.uid() THEN 1 END) as user_messages
FROM public.messages;

-- 7. Test the get_or_create_conversation function directly (this will show the actual error)
-- Replace 'YOUR_USER_ID_HERE' with an actual user ID from your users table
SELECT 
  'FUNCTION_TEST' as check_type,
  'Testing get_or_create_conversation function...' as test_message;

-- 8. Check RLS policies on conversations table
SELECT 
  'CONVERSATIONS_RLS_POLICIES' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'conversations' 
AND schemaname = 'public';

-- 9. Check RLS policies on messages table
SELECT 
  'MESSAGES_RLS_POLICIES' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages' 
AND schemaname = 'public';

-- 10. Check function permissions
SELECT 
  'FUNCTION_PERMISSIONS' as check_type,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_or_create_conversation', 'send_message', 'get_user_conversations')
ORDER BY routine_name, grantee;
