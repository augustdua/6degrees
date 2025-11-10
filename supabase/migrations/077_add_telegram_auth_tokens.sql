-- Create table for Telegram Mini App authentication tokens
CREATE TABLE IF NOT EXISTS public.telegram_auth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_telegram_auth_tokens_token ON public.telegram_auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_tokens_user_id ON public.telegram_auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_auth_tokens_expires_at ON public.telegram_auth_tokens(expires_at);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION clean_expired_telegram_auth_tokens()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.telegram_auth_tokens
  WHERE expires_at < now();
END;
$$;

-- Schedule cleanup (optional - run via cron if available)
-- This can be called periodically by your backend
COMMENT ON FUNCTION clean_expired_telegram_auth_tokens IS 'Removes expired Telegram auth tokens. Call this periodically from your backend.';



