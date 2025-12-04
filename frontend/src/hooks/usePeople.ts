import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';

export interface DiscoveredUser {
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  company?: string;
  role?: string;
  location?: string;
  linkedinUrl?: string;
  skills?: string[];
  interests?: string[];
  mutualConnections: number;
  lastActive?: string;
  isConnected: boolean;
  hasPendingRequest: boolean;
}

export interface DirectConnectionRequest {
  id: string;
  senderId: string;
  receiverId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  senderProfile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    bio?: string;
    company?: string;
    role?: string;
  };
  receiverProfile?: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    bio?: string;
    company?: string;
    role?: string;
  };
}

export interface PeopleSearchFilters {
  search?: string;
  company?: string;
  location?: string;
  excludeConnected?: boolean;
}

export const usePeople = () => {
  const { user } = useAuth();
  const [discoveredUsers, setDiscoveredUsers] = useState<DiscoveredUser[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<DirectConnectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const discoverUsers = useCallback(async (
    filters: PeopleSearchFilters = {},
    limit = 20,
    offset = 0,
    append = false
  ) => {
    if (!user) return;

    if (!append) setLoading(true);
    setError(null);

    try {
      // Use backend API instead of direct Supabase RPC
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        exclude_connected: String(filters.excludeConnected ?? true)
      });
      if (filters.search) params.append('search', filters.search);
      if (filters.company) params.append('company', filters.company);
      if (filters.location) params.append('location', filters.location);

      const data = await apiGet(`${API_ENDPOINTS.USERS_DISCOVER}?${params.toString()}`);

      const formattedUsers: DiscoveredUser[] = (data || []).map((u: any) => ({
        userId: u.user_id,
        firstName: u.first_name || 'Unknown',
        lastName: u.last_name || 'User',
        email: u.email,
        avatarUrl: u.avatar_url,
        bio: u.bio,
        company: u.company,
        role: u.role,
        location: u.location,
        linkedinUrl: u.linkedin_url,
        skills: u.skills || [],
        interests: u.interests || [],
        mutualConnections: u.mutual_connections || 0,
        lastActive: u.last_active,
        isConnected: u.is_connected || false,
        hasPendingRequest: u.has_pending_request || false,
      }));

      if (append) {
        setDiscoveredUsers(prev => [...prev, ...formattedUsers]);
      } else {
        setDiscoveredUsers(formattedUsers);
      }

      setHasMore(formattedUsers.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discover users';
      setError(errorMessage);
      console.error('Error discovering users:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const sendConnectionRequest = async (receiverId: string, message?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase.rpc('send_direct_connection_request', {
        p_receiver_id: receiverId,
        p_message: message || null
      });

      if (error) throw error;

      // Update the user's pending request status locally
      setDiscoveredUsers(prev =>
        prev.map(u =>
          u.userId === receiverId
            ? { ...u, hasPendingRequest: true }
            : u
        )
      );

      // Refresh connection requests
      await fetchConnectionRequests();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send connection request';
      setError(errorMessage);
      throw err;
    }
  };

  const respondToConnectionRequest = async (requestId: string, response: 'accepted' | 'rejected') => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase.rpc('respond_to_direct_connection_request', {
        p_request_id: requestId,
        p_response: response
      });

      if (error) throw error;

      // Update local state
      setConnectionRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? { ...req, status: response, updatedAt: new Date().toISOString() }
            : req
        )
      );

      // If accepted, refresh discovered users to update connection status
      if (response === 'accepted') {
        await discoverUsers();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to connection request';
      setError(errorMessage);
      throw err;
    }
  };

  const cancelConnectionRequest = async (requestId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('direct_connection_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('sender_id', user.id);

      if (error) throw error;

      // Update local state
      setConnectionRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? { ...req, status: 'cancelled', updatedAt: new Date().toISOString() }
            : req
        )
      );

      // Update discovered users if needed
      const request = connectionRequests.find(r => r.id === requestId);
      if (request) {
        setDiscoveredUsers(prev =>
          prev.map(u =>
            u.userId === request.receiverId
              ? { ...u, hasPendingRequest: false }
              : u
          )
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel connection request';
      setError(errorMessage);
      throw err;
    }
  };

  const fetchConnectionRequests = useCallback(async () => {
    if (!user) return;

    try {
      // Get requests where user is sender or receiver
      const { data, error } = await supabase
        .from('direct_connection_requests')
        .select(`
          *,
          sender:sender_id!inner(
            first_name,
            last_name,
            avatar_url,
            bio,
            company,
            role
          ),
          receiver:receiver_id!inner(
            first_name,
            last_name,
            avatar_url,
            bio,
            company,
            role
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRequests: DirectConnectionRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        senderId: req.sender_id,
        receiverId: req.receiver_id,
        message: req.message,
        status: req.status,
        createdAt: req.created_at,
        updatedAt: req.updated_at,
        senderProfile: req.sender ? {
          firstName: req.sender.first_name || 'Unknown',
          lastName: req.sender.last_name || 'User',
          avatarUrl: req.sender.avatar_url,
          bio: req.sender.bio,
          company: req.sender.company,
          role: req.sender.role,
        } : undefined,
        receiverProfile: req.receiver ? {
          firstName: req.receiver.first_name || 'Unknown',
          lastName: req.receiver.last_name || 'User',
          avatarUrl: req.receiver.avatar_url,
          bio: req.receiver.bio,
          company: req.receiver.company,
          role: req.receiver.role,
        } : undefined,
      }));

      setConnectionRequests(formattedRequests);
    } catch (err) {
      console.error('Error fetching connection requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch connection requests');
    }
  }, [user]);

  const getPendingRequestsCount = useCallback((): number => {
    return connectionRequests.filter(req =>
      req.status === 'pending' && req.receiverId === user?.id
    ).length;
  }, [connectionRequests, user]);

  const getSentRequestsCount = useCallback((): number => {
    return connectionRequests.filter(req =>
      req.status === 'pending' && req.senderId === user?.id
    ).length;
  }, [connectionRequests, user]);

  // Load initial data
  useEffect(() => {
    if (user) {
      discoverUsers();
      fetchConnectionRequests();
    }
  }, [user, discoverUsers, fetchConnectionRequests]);

  return {
    // Data
    discoveredUsers,
    connectionRequests,
    loading,
    error,
    hasMore,

    // Actions
    discoverUsers,
    sendConnectionRequest,
    respondToConnectionRequest,
    cancelConnectionRequest,
    fetchConnectionRequests,

    // Helpers
    getPendingRequestsCount,
    getSentRequestsCount,
  };
};