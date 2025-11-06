import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

/**
 * Generate a JWT token for a user (for Supabase RLS)
 */
function generateUserJWT(userId: string): string {
  const payload = {
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    iss: `${SUPABASE_URL}/auth/v1`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
  };
  
  return jwt.sign(payload, SUPABASE_JWT_SECRET);
}

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

    // Generate a JWT token for the user
    const userToken = generateUserJWT(userId);
    
    // Create a user-scoped Supabase client
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Call the RPC with user context
    const { data, error } = await userSupabase.rpc('get_user_conversations', {
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

/**
 * Get direct messages with a specific user
 * GET /api/messages/direct/:otherUserId
 */
export async function getDirectMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { otherUserId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!otherUserId) {
      return res.status(400).json({ error: 'Other user ID is required' });
    }

    console.log('📡 Fetching messages between', userId, 'and', otherUserId);

    // Generate a JWT token for the user
    const userToken = generateUserJWT(userId);
    
    // Create a user-scoped Supabase client
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      }
    });

    // Call the RPC to get messages
    const { data, error } = await userSupabase.rpc('get_conversation_messages', {
      p_conversation_id: otherUserId,
      p_limit: 100
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} messages`);

    return res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Send a direct message to another user
 * POST /api/messages/send
 */
export async function sendDirectMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { receiverId, content } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    console.log('📤 Sending message from', userId, 'to', receiverId);

    // Insert message directly into messages table
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        content: content.trim(),
        message_type: 'text'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error sending message:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Message sent successfully');

    return res.json({ success: true, message: data });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


