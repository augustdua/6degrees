-- Test manual chain creation for your most recent request
-- This will help us understand if it's a permissions issue or a data issue

INSERT INTO chains (
  request_id,
  participants,
  total_reward,
  status
)
VALUES (
  '9446679b-5cee-4a2e-a73b-3a53d4225db3',  -- Your most recent request
  '[{
    "userid": "4e9c9044-72e9-410c-abcb-a1ee8eb96ff4",
    "email": "august@grapherly.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "creator",
    "joinedAt": "2025-10-11T16:20:39.485Z",
    "rewardAmount": 0,
    "shareableLink": "https://share.6degree.app/r/test-manual-1760199039485",
    "parentUserId": null
  }]'::jsonb,
  100.00,  -- target_cash_reward from your request
  'active'
)
RETURNING *;

