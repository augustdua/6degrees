import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { getSessionStrict } from '@/lib/authSession';

export interface TargetClaim {
  id: string;
  requestId: string;
  chainId: string;
  claimantId: string;
  targetName: string;
  targetEmail: string;
  targetCompany: string;
  targetRole: string;
  message?: string;
  contactPreference: 'email' | 'linkedin' | 'phone';
  contactInfo: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  claimant?: {
    firstName: string;
    lastName: string;
    email: string;
    linkedinUrl?: string;
  };
  request?: {
    target: string;
    reward: number;
    message?: string;
  };
}

export const useTargetClaims = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<TargetClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClaimsForMyRequests = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // First get the request IDs for this user
      const { data: requestIds, error: requestError } = await supabase
        .from('connection_requests')
        .select('id')
        .eq('creator_id', user.id);

      if (requestError) throw requestError;

      // If no requests, return empty array
      if (!requestIds || requestIds.length === 0) {
        setClaims([]);
        return;
      }

      const requestIdList = requestIds.map(r => r.id);

      const { data, error } = await supabase
        .from('target_claims')
        .select(`
          *,
          claimant:users!claimant_id (
            first_name,
            last_name,
            email,
            linkedin_url
          ),
          request:connection_requests!request_id (
            target,
            reward,
            message
          )
        `)
        .in('request_id', requestIdList)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedClaims: TargetClaim[] = (data || []).map(claim => ({
        id: claim.id,
        requestId: claim.request_id,
        chainId: claim.chain_id,
        claimantId: claim.claimant_id,
        targetName: claim.target_name,
        targetEmail: claim.target_email,
        targetCompany: claim.target_company,
        targetRole: claim.target_role,
        message: claim.message,
        contactPreference: claim.contact_preference,
        contactInfo: claim.contact_info,
        status: claim.status,
        reviewedBy: claim.reviewed_by,
        reviewedAt: claim.reviewed_at,
        rejectionReason: claim.rejection_reason,
        createdAt: claim.created_at,
        updatedAt: claim.updated_at,
        claimant: claim.claimant ? {
          firstName: claim.claimant.first_name,
          lastName: claim.claimant.last_name,
          email: claim.claimant.email,
          linkedinUrl: claim.claimant.linkedin_url,
        } : undefined,
        request: claim.request ? {
          target: claim.request.target,
          reward: claim.request.reward,
          message: claim.request.message,
        } : undefined,
      }));

      setClaims(formattedClaims);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch claims';
      setError(errorMessage);
      console.error('Error fetching target claims:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const submitTargetClaim = async (
    requestId: string,
    chainId: string,
    targetData: {
      targetName: string;
      targetEmail: string;
      targetCompany: string;
      targetRole: string;
      message?: string;
      contactPreference: 'email' | 'linkedin' | 'phone';
      contactInfo: string;
    }
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Ensure we have a valid session before making the request
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
      }

      if (!session) {
        throw new Error('No active session. Please sign in again.');
      }

      console.log('Target claim session check:', {
        hasSession: !!session,
        userId: session.user?.id,
        expectedUserId: user.id
      });

      const { data, error } = await supabase
        .from('target_claims')
        .insert({
          request_id: requestId,
          chain_id: chainId,
          claimant_id: user.id,
          target_name: targetData.targetName,
          target_email: targetData.targetEmail,
          target_company: targetData.targetCompany,
          target_role: targetData.targetRole,
          message: targetData.message,
          contact_preference: targetData.contactPreference,
          contact_info: targetData.contactInfo,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Target claim database error:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // Create notification for request creator
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: (await supabase
            .from('connection_requests')
            .select('creator_id')
            .eq('id', requestId)
            .single()).data.creator_id,
          type: 'target_claim',
          title: 'New Target Claim',
          message: `Someone claimed to reach your target: ${targetData.targetName}`,
          data: { claim_id: data.id, request_id: requestId },
        });

      if (notificationError) {
        console.warn('Failed to create notification:', notificationError);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit claim';
      setError(errorMessage);
      throw err;
    }
  };

  const approveClaim = async (claimId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase.rpc('approve_target_claim', {
        claim_uuid: claimId
      });

      if (error) throw error;

      // Refresh claims
      await fetchClaimsForMyRequests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve claim';
      setError(errorMessage);
      throw err;
    }
  };

  const rejectClaim = async (claimId: string, reason?: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase.rpc('reject_target_claim', {
        claim_uuid: claimId,
        reason: reason || null
      });

      if (error) throw error;

      // Refresh claims
      await fetchClaimsForMyRequests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject claim';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchClaimsForMyRequests();
    }
  }, [user, fetchClaimsForMyRequests]);

  return {
    claims,
    loading,
    error,
    submitTargetClaim,
    approveClaim,
    rejectClaim,
    refreshClaims: fetchClaimsForMyRequests,
  };
};