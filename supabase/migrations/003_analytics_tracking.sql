-- Add link click tracking table
CREATE TABLE IF NOT EXISTS link_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    country VARCHAR(2),
    city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_link_clicks_request_id ON link_clicks(request_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_link_clicks_country ON link_clicks(country);

-- Enable RLS
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies for link_clicks
CREATE POLICY "Users can view clicks for their own requests" ON link_clicks
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM connection_requests WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert link clicks" ON link_clicks
    FOR INSERT WITH CHECK (true);

-- Add analytics columns to connection_requests table
ALTER TABLE connection_requests
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMP WITH TIME ZONE;

-- Add analytics columns to chains table
ALTER TABLE chains
ADD COLUMN IF NOT EXISTS chain_length INTEGER DEFAULT 1;

-- Function to update click count when a new click is recorded
CREATE OR REPLACE FUNCTION update_request_click_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE connection_requests
    SET
        click_count = click_count + 1,
        last_clicked_at = NEW.clicked_at
    WHERE id = NEW.request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update click count
CREATE TRIGGER trigger_update_click_count
    AFTER INSERT ON link_clicks
    FOR EACH ROW
    EXECUTE FUNCTION update_request_click_count();

-- Function to update chain length when participants change
CREATE OR REPLACE FUNCTION update_chain_length()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chains
    SET chain_length = jsonb_array_length(NEW.participants)
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update chain length
CREATE TRIGGER trigger_update_chain_length
    AFTER UPDATE ON chains
    FOR EACH ROW
    WHEN (OLD.participants IS DISTINCT FROM NEW.participants)
    EXECUTE FUNCTION update_chain_length();