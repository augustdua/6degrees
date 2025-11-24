import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

/**
 * Get public profile data for a user
 * Replaces the get_public_profile RPC call that hangs in Telegram Mini App
 */
export const getPublicProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log(`🔍 Getting public profile for user: ${userId}`);

    // Call the get_public_profile database function
    const { data, error } = await supabase.rpc('get_public_profile', {
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Error calling get_public_profile:', error);
      throw error;
    }

    console.log(`✅ Retrieved public profile for user: ${userId}`);

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error in getPublicProfile:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

