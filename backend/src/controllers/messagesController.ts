import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

export const getConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase.rpc('get_user_conversations', { 
      p_user_id: userId,
      p_limit: parseInt(limit as string),
      p_offset: parseInt(offset as string)
    });

    if (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
      return;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error in getConversations:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getConversationMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { otherUserId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data, error } = await supabase.rpc('get_conversation_messages', {
      p_conversation_id: otherUserId, // In direct messages, otherUserId acts as conversation_id
      p_limit: parseInt(limit as string),
      p_offset: parseInt(offset as string)
    });

    if (error) {
      console.error('Error fetching direct messages:', error);
      res.status(500).json({ error: 'Failed to fetch direct messages' });
      return;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error in getConversationMessages:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const sendDirectMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { receiver_id, message_content, message_type = 'text', related_offer_id, related_intro_id, related_bid_id } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!receiver_id || !message_content) {
      res.status(400).json({ error: 'Missing receiver_id or message_content' });
      return;
    }

    const { data, error } = await supabase.rpc('send_direct_message', {
      p_sender_id: userId,
      p_receiver_id: receiver_id,
      p_message_content: message_content,
      p_message_type: message_type,
      p_related_offer_id: related_offer_id || null,
      p_related_intro_id: related_intro_id || null,
      p_related_bid_id: related_bid_id || null,
    });

    if (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
      return;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error in sendDirectMessage:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const markDirectMessagesRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { other_user_id } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!other_user_id) {
      res.status(400).json({ error: 'Missing other_user_id' });
      return;
    }

    const { data, error } = await supabase.rpc('mark_direct_messages_read', {
      p_other_user_id: other_user_id
    });

    if (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
      return;
    }

    res.json({ success: true, count: data });
  } catch (error: any) {
    console.error('Error in markDirectMessagesRead:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
