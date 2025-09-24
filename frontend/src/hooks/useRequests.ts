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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = async (target: string, message: string, reward: number) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
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

    try {
      const shareableLink = `${window.location.origin}/r/${linkId}`;

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
        .single();

      if (requestError) throw requestError;

      if (!requestData || requestData.status !== 'active' || new Date(requestData.expires_at) < new Date()) {
        throw new Error('This connection request is no longer active');
      }

      // Get associated chain using maybeSingle to avoid 406 errors
      const { data: chainData, error: chainError } = await supabase
        .from('chains')
        .select('*')
        .eq('request_id', requestData.id)
        .maybeSingle();

      // If chain doesn't exist, that's okay for viewing purposes
      if (chainError) {
        console.warn('Error fetching chain data:', chainError);
      }

      const formattedRequest: ConnectionRequest = {
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
        creator: {
          id: requestData.creator.id,
          firstName: requestData.creator.first_name,
          lastName: requestData.creator.last_name,
          email: requestData.creator.email,
          avatar: requestData.creator.avatar_url,
          bio: requestData.creator.bio,
          linkedinUrl: requestData.creator.linkedin_url,
          twitterUrl: requestData.creator.twitter_url,
        },
      };

      return { request: formattedRequest, chain: chainData };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch request';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since this function doesn't depend on any reactive values

  const joinChain = async (requestId: string) => {
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

      // Use the improved create or join API
      const chainData = await createOrJoinChain(requestId, {
        totalReward: requestData.reward,
        role: 'forwarder'
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
          completed_at,
          request:connection_requests!request_id (
            id,
            target,
            message,
            reward,
            status,
            expires_at,
            shareable_link,
            creator:users!creator_id (
              id,
              first_name,
              last_name,
              email,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter chains where user is a participant (client-side filtering)
      // This is necessary because Supabase doesn't have good JSON array filtering
      const userChains = (chains || []).filter(chain => {
        const participants = chain.participants || [];
        return participants.some((p: any) => p.userid === user.id);
      });

      const formattedChains: Chain[] = userChains.map(chain => ({
        id: chain.id,
        requestId: chain.request_id,
        participants: chain.participants || [],
        status: chain.status,
        totalReward: chain.total_reward,
        chainLength: (chain.participants || []).length,
        completedAt: chain.completed_at,
        createdAt: chain.created_at,
        updatedAt: chain.updated_at,
        request: chain.request && Array.isArray(chain.request) && chain.request.length > 0 ? {
          id: chain.request[0].id,
          target: chain.request[0].target,
          message: chain.request[0].message,
          reward: chain.request[0].reward,
          status: chain.request[0].status,
          expiresAt: chain.request[0].expires_at,
          shareableLink: chain.request[0].shareable_link,
          isExpired: new Date(chain.request[0].expires_at) < new Date(),
          isActive: chain.request[0].status === 'active' && new Date(chain.request[0].expires_at) > new Date(),
          createdAt: chain.created_at,
          updatedAt: chain.updated_at,
          creator: chain.request[0].creator && Array.isArray(chain.request[0].creator) && chain.request[0].creator.length > 0 ? {
            id: chain.request[0].creator[0].id,
            firstName: chain.request[0].creator[0].first_name,
            lastName: chain.request[0].creator[0].last_name,
            email: chain.request[0].creator[0].email,
            avatar: chain.request[0].creator[0].avatar_url,
          } : undefined,
        } : undefined,
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


