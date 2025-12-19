-- Convert existing users to waitlist-based membership system
-- August Dua (app owner) remains as full member, everyone else becomes waitlister

-- August's user ID
-- dddffff1-bfed-40a6-a99c-28dccb4c5014

-- First, preview what will happen
SELECT 
  id,
  first_name,
  last_name,
  email,
  CASE 
    WHEN id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014' THEN 'member'
    ELSE 'waitlist'
  END as new_status
FROM users
ORDER BY created_at;

-- Set August as full member
UPDATE users 
SET 
  membership_status = 'member',
  membership_approved_at = NOW()
WHERE id = 'dddffff1-bfed-40a6-a99c-28dccb4c5014';

-- Set everyone else as waitlist
UPDATE users 
SET membership_status = 'waitlist'
WHERE id != 'dddffff1-bfed-40a6-a99c-28dccb4c5014'
  AND (membership_status IS NULL OR membership_status != 'member');

-- Verify the results
SELECT 
  membership_status,
  COUNT(*) as count
FROM users
GROUP BY membership_status;

-- Show member details
SELECT id, first_name, last_name, email, membership_status, membership_approved_at
FROM users
WHERE membership_status = 'member';

