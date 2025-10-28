-- Create intro_calls table for managing intro call requests and sessions
CREATE TABLE IF NOT EXISTS intro_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL REFERENCES users(id),
  
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  
  buyer_context TEXT,
  buyer_questions JSONB,
  
  daily_room_url TEXT,
  daily_room_name TEXT,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  call_quality_check TEXT, -- AI bot's assessment
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_intro_calls_buyer ON intro_calls(buyer_id);
CREATE INDEX IF NOT EXISTS idx_intro_calls_creator ON intro_calls(creator_id);
CREATE INDEX IF NOT EXISTS idx_intro_calls_target ON intro_calls(target_id);
CREATE INDEX IF NOT EXISTS idx_intro_calls_offer ON intro_calls(offer_id);
CREATE INDEX IF NOT EXISTS idx_intro_calls_status ON intro_calls(status);

-- Enable RLS
ALTER TABLE intro_calls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their intro calls" ON intro_calls;
DROP POLICY IF EXISTS "Authenticated users can create intro calls" ON intro_calls;
DROP POLICY IF EXISTS "Users can update their intro calls" ON intro_calls;

-- Policy: Users can view intro calls where they are buyer, creator, or target
CREATE POLICY "Users can view their intro calls"
  ON intro_calls
  FOR SELECT
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = creator_id OR 
    auth.uid() = target_id
  );

-- Policy: Buyers can insert intro calls (via backend API, but allow for flexibility)
CREATE POLICY "Authenticated users can create intro calls"
  ON intro_calls
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = creator_id);

-- Policy: Buyers and creators can update their intro calls
CREATE POLICY "Users can update their intro calls"
  ON intro_calls
  FOR UPDATE
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = creator_id OR 
    auth.uid() = target_id
  );

-- Add intro_call_request and intro_call_approved to message types check constraint
DO $$ 
BEGIN
  -- Check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_type_check'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT messages_type_check;
  END IF;
  
  ALTER TABLE messages ADD CONSTRAINT messages_type_check 
    CHECK (message_type IN (
      'text', 
      'offer_approval_request', 
      'offer_approval_response',
      'intro_call_request',
      'intro_call_approved',
      'intro_call_rejected'
    ));
END $$;

-- Add intro_call_request and intro_call_approved to notifications type check constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
  
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
      'chain_invitation', 'chain_joined', 'chain_completed', 'chain_reminder',
      'connection_request', 'connection_accepted', 'message', 'credit_earned',
      'credit_spent', 'reward_earned', 'reward_received', 'target_claim',
      'offer_approval_request', 'offer_approved', 'offer_rejected', 'offer_bid',
      'offer_bid_accepted', 'intro_scheduled', 'system',
      'intro_call_request', 'intro_call_approved', 'intro_call_rejected'
    ));
END $$;


