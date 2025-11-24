import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

export const softDeleteRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!requestId) return res.status(400).json({ error: 'Missing request ID' });

    const { data, error } = await supabase.rpc('soft_delete_connection_request', {
      p_request_id: requestId
    });

    if (error) {
      console.error('Error soft deleting request:', error);
      return res.status(500).json({ error: 'Failed to soft delete request' });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in softDeleteRequest:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
