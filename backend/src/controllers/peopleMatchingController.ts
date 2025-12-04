import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

/**
 * Get swipeable users for the deck
 */
export const getSwipeableUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 20;

    const { data, error } = await supabase.rpc('get_swipeable_users', {
      p_user_id: userId,
      p_limit: limit
    });

    if (error) {
      console.error('Error getting swipeable users:', error);
      res.status(500).json({ error: 'Failed to get users' });
      return;
    }

    res.json({ users: data || [] });
  } catch (error) {
    console.error('Error in getSwipeableUsers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Record a swipe (left or right)
 * Returns match info if a match occurred
 */
export const recordSwipe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { swiped_id, direction } = req.body;

    if (!swiped_id || !direction) {
      res.status(400).json({ error: 'swiped_id and direction are required' });
      return;
    }

    if (!['left', 'right'].includes(direction)) {
      res.status(400).json({ error: 'direction must be "left" or "right"' });
      return;
    }

    // Can't swipe on yourself
    if (swiped_id === userId) {
      res.status(400).json({ error: 'Cannot swipe on yourself' });
      return;
    }

    // Record the swipe
    const { error: swipeError } = await supabase
      .from('people_swipes')
      .insert({
        swiper_id: userId,
        swiped_id,
        direction
      });

    if (swipeError) {
      // Check if it's a duplicate
      if (swipeError.code === '23505') {
        res.status(400).json({ error: 'Already swiped on this user' });
        return;
      }
      console.error('Error recording swipe:', swipeError);
      res.status(500).json({ error: 'Failed to record swipe' });
      return;
    }

    // Check if a match was created (by the trigger)
    let match = null;
    if (direction === 'right') {
      const user1 = userId < swiped_id ? userId : swiped_id;
      const user2 = userId < swiped_id ? swiped_id : userId;

      const { data: matchData } = await supabase
        .from('people_matches')
        .select(`
          id,
          matched_at,
          status
        `)
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .single();

      if (matchData) {
        // Get matched user info
        const { data: matchedUser } = await supabase
          .from('users')
          .select('id, first_name, last_name, profile_picture_url, social_capital_score')
          .eq('id', swiped_id)
          .single();

        match = {
          ...matchData,
          matched_user: matchedUser
        };
      }
    }

    res.json({ 
      success: true, 
      is_match: !!match,
      match 
    });
  } catch (error) {
    console.error('Error in recordSwipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's matches
 */
export const getMatches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data, error } = await supabase.rpc('get_user_matches', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error getting matches:', error);
      res.status(500).json({ error: 'Failed to get matches' });
      return;
    }

    res.json({ matches: data || [] });
  } catch (error) {
    console.error('Error in getMatches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Schedule a call with a match
 */
export const scheduleMatchCall = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { match_id, scheduled_time } = req.body;

    if (!match_id || !scheduled_time) {
      res.status(400).json({ error: 'match_id and scheduled_time are required' });
      return;
    }

    // Verify user is part of this match
    const { data: match, error: matchError } = await supabase
      .from('people_matches')
      .select('*')
      .eq('id', match_id)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single();

    if (matchError || !match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

    // Create intro_call for the match
    const { data: introCall, error: callError } = await supabase
      .from('intro_calls')
      .insert({
        buyer_id: userId,
        target_id: otherUserId,
        creator_id: userId, // The one scheduling
        status: 'scheduled',
        scheduled_at: scheduled_time,
        call_type: 'match_call',
        duration_minutes: 15
      })
      .select()
      .single();

    if (callError) {
      console.error('Error creating intro call:', callError);
      res.status(500).json({ error: 'Failed to schedule call' });
      return;
    }

    // Update match status
    await supabase
      .from('people_matches')
      .update({
        status: 'call_scheduled',
        call_scheduled_at: scheduled_time,
        call_id: introCall.id
      })
      .eq('id', match_id);

    res.json({ 
      success: true, 
      call: introCall 
    });
  } catch (error) {
    console.error('Error in scheduleMatchCall:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Undo last swipe (premium feature?)
 */
export const undoLastSwipe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get last swipe
    const { data: lastSwipe, error: fetchError } = await supabase
      .from('people_swipes')
      .select('*')
      .eq('swiper_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !lastSwipe) {
      res.status(404).json({ error: 'No swipes to undo' });
      return;
    }

    // Check if it was within last 30 seconds
    const swipeTime = new Date(lastSwipe.created_at).getTime();
    const now = Date.now();
    if (now - swipeTime > 30000) {
      res.status(400).json({ error: 'Can only undo swipes within 30 seconds' });
      return;
    }

    // Delete the swipe
    await supabase
      .from('people_swipes')
      .delete()
      .eq('id', lastSwipe.id);

    // If it was a right swipe, also delete any match that was created
    if (lastSwipe.direction === 'right') {
      const user1 = userId < lastSwipe.swiped_id ? userId : lastSwipe.swiped_id;
      const user2 = userId < lastSwipe.swiped_id ? lastSwipe.swiped_id : userId;

      await supabase
        .from('people_matches')
        .delete()
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .eq('status', 'pending'); // Only delete if call not scheduled yet
    }

    res.json({ success: true, undone_swipe: lastSwipe });
  } catch (error) {
    console.error('Error in undoLastSwipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get swipe stats (for gamification)
 */
export const getSwipeStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get swipe counts
    const { data: swipeCounts } = await supabase
      .from('people_swipes')
      .select('direction')
      .eq('swiper_id', userId);

    const rightSwipes = swipeCounts?.filter(s => s.direction === 'right').length || 0;
    const leftSwipes = swipeCounts?.filter(s => s.direction === 'left').length || 0;

    // Get match count
    const { count: matchCount } = await supabase
      .from('people_matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // Get calls scheduled count
    const { count: callsCount } = await supabase
      .from('people_matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .eq('status', 'call_scheduled');

    res.json({
      stats: {
        total_swipes: rightSwipes + leftSwipes,
        right_swipes: rightSwipes,
        left_swipes: leftSwipes,
        matches: matchCount || 0,
        calls_scheduled: callsCount || 0,
        match_rate: rightSwipes > 0 ? ((matchCount || 0) / rightSwipes * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Error in getSwipeStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

