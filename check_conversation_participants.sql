-- Check conversation_participants table structure
SELECT 
  'CONVERSATION_PARTICIPANTS_STRUCTURE' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_participants' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if conversation_participants table exists
SELECT 
  'CONVERSATION_PARTICIPANTS_EXISTS' as check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_participants' AND table_schema = 'public') 
       THEN '✅ conversation_participants table exists' 
       ELSE '❌ conversation_participants table missing' END as status;

-- Check data in conversation_participants
SELECT 
  'CONVERSATION_PARTICIPANTS_DATA' as check_type,
  COUNT(*) as total_participants,
  COUNT(DISTINCT conversation_id) as unique_conversations,
  COUNT(DISTINCT user_id) as unique_users
FROM public.conversation_participants;

-- Check conversations data
SELECT 
  'CONVERSATIONS_DATA_CORRECTED' as check_type,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN created_by = auth.uid() THEN 1 END) as user_created_conversations
FROM public.conversations;
