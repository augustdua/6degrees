import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

export const getUserConnections = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase.rpc('get_user_connections', { p_user_id: userId });

    if (error) {
      console.error('Error fetching user connections:', error);
      return res.status(500).json({ error: 'Failed to fetch user connections' });
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error in getUserConnections:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
