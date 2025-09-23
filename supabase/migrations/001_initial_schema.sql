-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create connection_requests table
CREATE TABLE public.connection_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    target TEXT NOT NULL CHECK (LENGTH(target) >= 10 AND LENGTH(target) <= 200),
    message TEXT CHECK (LENGTH(message) <= 1000),
    reward DECIMAL(10,2) NOT NULL CHECK (reward >= 10 AND reward <= 10000),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    shareable_link TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chains table
CREATE TABLE public.chains (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id UUID REFERENCES public.connection_requests(id) ON DELETE CASCADE NOT NULL,
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_reward DECIMAL(10,2) NOT NULL CHECK (total_reward >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rewards table
CREATE TABLE public.rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chain_id UUID REFERENCES public.chains(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_created_at ON public.users(created_at);

CREATE INDEX idx_connection_requests_creator_id ON public.connection_requests(creator_id);
CREATE INDEX idx_connection_requests_status ON public.connection_requests(status);
CREATE INDEX idx_connection_requests_expires_at ON public.connection_requests(expires_at);
CREATE INDEX idx_connection_requests_shareable_link ON public.connection_requests(shareable_link);
CREATE INDEX idx_connection_requests_created_at ON public.connection_requests(created_at);

CREATE INDEX idx_chains_request_id ON public.chains(request_id);
CREATE INDEX idx_chains_status ON public.chains(status);
CREATE INDEX idx_chains_created_at ON public.chains(created_at);

CREATE INDEX idx_rewards_chain_id ON public.rewards(chain_id);
CREATE INDEX idx_rewards_user_id ON public.rewards(user_id);
CREATE INDEX idx_rewards_status ON public.rewards(status);
CREATE INDEX idx_rewards_created_at ON public.rewards(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_requests_updated_at BEFORE UPDATE ON public.connection_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chains_updated_at BEFORE UPDATE ON public.chains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view other users' public profiles" ON public.users
    FOR SELECT USING (true);

-- Connection requests policies
CREATE POLICY "Users can view all active connection requests" ON public.connection_requests
    FOR SELECT USING (status = 'active' AND expires_at > NOW());

CREATE POLICY "Users can view their own connection requests" ON public.connection_requests
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create connection requests" ON public.connection_requests
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own connection requests" ON public.connection_requests
    FOR UPDATE USING (auth.uid() = creator_id);

-- Chains policies
CREATE POLICY "Users can view chains they participate in" ON public.chains
    FOR SELECT USING (
        auth.uid()::text = ANY(
            SELECT jsonb_array_elements_text(participants::jsonb->'userId')
        )
    );

CREATE POLICY "Users can create chains" ON public.chains
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update chains they participate in" ON public.chains
    FOR UPDATE USING (
        auth.uid()::text = ANY(
            SELECT jsonb_array_elements_text(participants::jsonb->'userId')
        )
    );

-- Rewards policies
CREATE POLICY "Users can view their own rewards" ON public.rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create rewards" ON public.rewards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own rewards" ON public.rewards
    FOR UPDATE USING (auth.uid() = user_id);

-- Functions for chain management
CREATE OR REPLACE FUNCTION add_participant_to_chain(
    chain_uuid UUID,
    participant_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    current_participants JSONB;
    user_id_text TEXT;
BEGIN
    -- Get current participants
    SELECT participants INTO current_participants
    FROM public.chains
    WHERE id = chain_uuid;
    
    -- Extract user ID from participant data
    user_id_text := participant_data->>'userId';
    
    -- Check if user is already in the chain
    IF current_participants @> jsonb_build_array(jsonb_build_object('userId', user_id_text)) THEN
        RAISE EXCEPTION 'User is already in this chain';
    END IF;
    
    -- Add participant to chain
    UPDATE public.chains
    SET participants = participants || jsonb_build_array(participant_data),
        updated_at = NOW()
    WHERE id = chain_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and distribute rewards
CREATE OR REPLACE FUNCTION complete_chain_and_distribute_rewards(
    chain_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    chain_record RECORD;
    participant JSONB;
    reward_per_person DECIMAL(10,2);
    updated_participants JSONB := '[]'::jsonb;
BEGIN
    -- Get chain details
    SELECT * INTO chain_record
    FROM public.chains
    WHERE id = chain_uuid AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Chain not found or not active';
    END IF;
    
    -- Calculate reward per person
    reward_per_person := chain_record.total_reward / jsonb_array_length(chain_record.participants);
    
    -- Update participants with reward amounts
    FOR participant IN SELECT * FROM jsonb_array_elements(chain_record.participants)
    LOOP
        participant := jsonb_set(participant, '{rewardAmount}', to_jsonb(reward_per_person));
        updated_participants := updated_participants || jsonb_build_array(participant);
    END LOOP;
    
    -- Update chain status
    UPDATE public.chains
    SET status = 'completed',
        participants = updated_participants,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = chain_uuid;
    
    -- Create reward records
    FOR participant IN SELECT * FROM jsonb_array_elements(updated_participants)
    LOOP
        INSERT INTO public.rewards (chain_id, user_id, amount, status)
        VALUES (
            chain_uuid,
            (participant->>'userId')::UUID,
            (participant->>'rewardAmount')::DECIMAL(10,2),
            'pending'
        );
    END LOOP;
    
    -- Update connection request status
    UPDATE public.connection_requests
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = chain_record.request_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

