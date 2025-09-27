// src/controllers/feedController.ts
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

/** Normalize a query value: turns '', 'null', 'undefined', whitespace -> undefined */
const norm = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  const lc = t.toLowerCase();
  if (lc === 'null' || lc === 'undefined') return undefined;
  return t;
};

// GET /api/feed/data
export const getFeedData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // ---- Normalize all query params up-front
    const status = norm(req.query.status) as 'active' | 'completed' | undefined;
    const from = norm(req.query.from);
    const to = norm(req.query.to);
    const expiresAt = norm(req.query.expiresAt);
    const createdAt = norm(req.query.createdAt);
    const limit = Number(norm(req.query.limit)) || 20;
    const offset = Number(norm(req.query.offset)) || 0;

    console.log('Feed query parameters:', { status, limit, offset, from, to, expiresAt, createdAt });

    // ---- Base query
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
        shareable_link,
        creator:users!connection_requests_creator_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url,
          bio
        ),
        chains(
          id,
          status
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    // ---- Status filter
    if (status === 'active') {
      query = query.in('status', ['pending', 'active']);
    } else if (status === 'completed') {
      query = query.eq('status', 'completed');
    }

    // ---- Date filters (only if present)
    if (from)      query = query.gte('created_at', from);
    if (to)        query = query.lte('created_at', to);
    if (expiresAt) query = query.gte('expires_at', expiresAt);
    if (createdAt) query = query.gte('created_at', createdAt);

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching feed data:', error);
      res.status(500).json({ error: 'Failed to fetch feed data' });
      return;
    }

    if (!requests || requests.length === 0) {
      res.json([]);
      return;
    }

    // ---- Collect chain ids (from first chain per request)
    // Note: After data cleanup, all active connection_requests should have chains
    const chainIds: string[] = requests
      .map((r: any) => r.chains?.[0]?.id)
      .filter(Boolean);

    // ---- DISABLED: Participant count loading (was causing API hangs due to large JSON)
    // Setting default participant count to avoid loading massive JSON arrays
    let participantCounts: Record<string, number> = {};
    chainIds.forEach(id => {
      participantCounts[id] = 5; // Default count for testing
    });

    // ---- Likes for current user
    let userLikes: string[] = [];
    if (userId && chainIds.length > 0) {
      const { data: likes, error: likesErr } = await supabase
        .from('chain_likes')
        .select('chain_id')
        .eq('user_id', userId)
        .in('chain_id', chainIds);

      if (!likesErr) {
        userLikes = (likes ?? []).map(l => l.chain_id);
      }
    }

    // ---- Total likes per chain
    let likesCount: Record<string, number> = {};
    if (chainIds.length > 0) {
      const { data: allLikes } = await supabase
        .from('chain_likes')
        .select('chain_id')
        .in('chain_id', chainIds);

      (allLikes ?? []).forEach(like => {
        likesCount[like.chain_id] = (likesCount[like.chain_id] || 0) + 1;
      });
    }

    // ---- Unlocked chains for current user
    let unlockedChains: string[] = [];
    if (userId && chainIds.length > 0) {
      const { data: unlocked } = await supabase
        .from('unlocked_chains')
        .select('chain_id')
        .eq('user_id', userId)
        .in('chain_id', chainIds);

      unlockedChains = (unlocked ?? []).map(u => u.chain_id);
    }

    // ---- Transform to FeedChain[]
    const feedChains: FeedChain[] = requests.map((request: any) => {
      const chain = request.chains?.[0];
      const chainId: string | null = chain?.id ?? null;

      // DISABLED: participants JSON loading (was causing API hangs)
      // Using pre-computed participant count instead
      const chainLength = chainId ? (participantCounts[chainId] || 0) : 0;

      const isCompleted = request.status === 'completed';

      // Completed chains: credits = base + floor(length/2)
      const baseCredits = 3;
      const participantBonus = Math.floor(chainLength / 2);
      const requiredCredits = baseCredits + participantBonus;

      // creator relation can be object or array depending on join
      const creatorRel = Array.isArray(request.creator) ? request.creator[0] : request.creator;

      return {
        id: request.id,
        creator: {
          id: creatorRel?.id || '',
          firstName: creatorRel?.first_name || '',
          lastName: creatorRel?.last_name || '',
          avatar: creatorRel?.avatar_url,
          bio: creatorRel?.bio
        },
        target: request.target,
        message: request.message ?? undefined,
        reward: Number(request.reward) || 0,
        status: isCompleted ? 'completed' as const : 'active' as const,
        participantCount: chainLength,
        createdAt: request.created_at || new Date().toISOString(),
        expiresAt: request.expires_at || new Date().toISOString(),
        isLiked: !!(userId && chainId && userLikes.includes(chainId)),
        likesCount: chainId ? (likesCount[chainId] || 0) : 0,
        canAccess: !isCompleted || !!(userId && chainId && unlockedChains.includes(chainId)),
        requiredCredits: isCompleted ? requiredCredits : undefined
      };
    });

    res.json(feedChains);
  } catch (err) {
    console.error('Error in getFeedData:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/feed/stats
export const getFeedStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { count: activeCount, error: activeError } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'active'])
      .is('deleted_at', null);

    if (activeError) {
      console.error('Error fetching active count:', activeError);
      res.status(500).json({ error: 'Failed to fetch active count' });
      return;
    }

    const { count: completedCount, error: completedError } = await supabase
      .from('connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .is('deleted_at', null);

    if (completedError) {
      console.error('Error fetching completed count:', completedError);
      res.status(500).json({ error: 'Failed to fetch completed count' });
      return;
    }

    res.json({
      active: activeCount || 0,
      completed: completedCount || 0
    });
  } catch (err) {
    console.error('Error in getFeedStats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
