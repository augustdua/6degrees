import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

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
  const [userCount, setUserCount] = useState<number>(0);

  const discoverUsers = useCallback(async (
    filters: PeopleSearchFilters = {},
    limit = 20,
    offset = 0,
    append = false
  ) => {
    console.log('✅ discoverUsers: Starting', { filters, limit, offset, append, hasUser: !!user });
    
    if (!user) {
      console.log('❌ discoverUsers: No user, aborting');
      return;
    }

    // User object exists from useAuth, so we're authenticated
    // No need to check session again as it can hang
    if (!append) setLoading(true);
    setError(null);

    console.log('🔴 discoverUsers: Using backend API instead of Supabase...');
    
    try {
      // Use backend API since Supabase client hangs in Telegram Mini App
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.company && { company: filters.company }),
        ...(filters.location && { location: filters.location }),
        exclude_connected: (filters.excludeConnected ?? false).toString()
      });

      const response = await fetch(`/api/users/discover?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('🔴 discoverUsers: API call completed', { hasData: !!data, dataLength: data?.length });
      console.log('✅ discoverUsers: Success, got', data?.length || 0, 'users');

      const formattedUsers: DiscoveredUser[] = (data || []).map((user: any) => ({
        userId: user.id,
        firstName: user.first_name || 'Unknown',
        lastName: user.last_name || 'User',
        email: user.email,
        avatarUrl: user.profile_picture_url,
        bio: user.bio,
        company: user.company,
        role: user.role,
        location: user.location,
        linkedinUrl: user.linkedin_url,
        skills: user.skills || [],
        interests: user.interests || [],
        mutualConnections: 0,
        lastActive: user.last_active,
        isConnected: false,
        hasPendingRequest: false,
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
            profile_picture_url,
            bio,
            company,
            role
          ),
          receiver:receiver_id!inner(
            first_name,
            last_name,
            profile_picture_url,
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
          avatarUrl: req.sender.profile_picture_url,
          bio: req.sender.bio,
          company: req.sender.company,
          role: req.sender.role,
        } : undefined,
        receiverProfile: req.receiver ? {
          firstName: req.receiver.first_name || 'Unknown',
          lastName: req.receiver.last_name || 'User',
          avatarUrl: req.receiver.profile_picture_url,
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

  // Lightweight function to just get the count of discoverable users
  const fetchUserCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .neq('id', user.id)
        .in('visibility', ['public']);
      
      if (error) throw error;
      setUserCount(count || 0);
    } catch (err) {
      console.error('Error fetching user count:', err);
    }
  }, [user]);

  // Load initial data - fetch count and connection requests, but not full user list
  useEffect(() => {
    console.log('🟡 usePeople: useEffect triggered', {
      hasUser: !!user,
      userId: user?.id,
      discoveredUsersLength: discoveredUsers.length,
      loading
    });
    
    if (user) {
      console.log('🟡 usePeople: User exists, fetching connection requests and count...');
      // Fetch connection requests
      fetchConnectionRequests();
      // Fetch user count for sidebar display (lightweight query)
      fetchUserCount();
      // Note: discoveredUsers will be loaded on-demand when components need them
      // This prevents calling the expensive RPC before auth is fully ready
    } else {
      console.log('🟡 usePeople: No user, skipping data fetch');
    }
  }, [user, fetchConnectionRequests, fetchUserCount]);
  
  // Monitor state changes
  useEffect(() => {
    console.log('🟡 usePeople: State updated', {
      discoveredUsersLength: discoveredUsers.length,
      connectionRequestsLength: connectionRequests.length,
      loading,
      error,
      userCount
    });
  }, [discoveredUsers.length, connectionRequests.length, loading, error, userCount]);

  return {
    // Data
    discoveredUsers,
    connectionRequests,
    loading,
    error,
    hasMore,
    userCount,

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