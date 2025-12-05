import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

export const getUserConnections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data, error } = await supabase.rpc('get_user_connections', { p_user_id: userId });

    if (error) {
      console.error('Error fetching user connections:', error);
      res.status(500).json({ error: 'Failed to fetch user connections' });
      return;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error in getUserConnections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Search connections by name
 */
export const searchConnections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const searchQuery = (req.query.q as string || '').trim();
    
    if (searchQuery.length < 2) {
      res.json({ connections: [] });
      return;
    }

    console.log('🔍 Searching connections for user:', userId, 'query:', searchQuery);

    // Get connections where current user is user1
    const { data: data1 } = await supabase
      .from('user_connections')
      .select('user2_id')
      .eq('user1_id', userId)
      .eq('status', 'connected');

    // Get connections where current user is user2
    const { data: data2 } = await supabase
      .from('user_connections')
      .select('user1_id')
      .eq('user2_id', userId)
      .eq('status', 'connected');

    // Combine all connected user IDs
    const connectedIds = [
      ...(data1 || []).map(d => d.user2_id),
      ...(data2 || []).map(d => d.user1_id)
    ];

    console.log('🔍 Found', connectedIds.length, 'connections');

    if (connectedIds.length === 0) {
      res.json({ connections: [] });
      return;
    }

    // Search users by name within the connected users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, profile_picture_url')
      .in('id', connectedIds)
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
      .limit(10);

    if (error) {
      console.error('Error searching connections:', error);
      res.status(500).json({ error: 'Failed to search connections' });
      return;
    }

    console.log('🔍 Search returned', users?.length || 0, 'results');

    res.json({ connections: users || [] });
  } catch (error: any) {
    console.error('Error in searchConnections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
