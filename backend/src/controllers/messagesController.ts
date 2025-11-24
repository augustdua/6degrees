import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

export const getConversations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase.rpc('get_user_conversations', { p_user_id: userId });

    if (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error in getConversations:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getDirectMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { otherUserId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase.rpc('get_conversation_messages', {
      p_conversation_id: otherUserId, // In direct messages, otherUserId acts as conversation_id
      p_limit: parseInt(limit as string),
      p_offset: parseInt(offset as string)
    });

    if (error) {
      console.error('Error fetching direct messages:', error);
      return res.status(500).json({ error: 'Failed to fetch direct messages' });
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Error in getDirectMessages:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const sendDirectMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { receiver_id, message_content, message_type = 'text', related_offer_id, related_intro_id, related_bid_id } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!receiver_id || !message_content) return res.status(400).json({ error: 'Missing receiver_id or message_content' });

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
      return res.status(500).json({ error: 'Failed to send message' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error in sendDirectMessage:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const markMessagesRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { other_user_id } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!other_user_id) return res.status(400).json({ error: 'Missing other_user_id' });

    const { data, error } = await supabase.rpc('mark_direct_messages_read', {
      p_other_user_id: other_user_id
    });

    if (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ error: 'Failed to mark messages as read' });
    }

    res.json({ success: true, count: data });
  } catch (error: any) {
    console.error('Error in markMessagesRead:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
