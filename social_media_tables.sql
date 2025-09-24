-- Social Media Features Database Schema
-- Run these queries in your Supabase SQL editor

-- Connection Invitations Table
CREATE TABLE IF NOT EXISTS connection_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id VARCHAR NOT NULL, -- Can be user ID or target name for non-users
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connections Table (for accepted invitations)
CREATE TABLE IF NOT EXISTS connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE connection_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Policies for connection_invitations
CREATE POLICY "Users can view invitations sent to them" ON connection_invitations
    FOR SELECT USING (
        recipient_id = auth.uid()::text
        OR sender_id = auth.uid()
    );

CREATE POLICY "Users can send invitations" ON connection_invitations
    FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update invitations sent to them" ON connection_invitations
    FOR UPDATE USING (recipient_id = auth.uid()::text);

-- Policies for connections
CREATE POLICY "Users can view their connections" ON connections
    FOR SELECT USING (
        user1_id = auth.uid()
        OR user2_id = auth.uid()
    );

CREATE POLICY "System can create connections" ON connections
    FOR INSERT WITH CHECK (
        user1_id = auth.uid()
        OR user2_id = auth.uid()
    );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_connection_invitations_recipient ON connection_invitations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connection_invitations_sender ON connection_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_connection_invitations_status ON connection_invitations(status);
CREATE INDEX IF NOT EXISTS idx_connections_user1 ON connections(user1_id);
CREATE INDEX IF NOT EXISTS idx_connections_user2 ON connections(user2_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for connection_invitations
CREATE TRIGGER update_connection_invitations_updated_at
    BEFORE UPDATE ON connection_invitations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();