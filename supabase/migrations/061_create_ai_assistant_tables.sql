-- Migration: Create AI Assistant Chat System
-- Description: Tables for AI chatbot assistant with conversation history and context tracking

-- =====================================================
-- AI Chat Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    message_count INTEGER NOT NULL DEFAULT 0,
    context JSONB DEFAULT '{}'::jsonb, -- Store session context (page history, user state snapshots)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick user session lookups
CREATE INDEX idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_sessions_active ON ai_chat_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_ai_chat_sessions_last_message ON ai_chat_sessions(user_id, last_message_at DESC);

-- =====================================================
-- AI Chat Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb, -- Context at message time (current page, user state, etc.)
    function_call JSONB, -- Store function calls made by assistant
    function_result JSONB, -- Store function call results
    tokens_used INTEGER, -- Track token usage
    model TEXT DEFAULT 'gpt-4-turbo', -- Track which model was used
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient message retrieval
CREATE INDEX idx_ai_chat_messages_session_id ON ai_chat_messages(session_id, created_at DESC);
CREATE INDEX idx_ai_chat_messages_user_id ON ai_chat_messages(user_id, created_at DESC);
CREATE INDEX idx_ai_chat_messages_created_at ON ai_chat_messages(created_at DESC);

-- =====================================================
-- AI Chat Actions Table (log actions taken by AI)
-- =====================================================
CREATE TABLE IF NOT EXISTS ai_chat_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES ai_chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'navigate', 'create_offer', 'send_message', 'search', etc.
    action_data JSONB NOT NULL, -- Store action parameters and results
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for action tracking and analytics
CREATE INDEX idx_ai_chat_actions_session_id ON ai_chat_actions(session_id, created_at DESC);
CREATE INDEX idx_ai_chat_actions_user_id ON ai_chat_actions(user_id, created_at DESC);
CREATE INDEX idx_ai_chat_actions_type ON ai_chat_actions(action_type, created_at DESC);

-- =====================================================
-- RPC Functions
-- =====================================================

-- Function: Get or create active session for user
CREATE OR REPLACE FUNCTION get_or_create_ai_chat_session(
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Try to get active session (last 24 hours)
    SELECT id INTO v_session_id
    FROM ai_chat_sessions
    WHERE user_id = p_user_id
        AND is_active = true
        AND last_message_at > now() - interval '24 hours'
    ORDER BY last_message_at DESC
    LIMIT 1;

    -- If no active session, create new one
    IF v_session_id IS NULL THEN
        INSERT INTO ai_chat_sessions (user_id)
        VALUES (p_user_id)
        RETURNING id INTO v_session_id;
    END IF;

    RETURN v_session_id;
END;
$$;

-- Function: Get conversation history for session
CREATE OR REPLACE FUNCTION get_ai_chat_history(
    p_user_id UUID,
    p_session_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    session_id UUID,
    role TEXT,
    content TEXT,
    context JSONB,
    function_call JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- If session_id not provided, get the active session
    IF p_session_id IS NULL THEN
        v_session_id := get_or_create_ai_chat_session(p_user_id);
    ELSE
        v_session_id := p_session_id;
    END IF;

    -- Return messages for the session
    RETURN QUERY
    SELECT
        m.id,
        m.session_id,
        m.role,
        m.content,
        m.context,
        m.function_call,
        m.created_at
    FROM ai_chat_messages m
    WHERE m.session_id = v_session_id
        AND m.user_id = p_user_id
    ORDER BY m.created_at ASC
    LIMIT p_limit;
END;
$$;

-- Function: Save AI chat message
CREATE OR REPLACE FUNCTION save_ai_chat_message(
    p_user_id UUID,
    p_session_id UUID,
    p_role TEXT,
    p_content TEXT,
    p_context JSONB DEFAULT '{}'::jsonb,
    p_function_call JSONB DEFAULT NULL,
    p_function_result JSONB DEFAULT NULL,
    p_tokens_used INTEGER DEFAULT NULL,
    p_model TEXT DEFAULT 'gpt-4-turbo'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id UUID;
BEGIN
    -- Insert the message
    INSERT INTO ai_chat_messages (
        session_id,
        user_id,
        role,
        content,
        context,
        function_call,
        function_result,
        tokens_used,
        model
    ) VALUES (
        p_session_id,
        p_user_id,
        p_role,
        p_content,
        p_context,
        p_function_call,
        p_function_result,
        p_tokens_used,
        p_model
    )
    RETURNING id INTO v_message_id;

    -- Update session last_message_at and message_count
    UPDATE ai_chat_sessions
    SET
        last_message_at = now(),
        message_count = message_count + 1,
        updated_at = now()
    WHERE id = p_session_id;

    RETURN v_message_id;
END;
$$;

-- Function: Log AI action
CREATE OR REPLACE FUNCTION log_ai_chat_action(
    p_user_id UUID,
    p_session_id UUID,
    p_message_id UUID,
    p_action_type TEXT,
    p_action_data JSONB,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action_id UUID;
BEGIN
    INSERT INTO ai_chat_actions (
        session_id,
        message_id,
        user_id,
        action_type,
        action_data,
        success,
        error_message
    ) VALUES (
        p_session_id,
        p_message_id,
        p_user_id,
        p_action_type,
        p_action_data,
        p_success,
        p_error_message
    )
    RETURNING id INTO v_action_id;

    RETURN v_action_id;
END;
$$;

-- Function: Get user context for AI assistant
CREATE OR REPLACE FUNCTION get_ai_user_context(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_context JSONB;
    v_user_data JSONB;
    v_stats JSONB;
    v_recent_activity JSONB;
BEGIN
    -- Get user profile data
    SELECT jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'full_name', u.full_name,
        'bio', u.bio,
        'industry', u.industry,
        'organization', u.organization,
        'linkedin_url', u.linkedin_url,
        'created_at', u.created_at
    ) INTO v_user_data
    FROM users u
    WHERE u.id = p_user_id;

    -- Get user stats
    SELECT jsonb_build_object(
        'total_connections', COUNT(DISTINCT CASE WHEN cr.status = 'accepted' THEN cr.id END),
        'pending_requests', COUNT(DISTINCT CASE WHEN cr.status = 'pending' AND cr.recipient_id = p_user_id THEN cr.id END),
        'total_offers', COUNT(DISTINCT o.id),
        'active_offers', COUNT(DISTINCT CASE WHEN o.status = 'active' THEN o.id END),
        'unread_messages', COALESCE(
            (SELECT COUNT(*) FROM messages m
             WHERE m.receiver_id = p_user_id AND m.read_at IS NULL),
            0
        )
    ) INTO v_stats
    FROM users u
    LEFT JOIN connection_requests cr ON (cr.sender_id = p_user_id OR cr.recipient_id = p_user_id)
    LEFT JOIN offers o ON o.poster_id = p_user_id
    WHERE u.id = p_user_id
    GROUP BY u.id;

    -- Get wallet info
    SELECT jsonb_build_object(
        'credits', COALESCE(uc.credits, 0),
        'currency', COALESCE(uc.currency, 'USD')
    ) INTO v_recent_activity
    FROM user_credits uc
    WHERE uc.user_id = p_user_id;

    -- Combine all context
    v_context := jsonb_build_object(
        'user', v_user_data,
        'stats', v_stats,
        'wallet', v_recent_activity,
        'timestamp', now()
    );

    RETURN v_context;
END;
$$;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_actions ENABLE ROW LEVEL SECURITY;

-- Policies for ai_chat_sessions
CREATE POLICY "Users can view their own chat sessions"
    ON ai_chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
    ON ai_chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
    ON ai_chat_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies for ai_chat_messages
CREATE POLICY "Users can view their own chat messages"
    ON ai_chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
    ON ai_chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for ai_chat_actions
CREATE POLICY "Users can view their own chat actions"
    ON ai_chat_actions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat actions"
    ON ai_chat_actions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- Cleanup Function (run periodically)
-- =====================================================

-- Function to clean up old sessions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_ai_chat_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete sessions older than 30 days
    DELETE FROM ai_chat_sessions
    WHERE last_message_at < now() - interval '30 days';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$;

-- =====================================================
-- Grants
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_or_create_ai_chat_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_chat_history(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION save_ai_chat_message(UUID, UUID, TEXT, TEXT, JSONB, JSONB, JSONB, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_chat_action(UUID, UUID, UUID, TEXT, JSONB, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_user_context(UUID) TO authenticated;

COMMENT ON TABLE ai_chat_sessions IS 'Stores AI assistant chat sessions for users';
COMMENT ON TABLE ai_chat_messages IS 'Stores individual messages in AI assistant conversations';
COMMENT ON TABLE ai_chat_actions IS 'Logs actions taken by the AI assistant on behalf of users';
