import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

/**
 * GET /api/messages/conversation/:conversationId
 * Get messages for a specific conversation
 */
export const getConversationMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    console.log(`💬 Getting messages for conversation ${conversationId}, user ${userId}`);

    const { data, error } = await supabase.rpc('get_conversation_messages', {
      p_conversation_id: conversationId,
      p_limit: limit
    });

    if (error) {
      console.error('❌ Error calling get_conversation_messages:', error);
      throw error;
    }

    console.log(`✅ Retrieved ${data?.length || 0} messages`);

    return res.status(200).json(data || []);
  } catch (error: any) {
    console.error('Error in getConversationMessages:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * POST /api/messages/mark-read
 * Mark direct messages as read
 */
export const markDirectMessagesRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { other_user_id } = req.body;

    if (!other_user_id) {
      return res.status(400).json({ error: 'other_user_id is required' });
    }

    console.log(`✅ Marking messages as read between ${userId} and ${other_user_id}`);

    const { data, error } = await supabase.rpc('mark_direct_messages_read', {
      p_other_user_id: other_user_id
    });

    if (error) {
      console.error('❌ Error calling mark_direct_messages_read:', error);
      throw error;
    }

    console.log(`✅ Marked messages as read`);

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Error in markDirectMessagesRead:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
