-- Migration 066: Add bid message types to messages constraint
-- Adds support for offer_bid_request, offer_bid_approved, offer_bid_rejected
-- Includes ALL existing message types to avoid constraint violations

-- Drop the old constraint
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Drop the newer constraint if it exists (from migration 063)
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_type_check;

-- Add comprehensive constraint with ALL message types (existing + new)
ALTER TABLE public.messages 
  ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type IN (
    -- Basic types
    'text',
    'regular',
    'system',
    
    -- Offer approval types (existing)
    'offer_approval_request',
    'offer_approval_response',   -- Response to approval request
    'offer_approved',
    'offer_rejected',
    
    -- Bid types (NEW)
    'offer_bid_request',      -- Bid placed on offer
    'offer_bid_approved',     -- Bid accepted by creator
    'offer_bid_rejected',     -- Bid declined by creator
    
    -- Media types (from migration 063)
    'image',
    'video',
    'document',
    'audio',
    
    -- Intro call types (if they exist)
    'intro_call_request',
    'intro_call_approved',
    'intro_call_rejected',
    
    -- Connection types (if they exist)
    'connection_request',
    'connection_accepted',
    'connection_rejected'
  ));

-- Verify the constraint
SELECT 
  'Message type constraint updated' as status,
  pg_get_constraintdef(oid) as new_constraint
FROM pg_constraint
WHERE conrelid = 'messages'::regclass
  AND conname = 'messages_message_type_check';

-- Comment
COMMENT ON CONSTRAINT messages_message_type_check ON messages IS 
'Allowed message types: text, regular, offer approvals, offer bids, system, and media types';

