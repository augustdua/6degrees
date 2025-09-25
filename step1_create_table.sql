-- Step 1: Create chain_invites table
CREATE TABLE IF NOT EXISTS public.chain_invites (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.connection_requests(id) ON DELETE CASCADE,
    chain_id UUID REFERENCES public.chains(id) ON DELETE CASCADE,
    shareable_link TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Prevent duplicate invites
    UNIQUE(user_id, request_id)
);