import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

/**
 * GET /api/connections
 * Get user connections
 */
export const getUserConnections = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🔗 Getting connections for user: ${userId}`);

    const { data, error } = await supabase.rpc('get_user_connections', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error calling get_user_connections:', error);
      throw error;
    }

    console.log(`✅ Retrieved ${data?.length || 0} connections`);

    return res.status(200).json(data || []);
  } catch (error: any) {
    console.error('Error in getUserConnections:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

