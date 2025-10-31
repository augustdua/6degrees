-- Fix: Limit digest emails to once per 24 hours per user
-- This prevents users from getting 24 emails per day!

-- Step 1: Create a table to track when we last sent digest emails
CREATE TABLE IF NOT EXISTS email_digest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL DEFAULT 'unread_messages_digest',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_digest_log_user_sent 
ON email_digest_log(user_id, sent_at DESC);

-- Step 2: Drop and recreate the function with frequency limiting
DROP FUNCTION IF EXISTS send_unread_message_digests();

CREATE FUNCTION send_unread_message_digests()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  unread_count INTEGER,
  email_sent BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_backend_url TEXT;
  v_user RECORD;
  v_unread_count INTEGER;
  v_last_digest_sent TIMESTAMPTZ;
BEGIN
  -- Get backend URL
  v_backend_url := 'https://6degreesbackend-production.up.railway.app';

  -- Find users with unread messages > 15 minutes old
  FOR v_user IN
    SELECT DISTINCT
      m.receiver_id as user_id,
      u.email,
      u.first_name,
      u.last_name,
      u.email_notifications_enabled,
      COUNT(m.id) as unread_count
    FROM messages m
    JOIN users u ON m.receiver_id = u.id
    WHERE 
      m.read_at IS NULL
      AND m.created_at < NOW() - INTERVAL '15 minutes'
      AND m.message_type IN ('text', 'regular')
      AND u.email_notifications_enabled = true
    GROUP BY m.receiver_id, u.email, u.first_name, u.last_name, u.email_notifications_enabled
    HAVING COUNT(m.id) > 0
  LOOP
    BEGIN
      -- ⚡ NEW: Check when we last sent a digest to this user
      SELECT sent_at INTO v_last_digest_sent
      FROM email_digest_log
      WHERE user_id = v_user.user_id
        AND email_type = 'unread_messages_digest'
      ORDER BY sent_at DESC
      LIMIT 1;

      -- ⚡ NEW: Skip if we sent a digest in the last 24 hours
      IF v_last_digest_sent IS NOT NULL AND v_last_digest_sent > NOW() - INTERVAL '24 hours' THEN
        RAISE NOTICE 'Skipping user % - digest sent % hours ago', 
          v_user.email, 
          EXTRACT(EPOCH FROM (NOW() - v_last_digest_sent)) / 3600;
        
        -- Return skipped record
        user_id := v_user.user_id;
        user_email := v_user.email;
        unread_count := v_user.unread_count;
        email_sent := false;
        RETURN NEXT;
        CONTINUE;
      END IF;

      -- Call backend to send digest email
      PERFORM
        net.http_post(
          url := v_backend_url || '/api/notifications/webhooks/unread-messages-digest',
          headers := jsonb_build_object(
            'Content-Type', 'application/json'
          ),
          body := jsonb_build_object(
            'user_id', v_user.user_id,
            'email', v_user.email,
            'first_name', v_user.first_name,
            'last_name', v_user.last_name,
            'unread_count', v_user.unread_count
          )
        );
      
      -- ⚡ NEW: Log that we sent the digest
      INSERT INTO email_digest_log (user_id, email_type, message_count)
      VALUES (v_user.user_id, 'unread_messages_digest', v_user.unread_count);
      
      -- Return result
      user_id := v_user.user_id;
      user_email := v_user.email;
      unread_count := v_user.unread_count;
      email_sent := true;
      
      RETURN NEXT;
      
      RAISE NOTICE 'Sent unread digest to % (% unread messages)', v_user.email, v_user.unread_count;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other users
      RAISE WARNING 'Failed to send digest to %: %', v_user.email, SQLERRM;
      
      user_id := v_user.user_id;
      user_email := v_user.email;
      unread_count := v_user.unread_count;
      email_sent := false;
      
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$function$;

-- Step 3: Verify the fix
SELECT '✅ Digest frequency limiter installed!' as status;
SELECT '📧 Users will now receive at most ONE digest email per 24 hours' as info;

