-- Check the current column name in users table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name LIKE '%avatar%';

-- See a sample user record
SELECT id, first_name, last_name, avatar_url
FROM users
WHERE avatar_url IS NOT NULL
LIMIT 3;

