import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { generateShareableLink } from '@/lib/shareUtils';

export interface Invite {
  id: string;
  requestId: string;
  inviterId: string;
  inviteeEmail: string;
  inviteeId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  inviteLink: string;
  message?: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  inviter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  request?: {
    id: string;
    target: string;
    message?: string;
    reward: number;
  };
}

export interface PendingInvite {
  inviteId: string;
  requestId: string;
  inviterName: string;
  inviterEmail: string;
  target: string;
  message?: string;
  reward: number;
  inviteMessage?: string;
  createdAt: string;
  expiresAt: string;
}

export const useInvites = () => {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInvite = async (requestId: string, inviteeEmail: string, message?: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Generate unique invite link
      const linkId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const inviteLink = generateShareableLink(linkId);

      const { data, error } = await supabase
        .from('invites')
        .insert({
          request_id: requestId,
          inviter_id: user.id,
          invitee_email: inviteeEmail,
          invite_link: inviteLink,
          message,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (error) throw error;

      // Try to create notification if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteeEmail)
        .single();

      if (existingUser) {
        await supabase
          .from('invites')
          .update({ invitee_id: existingUser.id })
          .eq('id', data.id);

        // Call the function to create notification
        await supabase.rpc('create_invite_notification', { invite_uuid: data.id });
      }

      return data;
    } catch (err: any) {
      // Handle the case where invites table doesn't exist yet
      if (err?.code === 'PGRST106' || err?.code === 'PGRST205' ||
          err?.message?.includes('table') ||
          err?.message?.includes('invites') ||
          err?.message?.includes('schema cache')) {
        const errorMessage = 'Invites feature is not available yet. Please contact support.';
        setError(errorMessage);
        throw new Error(errorMessage);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create invite';
        setError(errorMessage);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  const getMyInvites = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          *,
          inviter:users!inviter_id (
            id,
            first_name,
            last_name,
            email,
            profile_picture_url
          ),
          request:connection_requests!request_id (
            id,
            target,
            message,
            reward
          )
        `)
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedInvites: Invite[] = (data || []).map(invite => ({
        id: invite.id,
        requestId: invite.request_id,
        inviterId: invite.inviter_id,
        inviteeEmail: invite.invitee_email,
        inviteeId: invite.invitee_id,
        status: invite.status,
        inviteLink: invite.invite_link,
        message: invite.message,
        expiresAt: invite.expires_at,
        acceptedAt: invite.accepted_at,
        createdAt: invite.created_at,
        updatedAt: invite.updated_at,
        inviter: invite.inviter ? {
          id: invite.inviter.id,
          firstName: invite.inviter.first_name,
          lastName: invite.inviter.last_name,
          email: invite.inviter.email,
          avatar: invite.inviter.profile_picture_url,
        } : undefined,
        request: invite.request ? {
          id: invite.request.id,
          target: invite.request.target,
          message: invite.request.message,
          reward: invite.request.reward,
        } : undefined,
      }));

      setInvites(formattedInvites);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invites';
      setError(errorMessage);
      console.error('Error fetching invites:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getPendingInvites = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Skip RPC function entirely and use direct query since the function doesn't exist
      // Simplified query to avoid SQL parsing issues
      const result = await supabase
        .from('invites')
        .select(`
          id,
          request_id,
          message,
          created_at,
          expires_at,
          inviter:users!inviter_id (
            first_name,
            last_name,
            email
          ),
          request:connection_requests!request_id (
            target,
            message,
            reward
          )
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (result.error) throw result.error;

      const data = result.data?.map((invite: any) => ({
        invite_id: invite.id,
        request_id: invite.request_id,
        inviter_name: `${invite.inviter.first_name} ${invite.inviter.last_name}`,
        inviter_email: invite.inviter.email,
        target: invite.request.target,
        message: invite.request.message,
        reward: invite.request.reward,
        invite_message: invite.message,
        created_at: invite.created_at,
        expires_at: invite.expires_at,
      })) || [];

      const formattedInvites: PendingInvite[] = (data || []).map((invite: any) => ({
        inviteId: invite.invite_id,
        requestId: invite.request_id,
        inviterName: invite.inviter_name,
        inviterEmail: invite.inviter_email,
        target: invite.target,
        message: invite.message,
        reward: invite.reward,
        inviteMessage: invite.invite_message,
        createdAt: invite.created_at,
        expiresAt: invite.expires_at,
      })) || [];

      setPendingInvites(formattedInvites);
    } catch (err: any) {
      // Handle the case where invites table doesn't exist yet
      if (err?.code === 'PGRST106' || err?.code === 'PGRST205' ||
          err?.message?.includes('table') ||
          err?.message?.includes('invites') ||
          err?.message?.includes('schema cache')) {
        console.log('Invites table not found, using empty state');
        setPendingInvites([]);
        setError(null);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pending invites';
        setError(errorMessage);
        console.error('Error fetching pending invites:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []); // Remove user dependency to prevent recreation

  const acceptInvite = async (inviteId: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // For now, just update the invite status until RPC functions are available
      const { error } = await supabase
        .from('invites')
        .update({
          status: 'accepted',
          invitee_id: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;

      // Refresh pending invites
      await getPendingInvites();

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invite';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectInvite = async (inviteId: string, reason?: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // For now, just update the invite status until RPC functions are available
      const { error } = await supabase
        .from('invites')
        .update({
          status: 'rejected',
          invitee_id: user.id,
        })
        .eq('id', inviteId);

      if (error) throw error;

      // Refresh pending invites
      await getPendingInvites();

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject invite';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getInviteByLink = async (linkId: string) => {
    setLoading(true);
    setError(null);

    try {
      const inviteLink = generateShareableLink(linkId);

      const { data, error } = await supabase
        .from('invites')
        .select(`
          *,
          inviter:users!inviter_id (
            id,
            first_name,
            last_name,
            email,
            profile_picture_url
          ),
          request:connection_requests!request_id (
            id,
            target,
            message,
            reward
          )
        `)
        .eq('invite_link', inviteLink)
        .single();

      if (error) throw error;

      if (!data || data.status !== 'pending' || new Date(data.expires_at) < new Date()) {
        throw new Error('This invite is no longer valid');
      }

      return {
        id: data.id,
        requestId: data.request_id,
        inviterId: data.inviter_id,
        inviteeEmail: data.invitee_email,
        inviteeId: data.invitee_id,
        status: data.status,
        inviteLink: data.invite_link,
        message: data.message,
        expiresAt: data.expires_at,
        acceptedAt: data.accepted_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        inviter: {
          id: data.inviter.id,
          firstName: data.inviter.first_name,
          lastName: data.inviter.last_name,
          email: data.inviter.email,
          avatar: data.inviter.profile_picture_url,
        },
        request: {
          id: data.request.id,
          target: data.request.target,
          message: data.request.message,
          reward: data.request.reward,
        },
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invite';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    invites,
    pendingInvites,
    loading,
    error,
    createInvite,
    getMyInvites,
    getPendingInvites,
    acceptInvite,
    rejectInvite,
    getInviteByLink,
  };
};