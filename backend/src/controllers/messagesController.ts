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


