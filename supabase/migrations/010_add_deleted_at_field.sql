-- Add deleted_at field to connection_requests table
ALTER TABLE public.connection_requests
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update the status check constraint to ensure deleted_at is set when status is 'deleted'
ALTER TABLE public.connection_requests
DROP CONSTRAINT IF EXISTS connection_requests_status_check;

ALTER TABLE public.connection_requests
ADD CONSTRAINT connection_requests_status_check
CHECK (
    status IN ('active', 'completed', 'expired', 'cancelled', 'deleted') AND
    (status != 'deleted' OR deleted_at IS NOT NULL)
);

-- Create index for efficient querying of non-deleted records
CREATE INDEX idx_connection_requests_not_deleted
ON public.connection_requests(id)
WHERE deleted_at IS NULL;

-- Update the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

-- Ensure trigger exists for connection_requests
DROP TRIGGER IF EXISTS trg_connection_requests_updated_at ON public.connection_requests;
CREATE TRIGGER trg_connection_requests_updated_at
BEFORE UPDATE ON public.connection_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();