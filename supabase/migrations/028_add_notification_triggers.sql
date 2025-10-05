-- Migration: Add notification triggers
-- Automatically sends push notifications for key events:
-- 1. Connection request received
-- 2. Credits earned (referral join)
-- 3. Chain target reached

-- Function to send push notification via Edge Function
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called by triggers
  -- It invokes the Supabase Edge Function to send the actual push notification

  -- For now, we'll use pg_net (Supabase's HTTP extension) to call the edge function
  -- You'll need to enable pg_net extension first

  -- Alternative: Use Supabase Edge Function via HTTP
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
      ),
      body := jsonb_build_object(
        'userId', p_user_id,
        'title', p_title,
        'body', p_body,
        'type', p_type,
        'data', p_data
      )
    );

  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$$;

-- Trigger function: Send notification when connection request is created
CREATE OR REPLACE FUNCTION notify_connection_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  -- Only send notification for new pending requests
  IF NEW.status = 'pending' THEN
    -- Get sender's name
    SELECT COALESCE(first_name || ' ' || last_name, email)
    INTO v_sender_name
    FROM users
    WHERE id = NEW.sender_id;

    -- Send push notification to receiver
    PERFORM send_push_notification(
      NEW.receiver_id,
      'New Connection Request',
      v_sender_name || ' wants to connect with you!',
      'connection_request',
      jsonb_build_object(
        'requestId', NEW.id,
        'senderId', NEW.sender_id,
        'senderName', v_sender_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function: Send notification when credits are earned
CREATE OR REPLACE FUNCTION notify_credits_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name TEXT;
  v_credits_amount INTEGER;
BEGIN
  -- Only notify for referral credits
  IF NEW.source IN ('referral_join', 'others_joined') THEN
    -- Get credit amount
    v_credits_amount := NEW.amount;

    -- Send push notification
    PERFORM send_push_notification(
      NEW.user_id,
      'You Earned Credits! 🎉',
      'Someone joined your chain! You earned ' || v_credits_amount || ' credits.',
      'credit_earned',
      jsonb_build_object(
        'transactionId', NEW.id,
        'amount', v_credits_amount,
        'source', NEW.source
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_connection_request ON direct_connection_requests;
CREATE TRIGGER trigger_notify_connection_request
AFTER INSERT ON direct_connection_requests
FOR EACH ROW
EXECUTE FUNCTION notify_connection_request();

DROP TRIGGER IF EXISTS trigger_notify_credits_earned ON credit_transactions;
CREATE TRIGGER trigger_notify_credits_earned
AFTER INSERT ON credit_transactions
FOR EACH ROW
EXECUTE FUNCTION notify_credits_earned();

-- Comments
COMMENT ON FUNCTION send_push_notification IS 'Sends push notification via Edge Function';
COMMENT ON FUNCTION notify_connection_request IS 'Trigger function to notify users of new connection requests';
COMMENT ON FUNCTION notify_credits_earned IS 'Trigger function to notify users when they earn credits';

-- NOTE: Before deploying, you need to:
-- 1. Enable pg_net extension: CREATE EXTENSION IF NOT EXISTS pg_net;
-- 2. Set configuration parameters with your Supabase URL and service key:
--    ALTER DATABASE postgres SET app.supabase_url = 'your-project-url';
--    ALTER DATABASE postgres SET app.supabase_service_key = 'your-service-key';
