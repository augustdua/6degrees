import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

/**
 * Get conversations for authenticated user
 * GET /api/messages/conversations
 */
export async function getConversations(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('📡 Fetching conversations for user:', userId);

    // Call the same RPC as the main app
    const { data, error } = await supabase.rpc('get_user_conversations', {
      p_limit: 50,
      p_offset: 0
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} conversations`);

    return res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


