import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { createOrJoinChain, explainSupabaseError, type CreateOrJoinOptions } from '@/lib/chainsApi';
import { getSessionStrict } from '@/lib/authSession';

export interface ConnectionRequest {
  id: string;
  target: string;
  message?: string;
  reward: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled' | 'deleted';
  expiresAt: string;
  shareableLink: string;
  isExpired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  parentUserId?: string; // The user whose link was clicked to access this request
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    bio?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
  };
}

export interface Chain {
  id: string;
  requestId: string;
  participants: Array<{
    userid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'creator' | 'forwarder' | 'target' | 'connector';
    joinedAt: string;
    rewardAmount?: number;
  }>;
  status: 'active' | 'completed' | 'failed';
  totalReward: number;
  chainLength: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  request?: ConnectionRequest;
}

export const useRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [request, setRequest] = useState<ConnectionRequest | null>(null);
  const [chain, setChain] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = async (target: string, message: string, reward: number) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Check wallet balance first
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance, total_spent')
        .eq('user_id', user.id)
        .single();

      if (walletError || !walletData) {
        throw new Error('Unable to access wallet. Please try again.');
      }

      if (walletData.balance < reward) {
        throw new Error(`Insufficient funds. Your balance is $${walletData.balance.toFixed(2)}, but you need $${reward.toFixed(2)}.`);
      }

      // Ensure we have a valid session for RLS
      const session = await getSessionStrict();

      // Generate unique shareable link with timestamp and random string
      const linkId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const shareableLink = `${window.location.origin}/r/${linkId}`;

      // Create connection request
      const { data: requestData, error: requestError } = await supabase
        .from('connection_requests')
        .insert({
          creator_id: user.id,
          target,
          message,
          reward,
          shareable_link: shareableLink,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating request:', requestError);
        throw requestError;
      }

      // Deduct reward amount from user's wallet
      const { error: walletUpdateError } = await supabase
        .from('wallets')
        .update({
          balance: walletData.balance - reward,
          total_spent: walletData.total_spent + reward
        })
        .eq('user_id', user.id);

      if (walletUpdateError) {
        console.error('Error updating wallet:', walletUpdateError);
        // Don't throw error here as request was already created
      } else {
        // Create transaction record
        await supabase
          .from('transactions')
          .insert({
            wallet_id: (await supabase.from('wallets').select('id').eq('user_id', user.id).single()).data.id,
            amount: reward,
            type: 'debit',
            description: `Created connection request: ${target.substring(0, 50)}...`,
            status: 'completed',
            reference_id: requestData.id
          });
      }

      // Create initial chain using the improved API
      try {
        const chainData = await createOrJoinChain(requestData.id, {
          totalReward: reward,
          role: 'creator'
        });
        return { request: requestData, chain: chainData };
      } catch (chainError) {
        console.error('Chain creation error:', chainError);
        console.warn('Chain creation failed, but request was created successfully');
        return { request: requestData, chain: null };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create request';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getMyRequests = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const currentUser = user; // Capture user at call time
      const { data, error } = await supabase
        .from('connection_requests')
        .select(`
          *,
          creator:users!creator_id (
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            bio,
            linkedin_url,
            twitter_url
          )
        `)
        .eq('creator_id', currentUser.id)
        .neq('status', 'cancelled') // Exclude cancelled requests
        .neq('status', 'deleted') // Exclude soft-deleted requests
        .is('deleted_at', null) // Extra safety: exclude any with deleted_at timestamp
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRequests: ConnectionRequest[] = data.map(req => ({
        id: req.id,
        target: req.target,
        message: req.message,
        reward: req.reward,
        status: req.status,
        expiresAt: req.expires_at,
        shareableLink: req.shareable_link,
        isExpired: new Date(req.expires_at) < new Date(),
        isActive: req.status === 'active' && new Date(req.expires_at) > new Date(),
        createdAt: req.created_at,
        updatedAt: req.updated_at,
        deletedAt: req.deleted_at,
        creator: req.creator ? {
          id: req.creator.id,
          firstName: req.creator.first_name,
          lastName: req.creator.last_name,
          email: req.creator.email,
          avatar: req.creator.avatar_url,
          bio: req.creator.bio,
          linkedinUrl: req.creator.linkedin_url,
          twitterUrl: req.creator.twitter_url,
        } : undefined,
      }));

      setRequests(formattedRequests);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch requests';
      setError(errorMessage);
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, []); // Remove user dependency to prevent recreation

  const getRequestByLink = useCallback(async (linkId: string) => {
    setLoading(true);
    setError(null);
    setRequest(null);
    setChain(null);

    try {
      const shareableLink = `${window.location.origin}/r/${linkId}`;
      console.log('Searching for shareable link:', shareableLink);

      // First, try to find this as an original connection request link
      const { data: requestData, error: requestError } = await supabase
        .from('connection_requests')
        .select(`
          *,
          creator:users!creator_id (
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            bio,
            linkedin_url,
            twitter_url
          )
        `)
        .eq('shareable_link', shareableLink)
        .neq('status', 'deleted')
        .is('deleted_at', null)
        .maybeSingle();

      if (requestData) {
        // This is an original connection request link
        console.log('Found original connection request:', requestData.id);

        if (requestData.status !== 'active' || new Date(requestData.expires_at) < new Date()) {
          throw new Error('This connection request is no longer active');
        }

        // Store the request and get its chain
        setRequest({
          id: requestData.id,
          target: requestData.target,
          message: requestData.message,
          reward: requestData.reward,
          status: requestData.status,
          expiresAt: requestData.expires_at,
          shareableLink: requestData.shareable_link,
          isExpired: new Date(requestData.expires_at) < new Date(),
          isActive: requestData.status === 'active' && new Date(requestData.expires_at) > new Date(),
          createdAt: requestData.created_at,
          updatedAt: requestData.updated_at,
          parentUserId: null, // Original creator links have null parentUserId
          creator: requestData.creator && Array.isArray(requestData.creator) ? {
            id: requestData.creator[0]?.id,
            firstName: requestData.creator[0]?.first_name,
            lastName: requestData.creator[0]?.last_name,
            email: requestData.creator[0]?.email,
            avatar: requestData.creator[0]?.avatar_url,
          } : undefined,
        });

        // Try to get the chain for this request
        const { data: chainData } = await supabase
          .from('chains')
          .select('*')
          .eq('request_id', requestData.id)
          .maybeSingle();

        if (chainData) {
          setChain({
            id: chainData.id,
            requestId: chainData.request_id,
            participants: chainData.participants || [],
            status: chainData.status,
            totalReward: chainData.total_reward,
            createdAt: chainData.created_at,
            updatedAt: chainData.updated_at,
          });
        }

        return;
      }

      // If not found as original request, search in chain participants
      console.log('Not found as original request, searching in chain participants...');

      const { data: chains, error: chainError } = await supabase
        .from('chains')
        .select('*')
        .not('participants', 'is', null);

      if (chainError) {
        throw chainError;
      }

      // Find chain where a participant has this shareable link
      let foundChain = null;
      let parentUserId = null;

      for (const chain of chains || []) {
        const participants = chain.participants || [];
        const participant = participants.find((p: any) => p.shareableLink === shareableLink);
        if (participant) {
          foundChain = chain;
          parentUserId = participant.userid;
          console.log('DEBUG: Found participant link owner:', {
            shareableLink,
            participantName: participant.firstName + ' ' + participant.lastName,
            participantId: participant.userid,
            parentUserId: parentUserId
          });
          break;
        }
      }

      if (!foundChain) {
        throw new Error('Invalid link - this connection request could not be found');
      }

      // Get the original request for this chain
      const { data: originalRequest, error: originalRequestError } = await supabase
        .from('connection_requests')
        .select(`
          *,
          creator:users!creator_id (
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            bio,
            linkedin_url,
            twitter_url
          )
        `)
        .eq('id', foundChain.request_id)
        .single();

      if (originalRequestError || !originalRequest) {
        throw new Error('Original request not found');
      }

      if (originalRequest.status !== 'active' || new Date(originalRequest.expires_at) < new Date()) {
        throw new Error('This connection request is no longer active');
      }

      console.log('Found participant link, parent user:', parentUserId);

      // Set the request and chain data
      setRequest({
        id: originalRequest.id,
        target: originalRequest.target,
        message: originalRequest.message,
        reward: originalRequest.reward,
        status: originalRequest.status,
        expiresAt: originalRequest.expires_at,
        shareableLink: originalRequest.shareable_link,
        isExpired: new Date(originalRequest.expires_at) < new Date(),
        isActive: originalRequest.status === 'active' && new Date(originalRequest.expires_at) > new Date(),
        createdAt: originalRequest.created_at,
        updatedAt: originalRequest.updated_at,
        creator: originalRequest.creator && Array.isArray(originalRequest.creator) ? {
          id: originalRequest.creator[0]?.id,
          firstName: originalRequest.creator[0]?.first_name,
          lastName: originalRequest.creator[0]?.last_name,
          email: originalRequest.creator[0]?.email,
          avatar: originalRequest.creator[0]?.avatar_url,
        } : undefined,
        parentUserId: parentUserId, // Store who shared this link
      });

      setChain({
        id: foundChain.id,
        requestId: foundChain.request_id,
        participants: foundChain.participants || [],
        status: foundChain.status,
        totalReward: foundChain.total_reward,
        createdAt: foundChain.created_at,
        updatedAt: foundChain.updated_at,
      });

      return;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch request';
      setError(errorMessage);
      console.error('getRequestByLink error:', err);

      // Clear state on error
      setRequest(null);
      setChain(null);

      throw err;
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since this function doesn't depend on any reactive values

  const joinChain = async (requestId: string, parentFromPage?: string | null) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Ensure we have a valid session for RLS
      const session = await getSessionStrict();

      // Check if request exists and is active
      const { data: requestData, error: requestError } = await supabase
        .from('connection_requests')
        .select(`
          *,
          creator:users!creator_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', requestId)
        .maybeSingle();

      if (requestError) throw requestError;

      if (!requestData) {
        throw new Error('Request not found');
      }

      if (requestData.creator_id === user.id) {
        throw new Error('You cannot join your own chain');
      }

      if (requestData.status !== 'active' || new Date(requestData.expires_at) < new Date()) {
        throw new Error('This connection request is no longer active');
      }

      // Get the parent user ID - prefer explicit param from page, then hook state, then creator fallback
      const parentUserIdFinal =
        (parentFromPage !== undefined ? parentFromPage : request?.parentUserId) // prefer explicit
        ?? requestData.creator_id;                                             // last resort

      console.log('DEBUG: Join chain parent logic:', {
        parentFromPage,
        requestParentUserId: request?.parentUserId,
        creatorId: requestData.creator_id,
        finalParentUserId: parentUserIdFinal,
        linkType: parentUserIdFinal === null ? 'Original creator link' :
                  parentUserIdFinal === requestData.creator_id ? 'Creator fallback' : 'Participant link'
      });

      // Use the improved create or join API
      const chainData = await createOrJoinChain(requestId, {
        totalReward: requestData.reward,
        role: 'forwarder',
        parentUserId: parentUserIdFinal // Pass the parent user ID to connect to the right node
      });

      return chainData;
    } catch (err) {
      const errorMessage = explainSupabaseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getMyChains = useCallback(async () => {
    if (!user) return [];

    setLoading(true);
    setError(null);

    try {
      const session = await getSessionStrict();

      // Get chains where user is a participant using a more efficient approach
      const { data: chains, error } = await supabase
        .from('chains')
        .select(`
          id,
          request_id,
          participants,
          status,
          total_reward,
          created_at,
          updated_at,
          completed_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter chains where user is a participant (client-side filtering)
      // This is necessary because Supabase doesn't have good JSON array filtering
      const userChains = (chains || []).filter(chain => {
        const participants = chain.participants || [];
        return participants.some((p: any) => p.userid === user.id);
      });

      // Fetch request data for each chain
      const chainsWithRequests = await Promise.all(
        userChains.map(async (chain) => {
          try {
            const { data: requestData, error: requestError } = await supabase
              .from('connection_requests')
              .select(`
                id,
                target,
                message,
                reward,
                status,
                expires_at,
                shareable_link,
                creator_id,
                creator:users!creator_id (
                  id,
                  first_name,
                  last_name,
                  email,
                  avatar_url
                )
              `)
              .eq('id', chain.request_id)
              .neq('status', 'deleted') // Exclude soft-deleted requests
              .is('deleted_at', null) // Extra safety: exclude any with deleted_at timestamp
              .maybeSingle();

            if (requestError) {
              console.error('Error fetching request data:', requestError);
              return null; // Return null to filter out chains with invalid requests
            }

            // If no request data found (deleted request), return null to filter out
            if (!requestData) {
              console.warn(`Chain ${chain.id} references deleted request ${chain.request_id}`);
              return null;
            }

            return {
              ...chain,
              request: {
                id: requestData.id,
                target: requestData.target,
                message: requestData.message,
                reward: requestData.reward,
                status: requestData.status,
                expiresAt: requestData.expires_at,
                shareableLink: requestData.shareable_link,
                isExpired: new Date(requestData.expires_at) < new Date(),
                isActive: requestData.status === 'active' && new Date(requestData.expires_at) > new Date(),
                createdAt: chain.created_at,
                updatedAt: chain.updated_at,
                creator: requestData.creator && Array.isArray(requestData.creator) && requestData.creator.length > 0 ? {
                  id: requestData.creator[0].id,
                  firstName: requestData.creator[0].first_name,
                  lastName: requestData.creator[0].last_name,
                  email: requestData.creator[0].email,
                  avatar: requestData.creator[0].avatar_url,
                } : undefined,
              }
            };
          } catch (error) {
            console.error('Error processing chain:', error);
            return null; // Return null to filter out chains with processing errors
          }
        })
      );

      // Filter out null values (chains with deleted requests)
      const validChains = chainsWithRequests.filter(chain => chain !== null);
      
      const formattedChains: Chain[] = validChains.map(chain => ({
        id: chain.id,
        requestId: chain.request_id,
        participants: chain.participants || [],
        status: chain.status,
        totalReward: chain.total_reward,
        chainLength: (chain.participants || []).length,
        completedAt: chain.completed_at,
        createdAt: chain.created_at,
        updatedAt: chain.updated_at,
        request: chain.request,
      }));

      return formattedChains;
    } catch (err: any) {
      if (err?.code === 'PGRST106' || err?.code === 'PGRST205' ||
          err?.message?.includes('table') ||
          err?.message?.includes('chains')) {
        console.log('Chains table not found, returning empty array');
        return [];
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chains';
        console.error('Error fetching chains:', err);
        setError(errorMessage);
        return [];
      }
    } finally {
      setLoading(false);
    }
  }, []); // Remove user dependency to prevent recreation

  const completeChain = async (requestId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Check if request exists and user is creator
      const { data: requestData, error: requestError } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      if (requestData.creator_id !== user.id) {
        throw new Error('Only the creator can complete the chain');
      }

      if (requestData.status !== 'active') {
        throw new Error('This request is already completed or cancelled');
      }

      // Get the chain
      const { data: chainData, error: chainError } = await supabase
        .from('chains')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (chainError) throw chainError;

      if (chainData.status !== 'active') {
        throw new Error('This chain is already completed');
      }

      // Calculate rewards
      const participantCount = chainData.participants.length;
      const rewardPerPerson = chainData.total_reward / participantCount;

      const updatedParticipants = chainData.participants.map((participant: any) => ({
        ...participant,
        rewardAmount: Math.round(rewardPerPerson * 100) / 100
      }));

      // Update request status
      const { error: requestUpdateError } = await supabase
        .from('connection_requests')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestUpdateError) throw requestUpdateError;

      // Update chain status
      const { data: updatedChain, error: chainUpdateError } = await supabase
        .from('chains')
        .update({
          status: 'completed',
          participants: updatedParticipants,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chainData.id)
        .select()
        .single();

      if (chainUpdateError) throw chainUpdateError;

      return { request: requestData, chain: updatedChain };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete chain';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    requests,
    request,
    chain,
    loading,
    error,
    createRequest,
    getMyRequests,
    getRequestByLink,
    getMyChains,
    joinChain,
    completeChain,
  };
};


