import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

export interface FeedChain {
  id: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    bio?: string;
  };
  target: string;
  message?: string;
  reward: number;
  status: 'active' | 'completed';
  participantCount: number;
  createdAt: string;
  expiresAt: string;
  isLiked?: boolean;
  likesCount: number;
  canAccess: boolean; // For completed chains
  requiredCredits?: number; // For completed chains
}

// Get feed data for the user
export const getFeedData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { status, limit = 20, offset = 0 } = req.query;

    // Build query for connection requests with chains
    let query = supabase
      .from('connection_requests')
      .select(`
        id,
        target,
        message,
        reward,
        status,
        created_at,
        expires_at,
        creator:users!connection_requests_creator_id_fkey(
          id,
          firstName,
          lastName,
          avatar_url,
          bio
        ),
        chains(
          id,
          participants,
          chainLength
        )
      `)
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    // Filter by status if provided
    if (status === 'active') {
      query = query.in('status', ['pending', 'active']);
    } else if (status === 'completed') {
      query = query.eq('status', 'completed');
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching feed data:', error);
      res.status(500).json({ error: 'Failed to fetch feed data' });
      return;
    }

    if (!requests) {
      res.json([]);
      return;
    }

    // Get likes data for the current user (if authenticated)
    let userLikes: string[] = [];
    if (userId) {
      const { data: likes } = await supabase
        .from('chain_likes')
        .select('chain_id')
        .eq('user_id', userId);

      userLikes = likes?.map(like => like.chain_id) || [];
    }

    // Get likes count for each chain
    const chainIds = requests
      .map(r => r.chains?.[0]?.id)
      .filter(Boolean);

    let likesCount: Record<string, number> = {};
    if (chainIds.length > 0) {
      const { data: allLikes } = await supabase
        .from('chain_likes')
        .select('chain_id')
        .in('chain_id', chainIds);

      // Count likes per chain
      allLikes?.forEach(like => {
        likesCount[like.chain_id] = (likesCount[like.chain_id] || 0) + 1;
      });
    }

    // Get unlocked chains for the current user (if authenticated)
    let unlockedChains: string[] = [];
    if (userId) {
      const { data: unlocked } = await supabase
        .from('unlocked_chains')
        .select('chain_id')
        .eq('user_id', userId);

      unlockedChains = unlocked?.map(u => u.chain_id) || [];
    }

    // Transform data to feed format
    const feedChains: FeedChain[] = requests.map(request => {
      const chain = request.chains?.[0];
      const chainId = chain?.id;
      const isCompleted = request.status === 'completed';

      // Calculate required credits for completed chains (base cost + participant count)
      const baseCredits = 3;
      const participantBonus = Math.floor((chain?.chainLength || 1) / 2);
      const requiredCredits = baseCredits + participantBonus;

      const creator = Array.isArray(request.creator) ? request.creator[0] : request.creator;

      return {
        id: request.id,
        creator: {
          id: creator?.id || '',
          firstName: creator?.firstName || '',
          lastName: creator?.lastName || '',
          avatar: creator?.avatar_url,
          bio: creator?.bio
        },
        target: request.target,
        message: request.message,
        reward: request.reward,
        status: isCompleted ? 'completed' : 'active',
        participantCount: chain?.chainLength || 0,
        createdAt: request.created_at,
        expiresAt: request.expires_at,
        isLiked: userId ? userLikes.includes(chainId) : false,
        likesCount: chainId ? (likesCount[chainId] || 0) : 0,
        canAccess: !isCompleted || Boolean(userId && unlockedChains.includes(chainId)),
        requiredCredits: isCompleted ? requiredCredits : undefined
      };
    });

    res.json(feedChains);
  } catch (error) {
    console.error('Error in getFeedData:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get feed stats (total counts for tabs)
export const getFeedStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get active chains count
    const { count: activeCount, error: activeError } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'active'])
      .eq('deleted_at', null);

    if (activeError) {
      console.error('Error fetching active count:', activeError);
      res.status(500).json({ error: 'Failed to fetch active count' });
      return;
    }

    // Get completed chains count
    const { count: completedCount, error: completedError } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('deleted_at', null);

    if (completedError) {
      console.error('Error fetching completed count:', completedError);
      res.status(500).json({ error: 'Failed to fetch completed count' });
      return;
    }

    res.json({
      active: activeCount || 0,
      completed: completedCount || 0
    });
  } catch (error) {
    console.error('Error in getFeedStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};