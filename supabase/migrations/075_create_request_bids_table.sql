-- Create request_bids table for bidding on networking requests
-- Similar to offer bids but for connection requests

CREATE TABLE IF NOT EXISTS public.request_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.connection_requests(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  
  -- Prevent duplicate pending bids from same user on same request
  UNIQUE(request_id, bidder_id, status)
);

-- Add indexes for performance
CREATE INDEX idx_request_bids_request_id ON public.request_bids(request_id);
CREATE INDEX idx_request_bids_bidder_id ON public.request_bids(bidder_id);
CREATE INDEX idx_request_bids_status ON public.request_bids(status);

-- Enable Row Level Security
ALTER TABLE public.request_bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Anyone can create a bid
CREATE POLICY "Anyone can create request bids"
  ON public.request_bids
  FOR INSERT
  TO public
  WITH CHECK (bidder_id = auth.uid());

-- 2. Bidders can view their own bids
CREATE POLICY "Bidders can view own bids"
  ON public.request_bids
  FOR SELECT
  TO public
  USING (bidder_id = auth.uid());

-- 3. Request creators can view bids on their requests
CREATE POLICY "Creators can view bids on their requests"
  ON public.request_bids
  FOR SELECT
  TO public
  USING (
    request_id IN (
      SELECT id FROM connection_requests WHERE creator_id = auth.uid()
    )
  );

-- 4. Request creators can update bids (approve/reject)
CREATE POLICY "Creators can update bids on their requests"
  ON public.request_bids
  FOR UPDATE
  TO public
  USING (
    request_id IN (
      SELECT id FROM connection_requests WHERE creator_id = auth.uid()
    )
  )
  WITH CHECK (
    request_id IN (
      SELECT id FROM connection_requests WHERE creator_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_request_bids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_request_bids_updated_at
  BEFORE UPDATE ON public.request_bids
  FOR EACH ROW
  EXECUTE FUNCTION update_request_bids_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.request_bids IS 'Bids placed by users on networking requests (connection_requests)';
COMMENT ON COLUMN public.request_bids.status IS 'pending: awaiting creator review, approved: accepted by creator, rejected: declined by creator';

