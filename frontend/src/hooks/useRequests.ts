import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

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

      // Create initial chain with creator as first participant
      const { data: chainData, error: chainError } = await supabase
        .from('chains')
        .insert({
          request_id: requestData.id,
          participants: [{
            userid: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: 'creator',
            joinedAt: new Date().toISOString(),
            rewardAmount: 0
          }],
          total_reward: reward,
        })
        .select()
        .single();

      if (chainError) throw chainError;

      return { request: requestData, chain: chainData };
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

      // Get associated chain
      const { data: chainData, error: chainError } = await supabase
        .from('chains')
        .select('*')
        .eq('request_id', requestData.id)
        .single();

      // If chain doesn't exist, that's okay for viewing purposes
      if (chainError && chainError.code !== 'PGRST116') {
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
        .single();

      if (requestError) throw requestError;

      if (requestData.creator_id === user.id) {
        throw new Error('You cannot join your own chain');
      }

      if (requestData.status !== 'active' || new Date(requestData.expires_at) < new Date()) {
        throw new Error('This connection request is no longer active');
      }

      // Get the chain, create one if it doesn't exist
      let { data: chainData, error: chainError } = await supabase
        .from('chains')
        .select('*')
        .eq('request_id', requestId)
        .single();

      // If chain doesn't exist, create it with the creator as first participant
      if (chainError && chainError.code === 'PGRST116') {
        const { data: newChainData, error: newChainError } = await supabase
          .from('chains')
          .insert({
            request_id: requestId,
            participants: [{
              userid: requestData.creator_id,
              email: requestData.creator?.email || '',
              firstName: requestData.creator?.first_name || 'Creator',
              lastName: requestData.creator?.last_name || '',
              role: 'creator',
              joinedAt: new Date().toISOString(),
              rewardAmount: 0
            }],
            total_reward: requestData.reward,
            status: 'active'
          })
          .select()
          .single();

        if (newChainError) throw newChainError;
        chainData = newChainData;
      } else if (chainError) {
        throw chainError;
      }

      if (chainData.status !== 'active') {
        throw new Error('This chain is no longer active');
      }

      // Check if user is already in the chain
      const existingParticipant = chainData.participants.find(
        (p: any) => p.userid === user.id
      );

      if (existingParticipant) {
        throw new Error('You are already part of this chain');
      }

      // Add user to chain
      const updatedParticipants = [
        ...chainData.participants,
        {
          userid: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: 'forwarder',
          joinedAt: new Date().toISOString(),
          rewardAmount: 0
        }
      ];

      const { data: updatedChain, error: updateError } = await supabase
        .from('chains')
        .update({
          participants: updatedParticipants,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chainData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return updatedChain;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join chain';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
    joinChain,
    completeChain,
  };
};


