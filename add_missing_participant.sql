-- Add the missing forwarder to the active chain
-- This will add the user who was in the duplicate chains back to the main chain

-- First, let's see what the current chain looks like
SELECT 
  id,
  request_id,
  participants,
  jsonb_array_length(participants) as participant_count
FROM chains 
WHERE request_id = '17e400af-6234-4d57-8bae-405125bdac8a';

-- Add the missing forwarder to the chain
UPDATE chains 
SET participants = participants || jsonb_build_object(
  'userid', '6ee02749-b2a1-4151-a7dc-9aff1ed982db',
  'email', 'duaaugust.de@gmail.com',
  'firstName', 'Ronny',
  'lastName', 'Cole',
  'role', 'forwarder',
  'joinedAt', '2025-09-24T10:01:14.658Z',
  'rewardAmount', 0
),
updated_at = NOW()
WHERE request_id = '17e400af-6234-4d57-8bae-405125bdac8a';

-- Verify the update worked
SELECT 
  id,
  request_id,
  participants,
  jsonb_array_length(participants) as participant_count
FROM chains 
WHERE request_id = '17e400af-6234-4d57-8bae-405125bdac8a';
