-- ========================================
-- FIX MESSAGE TYPE CONSTRAINT
-- Run this if verification shows constraint is missing media types
-- ========================================

-- This fixes the error:
-- "new row for relation messages violates check constraint messages_message_type_check"

-- ========================================
-- Step 1: Drop ALL existing type constraints
-- ========================================
DO $$ 
BEGIN
  -- Drop any constraint with 'type' and 'check' in the name
  EXECUTE (
    SELECT 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || constraint_name || ' CASCADE;'
    FROM information_schema.table_constraints
    WHERE table_name = 'messages'
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%type%check%'
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No existing constraint found or error: %', SQLERRM;
END $$;

-- Drop by specific names (in case the above didn't work)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check CASCADE;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check CASCADE;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check1 CASCADE;

-- ========================================
-- Step 2: Add media columns if they don't exist
-- ========================================
DO $$ 
BEGIN
  -- Add media_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_type TEXT;
    RAISE NOTICE 'Added media_type column';
  ELSE
    RAISE NOTICE 'media_type column already exists';
  END IF;

  -- Add media_size column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'media_size'
  ) THEN
    ALTER TABLE messages ADD COLUMN media_size BIGINT;
    RAISE NOTICE 'Added media_size column';
  ELSE
    RAISE NOTICE 'media_size column already exists';
  END IF;
END $$;

-- ========================================
-- Step 3: Create NEW constraint with ALL message types
-- ========================================
ALTER TABLE messages 
ADD CONSTRAINT messages_type_check 
CHECK (message_type IN (
  'text',
  'image',
  'video', 
  'document',
  'audio',
  'offer_approval_request',
  'offer_approval_response',
  'intro_call_request',
  'intro_call_approved',
  'intro_call_rejected'
));

-- ========================================
-- Step 4: Create index for media queries
-- ========================================
CREATE INDEX IF NOT EXISTS idx_messages_media_type 
  ON messages(media_type) 
  WHERE media_type IS NOT NULL;

-- ========================================
-- Step 5: Verify the fix worked
-- ========================================
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'messages'::regclass
  AND conname = 'messages_type_check';

-- Should show constraint with all message types including 'image', 'video', 'document'

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Message type constraint has been fixed!';
  RAISE NOTICE 'You can now upload images, videos, and documents in messages.';
  RAISE NOTICE 'Try uploading a file again in the chat.';
END $$;

