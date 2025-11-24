-- Check the actual schema of the messages table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check a sample message
SELECT * FROM messages LIMIT 3;

-- Check if there's a direct_messages table or similar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%message%' OR table_name LIKE '%conversation%' OR table_name LIKE '%chat%')
ORDER BY table_name;

