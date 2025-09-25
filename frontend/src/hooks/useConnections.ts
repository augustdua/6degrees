import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface UserConnection {
  connectionId: string;
  connectedUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  bio?: string;
  connectedAt: string;
  connectionRequestId?: string;
}

export const useConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_user_connections', {
        p_user_id: user.id
      });

      if (error) throw error;

      const formattedConnections: UserConnection[] = (data || []).map((conn: any) => ({
        connectionId: conn.connection_id,
        connectedUserId: conn.connected_user_id,
        firstName: conn.first_name || 'Unknown',
        lastName: conn.last_name || 'User',
        email: conn.email || '',
        linkedinUrl: conn.linkedin_url,
        avatarUrl: conn.avatar_url,
        bio: conn.bio,
        connectedAt: conn.connected_at,
        connectionRequestId: conn.connection_request_id,
      }));

      setConnections(formattedConnections);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch connections';
      setError(errorMessage);
      console.error('Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getConnectionsCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data, error } = await supabase.rpc('get_user_connections', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data?.length || 0;
    } catch (err) {
      console.error('Error getting connections count:', err);
      return 0;
    }
  }, [user]);

  const removeConnection = async (connectionId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'blocked' })
        .eq('id', connectionId)
        .eq('user1_id', user.id)
        .or(`user2_id.eq.${user.id}`);

      if (error) throw error;

      // Refresh connections
      await fetchConnections();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove connection';
      setError(errorMessage);
      throw err;
    }
  };

  const isConnectedWith = useCallback(async (userId: string): Promise<boolean> => {
    if (!user || userId === user.id) return false;

    try {
      const { data, error } = await supabase
        .from('user_connections')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
        .eq('status', 'connected')
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      console.error('Error checking connection status:', err);
      return false;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user, fetchConnections]);

  return {
    connections,
    loading,
    error,
    fetchConnections,
    getConnectionsCount,
    removeConnection,
    isConnectedWith,
  };
};