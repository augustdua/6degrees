-- Add soft delete functionality to connection_requests table
-- This migration adds the deleted_at column and updates the status constraint

-- Add deleted_at column
ALTER TABLE public.connection_requests 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Update the status constraint to include 'deleted'
ALTER TABLE public.connection_requests 
DROP CONSTRAINT IF EXISTS connection_requests_status_check;

ALTER TABLE public.connection_requests 
ADD CONSTRAINT connection_requests_status_check 
CHECK (status IN ('active', 'completed', 'expired', 'cancelled', 'deleted'));

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_connection_requests_deleted_at 
ON public.connection_requests(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "Users can view their own connection requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Users can update their own connection requests" ON public.connection_requests;

-- Recreate RLS policies with soft delete support
CREATE POLICY "Users can view their own connection requests" ON public.connection_requests
FOR SELECT USING (
    creator_id = auth.uid() AND deleted_at IS NULL
);

CREATE POLICY "Users can create connection requests" ON public.connection_requests
FOR INSERT WITH CHECK (
    creator_id = auth.uid()
);

CREATE POLICY "Users can update their own connection requests" ON public.connection_requests
FOR UPDATE USING (
    creator_id = auth.uid() AND deleted_at IS NULL
);

-- Function to soft delete a connection request
CREATE OR REPLACE FUNCTION soft_delete_connection_request(
    p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Soft delete the request
    UPDATE public.connection_requests
    SET 
        status = 'deleted',
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id
    AND creator_id = v_user_id
    AND deleted_at IS NULL;
    
    -- Check if any rows were affected
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Connection request not found or already deleted';
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION soft_delete_connection_request(UUID) TO authenticated;
