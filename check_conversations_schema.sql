-- Check the actual schema of the conversations table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'conversations'
ORDER BY ordinal_position;

-- Also check if there's a sample conversation
SELECT * FROM conversations LIMIT 1;
