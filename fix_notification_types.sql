-- Fix notification types constraint to include all needed types
-- Apply this to your Supabase database

-- Drop the existing constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add comprehensive constraint with all notification types used in the system
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'chain_joined', 'target_claim', 'chain_approved', 'chain_rejected',
  'reward_received', 'invite_received', 'invite_accepted', 'invite_rejected',
  'reward_earned', 'target_claimed', 'claim_approved', 'claim_rejected',
  'connection_request', 'connection_accepted', 'connection_rejected',
  'invite_sent', 'invite_declined', 'chain_completed', 'chain_failed'
));

-- Update the reject_target_claim function to use proper notification types
CREATE OR REPLACE FUNCTION reject_target_claim(claim_uuid UUID, reason TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim RECORD;
BEGIN
  -- Get the claim details
  SELECT tc.*, cr.creator_id, cr.target
  INTO v_claim
  FROM target_claims tc
  JOIN connection_requests cr ON tc.request_id = cr.id
  WHERE tc.id = claim_uuid AND tc.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found or already processed';
  END IF;

  -- Update claim status
  UPDATE target_claims
  SET
    status = 'rejected',
    reviewed_by = auth.uid()::text,
    reviewed_at = now(),
    rejection_reason = reason,
    updated_at = now()
  WHERE id = claim_uuid;

  -- Create notification for claimant (avoid self-notification)
  IF v_claim.claimant_id != auth.uid() THEN
    INSERT INTO notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_claim.claimant_id,
      'claim_rejected', -- Use the correct type
      'Target Claim Rejected',
      'Your target claim has been rejected. The chain remains active.',
      jsonb_build_object(
        'claim_id', claim_uuid,
        'reason', reason
      )
    );
  END IF;

  -- Optionally notify the creator that they rejected a claim (but avoid self-notification)
  IF v_claim.creator_id != auth.uid() AND v_claim.creator_id != v_claim.claimant_id THEN
    INSERT INTO notifications (
      user_id, type, title, message, data
    ) VALUES (
      v_claim.creator_id,
      'chain_approved', -- Reuse existing type or create new one
      'Target Claim Reviewed',
      'You have reviewed a target claim for: ' || v_claim.target,
      jsonb_build_object(
        'claim_id', claim_uuid,
        'action', 'rejected'
      )
    );
  END IF;
END;
$$;