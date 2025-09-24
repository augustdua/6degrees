-- Test queries to verify all the fixes work
-- Run these to make sure everything is working

-- 1. Test request fetching (should work now)
SELECT 
  cr.id,
  cr.target,
  cr.message,
  cr.status,
  cr.expires_at,
  u.first_name,
  u.last_name,
  u.email
FROM connection_requests cr
LEFT JOIN users u ON cr.creator_id = u.id
WHERE cr.id = '17e400af-6234-4d57-8bae-405125bdac8a';

-- 2. Test chain fetching (should work now)
SELECT 
  c.id,
  c.request_id,
  c.participants,
  c.status,
  c.total_reward
FROM chains c
WHERE c.request_id = '17e400af-6234-4d57-8bae-405125bdac8a';

-- 3. Test chain creation (should work now)
-- This simulates what happens when someone joins a chain
INSERT INTO chains (
  request_id,
  participants,
  total_reward,
  status
) VALUES (
  '17e400af-6234-4d57-8bae-405125bdac8a',
  '[{"userid": "test-user", "email": "test@example.com", "firstName": "Test", "lastName": "User", "role": "forwarder", "joinedAt": "2025-01-24T10:00:00.000Z", "rewardAmount": 0}]',
  1000.00,
  'active'
) RETURNING *;

-- 4. Test chain update (should work now)
-- This simulates adding a participant to an existing chain
UPDATE chains 
SET participants = participants || jsonb_build_object(
  'userid', 'another-test-user',
  'email', 'another@example.com',
  'firstName', 'Another',
  'lastName', 'User',
  'role', 'forwarder',
  'joinedAt', NOW()::text,
  'rewardAmount', 0
),
updated_at = NOW()
WHERE request_id = '17e400af-6234-4d57-8bae-405125bdac8a'
RETURNING *;

-- 5. Clean up test data
DELETE FROM chains 
WHERE request_id = '17e400af-6234-4d57-8bae-405125bdac8a' 
  AND participants @> '[{"userid": "test-user"}]'::jsonb;

DELETE FROM chains 
WHERE request_id = '17e400af-6234-4d57-8bae-405125bdac8a' 
  AND participants @> '[{"userid": "another-test-user"}]'::jsonb;
