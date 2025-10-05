-- Migration: Add push notification support
-- Adds columns to users table for storing push notification tokens
-- Creates a notifications_log table for tracking sent notifications

-- Add push token columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS push_token TEXT,
ADD COLUMN IF NOT EXISTS push_platform TEXT CHECK (push_platform IN ('ios', 'android', 'web')),
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true NOT NULL;

-- Create index for faster push token lookups
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_push_platform ON users(push_platform) WHERE push_platform IS NOT NULL;

-- Add comments
COMMENT ON COLUMN users.push_token IS 'FCM/APNs device token for push notifications';
COMMENT ON COLUMN users.push_platform IS 'Platform of the device (ios, android, web)';
COMMENT ON COLUMN users.push_token_updated_at IS 'Last time the push token was updated';
COMMENT ON COLUMN users.push_notifications_enabled IS 'Whether user has enabled push notifications';

-- Create notifications_log table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'clicked')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for notifications_log
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id ON notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_sent_at ON notifications_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_log_type ON notifications_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_log_status ON notifications_log(delivery_status);

-- Add RLS policies for notifications_log
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification history
CREATE POLICY "Users can view their own notifications"
ON notifications_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role can insert notifications (sent by backend)
CREATE POLICY "Service can insert notifications"
ON notifications_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Users can update their own notification status (e.g., mark as clicked)
CREATE POLICY "Users can update their own notification status"
ON notifications_log
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE notifications_log IS 'Log of all push notifications sent to users';
COMMENT ON COLUMN notifications_log.notification_type IS 'Type of notification (connection_request, credit_earned, chain_update, etc.)';
COMMENT ON COLUMN notifications_log.delivery_status IS 'Status of notification delivery';
