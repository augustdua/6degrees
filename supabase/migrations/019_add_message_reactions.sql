-- Add message reactions functionality to group chat
-- This migration adds the ability to react to group messages with emojis

-- 1. Create message_reactions table for group chat reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (length(emoji) > 0 AND length(emoji) <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Make policy creation idempotent
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions to messages they can see" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;

-- RLS Policy: Users can view reactions on messages from chains they participate in
CREATE POLICY "Users can view reactions on messages they can see" ON message_reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_messages gm
            JOIN chains c ON c.id = gm.chain_id
            WHERE gm.id = message_reactions.message_id
            AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(c.participants) AS participant
                WHERE (participant->>'userid')::uuid = auth.uid()
            )
        )
    );

-- RLS Policy: Users can add reactions to messages they can see
CREATE POLICY "Users can add reactions to messages they can see" ON message_reactions
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_messages gm
            JOIN chains c ON c.id = gm.chain_id
            WHERE gm.id = message_reactions.message_id
            AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(c.participants) AS participant
                WHERE (participant->>'userid')::uuid = auth.uid()
            )
        )
    );

-- RLS Policy: Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions" ON message_reactions
    FOR DELETE
    USING (user_id = auth.uid());

-- 2. Function to add message reaction
CREATE OR REPLACE FUNCTION add_message_reaction(
    p_message_id UUID,
    p_emoji TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate input
    IF p_emoji IS NULL OR length(trim(p_emoji)) = 0 THEN
        RAISE EXCEPTION 'Emoji cannot be empty';
    END IF;

    IF length(p_emoji) > 10 THEN
        RAISE EXCEPTION 'Emoji too long (max 10 characters)';
    END IF;

    -- Check if user can access the message
    IF NOT EXISTS (
        SELECT 1 FROM group_messages gm
        JOIN chains c ON c.id = gm.chain_id
        WHERE gm.id = p_message_id
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(c.participants) AS participant
            WHERE (participant->>'userid')::uuid = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied: User cannot access this message';
    END IF;

    -- Insert or ignore if already exists
    INSERT INTO message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, auth.uid(), trim(p_emoji))
    ON CONFLICT (message_id, user_id, emoji) DO NOTHING;
END;
$$;

-- 3. Function to remove message reaction
CREATE OR REPLACE FUNCTION remove_message_reaction(
    p_message_id UUID,
    p_emoji TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM message_reactions
    WHERE message_id = p_message_id
    AND user_id = auth.uid()
    AND emoji = trim(p_emoji);
END;
$$;

-- 4. Enhanced function to get group chat messages with reactions
CREATE OR REPLACE FUNCTION get_group_chat_messages_with_reactions(
    p_chain_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before_message_id UUID DEFAULT NULL
)
RETURNS TABLE (
    message_id UUID,
    sender_id UUID,
    sender_name TEXT,
    sender_avatar TEXT,
    content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    reactions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user is part of the chain
    IF NOT EXISTS (
        SELECT 1 FROM chains c
        WHERE c.id = p_chain_id
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(c.participants) AS participant
            WHERE (participant->>'userid')::uuid = auth.uid()
        )
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not part of this chain';
    END IF;

    RETURN QUERY
    SELECT
        gm.id,
        gm.sender_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as sender_name,
        u.avatar_url,
        gm.content,
        gm.sent_at,
        gm.edited_at,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'emoji', emoji,
                        'count', reaction_count,
                        'users', users_array
                    )
                )
                FROM (
                    SELECT
                        mr.emoji,
                        COUNT(*) as reaction_count,
                        jsonb_agg(
                            jsonb_build_object(
                                'userId', mr.user_id::text,
                                'userName', COALESCE(ru.first_name || ' ' || ru.last_name, ru.email)
                            )
                        ) as users_array
                    FROM message_reactions mr
                    JOIN users ru ON ru.id = mr.user_id
                    WHERE mr.message_id = gm.id
                    GROUP BY mr.emoji
                ) reactions_grouped
            ),
            '[]'::jsonb
        ) as reactions
    FROM group_messages gm
    JOIN users u ON u.id = gm.sender_id
    WHERE gm.chain_id = p_chain_id
    AND (p_before_message_id IS NULL OR gm.sent_at < (
        SELECT gm2.sent_at FROM group_messages gm2 WHERE gm2.id = p_before_message_id
    ))
    ORDER BY gm.sent_at ASC
    LIMIT p_limit;
END;
$$;

-- 5. Grant permissions for new tables and functions
GRANT ALL ON TABLE message_reactions TO authenticated;
GRANT EXECUTE ON FUNCTION add_message_reaction TO authenticated;
GRANT EXECUTE ON FUNCTION remove_message_reaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_chat_messages_with_reactions TO authenticated;