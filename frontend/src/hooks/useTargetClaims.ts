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
          // claimant_id is automatically set by database to auth.uid()
          target_name: targetData.targetName,
          target_email: targetData.targetEmail,
          target_company: targetData.targetCompany,
          target_role: targetData.targetRole,
          message: targetData.message,
          contact_preference: targetData.contactPreference,
          contact_info: targetData.contactInfo,
          status: 'pending',
        })
        .select('*')
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

      console.log('Target claim created successfully:', data);

      // Create notification for request creator (but not if they're claiming their own target)
      const requestCreatorResult = await supabase
        .from('connection_requests')
        .select('creator_id')
        .eq('id', requestId)
        .single();

      if (requestCreatorResult.data?.creator_id && requestCreatorResult.data.creator_id !== user.id) {
        // Notify the creator about the new claim
        const { error: creatorNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: requestCreatorResult.data.creator_id,
            type: 'target_claim',
            title: 'New Target Claim',
            message: `Someone claimed to reach your target: ${targetData.targetName}`,
            data: { claim_id: data.id, request_id: requestId },
          });

        if (creatorNotificationError) {
          console.warn('Failed to create creator notification:', creatorNotificationError);
        }

        // Notify the claimant that their claim has been submitted and creator will review
        const { error: claimantNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'target_claim',
            title: 'Target Claim Submitted',
            message: `Your target claim for ${targetData.targetName} has been submitted. The creator will review it shortly.`,
            data: { claim_id: data.id, request_id: requestId, status: 'pending_review' },
          });

        if (claimantNotificationError) {
          console.warn('Failed to create claimant notification:', claimantNotificationError);
        }
      } else if (requestCreatorResult.data.creator_id === user.id) {
        console.log('Skipping notification - user is claiming their own target');
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
      // Step 1: Check current session
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session check error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }

      // Step 2: If no session or expired, try to refresh
      if (!session || Date.now() > session.expires_at * 1000) {
        console.log('Session missing or expired, attempting refresh...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh error:', refreshError);
          throw new Error(`Session refresh failed: ${refreshError.message}. Please sign in again.`);
        }
        
        session = refreshData.session;
        
        if (!session) {
          throw new Error('No session available after refresh. Please sign in again.');
        }
      }

      // Step 3: Verify user is still authenticated
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error('User verification error:', userError);
        throw new Error('User verification failed. Please sign in again.');
      }

      // Step 4: Double-check session is valid
      if (!session.access_token) {
        throw new Error('No access token available. Please sign in again.');
      }

      console.log('Session validation successful:', {
        userId: currentUser.id,
        sessionExpiresAt: new Date(session.expires_at * 1000),
        hasAccessToken: !!session.access_token
      });

      // Step 5: Make the RPC call
      const { error } = await supabase.rpc('approve_target_claim', {
        claim_uuid: claimId
      });

      if (error) {
        console.error('Approve claim RPC error:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // Step 6: Refresh claims
      await fetchClaimsForMyRequests();
      
      console.log('Target claim approved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve claim';
      setError(errorMessage);
      throw err;
    }
  };

  const rejectClaim = async (claimId: string, reason?: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Step 1: Check current session
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session check error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }

      // Step 2: If no session or expired, try to refresh
      if (!session || Date.now() > session.expires_at * 1000) {
        console.log('Session missing or expired, attempting refresh...');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh error:', refreshError);
          throw new Error(`Session refresh failed: ${refreshError.message}. Please sign in again.`);
        }
        
        session = refreshData.session;
        
        if (!session) {
          throw new Error('No session available after refresh. Please sign in again.');
        }
      }

      // Step 3: Verify user is still authenticated
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error('User verification error:', userError);
        throw new Error('User verification failed. Please sign in again.');
      }

      // Step 4: Double-check session is valid
      if (!session.access_token) {
        throw new Error('No access token available. Please sign in again.');
      }

      console.log('Session validation successful for reject:', {
        userId: currentUser.id,
        sessionExpiresAt: new Date(session.expires_at * 1000),
        hasAccessToken: !!session.access_token
      });

      // Step 5: Make the RPC call
      const { error } = await supabase.rpc('reject_target_claim', {
        claim_uuid: claimId,
        reason: reason || null
      });

      if (error) {
        console.error('Reject claim RPC error:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // Step 6: Refresh claims
      await fetchClaimsForMyRequests();
      
      console.log('Target claim rejected successfully');
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